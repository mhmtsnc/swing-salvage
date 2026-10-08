import Phaser from 'phaser';
import { hex } from '../config/palette';
import { STRINGS } from '../config/strings';
import { Button, bigButton, card, icon, label } from './components';

export class PausePanel {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[];
  private dim: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, cb: { onResume: () => void; onHome: () => void }) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, hex('#24353A'), 0.35).setOrigin(0, 0).setInteractive();
    const resume = bigButton(scene, 240, 64, STRINGS.resume, 26, cb.onResume).setPosition(0, 10);
    const home = new Button(scene, 240, 52, [icon(scene, 'home').setPosition(-40, 0), label(scene, STRINGS.home, 16).setPosition(8, 0)], cb.onHome).setPosition(0, 86);
    this.buttons = [resume, home];
    this.panel = scene.add.container(0, 0, [card(scene, 300, 270), label(scene, STRINGS.paused, 36).setY(-90), resume.root, home.root]);
    this.root = scene.add.container(0, 0, [this.dim, this.panel]).setVisible(false);
  }

  show(v: boolean): void {
    this.root.setVisible(v);
    for (const b of this.buttons) b.setVisible(v);
  }

  layout(W: number, H: number): void {
    this.dim.setSize(W, H);
    this.panel.setPosition(W / 2, H / 2);
  }
}
