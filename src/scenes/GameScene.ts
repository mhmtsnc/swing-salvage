import Phaser from 'phaser';
import { getTuning, type Tuning } from '../config/tuning';
import { PALETTE } from '../config/palette';
import { createRng } from '../core/rng';
import { dailyInfo, finishAttempt, startAttempt, triesLeft } from '../core/daily';
import { summarizeRun, type Summary } from '../core/summary';
import { buildShareText, type ShareInput } from '../core/share';
import { shareText } from '../core/shareAction';
import { toggleTuningPanel } from '../core/tuningPanel';
import { STORE_URL } from '../config/app';
import { STRINGS, fmt } from '../config/strings';
import { FixedStepper, STEP_MS, toStepAcc } from '../core/time';
import { getItem, setItem } from '../core/storage';
import { difficultyEndless } from '../game/Difficulty';
import { scorePlacement, stormMultiplier, type ScoreResult } from '../game/scoring';
import { RopeLoad } from '../game/ropeLoad';
import { GhostRecorder, ghostPoseAt, ghostScoreAt } from '../core/ghost';
import type { GhostData } from '../core/storage';
import { Helicopter } from '../game/Helicopter';
import { Rope } from '../game/Rope';
import { Cargo } from '../game/Cargo';
import { Sea, waterY, waterYMid } from '../game/Sea';
import { Ship } from '../game/Ship';
import { Run, type FailKind, type RunMode } from '../game/Run';
import { Spawner } from '../game/Spawner';
import { Weather } from '../game/Weather';
import { WeatherFx } from '../game/WeatherFx';
import { Fx } from '../game/Fx';
import { Feedback } from '../game/Feedback';
import { loops } from '../core/audio';
import { loadMeta, saveMeta } from '../meta/store';
import { finalizeRun, type RunReport } from '../meta/finalize';
import { applyPlacement, deltaMetrics, emptyMetrics, type RunMetrics } from '../meta/tally';
import { wouldComplete, missionText } from '../meta/missions';
import { rankFor, runXp } from '../meta/rank';
import { HELI_ORIGIN } from '../art/textures';
import { ads } from '../core/ads';
import type { MedalTier } from '../core/summary';
import { classifyPlacement, findBelow } from '../game/placement';
import { mastRect, rectWorldAabb, shipParts, slotCentersWorld, worldToShip } from '../game/shipModel';

type Collider = { collides(body: MatterJS.BodyType, bodies: MatterJS.BodyType[]): unknown[] };

const OLD_SHIP_EXIT_X = -560;
const WAVE_RATE = 3; // px/sn: dalga genliği zorlukla yumuşak değişir
const CAMERA_SHIFT = 0.35;
const CAMERA_ZOOM = 1.06;
const CAMERA_FX_MS = 400;
const RESUME_SECONDS = 1.0;
const ASSIST_RADIUS = 0.6;
const MAGNET_REACH = 2.2;
const MAGNET_ACCEL = 520;
const MAGNET_FLOOR = 0.35;
const RETICLE_RANGE = 170;
const TRAIL_EVERY = 0.05;
const TIME_OF_DAY = [
  { color: 0xffffff, alpha: 0 },
  { color: 0xffc48a, alpha: 0.38 },
  { color: 0x9a86c8, alpha: 0.5 },
  { color: 0x3a4a7a, alpha: 0.6 },
  { color: 0xf2b6c4, alpha: 0.34 },
];
const SAFE_HEIGHT = 420;

export class GameScene extends Phaser.Scene {
  run!: Run;
  newBest = false;
  /** Normal mod rekoru */
  best = 0;
  mode: RunMode = 'normal';
  summary: Summary | null = null;
  private attemptConsumed = false;
  private culprit: Cargo | null = null;
  private busy = false;
  private runStartMs = 0;
  private lastRunSec = 0;
  private rewardedThisGameOver = false;
  private resumeT = 0;
  private reticle!: Phaser.GameObjects.Graphics;
  private tod!: Phaser.GameObjects.Rectangle;
  private todTween: Phaser.Tweens.Tween | null = null;
  private trailT = 0;
  private assistLevel = 1;
  private trailCache = 'none';
  /** v1.2: görev/başarım için canlı koşu metrikleri */
  private metrics: RunMetrics = emptyMetrics();
  private countedMetrics: RunMetrics | null = null;
  private prevHistScore: number | null = null;
  private notifiedMissions = new Set<string>();
  report: RunReport | null = null;
  private ropeLoad = new RopeLoad();
  private creakAt = 0;
  private runTime = 0;
  private ghostRec!: GhostRecorder;
  private ghostData: GhostData | null = null;
  private ghostImg!: Phaser.GameObjects.Image;
  private counted: { delivered: number; perfects: number; runCounted: boolean; medal: MedalTier | null; score: number } = {
    delivered: 0, perfects: 0, runCounted: false, medal: null, score: 0,
  };
  private lastShare: ShareInput | null = null;
  private T!: Tuning;
  private stepper = new FixedStepper();
  private simTime = 0;
  private W = 0;
  private H = 0;
  private seaY = 0;
  private waveAmp = 0;
  private startScore = 0;
  private sea!: Sea;
  private ship!: Ship;
  private oldShip: Ship | null = null;
  private heli!: Helicopter;
  private rope!: Rope;
  private spawner!: Spawner;
  private weather!: Weather;
  private weatherFx!: WeatherFx;
  private fx!: Fx;
  private fb!: Feedback;
  private rainLevel = 0;
  private fixedSeed: number | null = null;
  seed = 0;
  private cargos: Cargo[] = [];
  private active: Cargo | null = null;
  private spawnAt = 0;
  private failLeft = 0;
  private debugText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.T = getTuning();
    this.matter.world.autoUpdate = false;
    this.cameras.main.setBackgroundColor(PALETTE.sky);
    const q = new URLSearchParams(location.search);
    this.startScore = Math.max(0, Number(q.get('score')) || 0);
    this.run = new Run(this.T);
    this.measure();

    this.sea = new Sea(this);
    this.waveAmp = this.diffAt(this.startScore).waveAmp;
    this.ship = new Ship(this, this.T, this.seaY, this.diffAt(this.startScore).rollAmpDeg);
    this.heli = new Helicopter(this, this.T, { W: this.W, seaY: this.seaY });
    this.rope = new Rope(this, this.T, this.heli.winchPoint());
    const seedParam = Number(q.get('seed'));
    this.fixedSeed = Number.isFinite(seedParam) && q.get('seed') ? seedParam : null;
    this.weatherFx = new WeatherFx(this);
    this.fx = new Fx(this);
    this.reticle = this.add.graphics().setDepth(9.8);
    this.tod = this.add
      .rectangle(0, 0, 10, 10, 0xffffff)
      .setOrigin(0, 0)
      .setDepth(16.4)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(0);
    this.ghostRec = new GhostRecorder(this.T.ghost.sampleEvery);
    this.ghostImg = this.add
      .image(0, 0, `heli_${getItem('ss.paint')}`)
      .setOrigin(HELI_ORIGIN.x, HELI_ORIGIN.y)
      .setAlpha(0.32)
      .setDepth(14.8)
      .setVisible(false);
    this.loadGhost();
    this.setTimeOfDay(0, true);
    this.refreshCosmetics();
    this.fb = new Feedback(this, this.fx, this.T);
    this.makeRngs();
    this.rainLevel = this.diffAt(this.startScore).rain;
    this.best = getItem('ss.best');
    this.startRun('READY');
    this.spawnAt = 0;
    if (q.get('tune') === '1') void toggleTuningPanel();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const s = this.run.state;
      if (this.blockedByUi(p.x, p.y)) return;
      if (s === 'READY') {
        this.run.start();
        this.runStartMs = performance.now();
        this.consumeAttempt();
        this.game.events.emit('ss:started');
      }
      if (s === 'READY' || s === 'PLAYING' || s === 'SWAPPING' || s === 'RESUMING') this.heli.pointerDown(p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      this.heli.pointerMove(p.x, p.y);
      this.game.events.emit('ss:dragMove');
    });
    this.input.on('pointerup', () => this.heli.pointerUp());
    this.game.events.on('ss:again', this.again, this);
    this.game.events.on('ss:pause', this.pauseGame, this);
    this.game.events.on('ss:resume', this.resumeGame, this);
    this.game.events.on('ss:home', this.home, this);
    this.game.events.on('ss:paint', this.onPaint, this);
    this.game.events.on('ss:overlay', this.refreshCosmetics, this);
    this.game.events.on('ss:daily', this.armDaily, this);
    this.game.events.on('ss:share', this.shareRun, this);
    this.game.events.on('ss:secondChance', this.secondChance, this);
    this.game.events.on('ss:privacyOptions', this.privacyOptions, this);
    document.addEventListener('visibilitychange', this.onVisibility);

    if (q.get('debug') === '1') {
      this.matter.world.createDebugGraphic();
      this.debugText = this.add
        .text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: PALETTE.uiText })
        .setDepth(100);
    }

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      this.game.events.off('ss:again', this.again, this);
      this.game.events.off('ss:pause', this.pauseGame, this);
      this.game.events.off('ss:resume', this.resumeGame, this);
      this.game.events.off('ss:home', this.home, this);
      this.game.events.off('ss:paint', this.onPaint, this);
      this.game.events.off('ss:overlay', this.refreshCosmetics, this);
      this.game.events.off('ss:daily', this.armDaily, this);
      this.game.events.off('ss:share', this.shareRun, this);
      this.game.events.off('ss:secondChance', this.secondChance, this);
      this.game.events.off('ss:privacyOptions', this.privacyOptions, this);
      document.removeEventListener('visibilitychange', this.onVisibility);
    });
  }

  // ───────── yardımcılar ─────────

  private measure(): void {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.seaY = this.H - this.T.world.seaFromBottom;
  }

  private onResize(): void {
    const oldSea = this.seaY;
    this.measure();
    this.heli.setBounds(this.W, this.seaY);
    // Gemi geometrisi seaY'e bağlı: sadece sakin durumlarda yeniden kur.
    if (Math.abs(oldSea - this.seaY) > 0.5 && (this.run.state === 'READY' || this.run.state === 'GAME_OVER')) {
      const state = this.run.state;
      this.resetWorld();
      this.startRun(state);
    }
  }

  /** Sonsuz zorluk eğrisi, ilerleme puanına göre. */
  private diffAt(progress: number) {
    return difficultyEndless(progress, this.T.difficulty, this.T.endless);
  }

  private get collider(): Collider {
    return this.matter.query as unknown as Collider;
  }

  /** Her koşu için ayrı akışlar: kargo sırası (spawnRng) ve hava (weatherRng). */
  private makeRngs(): void {
    this.seed = this.fixedSeed ?? (this.mode === 'daily' ? this.dailyNow().seed : Date.now() >>> 0);
    this.spawner = new Spawner(createRng(`${this.seed}:spawn`), this.T);
    this.ship.setHotSlot(this.spawner.pickHotSlot(this.T.ship.slotCentersX.length));
    this.weather = new Weather(createRng(`${this.seed}:weather`), this.T, {
      onGustWarn: (dir) => {
        this.fb.gustWarn();
        this.game.events.emit('ss:gustWarn', dir);
      },
      onGustStart: (dir) => this.game.events.emit('ss:gustStart', dir),
      onGustEnd: () => this.game.events.emit('ss:gustEnd'),
      onLightning: (x) => {
        this.weatherFx.lightning(x, this.W);
        this.game.events.emit('ss:lightning');
      },
      onThunder: () => {
        this.fb.thunder();
        this.game.events.emit('ss:thunder');
      },
    });
  }

  /** UIScene'in yayınladığı dokunma alanları ve modal bayrağı: arkadaki oyun girdiyi görmesin. */
  private blockedByUi(x: number, y: number): boolean {
    if (this.registry.get('ss:modal')) return true;
    const rects = (this.registry.get('ss:uiRects') as { x: number; y: number; w: number; h: number }[] | undefined) ?? [];
    return rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  }

  private onVisibility = (): void => {
    if (document.hidden) this.pauseGame();
  };

  pauseGame(): void {
    if (!this.run.pause()) return;
    this.tweens.pauseAll();
    this.heli.pointerUp();
    this.game.events.emit('ss:paused');
  }

  resumeGame(): void {
    if (!this.run.resume()) return;
    this.tweens.resumeAll();
    this.stepper.reset();
  }

  /** Başlık ekranına dön (HOME). */
  home(): void {
    if (this.run.state !== 'PAUSED' && this.run.state !== 'GAME_OVER') return;
    this.tweens.resumeAll();
    this.mode = 'normal';
    this.resetWorld();
    this.startRun('READY');
    this.game.events.emit('ss:homed');
  }

  private onPaint(id: string): void {
    this.heli.setPaint(id);
    this.ghostImg.setTexture(`heli_${id}`);
    this.refreshCosmetics();
  }

  /** Onboarding için: dünya koordinatları. */
  get heliPos(): { x: number; y: number } {
    return { x: this.heli.x, y: this.heli.y };
  }

  isCarrying(): boolean {
    return this.active?.state === 'CARRIED';
  }

  floatingCargoTop(): { x: number; y: number } | null {
    const c = this.active;
    return c && c.state === 'FLOATING' ? c.topCenter() : null;
  }

  slotPositions(): { x: number; y: number }[] {
    return slotCentersWorld(this.ship.pose(), this.ship.params);
  }

  private stackBodies(): MatterJS.BodyType[] {
    const out: MatterJS.BodyType[] = [this.ship.body];
    for (const c of this.cargos) if ((c.state === 'SETTLING' || c.state === 'STACKED') && c.body) out.push(c.body);
    return out;
  }

  /** Kargonun gemi çerçevesine göreli doğrusal (px/s) ve açısal (rad/s) hızı. */
  private relMotion(b: MatterJS.BodyType): { speed: number; ang: number } {
    const s = this.ship.body;
    const w = s.angularVelocity;
    const rx = b.position.x - s.position.x;
    const ry = b.position.y - s.position.y;
    const vx = s.velocity.x - w * ry;
    const vy = s.velocity.y + w * rx;
    return {
      speed: Math.hypot(b.velocity.x - vx, b.velocity.y - vy) * 60,
      ang: Math.abs(b.angularVelocity - w) * 60,
    };
  }

  // ───────── dünya kurulumu / yeniden başlatma ─────────

  private clearCargo(): void {
    for (const c of this.cargos) c.destroy(this.matter);
    this.cargos = [];
    this.active = null;
  }

  /** Sahne yeniden başlamadan her şeyi temiz başlangıca döndürür (< 300 ms). */
  private resetWorld(): void {
    this.tweens.killAll();
    this.clearCargo();
    this.oldShip?.destroy();
    this.oldShip = null;
    this.ship.destroy();
    this.measure();
    const d = this.diffAt(this.startScore);
    this.waveAmp = d.waveAmp;
    this.ship = new Ship(this, this.T, this.seaY, d.rollAmpDeg);
    this.heli.setBounds(this.W, this.seaY);
    this.heli.reset();
    this.rope.resetHook(this.heli.winchPoint());
    this.makeRngs();
    this.rainLevel = d.rain;
    this.failLeft = 0;
    this.newBest = false;
    this.summary = null;
    this.attemptConsumed = false;
    this.culprit = null;
    this.runTime = 0;
    this.ghostRec.reset();
    this.ropeLoad.reset();
    this.loadGhost();
    this.setTimeOfDay(0, true);
    this.counted = { delivered: 0, perfects: 0, runCounted: false, medal: null, score: 0 };
    this.metrics = emptyMetrics();
    this.countedMetrics = null;
    this.prevHistScore = null;
    this.notifiedMissions = new Set();
    this.report = null;
    this.rewardedThisGameOver = false;
    this.stepper.reset();
    const cam = this.cameras.main;
    cam.resetFX();
    cam.setZoom(1);
    cam.centerOn(this.W / 2, this.H / 2);
    this.spawnAt = this.simTime;
  }

  private async again(): Promise<void> {
    if (this.run.state !== 'GAME_OVER' || this.busy) return;
    this.busy = true;
    try {
      if (this.persist) {
        await ads.maybeShowInterstitial({ lastRunSec: this.lastRunSec, rewardedWatched: this.rewardedThisGameOver });
      }
    } catch {
      /* reklam hatası oyunu kilitlemez */
    }
    this.busy = false;
    if (this.run.state !== 'GAME_OVER') return;
    if (this.mode === 'daily' && this.triesLeftNow() <= 0) this.mode = 'normal';
    this.resetWorld();
    this.startRun('PLAYING');
    this.runStartMs = performance.now();
    this.consumeAttempt();
  }

  private startRun(state: 'READY' | 'PLAYING' | 'GAME_OVER'): void {
    this.run.reset(state, this.startScore);
    this.run.mode = this.mode;
  }

  // ───────── Daily Storm ─────────

  private get persist(): boolean {
    return this.startScore === 0;
  }

  private dailyNow() {
    return dailyInfo(new Date(), this.T.daily.epochUtc);
  }

  dailyNumber(): number {
    return this.dailyNow().number;
  }

  triesLeftNow(): number {
    return triesLeft(getItem('ss.daily'), this.dailyNow().date, this.T.daily.attemptsPerDay);
  }

  /** DAILY butonu: bugünün tohumuyla hazır bekleyen koşu. Deneme ilk sürüklemede harcanır. */
  private armDaily(): void {
    if (this.run.state !== 'READY' || this.triesLeftNow() <= 0) return;
    this.mode = 'daily';
    this.resetWorld();
    this.startRun('READY');
  }

  private consumeAttempt(): void {
    if (this.mode !== 'daily' || this.attemptConsumed) return;
    this.attemptConsumed = true;
    if (this.persist) setItem('ss.daily', startAttempt(getItem('ss.daily'), this.dailyNow().date));
  }

  /** SHARE: son koşunun spoiler vermeyen emoji satırı. */
  private async shareRun(): Promise<void> {
    if (!this.lastShare) return;
    const out = await shareText(buildShareText(this.lastShare));
    if (out === 'copied') this.game.events.emit('ss:toast', STRINGS.copied);
  }

  // ───────── sabit adım ─────────

  private placedCount(): number {
    return this.cargos.filter((c) => c.state === 'SETTLING' || c.state === 'STACKED').length;
  }

  private spawnCargo(): void {
    const pick = this.spawner.next(this.run.progress, this.W);
    const c = new Cargo(this, this.T, pick.type, pick.x, pick.weightMul);
    this.cargos.push(c);
    this.active = c;
    this.fb.spawned(pick.x, waterY(pick.x, this.simTime, this.seaY, this.waveAmp) - 10);
  }

  private fixedStep(): void {
    const run = this.run;
    const d = this.diffAt(run.progress);
    this.waveAmp += Phaser.Math.Clamp(d.waveAmp - this.waveAmp, -WAVE_RATE / 60, WAVE_RATE / 60);
    this.ship.step(d.rollAmpDeg, d.rollPeriod);

    const live = run.state === 'PLAYING' || run.state === 'SWAPPING' || run.state === 'FAILING' || run.state === 'RESUMING';
    if (live) this.weather.step(STEP_MS / 1000, d, run.progress, run.state === 'SWAPPING' || run.state === 'RESUMING');
    const base = live ? this.weather.baseAccel(d, run.progress) : 0;
    const gust = live ? this.weather.gustAccel() : 0;

    const carried = this.active?.state === 'CARRIED' ? this.active : null;
    this.heli.step(carried ? carried.handling : 1, base + gust);
    this.rope.step(this.heli.winchPoint());
    if (base + gust !== 0) this.pushBody(this.rope.endBody, (base + gust) * this.massScale(this.rope.endBody));
    if (gust !== 0) {
      const f = gust * this.T.weather.stackGustFactor;
      for (const c of this.cargos) {
        if ((c.state === 'SETTLING' || c.state === 'STACKED') && c.body) this.pushBody(c.body, f);
      }
    }
    if (carried?.body) carried.preSpeed = this.relMotion(carried.body).speed;
    this.assistHook();

    this.matter.step(STEP_MS);
    this.simTime += STEP_MS / 1000;
    if (run.state === 'PLAYING' || run.state === 'SWAPPING') {
      this.runTime += STEP_MS / 1000;
      this.ghostRec.tick(this.runTime, this.heli.x, this.heli.y, this.heli.facing);
    }
    this.trackCarried(this.active?.state === 'CARRIED' ? this.active : null);

    if (run.state === 'READY' || run.state === 'PLAYING') this.trySpawn();
    if (run.state !== 'PLAYING' && run.state !== 'SWAPPING') return;

    this.handlePickup();
    this.handleRelease();
    this.handleSettling();
    this.checkFailures();
    this.checkSwap();
  }

  // ───────── v1.2: kavrama yardımı, gün döngüsü, iz efekti ─────────

  /** Yeni oyuncuya yardım: ilk 10 koşuda 1 → 0 (yakalama yarıçapı ve kanca manyetizması). */
  private assist(): number {
    return this.assistLevel;
  }

  /** Depolamayı kare başına okumamak için: koşu sayısı ve iz seçimi önbelleği. */
  private refreshCosmetics(): void {
    this.assistLevel = Phaser.Math.Clamp(1 - getItem('ss.stats').runs / 10, 0, 1);
    this.trailCache = loadMeta().trail;
  }

  private pickupRadius(): number {
    return this.T.hook.pickupRadius * (1 + ASSIST_RADIUS * this.assist());
  }

  /** Kanca, yüzen kargonun üst-orta noktasına yaklaştıkça hafifçe çekilir (hedeflemesi zor kavrama şikâyeti). */
  private assistHook(): void {
    const c = this.active;
    if (!c || c.state !== 'FLOATING' || !this.rope.hook || this.run.state !== 'PLAYING') return;
    const top = c.topCenter();
    const hp = this.rope.hook.position;
    const dx = top.x - hp.x;
    const dy = top.y - hp.y;
    const d = Math.hypot(dx, dy);
    const reach = this.pickupRadius() * MAGNET_REACH;
    if (d > reach || d < 1) return;
    const strength = MAGNET_ACCEL * (MAGNET_FLOOR + (1 - MAGNET_FLOOR) * this.assist()) * (1 - d / reach);
    this.matter.body.setVelocity(this.rope.hook, {
      x: this.rope.hook.velocity.x + toStepAcc((dx / d) * strength),
      y: this.rope.hook.velocity.y + toStepAcc((dy / d) * strength),
    });
  }

  /** Kancanın yaklaştığı yüzen kargonun etrafında halka işareti. */
  private drawReticle(): void {
    const g = this.reticle;
    g.clear();
    const c = this.active;
    if (!c || c.state !== 'FLOATING' || !this.rope.hook || this.run.state !== 'PLAYING') return;
    const top = c.topCenter();
    const hp = this.rope.hook.position;
    const d = Math.hypot(top.x - hp.x, top.y - hp.y);
    if (d > RETICLE_RANGE) return;
    const k = 1 - d / RETICLE_RANGE;
    const r = this.pickupRadius();
    const hot = d < r;
    g.lineStyle(3, hot ? 0xf3c44e : 0xffffff, 0.35 + 0.6 * k);
    g.strokeCircle(top.x, top.y, r + (1 - k) * 10);
    if (hot) g.fillStyle(0xf3c44e, 0.25).fillCircle(top.x, top.y, r);
  }

  /** Her gemi farklı ışıkta: gün → altın saat → alacakaranlık → gece → şafak. */
  private setTimeOfDay(index: number, instant: boolean): void {
    const p = TIME_OF_DAY[index % TIME_OF_DAY.length];
    this.todTween?.stop();
    if (instant) {
      this.tod.setFillStyle(p.color).setAlpha(p.alpha);
      return;
    }
    const from = { color: this.tod.fillColor, alpha: this.tod.alpha };
    const state = { k: 0 };
    this.todTween = this.tweens.add({
      targets: state,
      k: 1,
      duration: (this.T.ship.swapExitTime + this.T.ship.swapEnterTime) * 1000,
      onUpdate: () => {
        const a = Phaser.Display.Color.IntegerToColor(from.color);
        const b = Phaser.Display.Color.IntegerToColor(p.color);
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, state.k * 100);
        this.tod.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).setAlpha(from.alpha + (p.alpha - from.alpha) * state.k);
      },
    });
  }

  /** Helikopter arkasında seçili iz efekti. */
  private emitTrail(dt: number): void {
    const trail = this.trailId;
    if (trail === 'none') return;
    const run = this.run;
    if (run.state !== 'PLAYING' && run.state !== 'SWAPPING' && run.state !== 'READY') return;
    this.trailT += dt;
    if (this.trailT < TRAIL_EVERY) return;
    this.trailT = 0;
    const x = this.heli.x - this.heli.facing * 70;
    const y = this.heli.y - 6;
    const o = { speed: [10, 50] as [number, number], angle: [-180, 180] as [number, number], gravity: 20, life: [0.5, 0.9] as [number, number], scale: [0.7, 1.1] as [number, number] };
    switch (trail) {
      case 'sparks': this.fx.burst('sparkle', x, y, 1, { ...o, tint: 0xf3c44e, gravity: 120 }); break;
      case 'bubbles': this.fx.burst('drop', x, y, 1, { ...o, gravity: -40, tint: 0xd6ebe8 }); break;
      case 'smoke': this.fx.burst('dust', x, y, 1, { ...o, gravity: -15, tint: 0x6d7c80, scale: [0.9, 1.5] }); break;
      case 'leaves': this.fx.burst('dust', x, y, 1, { ...o, gravity: 90, tint: 0x8fa65a, spin: 5 }); break;
      case 'confetti': this.fx.burst(`confetti_${Math.floor(Math.random() * 6)}`, x, y, 1, { ...o, gravity: 140, spin: 8 }); break;
      case 'stars': this.fx.burst('sparkle', x, y, 1, { ...o, tint: 0xffffff, spin: 3 }); break;
    }
  }

  private get trailId(): string {
    return this.trailCache;
  }

  /** Kendi rekoruna karşı hayalet: normal modda, kayıtlı en iyi koşu. */
  private loadGhost(): void {
    const g = getItem('ss.ghost');
    this.ghostData = this.mode === 'normal' && g.samples.length >= 6 ? g : null;
  }

  /** Hayaletin şu anki skoru farkı (bizim − onun); hayalet yoksa null. */
  ghostDiff(): number | null {
    if (!this.ghostData || this.run.state === 'READY') return null;
    return this.run.score - ghostScoreAt(this.ghostData, this.runTime);
  }

  get stormMult(): number {
    return stormMultiplier(this.run.progress, this.T.scoring);
  }

  get comboMult(): number {
    const sc = this.T.scoring;
    return 1 + Math.min(sc.comboMax, Math.max(0, this.run.streak - 1) * sc.comboStep);
  }

  /** HUD rüzgâr oku: yön ve şiddet (−1..1). */
  windIndicator(): number {
    const d = this.diffAt(this.run.progress);
    const max = this.T.endless.windBase;
    return this.weather.windSign(this.run.progress) * Math.min(1, d.windBase / max + 0.15);
  }

  /** Hafif kargo rüzgârdan daha çok etkilenir, ağır olan daha az. */
  private massScale(b: MatterJS.BodyType): number {
    return Phaser.Math.Clamp(Math.pow(8 / Math.max(b.mass, 0.001), 0.3), 0.7, 1.4);
  }

  /** Taşınan kargo: salınım zirvesi, taşıma süresi, "kıl payı" ve halat yükü (kopma riski). */
  private trackCarried(c: Cargo | null): void {
    if (!c || !c.body) {
      this.ropeLoad.reset();
      this.rope.setStrain(0);
      return;
    }
    const dt = STEP_MS / 1000;
    c.carrySec = this.simTime - c.pickedAt;
    // salınım: zirve 40°/sn ile sönen tutucu (son ~0,5 sn)
    c.swingPeak = Math.max(this.rope.swingDeg(), c.swingPeak - 40 * dt);
    // kıl payı: su çizgisinin hemen üstünde ama batmadan
    const water = waterY(c.centerX, this.simTime, this.seaY, this.waveAmp);
    const gap = water - c.bottom();
    if (gap > 0 && gap < this.T.rules.closeCallDist) c.closeT += dt;
    if (c.closeT >= this.T.rules.closeCallTime) c.closeCall = true;
    // halat yükü
    const v = c.body.velocity;
    const snap = this.ropeLoad.update(v.x, v.y, dt, this.T.ropeLoad, this.T.world.gravityY * 1000, c.body.mass);
    const ratio = this.ropeLoad.ratio(this.T.ropeLoad, c.body.mass);
    this.rope.setStrain(ratio);
    if (ratio > this.T.ropeLoad.warnFrac && this.simTime - this.creakAt > 0.6) {
      this.creakAt = this.simTime;
      this.fb.creak();
    }
    if (snap && this.run.state === 'PLAYING') this.snapRope(c);
  }

  /** Halat koptu: kargo serbest kalır, sert iniş sayılır (güverteye düşerse oturur, suya düşerse SPLASH). */
  private snapRope(c: Cargo): void {
    if (!c.body) return;
    this.fb.snap(c.body.position.x, c.body.position.y);
    c.damaged = true;
    this.metrics.snaps++;
    c.placement = {
      grade: 'normal', sweet: false, perfect: false, hard: true, alignDx: 99, angleDeg: 90, impact: this.T.rules.hardLandingImpact,
    };
    c.state = 'SETTLING';
    c.calmTime = 0;
    c.contactTime = 0;
    c.toShipLayer();
    this.rope.detachToHook();
    this.ropeLoad.reset();
    this.active = null;
    this.spawnAt = this.simTime + this.T.rules.nextSpawnDelay;
    this.game.events.emit('ss:snap');
  }

  /** Yatay ivme (px/s²) → bu adımın hız farkı. */
  private pushBody(b: MatterJS.BodyType, accPxS2: number): void {
    this.matter.body.setVelocity(b, { x: b.velocity.x + toStepAcc(accPxS2), y: b.velocity.y });
  }

  private trySpawn(): void {
    if (this.active || this.simTime < this.spawnAt) return;
    if (this.placedCount() >= this.run.quota) return;
    this.spawnCargo();
  }

  private handlePickup(): void {
    const c = this.active;
    if (!c || c.state !== 'FLOATING' || !this.rope.hook || this.run.state !== 'PLAYING') return;
    const top = c.topCenter();
    const hp = this.rope.hook.position;
    if (Math.hypot(hp.x - top.x, hp.y - top.y) < this.pickupRadius()) {
      c.pickUp(this.matter, this.simTime);
      c.gustHook = this.weather.phase === 'ACTIVE';
      this.ropeLoad.reset();
      this.rope.attach(c.body as MatterJS.BodyType, { x: 0, y: -c.h / 2 }, c.w / 2);
      this.fb.hooked(c);
      this.game.events.emit('ss:hooked');
    }
  }

  /** §7.2 otomatik bırakma + §7.4 yerleşim kalitesi. */
  private handleRelease(): void {
    const c = this.active;
    if (!c || c.state !== 'CARRIED' || !c.body) return;
    const r = this.T.rules;
    const contact = this.collider.collides(c.body, this.stackBodies()).length > 0;
    if (!contact) {
      c.contactTime = 0;
      c.touching = false;
      if (this.simTime - c.lastContactAt > 0.5) c.impact = 0;
      return;
    }
    if (!c.touching) {
      c.impact = Math.max(c.impact, c.preSpeed);
      const onShip = this.collider.collides(c.body, [this.ship.body]).length > 0;
      this.fb.contact(c.body.position.x, c.bottom(), c.preSpeed, !onShip);
    }
    c.touching = true;
    c.lastContactAt = this.simTime;
    const speed = this.relMotion(c.body).speed;
    if (speed >= r.releaseMaxSpeed) {
      c.contactTime = 0;
      return;
    }
    c.contactTime += STEP_MS / 1000;
    if (c.contactTime < r.releaseContactTime) return;

    const pose = this.ship.pose();
    const box = c.box();
    const below = findBelow(
      box,
      this.cargos.filter((o) => o !== c && (o.state === 'SETTLING' || o.state === 'STACKED') && o.body).map((o) => o.box()),
    );
    c.placement = classifyPlacement({
      cargo: box,
      below,
      slotCentersX: slotCentersWorld(pose, this.ship.params).map((p) => p.x),
      deckAngle: pose.angle,
      impact: c.impact,
      rules: r,
      hotSlot: this.ship.hotSlot,
    });
    c.gustLanding = this.weather.phase === 'ACTIVE';
    c.carrySec = this.simTime - c.pickedAt;
    if (c.placement.hard) {
      c.damaged = true;
      this.hardKick(c);
    }
    this.fb.released(box.x, box.y + c.h / 2, c.w, c.h, c.placement.hard);
    c.state = 'SETTLING';
    c.calmTime = 0;
    c.contactTime = 0;
    c.toShipLayer();
    this.rope.detachToHook();
    this.active = null;
    this.spawnAt = this.simTime + r.nextSpawnDelay;
  }

  /** Sert inişte kargo yana kayar ve döner (güverteden düşebilir). */
  private hardKick(c: Cargo): void {
    if (!c.body) return;
    const dir = Math.sign(c.body.velocity.x) || (this.ship.pose().angle >= 0 ? 1 : -1);
    const push = (c.impact * this.T.rules.hardKick) / 60;
    this.matter.body.setVelocity(c.body, { x: c.body.velocity.x + dir * push, y: c.body.velocity.y });
    this.matter.body.setAngularVelocity(c.body, c.body.angularVelocity + dir * 0.04);
  }

  /** §7.3 oturma: kesintisiz settleTime boyunca sakin ve temasta → STACKED + puan. */
  private handleSettling(): void {
    const r = this.T.rules;
    for (const c of this.cargos) {
      if (c.state !== 'SETTLING' || !c.body) continue;
      const touching = this.collider.collides(c.body, this.stackBodies()).length > 0;
      const m = this.relMotion(c.body);
      if (touching && m.speed < r.settleMaxSpeed && m.ang < r.settleMaxAngSpeed) c.calmTime += STEP_MS / 1000;
      else c.calmTime = 0;
      if (c.calmTime < r.settleTime) continue;

      c.state = 'STACKED';
      const pose = this.ship.pose();
      const loc = worldToShip(pose, this.ship.params, c.body.position);
      c.stackedLocal = { x: loc.x, y: loc.y, angle: c.body.angle - pose.angle };
      const grade = c.placement?.grade ?? 'normal';
      const hard = (c.placement?.hard ?? false) || c.damaged;
      const res = scorePlacement(
        {
          base: c.points,
          grade,
          swingDeg: c.swingPeak,
          hard,
          sweet: c.placement?.sweet ?? false,
          risk: { closeCall: c.closeCall, gustHook: c.gustHook, gustLanding: c.gustLanding, saved: c.saved },
          carrySec: c.carrySec,
          perfectStreakBefore: this.run.streak,
          cleanStreakBefore: this.run.cleanStreak,
          progress: this.run.progress,
        },
        this.T.scoring,
      );
      this.run.commit(res, grade);
      this.metrics = applyPlacement(this.metrics, {
        type: c.type,
        grade,
        sweet: c.placement?.sweet ?? false,
        saved: c.saved,
        closeCall: c.closeCall,
        gustLanding: c.gustLanding,
        swingPoints: res.parts.find((p) => p.key === 'swing')?.points ?? 0,
        speedyPoints: res.parts.find((p) => p.key === 'speedy')?.points ?? 0,
        hard,
        streak: res.perfectStreak,
        clean: res.cleanStreak,
        score: this.run.score,
        ships: this.run.shipIndex + 1,
      });
      this.notifyMissions();
      this.ghostRec.score(this.runTime, this.run.score);
      this.fb.placed(c.body.position.x, c.body.position.y, {
        grade,
        streak: res.perfectStreak,
        milestone: res.streakBonus > 0 || res.cleanBonus > 0,
        sweet: c.placement?.sweet ?? false,
      });
      this.game.events.emit('ss:placed', {
        x: c.body.position.x,
        y: c.body.position.y,
        gained: res.gained,
        labels: this.rewardLabels(res, grade),
        grade,
        streak: res.perfectStreak,
        hard,
      });
    }
  }

  /** Koşu içinde biten görevleri canlı bildirir (kalıcı işleme koşu sonunda). */
  private notifyMissions(): void {
    const meta = loadMeta();
    const m = { ...this.metrics, runs: 1 };
    for (const id of wouldComplete(meta.missions, m)) {
      if (this.notifiedMissions.has(id)) continue;
      this.notifiedMissions.add(id);
      const slot = meta.missions.find((x) => x.id === id);
      if (slot) this.game.events.emit('ss:mission', missionText(slot));
    }
  }

  /** Meta bilgisi (UI için). */
  get metaNow() {
    return loadMeta();
  }

  /** Yerleştirme ödüllerinin kısa etiketleri (öncelik sırasıyla). */
  private rewardLabels(res: ScoreResult, grade: 'normal' | 'perfect' | 'flawless'): string[] {
    const R = STRINGS.rewards;
    const out: string[] = [];
    if (grade === 'flawless') out.push(`${R.flawless} ×${res.placementMult}`);
    else if (grade === 'perfect') out.push(`${R.perfect} ×${res.placementMult}`);
    if (res.streakBonus > 0) {
      out.push(res.perfectStreak === this.T.rules.steadyEvery ? `${STRINGS.steady} +${res.streakBonus}` : `${R.chain} ×${res.perfectStreak} +${res.streakBonus}`);
    }
    const label: Record<string, string> = {
      swing: R.swing, closeCall: R.closeCall, gustHook: R.gustHook, gustLanding: R.gustLanding,
      saved: R.saved, speedy: R.speedy, sweet: R.sweet,
    };
    for (const p of res.parts) if (label[p.key]) out.push(`${label[p.key]} +${p.points}`);
    if (res.cleanBonus > 0) out.push(`${R.clean} ×${res.cleanStreak} +${res.cleanBonus}`);
    return out;
  }

  /** §7.5 başarısızlıklar: F1 SPLASH, F2 CRASH, F3 TOPPLE. */
  private checkFailures(): void {
    const r = this.T.rules;
    const t = this.simTime;
    for (const c of this.cargos) {
      if (!c.body) continue;
      if (c.state === 'CARRIED') {
        if (t - c.pickedAt >= r.carriedGrace) {
          const water = waterY(c.centerX, t, this.seaY, this.waveAmp);
          if (c.bottom() > water + r.waterMargin) {
            // Son anda kurtarma: kargo kısa süre batabilir, rescueGrace içinde çekilirse kurtulur.
            if (c.submergedT === 0) this.fb.waterTouch(c.centerX, water);
            c.submergedT += STEP_MS / 1000;
            const v = c.body.velocity;
            this.matter.body.setVelocity(c.body, { x: v.x * 0.92, y: v.y * 0.92 });
            if (c.submergedT > r.rescueGrace) return this.triggerFail('splash', c.body.position, c);
          } else if (c.submergedT > 0) {
            if (c.submergedT >= 0.08) {
              c.saved = true;
              this.fb.saved(c.centerX, water);
              this.game.events.emit('ss:saved');
            }
            c.submergedT = 0;
          }
        }
      } else if (c.state === 'SETTLING' || c.state === 'STACKED') {
        if (c.bottom() > waterYMid(c.centerX, t, this.seaY, this.waveAmp) + r.waterMargin) {
          return this.triggerFail('splash', c.body.position, c);
        }
      }
    }

    if (this.run.state === 'PLAYING') {
      const hb = this.heli.hitbox();
      const pose = this.ship.pose();
      const params = this.ship.params;
      const parts = shipParts(this.seaY, this.T.ship);
      for (const rect of [parts.bridge, mastRect(this.seaY, this.T.ship)]) {
        const a = rectWorldAabb(pose, params, rect);
        if (hb.right > a.x0 && hb.x < a.x1 && hb.bottom > a.y0 && hb.y < a.y1) {
          return this.triggerFail('crash', { x: this.heli.x, y: this.heli.y }, null);
        }
      }
      for (const c of this.cargos) {
        if ((c.state !== 'SETTLING' && c.state !== 'STACKED') || !c.body) continue;
        const b = c.body.bounds;
        if (hb.right > b.min.x && hb.x < b.max.x && hb.bottom > b.min.y && hb.y < b.max.y) {
          return this.triggerFail('crash', { x: this.heli.x, y: this.heli.y }, null);
        }
      }
    }

    const pose = this.ship.pose();
    for (const c of this.cargos) {
      if (c.state !== 'STACKED' || !c.body || !c.stackedLocal) continue;
      const loc = worldToShip(pose, this.ship.params, c.body.position);
      let da = c.body.angle - pose.angle - c.stackedLocal.angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (
        loc.y - c.stackedLocal.y > r.toppleDrop ||
        Math.abs((da * 180) / Math.PI) > r.toppleAngleDeg
      ) {
        return this.triggerFail('topple', c.body.position, c);
      }
    }
  }

  private triggerFail(kind: FailKind, at: { x: number; y: number }, culprit: Cargo | null): void {
    if (this.run.state === 'FAILING') return;
    this.run.fail(kind);
    this.culprit = culprit;
    this.fb.fail(kind, at.x, kind === 'splash' ? this.seaY : at.y, culprit, this.heli.images());
    this.failLeft = this.T.fx.failSlowMoTime;
    this.heli.pointerUp();
    const cam = this.cameras.main;
    const cx = this.W / 2 + (at.x - this.W / 2) * CAMERA_SHIFT;
    const cy = this.H / 2 + (at.y - this.H / 2) * CAMERA_SHIFT;
    cam.pan(cx, cy, CAMERA_FX_MS, 'Sine.easeInOut');
    cam.zoomTo(CAMERA_ZOOM, CAMERA_FX_MS, 'Sine.easeInOut');
    this.fx.shake(cam, this.T.fx.shakeFail, 250, this.W);
  }

  // ───────── gemi değişimi (§7.6) ─────────

  private checkSwap(): void {
    if (this.run.state !== 'PLAYING' || !this.run.shipFull) return;
    if (this.cargos.some((c) => c.state === 'SETTLING' || c.state === 'FLOATING' || c.state === 'CARRIED')) return;
    const bonus = this.run.beginSwap();
    this.setTimeOfDay(this.run.shipIndex + 1, false);
    this.fb.shipFull(this.W * 0.3, this.seaY - 140);
    this.game.events.emit('ss:shipFull', { bonus });

    const s = this.T.ship;
    const old = this.ship;
    const pose = old.pose();
    for (const c of this.cargos) {
      if (!c.body) continue;
      const loc = worldToShip(pose, old.params, c.body.position);
      const pv = { x: old.params.ship.pivotX, y: this.seaY - s.pivotAboveSea };
      c.makeDecor(this.matter, old.container, { x: loc.x - pv.x, y: loc.y - pv.y }, c.body.angle - pose.angle);
    }
    this.cargos = [];
    old.removeBody();
    this.oldShip = old;

    this.tweens.add({
      targets: old,
      offsetX: OLD_SHIP_EXIT_X,
      duration: s.swapExitTime * 1000,
      ease: 'Quad.easeIn',
      onComplete: () => {
        old.destroy();
        this.oldShip = null;
        const d = this.diffAt(this.run.progress);
        const next = new Ship(this, this.T, this.seaY, d.rollAmpDeg);
        next.offsetX = OLD_SHIP_EXIT_X;
        next.setHotSlot(this.spawner.pickHotSlot(this.T.ship.slotCentersX.length));
        this.ship = next;
        this.tweens.add({
          targets: next,
          offsetX: 0,
          duration: s.swapEnterTime * 1000,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (this.run.state !== 'SWAPPING') return;
            this.run.endSwap();
            this.spawner.resetShip();
            this.weather.newShip();
            this.spawnAt = this.simTime;
          },
        });
      },
    });
  }

  // ───────── çerçeve döngüsü ─────────

  update(_time: number, delta: number): void {
    this.measure();
    const run = this.run;
    let steps = 0;
    if (run.state === 'RESUMING') {
      this.resumeT += delta / 1000;
      if (this.resumeT >= RESUME_SECONDS) this.endResume();
    }
    if (run.state !== 'GAME_OVER' && run.state !== 'PAUSED') {
      const slow = this.T.fx.failSlowMo;
      const scale =
        run.state === 'FAILING' ? slow : run.state === 'RESUMING' ? slow + (1 - slow) * Math.min(1, this.resumeT / RESUME_SECONDS) : 1;
      steps = this.stepper.advance(delta * scale);
      for (let i = 0; i < steps; i++) this.fixedStep();
    }

    if (run.state === 'FAILING') {
      this.failLeft -= delta / 1000;
      if (this.failLeft <= 0) this.finishFail();
    }

    this.sea.draw(this.simTime, this.seaY, this.waveAmp, this.W, this.H);
    this.ship.render();
    this.oldShip?.render();
    for (const c of this.cargos) {
      c.updateFloating(this.simTime, this.seaY, this.waveAmp);
      c.sync();
    }
    this.heli.render(delta / 1000);
    this.renderGhost();
    this.rope.draw();
    const dRain = this.diffAt(run.progress).rain;
    this.rainLevel += Phaser.Math.Clamp(dRain - this.rainLevel, -delta / 1000, delta / 1000);
    this.weatherFx.setRain(this.rainLevel);
    this.weatherFx.update(this.weather, this.W, this.H, delta / 1000);
    this.fx.update(delta / 1000);
    this.drawReticle();
    this.tod.setSize(this.W, this.H);
    this.emitTrail(delta / 1000);
    loops.update(
      run.state === 'PLAYING' || run.state === 'SWAPPING' || run.state === 'READY',
      Math.hypot(this.heli.vx, this.heli.vy) / this.T.heli.maxSpeed,
      this.rainLevel,
      Math.min(1.5, Math.abs(this.weather.windSign(run.progress)) * (this.diffAt(run.progress).windBase / 0.4) + this.weather.envelope() * 0.8),
    );

    if (this.debugText) {
      this.debugText.setText(
        `FPS ${this.game.loop.actualFps.toFixed(0)}  steps ${steps}  ${run.state}\n` +
          `score ${run.score}  ship ${run.shipIndex + 1}  ${run.stacked}/${run.quota}  streak ${run.streak}\n` +
          `cargo ${this.cargos.map((c) => c.state[0]).join('')}  gust ${this.weather.phase}  seed ${this.seed}`,
      );
    }
  }

  private renderGhost(): void {
    const g = this.ghostData;
    const p = g && this.run.state !== 'READY' && this.run.state !== 'GAME_OVER' ? ghostPoseAt(g, this.runTime) : null;
    if (!p) {
      this.ghostImg.setVisible(false);
      return;
    }
    this.ghostImg.setVisible(true).setPosition(p.x, p.y).setScale(-p.facing * this.T.heli.spriteScale, this.T.heli.spriteScale);
  }

  private finishFail(): void {
    const run = this.run;
    run.gameOver();
    const today = this.dailyNow().date;
    let daily = getItem('ss.daily');
    if (run.mode === 'daily') daily = finishAttempt(daily, today, run.score);
    const prevBest = getItem('ss.best');
    this.lastRunSec = this.runStartMs ? (performance.now() - this.runStartMs) / 1000 : 0;
    this.rewardedThisGameOver = false;
    const meta0 = loadMeta();
    const xpPreview = runXp(run.score - (this.counted.runCounted ? 0 : 0), run.delivered, run.perfects);
    const rankNow = rankFor(meta0.xp + Math.max(0, xpPreview - 0));
    const sum = summarizeRun({
      lastKind: meta0.lastMsgKind,
      xpToRank: { remaining: Math.max(1, rankNow.need - rankNow.into), rank: rankNow.rank + 1 },
      already: { runCounted: this.counted.runCounted, medal: this.counted.medal },
      result: {
        score: run.score,
        delivered: run.delivered - this.counted.delivered,
        perfects: run.perfects - this.counted.perfects,
        shipsReached: run.shipIndex + 1,
        mode: run.mode,
      },
      stats: getItem('ss.stats'),
      bestNormal: prevBest,
      daily,
      prevUnlocks: getItem('ss.unlocks'),
    });
    if (this.persist) {
      if (run.mode === 'daily') setItem('ss.daily', daily);
      setItem('ss.stats', sum.stats);
      setItem('ss.unlocks', sum.unlocked);
      if (sum.newBest) {
        setItem('ss.best', run.score);
        setItem('ss.ghost', this.ghostRec.data(run.score));
      }
      if (!this.counted.runCounted) ads.noteRunFinished();
    }
    // v1.2: görevler, XP/rütbe, başarımlar, kasalar
    const total: RunMetrics = { ...this.metrics, ships: run.shipIndex + 1, score: run.score, runs: 1 };
    const delta = deltaMetrics(total, this.countedMetrics);
    if (this.counted.runCounted) delta.runs = 0;
    const fin = finalizeRun({
      meta: meta0,
      metrics: delta,
      run: {
        score: run.score,
        delivered: run.delivered,
        perfects: run.perfects,
        scoreDelta: run.score - (this.counted.runCounted ? this.counted.score : 0),
        deliveredDelta: run.delivered - this.counted.delivered,
        perfectsDelta: run.perfects - this.counted.perfects,
        mode: run.mode,
        date: today,
        continued: this.counted.runCounted,
        prevScore: this.prevHistScore,
      },
      stats: { ...sum.stats },
      bestScore: Math.max(prevBest, run.score),
      dailyDays: new Set(daily.playedDays).size,
    });
    if (sum.messageKind === 'xp') {
      sum.message = fmt(STRINGS.xpToRank, { n: Math.max(1, fin.report.rankAfter.need - fin.report.rankAfter.into), rank: fin.report.rankAfter.rank + 1 });
    }
    fin.meta.lastMsgKind = sum.messageKind;
    if (this.persist) saveMeta(fin.meta);
    this.report = fin.report;
    this.prevHistScore = run.score;
    this.countedMetrics = total;
    this.counted = { delivered: run.delivered, perfects: run.perfects, runCounted: true, medal: sum.medal ?? this.counted.medal, score: run.score };
    this.summary = sum;
    this.newBest = sum.newBest || (this.newBest && run.mode === 'normal');
    this.best = Math.max(prevBest, sum.newBest ? run.score : 0);
    this.lastShare = {
      mode: run.mode,
      dailyNumber: this.dailyNow().number,
      score: run.score,
      ships: run.shipIndex + 1,
      perfects: run.perfects,
      log: run.log,
      death: run.failKind,
      storeUrl: STORE_URL,
    };
    this.refreshCosmetics();
    this.game.events.emit('ss:gameover');
  }

  // ───────── SECOND CHANCE (§16.2) ─────────

  canSecondChance(): boolean {
    return (
      this.run.state === 'GAME_OVER' &&
      !this.busy &&
      !this.run.secondChanceUsed &&
      this.run.score >= this.T.ads.secondChanceMinScore &&
      ads.canOfferRewarded()
    );
  }

  private async privacyOptions(): Promise<void> {
    await ads.showPrivacyOptions();
  }

  private async secondChance(): Promise<void> {
    if (!this.canSecondChance()) return;
    this.busy = true;
    let ok = false;
    try {
      ok = await ads.showRewarded();
    } catch {
      ok = false;
    }
    this.busy = false;
    if (!ok || this.run.state !== 'GAME_OVER') return; // ödülsüz kapanış: panel olduğu gibi kalır
    this.rewardedThisGameOver = true;
    this.beginResume();
  }

  private removeCargo(c: Cargo): void {
    if (c === this.active) {
      this.rope.detachToHook();
      this.active = null;
    }
    if (c.state === 'STACKED') this.run.stacked = Math.max(0, this.run.stacked - 1);
    c.destroy(this.matter);
    this.cargos = this.cargos.filter((o) => o !== c);
  }

  private beginResume(): void {
    const run = this.run;
    run.secondChanceUsed = true;
    run.state = 'RESUMING';
    const pose = this.ship.pose();
    const drop = new Set<Cargo>();
    if (this.culprit && run.failKind !== 'crash') drop.add(this.culprit);
    if (run.failKind === 'topple') {
      for (const c of this.cargos) {
        if (c.state !== 'STACKED' || !c.body || !c.stackedLocal) continue;
        const loc = worldToShip(pose, this.ship.params, c.body.position);
        if (Math.hypot(loc.x - c.stackedLocal.x, loc.y - c.stackedLocal.y) > this.T.rules.toppleDrop) drop.add(c);
      }
    }
    // taşınan kargo varsa o da kalkar (halat boş kancaya döner), yenisi doğar
    if (this.active?.state === 'CARRIED') drop.add(this.active);
    for (const c of drop) this.removeCargo(c);

    this.heli.teleport((this.T.ship.bowTipX + this.W - this.T.heli.marginX) / 2, Math.max(this.T.heli.minY, this.seaY - SAFE_HEIGHT));
    this.rope.resetHook(this.heli.winchPoint());
    this.spawnAt = this.simTime + this.T.rules.nextSpawnDelay;
    this.culprit = null;
    this.resumeT = 0;
    this.failLeft = 0;
    const cam = this.cameras.main;
    cam.resetFX();
    cam.setZoom(1);
    cam.centerOn(this.W / 2, this.H / 2);
    this.stepper.reset();
  }

  /** Bağışıklık bitti: STACKED kargoların referans konumu/açısı yeniden alınır, koşu sürer. */
  private endResume(): void {
    const pose = this.ship.pose();
    for (const c of this.cargos) {
      if (c.state !== 'STACKED' || !c.body) continue;
      const loc = worldToShip(pose, this.ship.params, c.body.position);
      c.stackedLocal = { x: loc.x, y: loc.y, angle: c.body.angle - pose.angle };
    }
    this.run.state = 'PLAYING';
  }

  /** Game over panelinde gösterilen rekor (Daily'de günün en iyisi). */
  panelBest(): number {
    return this.mode === 'daily' ? getItem('ss.daily').best : this.best;
  }

  /** HUD/READY etiketi: Daily modunda "DAILY #12". */
  modeTag(): string | null {
    return this.mode === 'daily' ? fmt(STRINGS.dailyTag, { n: this.dailyNumber() }) : null;
  }
}
