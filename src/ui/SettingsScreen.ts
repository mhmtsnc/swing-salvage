import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { PALETTE, hex } from '../config/palette';
import { STRINGS } from '../config/strings';
import { VERSION } from '../config/app';
import { getItem, setItem } from '../core/storage';
import { Button, Toggle, card, icon, label } from './components';

const CARD_W = 340;
const ROW_H = 60;
const VERSION_TAPS = 7;
const VERSION_TAP_WINDOW_MS = 2500;

/** §11.5 SETTINGS. */
export class SettingsScreen {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[] = [];
  private dim: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private sound: Toggle;
  private haptics: Toggle;
  private shake: Toggle;
  private privacyOpts: Button;
  private policy: Button;
  private howTo: Button;
  private back: Button;
  private version: Phaser.GameObjects.Text;
  private taps: number[] = [];
  private height = 0;
  private native = Capacitor.isNativePlatform();

  constructor(
    private scene: Phaser.Scene,
    cb: { onBack: () => void; onHowTo: () => void; onPrivacyOptions: () => void; onPolicy: () => void; onTune: () => void },
  ) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, hex(PALETTE.sky), 0.96).setOrigin(0, 0);
    const s = getItem('ss.settings');
    this.sound = new Toggle(scene, s.sound, (v) => this.save({ sound: v }));
    this.haptics = new Toggle(scene, s.haptics, (v) => this.save({ haptics: v }));
    this.shake = new Toggle(scene, getItem('ss.shake'), (v) => {
      setItem('ss.shake', v);
      scene.game.events.emit('ss:settings');
    });
    this.privacyOpts = this.row(STRINGS.privacy, cb.onPrivacyOptions);
    this.howTo = this.row(STRINGS.howToPlay, cb.onHowTo);
    this.policy = this.row(STRINGS.privacyPolicy, cb.onPolicy);
    this.back = new Button(scene, 120, 52, [icon(scene, 'back').setPosition(-30, 0), label(scene, STRINGS.back, 16).setPosition(10, 0)], cb.onBack);
    this.version = label(scene, `v${VERSION}`, 14, PALETTE.uiTextSoft, '500');
    this.version.setInteractive({ useHandCursor: false }).on('pointerup', () => {
      const now = scene.time.now;
      this.taps = this.taps.filter((t) => now - t < VERSION_TAP_WINDOW_MS);
      this.taps.push(now);
      if (this.taps.length >= VERSION_TAPS) {
        this.taps = [];
        cb.onTune();
      }
    });
    const rowsKids: Phaser.GameObjects.GameObject[] = [
      label(scene, STRINGS.sound, 20, PALETTE.uiText, '600').setOrigin(0, 0.5),
      label(scene, STRINGS.haptics, 20, PALETTE.uiText, '600').setOrigin(0, 0.5),
      label(scene, 'Screen shake', 20, PALETTE.uiText, '600').setOrigin(0, 0.5),
    ];
    this.panel = scene.add.container(0, 0, [
      card(scene, CARD_W, 10),
      ...rowsKids,
      this.sound.root, this.haptics.root, this.shake.root,
      this.privacyOpts.root, this.howTo.root, this.policy.root, this.back.root, this.version,
    ]);
    this.buttons.push(this.privacyOpts, this.howTo, this.policy, this.back);
    this.root = scene.add.container(0, 0, [this.dim, label(scene, STRINGS.settings, 36).setName('title'), this.panel]).setVisible(false);
    this.layoutRows();
  }

  private row(text: string, onTap: () => void): Button {
    return new Button(this.scene, CARD_W - 32, 52, [label(this.scene, text, 17, PALETTE.uiText, '600')], onTap, { fill: '#EFE9DB' });
  }

  private save(patch: Partial<{ sound: boolean; haptics: boolean }>): void {
    setItem('ss.settings', { ...getItem('ss.settings'), ...patch });
    this.scene.game.events.emit('ss:settings');
  }

  refresh(): void {
    const s = getItem('ss.settings');
    this.sound.set(s.sound);
    this.haptics.set(s.haptics);
    this.shake.set(getItem('ss.shake'));
  }

  private layoutRows(): void {
    const rows = 3 + (this.native ? 1 : 0) + 2;
    this.height = rows * ROW_H + 130;
    const card0 = this.panel.list[0] as Phaser.GameObjects.Graphics;
    card0.clear();
    card0.fillStyle(hex(PALETTE.shadow), 0.1).fillRoundedRect(-CARD_W / 2 - 1, -this.height / 2 + 7, CARD_W + 2, this.height, 14);
    card0.fillStyle(hex(PALETTE.shadow), 0.18).fillRoundedRect(-CARD_W / 2, -this.height / 2 + 3, CARD_W, this.height, 14);
    card0.fillStyle(hex(PALETTE.uiPaper), 1).fillRoundedRect(-CARD_W / 2, -this.height / 2, CARD_W, this.height, 14);
    let y = -this.height / 2 + 14 + ROW_H / 2;
    const labels = this.panel.list.filter((o): o is Phaser.GameObjects.Text => o instanceof Phaser.GameObjects.Text && o !== this.version);
    labels[0].setPosition(-CARD_W / 2 + 24, y);
    this.sound.root.setPosition(CARD_W / 2 - 52, y);
    y += ROW_H;
    labels[1].setPosition(-CARD_W / 2 + 24, y);
    this.haptics.root.setPosition(CARD_W / 2 - 52, y);
    y += ROW_H;
    labels[2].setPosition(-CARD_W / 2 + 24, y);
    this.shake.root.setPosition(CARD_W / 2 - 52, y);
    y += ROW_H;
    this.privacyOpts.root.setVisible(this.native);
    if (this.native) {
      this.privacyOpts.setPosition(0, y);
      y += ROW_H;
    }
    this.howTo.setPosition(0, y);
    y += ROW_H;
    this.policy.setPosition(0, y);
    this.back.setPosition(0, this.height / 2 + 50);
    this.version.setPosition(CARD_W / 2 - 40, this.height / 2 - 18);
  }

  show(v: boolean): void {
    this.root.setVisible(v);
    for (const b of this.buttons) b.setVisible(v && (b !== this.privacyOpts || this.native));
    if (v) this.refresh();
  }

  layout(W: number, H: number): void {
    this.dim.setSize(W, H);
    this.panel.setPosition(W / 2, H / 2);
    (this.root.getByName('title') as Phaser.GameObjects.Text).setPosition(W / 2, H / 2 - this.height / 2 - 50);
  }
}
