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
import { difficultyAt } from '../game/Difficulty';
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
  private counted: { delivered: number; perfects: number; runCounted: boolean; medal: MedalTier | null } = {
    delivered: 0, perfects: 0, runCounted: false, medal: null,
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
    this.waveAmp = difficultyAt(this.startScore, this.T.difficulty).waveAmp;
    this.ship = new Ship(this, this.T, this.seaY, difficultyAt(this.startScore, this.T.difficulty).rollAmpDeg);
    this.heli = new Helicopter(this, this.T, { W: this.W, seaY: this.seaY });
    this.rope = new Rope(this, this.T, this.heli.winchPoint());
    const seedParam = Number(q.get('seed'));
    this.fixedSeed = Number.isFinite(seedParam) && q.get('seed') ? seedParam : null;
    this.weatherFx = new WeatherFx(this);
    this.fx = new Fx(this);
    this.fb = new Feedback(this, this.fx, this.T);
    this.makeRngs();
    this.rainLevel = difficultyAt(this.startScore, this.T.difficulty).rain;
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

  private get collider(): Collider {
    return this.matter.query as unknown as Collider;
  }

  /** Her koşu için ayrı akışlar: kargo sırası (spawnRng) ve hava (weatherRng). */
  private makeRngs(): void {
    this.seed = this.fixedSeed ?? (this.mode === 'daily' ? this.dailyNow().seed : Date.now() >>> 0);
    this.spawner = new Spawner(createRng(`${this.seed}:spawn`), this.T);
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
    const d = difficultyAt(this.startScore, this.T.difficulty);
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
    this.counted = { delivered: 0, perfects: 0, runCounted: false, medal: null };
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
    const pick = this.spawner.next(this.run.score, this.W);
    const c = new Cargo(this, this.T, pick.type, pick.x);
    this.cargos.push(c);
    this.active = c;
    this.fb.spawned(pick.x, waterY(pick.x, this.simTime, this.seaY, this.waveAmp) - 10);
  }

  private fixedStep(): void {
    const run = this.run;
    const d = difficultyAt(run.score, this.T.difficulty);
    this.waveAmp += Phaser.Math.Clamp(d.waveAmp - this.waveAmp, -WAVE_RATE / 60, WAVE_RATE / 60);
    this.ship.step(d.rollAmpDeg, d.rollPeriod);

    const live = run.state === 'PLAYING' || run.state === 'SWAPPING' || run.state === 'FAILING' || run.state === 'RESUMING';
    if (live) this.weather.step(STEP_MS / 1000, d, run.score, run.state === 'SWAPPING' || run.state === 'RESUMING');
    const base = live ? this.weather.baseAccel(d) : 0;
    const gust = live ? this.weather.gustAccel() : 0;

    const carried = this.active?.state === 'CARRIED' ? this.active : null;
    this.heli.step(carried ? carried.handling : 1, base + gust);
    this.rope.step(this.heli.winchPoint());
    if (base + gust !== 0) this.pushBody(this.rope.endBody, base + gust);
    if (gust !== 0) {
      const f = gust * this.T.weather.stackGustFactor;
      for (const c of this.cargos) {
        if ((c.state === 'SETTLING' || c.state === 'STACKED') && c.body) this.pushBody(c.body, f);
      }
    }
    if (carried?.body) carried.preSpeed = this.relMotion(carried.body).speed;

    this.matter.step(STEP_MS);
    this.simTime += STEP_MS / 1000;

    if (run.state === 'READY' || run.state === 'PLAYING') this.trySpawn();
    if (run.state !== 'PLAYING' && run.state !== 'SWAPPING') return;

    this.handlePickup();
    this.handleRelease();
    this.handleSettling();
    this.checkFailures();
    this.checkSwap();
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
    if (Math.hypot(hp.x - top.x, hp.y - top.y) < this.T.hook.pickupRadius) {
      c.pickUp(this.matter, this.simTime);
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
    if (!c.touching) c.impact = Math.max(c.impact, c.preSpeed);
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
    });
    this.fb.released(box.x, box.y + c.h / 2, c.w, c.h, c.placement.hard);
    c.state = 'SETTLING';
    c.calmTime = 0;
    c.contactTime = 0;
    c.toShipLayer();
    this.rope.detachToHook();
    this.active = null;
    this.spawnAt = this.simTime + r.nextSpawnDelay;
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
      const res = this.run.onStacked(c.points, c.placement?.perfect ?? false);
      this.fb.placed(c.body.position.x, c.body.position.y, res.perfect, res.steady, res.streak);
      this.game.events.emit('ss:placed', {
        x: c.body.position.x,
        y: c.body.position.y,
        gained: res.gained,
        perfect: res.perfect,
        steady: res.steady,
        streak: res.streak,
        hard: c.placement?.hard ?? false,
      });
    }
  }

  /** §7.5 başarısızlıklar: F1 SPLASH, F2 CRASH, F3 TOPPLE. */
  private checkFailures(): void {
    const r = this.T.rules;
    const t = this.simTime;
    for (const c of this.cargos) {
      if (!c.body) continue;
      if (c.state === 'CARRIED') {
        if (t - c.pickedAt >= r.carriedGrace && c.bottom() > waterY(c.centerX, t, this.seaY, this.waveAmp) + r.waterMargin) {
          return this.triggerFail('splash', c.body.position, c);
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
    cam.shake(250, this.T.fx.shakeFail / this.W);
  }

  // ───────── gemi değişimi (§7.6) ─────────

  private checkSwap(): void {
    if (this.run.state !== 'PLAYING' || !this.run.shipFull) return;
    if (this.cargos.some((c) => c.state === 'SETTLING' || c.state === 'FLOATING' || c.state === 'CARRIED')) return;
    const bonus = this.run.beginSwap();
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
        const d = difficultyAt(this.run.score, this.T.difficulty);
        const next = new Ship(this, this.T, this.seaY, d.rollAmpDeg);
        next.offsetX = OLD_SHIP_EXIT_X;
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
    this.rope.draw();
    const dRain = difficultyAt(run.score, this.T.difficulty).rain;
    this.rainLevel += Phaser.Math.Clamp(dRain - this.rainLevel, -delta / 1000, delta / 1000);
    this.weatherFx.setRain(this.rainLevel);
    this.weatherFx.update(this.weather, this.W, this.H, delta / 1000);
    this.fx.update(delta / 1000);
    loops.update(
      run.state === 'PLAYING' || run.state === 'SWAPPING' || run.state === 'READY',
      Math.hypot(this.heli.vx, this.heli.vy) / this.T.heli.maxSpeed,
      this.rainLevel,
    );

    if (this.debugText) {
      this.debugText.setText(
        `FPS ${this.game.loop.actualFps.toFixed(0)}  steps ${steps}  ${run.state}\n` +
          `score ${run.score}  ship ${run.shipIndex + 1}  ${run.stacked}/${run.quota}  streak ${run.streak}\n` +
          `cargo ${this.cargos.map((c) => c.state[0]).join('')}  gust ${this.weather.phase}  seed ${this.seed}`,
      );
    }
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
    const sum = summarizeRun({
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
      if (sum.newBest) setItem('ss.best', run.score);
      if (!this.counted.runCounted) ads.noteRunFinished();
    }
    this.counted = { delivered: run.delivered, perfects: run.perfects, runCounted: true, medal: sum.medal ?? this.counted.medal };
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
