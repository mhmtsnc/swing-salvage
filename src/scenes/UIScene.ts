import Phaser from 'phaser';
import { getTuning, type Tuning } from '../config/tuning';
import type { PaintId } from '../config/palette';
import { PRIVACY_URL } from '../config/app';
import { STRINGS, fmt } from '../config/strings';
import { getItem, setItem } from '../core/storage';
import { evaluateUnlocks } from '../core/unlocks';
import type { GameScene } from './GameScene';
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

    // Sıra: arka → ön
    for (const root of [this.ready.root, this.hud.root, this.pausePanel.root, this.over.root, this.hangar.root, this.settings.root]) {
      this.children.bringToTop(root);
    }

    const on = (e: string, fn: (...a: never[]) => void) => {
      ev.on(e, fn, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => ev.off(e, fn, this));
    };
    on('ss:placed', ((p: { x: number; y: number; gained: number; perfect: boolean; steady: boolean }) => {
      this.onboarding.onPlaced();
      const small = p.steady ? STRINGS.steady : p.perfect ? STRINGS.perfect : null;
      this.hud.floatTag(p.x, p.y - 50, `+${p.gained}`, small);
    }) as never);
    on('ss:shipFull', ((p: { bonus: number }) => {
      this.hud.floatTag(this.scale.width / 2, this.scale.height * 0.32, `+${p.bonus}`, STRINGS.shipFull);
    }) as never);
    on('ss:hooked', (() => this.onboarding.onHooked()) as never);
    on('ss:dragMove', (() => this.onboarding.onDragMove()) as never);
    on('ss:gameover', (() => this.openPanel()) as never);
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
    this.over.hide();
    this.game.events.emit('ss:again');
  }

  private homeTapped(): void {
    if (!this.over.isOpen || !this.over.unlocked) return;
    this.over.hide();
    this.game.events.emit('ss:home');
  }

  private medalFor(score: number): GameOverData['medal'] {
    const m = this.T.medals;
    if (score >= m.platinum) return 'platinum';
    if (score >= m.gold) return 'gold';
    if (score >= m.silver) return 'silver';
    if (score >= m.bronze) return 'bronze';
    return null;
  }

  private openPanel(): void {
    const run = this.gs.run;
    const data: GameOverData = {
      kind: run.failKind ?? 'splash',
      score: run.score,
      best: this.gs.best,
      newBest: this.gs.newBest,
      medal: this.medalFor(run.score),
      message: fmt(STRINGS.delivered, { n: run.delivered }),
      canSecondChance: false,
      daily: null,
      playNormal: false,
    };
    this.over.show(data, this.scale.width, this.scale.height, this.T.fx.gameOverInputLock);
  }

  // ───────── çerçeve döngüsü ─────────

  update(): void {
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
    const showHud = ov === 'none' && (state === 'PLAYING' || state === 'SWAPPING' || state === 'PAUSED' || state === 'FAILING' || state === 'GAME_OVER');
    this.ready.show(showReady);
    this.hud.show(showHud);
    this.pausePanel.show(ov === 'none' && state === 'PAUSED');
    this.hangar.show(ov === 'hangar');
    this.settings.show(ov === 'settings');
    if (state !== 'GAME_OVER' && this.over.isOpen) this.over.hide();

    this.ready.update(W, H, this.gs.best);
    this.hud.update(W, run, this.gs.best, null);
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
