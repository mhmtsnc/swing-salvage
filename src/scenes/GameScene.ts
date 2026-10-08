import Phaser from 'phaser';
import { getTuning } from '../config/tuning';
import { PALETTE, hex } from '../config/palette';
import { FixedStepper, STEP_MS } from '../core/time';

export class GameScene extends Phaser.Scene {
  private stepper = new FixedStepper();
  private sea?: Phaser.GameObjects.Rectangle;
  private label?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.matter.world.autoUpdate = false;
    this.cameras.main.setBackgroundColor(PALETTE.sky);
    this.sea = this.add.rectangle(0, 0, 10, 10, hex(PALETTE.seaFront)).setOrigin(0, 0);
    this.label = this.add
      .text(0, 0, 'F1 OK', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '48px', color: PALETTE.uiText })
      .setOrigin(0.5);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.layout();
  }

  private layout(): void {
    const { width: W, height: H } = this.scale;
    const seaY = H - getTuning().world.seaFromBottom;
    this.sea?.setPosition(0, seaY).setSize(W, H - seaY);
    this.label?.setPosition(W / 2, H / 2);
    this.cameras.main.setSize(W, H);
  }

  update(_time: number, delta: number): void {
    const steps = this.stepper.advance(delta);
    for (let i = 0; i < steps; i++) this.matter.step(STEP_MS);
  }
}
