import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { STRINGS } from '../config/strings';
import { getItem, setItem } from '../core/storage';
import { card, label } from './components';
import { drawGhostHand } from './ReadyScreen';

type Step = 'drag' | 'hook' | 'drop';

/** §11.6: 3 ipucu, her biri bir kez (`ss.onboard`). */
export class Onboarding {
  private handBox: Phaser.GameObjects.Container;
  private dragText: Phaser.GameObjects.Container;
  private arrow: Phaser.GameObjects.Container;
  private frames: Phaser.GameObjects.Graphics;
  private dropText: Phaser.GameObjects.Container;
  private dragged = 0;

  constructor(private scene: Phaser.Scene) {
    const hand = scene.add.graphics();
    drawGhostHand(hand);
    this.handBox = scene.add.container(0, 0, [hand]);
    this.dragText = this.tag(STRINGS.dragToFly);
    const arrowInner = scene.add.container(0, 0, [this.makeArrow(), label(scene, STRINGS.hookIt, 18, PALETTE.uiRed).setY(-34)]);
    this.arrow = scene.add.container(0, 0, [arrowInner]);
    this.frames = scene.add.graphics();
    this.dropText = this.tag(STRINGS.setGently);
    scene.tweens.add({ targets: hand, x: 90, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: arrowInner, y: 10, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.frames, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
    this.hideAll();
  }

  private tag(text: string): Phaser.GameObjects.Container {
    const t = label(this.scene, text, 16, PALETTE.uiText, '600');
    const w = t.width + 32;
    return this.scene.add.container(0, 0, [card(this.scene, w, 40), t]);
  }

  private makeArrow(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(hex(PALETTE.shadow), 0.2).fillTriangle(-12, -4, 12, -4, 0, 16);
    g.fillStyle(hex(PALETTE.uiPaper), 1).fillTriangle(-12, -8, 12, -8, 0, 12);
    g.lineStyle(2, hex(PALETTE.uiRed), 1).strokeTriangle(-12, -8, 12, -8, 0, 12);
    return g;
  }

  private done(step: Step): boolean {
    return getItem('ss.onboard')[step];
  }

  private mark(step: Step): void {
    setItem('ss.onboard', { ...getItem('ss.onboard'), [step]: true });
  }

  /** Koşu başlayınca ilk sürüklemeyi say; yeterli hareketten sonra drag ipucu kapanır. */
  onDragMove(): void {
    if (this.done('drag')) return;
    if (++this.dragged > 12) this.mark('drag');
  }

  onHooked(): void {
    if (!this.done('hook')) this.mark('hook');
  }

  onPlaced(): void {
    if (!this.done('drop')) this.mark('drop');
  }

  reset(): void {
    setItem('ss.onboard', { drag: false, hook: false, drop: false });
    this.dragged = 0;
  }

  hideAll(): void {
    for (const o of [this.handBox, this.dragText, this.arrow, this.frames, this.dropText]) o.setVisible(false);
  }

  /** Her kare: duruma göre doğru ipucunu konumlandırır. */
  update(playing: boolean, heli: { x: number; y: number }, cargoTop: { x: number; y: number } | null, slots: { x: number; y: number }[], carrying: boolean): void {
    this.hideAll();
    if (!playing) return;
    if (!this.done('drag')) {
      this.handBox.setVisible(true).setPosition(heli.x - 45, heli.y + 110);
      this.dragText.setVisible(true).setPosition(heli.x, heli.y + 190);
      return;
    }
    if (!this.done('hook') && cargoTop) {
      this.arrow.setVisible(true).setPosition(cargoTop.x, cargoTop.y - 40);
      return;
    }
    if (!this.done('drop') && carrying) {
      this.frames.setVisible(true).clear();
      this.frames.lineStyle(3, hex(PALETTE.uiRed), 1);
      for (const s of slots) this.frames.strokeRect(s.x - 40, s.y - 60, 80, 62);
      this.dropText.setVisible(true).setPosition(slots[0] ? slots[0].x + 50 : 160, (slots[0]?.y ?? 640) - 110);
    }
  }
}
