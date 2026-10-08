import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { STRINGS, fmt } from '../config/strings';
import type { Run } from '../game/Run';
import { Button, card, drawCard, icon, label, setText } from './components';

const DOT = 8;
const DOT_GAP = 4;
const TAG_MS = 900;
const TAG_RISE = 40;

/** Üst kısım: BEST kartı, skor kartı, gemi ilerlemesi, seri noktaları, duraklat ve uçan yazılar. */
export class Hud {
  readonly root: Phaser.GameObjects.Container;
  readonly pauseBtn: Button;
  private bestCard: Phaser.GameObjects.Graphics;
  private bestLabel: Phaser.GameObjects.Text;
  private bestValue: Phaser.GameObjects.Text;
  private scoreCard: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private shipText: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Graphics;
  private lastBestW = 0;
  private lastScoreW = 0;

  constructor(private scene: Phaser.Scene, onPause: () => void) {
    this.bestCard = card(scene, 100, 40);
    this.bestLabel = label(scene, STRINGS.best, 12, PALETTE.uiTextSoft, '600');
    this.bestValue = label(scene, '0', 17);
    this.scoreCard = card(scene, 84, 60);
    this.scoreText = label(scene, '0', 38);
    this.shipText = label(scene, '', 14, PALETTE.uiText, '600');
    this.dots = scene.add.graphics();
    this.pauseBtn = new Button(scene, 48, 48, [icon(scene, 'pause')], onPause);
    this.root = scene.add.container(0, 0, [
      this.bestCard, this.bestLabel, this.bestValue, this.scoreCard, this.scoreText, this.shipText, this.dots,
    ]);
  }

  show(v: boolean): void {
    this.root.setVisible(v);
    this.pauseBtn.setVisible(v);
  }

  update(W: number, run: Run, best: number, modeTag: string | null): void {
    const bestStr = modeTag ?? String(best);
    setText(this.bestLabel, modeTag ? '' : STRINGS.best);
    setText(this.bestValue, bestStr);
    const bw = Math.max(80, (modeTag ? 0 : this.bestLabel.width + 6) + this.bestValue.width + 24);
    if (bw !== this.lastBestW) {
      this.lastBestW = bw;
      drawCard(this.bestCard, bw, 40);
    }
    const left = 16 + bw / 2;
    this.bestCard.setPosition(left, 40);
    const inner = (modeTag ? 0 : this.bestLabel.width + 6) + this.bestValue.width;
    this.bestLabel.setPosition(left - inner / 2 + this.bestLabel.width / 2, 40);
    this.bestValue.setPosition(left + inner / 2 - this.bestValue.width / 2, 40);

    setText(this.scoreText, String(run.score));
    const sw = Math.max(84, this.scoreText.width + 32);
    if (sw !== this.lastScoreW) {
      this.lastScoreW = sw;
      drawCard(this.scoreCard, sw, 60);
    }
    this.scoreCard.setPosition(W / 2, 44);
    this.scoreText.setPosition(W / 2, 44);
    setText(this.shipText, fmt(STRINGS.shipProgress, { n: run.shipIndex + 1, k: Math.min(run.stacked, run.quota), q: run.quota }));
    this.shipText.setPosition(W / 2, 44 + 30 + 6 + 7);

    const total = 5;
    const filled = run.streak === 0 ? 0 : ((run.streak - 1) % total) + 1;
    const g = this.dots;
    g.clear();
    const x0 = W / 2 - (total * DOT + (total - 1) * DOT_GAP) / 2 + DOT / 2;
    for (let i = 0; i < total; i++) {
      const x = x0 + i * (DOT + DOT_GAP);
      const y = 44 + 30 + 6 + 14 + 12;
      if (i < filled) g.fillStyle(hex(PALETTE.uiRed), 1).fillCircle(x, y, DOT / 2);
      else g.fillStyle(hex(PALETTE.uiPaper), 1).fillCircle(x, y, DOT / 2).lineStyle(1.5, hex(PALETTE.uiTextSoft), 1).strokeCircle(x, y, DOT / 2 - 0.75);
    }
    this.pauseBtn.setPosition(W - 16 - 24, 16 + 24);
  }

  /** Kâğıt etiketli uçan yazı: 0,9 sn'de 40 px yükselip söner. */
  floatTag(x: number, y: number, big: string, small: string | null): void {
    const w = Math.max(70, (small ? small.length * 8 : 0) + 28);
    const h = small ? 54 : 40;
    const g = card(this.scene, w, h);
    const kids: Phaser.GameObjects.GameObject[] = [g, label(this.scene, big, 24, PALETTE.uiRed).setY(small ? -9 : 0)];
    if (small) kids.push(label(this.scene, small, 12, PALETTE.uiText, '600').setY(14));
    const c = this.scene.add.container(x, y, kids).setRotation(-0.1).setDepth(50).setScale(0.7);
    this.scene.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: c,
      y: y - TAG_RISE,
      alpha: 0,
      duration: TAG_MS,
      ease: 'Sine.easeOut',
      onComplete: () => c.destroy(),
    });
  }
}
