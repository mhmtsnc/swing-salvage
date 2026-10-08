import Phaser from 'phaser';
import { getTuning, type Tuning } from '../config/tuning';
import { PALETTE, hex } from '../config/palette';
import { STRINGS, fmt } from '../config/strings';
import type { GameScene } from './GameScene';

const FONT = 'Fredoka';
const PANEL_W = 360;
const PANEL_H = 330;
const PANEL_SLIDE_MS = 250;

const FAIL_TEXT = {
  splash: [STRINGS.splashTitle, STRINGS.splashSub],
  crash: [STRINGS.crashTitle, STRINGS.crashSub],
  topple: [STRINGS.toppleTitle, STRINGS.toppleSub],
} as const;

/** Geçici arayüz (son tasarım F5'te). Oyun durumunu GameScene.run'dan okur. */
export class UIScene extends Phaser.Scene {
  private T!: Tuning;
  private game_!: GameScene;
  private scoreText!: Phaser.GameObjects.Text;
  private shipText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;
  private sub!: Phaser.GameObjects.Text;
  private result!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private againBtn!: Phaser.GameObjects.Rectangle;
  private panelOpen = false;
  private unlockAt = 0;

  constructor() {
    super('UIScene');
  }

  private txt(size: number, color: string, weight = '700'): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, '', { fontFamily: FONT, fontStyle: weight, fontSize: `${size}px`, color })
      .setOrigin(0.5);
  }

  create(): void {
    this.T = getTuning();
    this.game_ = this.scene.get('GameScene') as GameScene;
    this.scoreText = this.txt(72, PALETTE.uiText);
    this.shipText = this.txt(22, PALETTE.uiTextSoft, '600');
    this.hint = this.txt(30, PALETTE.uiText, '600').setText(STRINGS.dragToStart);
    this.banner = this.txt(44, PALETTE.uiRed).setAlpha(0);

    const bg = this.add.rectangle(0, 0, PANEL_W, PANEL_H, hex(PALETTE.uiPaper)).setStrokeStyle(4, hex(PALETTE.uiTeal));
    this.title = this.txt(52, PALETTE.uiRed).setPosition(0, -PANEL_H / 2 + 52);
    this.sub = this.txt(22, PALETTE.uiTextSoft, '500').setPosition(0, -PANEL_H / 2 + 92);
    this.result = this.txt(64, PALETTE.uiText).setPosition(0, -20);
    this.bestText = this.txt(24, PALETTE.uiTextSoft, '600').setPosition(0, 28);
    this.againBtn = this.add.rectangle(0, PANEL_H / 2 - 62, 240, 70, hex(PALETTE.uiRed)).setStrokeStyle(4, hex(PALETTE.uiRedBase));
    const againLabel = this.txt(36, PALETTE.uiPaper).setPosition(0, PANEL_H / 2 - 62).setText(STRINGS.again);
    this.panel = this.add
      .container(0, 0, [bg, this.title, this.sub, this.result, this.bestText, this.againBtn, againLabel])
      .setVisible(false);

    this.againBtn.setInteractive({ useHandCursor: true });
    this.againBtn.on('pointerdown', () => {
      if (this.time.now >= this.unlockAt) this.game.events.emit('ss:again');
    });

    this.game.events.on('ss:banner', this.showBanner, this);
    this.game.events.on('ss:gameover', this.openPanel, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('ss:banner', this.showBanner, this);
      this.game.events.off('ss:gameover', this.openPanel, this);
    });
  }

  private showBanner(b: { text: string; kind: string }): void {
    this.tweens.killTweensOf(this.banner);
    this.banner
      .setText(b.text)
      .setColor(b.kind === 'ship' ? PALETTE.uiTeal : PALETTE.uiRed)
      .setPosition(this.scale.width / 2, this.scale.height * 0.3)
      .setAlpha(1)
      .setScale(0.6);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      y: this.banner.y - 30,
      delay: this.T.ship.swapBannerTime * 1000,
      duration: 300,
    });
  }

  private openPanel(): void {
    const run = this.game_.run;
    const [title, sub] = FAIL_TEXT[run.failKind ?? 'splash'];
    this.title.setText(title);
    this.sub.setText(sub);
    this.result.setText(String(run.score));
    this.bestText.setText(this.game_.newBest ? STRINGS.newBest : `${STRINGS.best} ${this.game_.best}`);
    this.unlockAt = this.time.now + this.T.fx.gameOverInputLock * 1000;
    this.panelOpen = true;
    const cy = this.scale.height * 0.47;
    this.panel.setVisible(true).setPosition(this.scale.width / 2, this.scale.height + PANEL_H);
    this.tweens.add({ targets: this.panel, y: cy, duration: PANEL_SLIDE_MS, ease: 'Cubic.easeOut' });
  }

  update(): void {
    const { width: W } = this.scale;
    const run = this.game_?.run;
    if (!run) return;
    this.scoreText.setText(String(run.score)).setPosition(W / 2, 76);
    this.shipText
      .setText(fmt(STRINGS.shipProgress, { n: run.shipIndex + 1, k: Math.min(run.stacked, run.quota), q: run.quota }))
      .setPosition(W / 2, 136);
    this.hint.setVisible(run.state === 'READY').setPosition(W / 2, this.scale.height * 0.4);

    if (this.panelOpen && run.state !== 'GAME_OVER') {
      this.panelOpen = false;
      this.tweens.killTweensOf(this.panel);
      this.panel.setVisible(false);
    }
    if (this.panelOpen) this.panel.x = W / 2;
  }
}
