import Phaser from 'phaser';
import { getTuning, type Tuning } from '../config/tuning';
import type { PaintId } from '../config/palette';
import { PRIVACY_URL } from '../config/app';
import { STRINGS, fmt } from '../config/strings';
import { getItem, setItem } from '../core/storage';
import { evaluateUnlocks } from '../core/unlocks';
import { toggleTuningPanel } from '../core/tuningPanel';
import { card, label } from '../ui/components';
import type { GameScene } from './GameScene';
import { Fx } from '../game/Fx';
import { play } from '../core/audio';
import { haptic } from '../core/haptics';
import type { Button } from '../ui/components';
import { GameOverPanel, type GameOverData } from '../ui/GameOverPanel';
import { HangarScreen } from '../ui/HangarScreen';
import { Hud } from '../ui/Hud';
import { Onboarding } from '../ui/Onboarding';
import { PausePanel } from '../ui/PausePanel';
import { ReadyScreen } from '../ui/ReadyScreen';
import { SettingsScreen } from '../ui/SettingsScreen';

type Overlay = 'none' | 'hangar' | 'settings';

/** Bütün arayüz burada (kamera sarsıntısı HUD'u etkilemesin). Oyun durumunu GameScene.run'dan okur. */
export class UIScene extends Phaser.Scene {
  private T!: Tuning;
  private gs!: GameScene;
  private ready!: ReadyScreen;
  private hud!: Hud;
  private over!: GameOverPanel;
  private pausePanel!: PausePanel;
  private hangar!: HangarScreen;
  private settings!: SettingsScreen;
  private onboarding!: Onboarding;
  private fx!: Fx;
  private overlay: Overlay = 'none';
  private lastState = '';

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.T = getTuning();
    this.gs = this.scene.get('GameScene') as GameScene;
    const ev = this.game.events;

    this.ready = new ReadyScreen(this, {
      onDaily: () => ev.emit('ss:daily'),
      onHangar: () => this.openOverlay('hangar'),
      onSettings: () => this.openOverlay('settings'),
    });
    this.hud = new Hud(this, () => ev.emit('ss:pause'));
    this.over = new GameOverPanel(this, {
      onAgain: () => this.againTapped(),
      onSecondChance: () => ev.emit('ss:secondChance'),
      onShare: () => ev.emit('ss:share'),
      onHome: () => this.homeTapped(),
    });
    this.pausePanel = new PausePanel(this, { onResume: () => ev.emit('ss:resume'), onHome: () => ev.emit('ss:home') });
    this.hangar = new HangarScreen(this, {
      onSelect: (id) => this.selectPaint(id),
      onBack: () => this.openOverlay('none'),
    });
    this.settings = new SettingsScreen(this, {
      onBack: () => this.openOverlay('none'),
      onHowTo: () => this.onboarding.reset(),
      onPrivacyOptions: () => ev.emit('ss:privacyOptions'),
      onPolicy: () => window.open(PRIVACY_URL, '_blank', 'noopener'),
      onTune: () => ev.emit('ss:tune'),
    });
    this.onboarding = new Onboarding(this);
    this.fx = new Fx(this, 60);

    // Sıra: arka → ön
    for (const root of [this.ready.root, this.hud.root, this.pausePanel.root, this.over.root, this.hangar.root, this.settings.root]) {
      this.children.bringToTop(root);
    }

    const on = (e: string, fn: (...a: never[]) => void) => {
      ev.on(e, fn, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ev.off(e, fn, this));
    };
    on('ss:placed', ((p: { x: number; y: number; gained: number; labels: string[] }) => {
      this.onboarding.onPlaced();
      this.hud.floatTag(p.x, p.y - 60, `+${p.gained}`, p.labels);
    }) as never);
    on('ss:saved', (() => this.hud.floatTag(this.scale.width / 2, this.scale.height * 0.4, STRINGS.rewards.saved, [])) as never);
    on('ss:snap', (() => this.hud.floatTag(this.scale.width / 2, this.scale.height * 0.4, STRINGS.rewards.snap, [])) as never);
    on('ss:shipFull', ((p: { bonus: number }) => {
      this.hud.floatTag(this.scale.width / 2, this.scale.height * 0.32, `+${p.bonus}`, [STRINGS.shipFull]);
    }) as never);
    on('ss:hooked', (() => this.onboarding.onHooked()) as never);
    on('ss:dragMove', (() => this.onboarding.onDragMove()) as never);
    on('ss:gameover', (() => this.openPanel()) as never);
    on('ss:toast', ((t: string) => this.toast(t)) as never);
    on('ss:tune', (() => void toggleTuningPanel()) as never);
  }

  // ───────── geçişler ─────────

  private openOverlay(o: Overlay): void {
    this.overlay = o;
    if (o === 'hangar') this.hangar.refresh(this.unlocked(), getItem('ss.paint') as PaintId);
    this.game.events.emit('ss:overlay', o);
  }

  private unlocked(): PaintId[] {
    return evaluateUnlocks(getItem('ss.stats'), getItem('ss.daily'));
  }

  private selectPaint(id: PaintId): void {
    if (!this.unlocked().includes(id)) return;
    setItem('ss.paint', id);
    this.game.events.emit('ss:paint', id);
    this.hangar.refresh(this.unlocked(), id);
  }

  private againTapped(): void {
    if (!this.over.isOpen || !this.over.unlocked) return;
    this.game.events.emit('ss:again');
  }

  private homeTapped(): void {
    if (!this.over.isOpen || !this.over.unlocked) return;
    this.game.events.emit('ss:home');
  }

  private toast(text: string): void {
    const t = label(this, text, 18, '#24353A', '600');
    const c = this.add
      .container(this.scale.width / 2, this.scale.height - 90, [card(this, t.width + 40, 44), t])
      .setDepth(200);
    this.tweens.add({ targets: c, alpha: 0, y: c.y - 24, delay: 900, duration: 400, onComplete: () => c.destroy() });
  }

  private openPanel(): void {
    const run = this.gs.run;
    const sum = this.gs.summary;
    const daily = run.mode === 'daily';
    const left = this.gs.triesLeftNow();
    const data: GameOverData = {
      kind: run.failKind ?? 'splash',
      score: run.score,
      best: this.gs.panelBest(),
      newBest: this.gs.newBest,
      medal: sum?.medal ?? null,
      message: sum?.message ?? fmt(STRINGS.delivered, { n: run.delivered }),
      canSecondChance: this.gs.canSecondChance(),
      daily: daily ? { triesText: fmt(STRINGS.triesLeft, { n: left }) } : null,
      playNormal: daily && left <= 0,
    };
    this.over.show(data, this.scale.width, this.scale.height, this.T.fx.gameOverInputLock);
    // NEW BEST: konfeti, fanfar; madalya: zil (panel kayarken)
    if (data.newBest) {
      this.time.delayedCall(250, () => {
        this.fx.confetti(this.scale.width / 2, this.scale.height * 0.4, 36);
        play('new_best');
        haptic('success');
      });
    }
    if (data.medal) {
      this.time.delayedCall(550, () => {
        play('medal');
        haptic('light');
      });
    }
  }

  // ───────── çerçeve döngüsü ─────────

  update(_time: number, delta: number): void {
    this.fx.update(delta / 1000);
    const run = this.gs?.run;
    if (!run) return;
    const { width: W, height: H } = this.scale;
    const state = run.state;
    const ov = this.overlay;

    if (ov === 'none' && this.lastState !== state) {
      // durum değişince panelleri senkronla
      if (state !== 'GAME_OVER' && this.over.isOpen) this.over.hide();
    }
    this.lastState = state;

    const showReady = ov === 'none' && state === 'READY';
    const showHud = ov === 'none' && (state === 'PLAYING' || state === 'SWAPPING' || state === 'PAUSED' || state === 'FAILING' || state === 'GAME_OVER' || state === 'RESUMING');
    this.ready.show(showReady);
    this.hud.show(showHud);
    this.pausePanel.show(ov === 'none' && state === 'PAUSED');
    this.hangar.show(ov === 'hangar');
    this.settings.show(ov === 'settings');
    if (state !== 'GAME_OVER' && this.over.isOpen) this.over.hide();

    const k = this.gs.triesLeftNow();
    this.ready.setDaily(true, this.gs.dailyNumber(), k);
    this.ready.update(W, H, this.gs.best, this.gs.modeTag());
    this.hud.update(W, run, this.gs.best, this.gs.modeTag(), {
      combo: this.gs.comboMult,
      storm: this.gs.stormMult,
      ghostDiff: this.gs.ghostDiff(),
      wind: this.gs.windIndicator(),
    });
    this.pausePanel.layout(W, H);
    this.hangar.layout(W, H);
    this.settings.layout(W, H);
    this.over.layout(W, H);

    const playing = ov === 'none' && (state === 'PLAYING');
    this.onboarding.update(
      playing,
      this.gs.heliPos,
      this.gs.floatingCargoTop(),
      this.gs.slotPositions(),
      this.gs.isCarrying(),
    );

    // GameScene'e dokunma alanlarını ve modal bayrağını yayınla
    const buttons: Button[] = [
      ...this.ready.buttons, this.hud.pauseBtn, ...this.pausePanel.buttons, ...this.over.buttons,
      ...this.hangar.buttons, ...this.settings.buttons,
    ];
    const rects = buttons.map((b) => b.rect()).filter((r): r is NonNullable<typeof r> => r !== null);
    this.registry.set('ss:uiRects', rects);
    this.registry.set('ss:modal', ov !== 'none' || state === 'PAUSED' || state === 'GAME_OVER' || state === 'FAILING');
  }
}
