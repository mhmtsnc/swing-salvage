import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { STRINGS, fmt } from '../config/strings';
import { Button, card, iconButton, label, setText } from './components';
import { MissionsCard } from './MissionsCard';
import type { MetaState } from '../core/storage';

const LOGO_Y = 150;
const BTN_W = 88;
const BTN_H = 76;
const BTN_GAP = 16;
const BOTTOM_OFFSET = 120;

export function drawGhostHand(g: Phaser.GameObjects.Graphics): void {
  g.clear();
  g.fillStyle(hex(PALETTE.shadow), 0.2).fillCircle(0, 6, 17);
  g.fillStyle(0xffffff, 0.92).fillCircle(0, 0, 16);
  g.fillStyle(0xffffff, 0.92).fillRoundedRect(-6, -34, 12, 30, 6);
  g.lineStyle(2, hex(PALETTE.ink), 0.35).strokeCircle(0, 0, 16);
}

/** §11.1 başlık ekranı. Butonların dışında sürükleme koşuyu hemen başlatır (GameScene). */
export class ReadyScreen {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[] = [];
  private logo: Phaser.GameObjects.Container;
  private bestText: Phaser.GameObjects.Text;
  private hand: Phaser.GameObjects.Graphics;
  private hint: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Container;
  private daily: Button;
  private dailySub = '';
  private dailyOn = false;
  private dailyBtns: Button[];
  private missions: MissionsCard;

  constructor(scene: Phaser.Scene, cb: { onDaily: () => void; onHangar: () => void; onSettings: () => void; onStats: () => void }) {
    const logoCard = card(scene, 340, 104);
    const title = label(scene, STRINGS.title, 40).setY(-14);
    this.bestText = label(scene, '', 16, PALETTE.uiTextSoft, '600').setY(26);
    this.logo = scene.add.container(0, LOGO_Y, [logoCard, title, this.bestText]).setRotation((-2 * Math.PI) / 180);

    this.hand = scene.add.graphics();
    drawGhostHand(this.hand);
    this.hint = label(scene, STRINGS.dragToStart, 18, PALETTE.uiText, '500');
    scene.tweens.add({ targets: this.hand, x: 70, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.daily = iconButton(scene, 'calendar', STRINGS.daily, BTN_W, BTN_H, cb.onDaily, '');
    const hangar = iconButton(scene, 'heli', STRINGS.hangar, BTN_W, BTN_H, cb.onHangar);
    const stats = iconButton(scene, 'trophy', 'STATS', BTN_W, BTN_H, cb.onStats);
    const settings = iconButton(scene, 'gear', STRINGS.settings, BTN_W, BTN_H, cb.onSettings);
    this.dailyBtns = [this.daily, hangar, stats, settings];
    this.buttons.push(hangar, stats, settings, this.daily);
    this.bar = scene.add.container(0, 0, [this.daily.root, hangar.root, stats.root, settings.root]);
    this.missions = new MissionsCard(scene);
    this.root = scene.add.container(0, 0, [this.logo, this.hand, this.hint, this.missions.root, this.bar]);
  }

  /** Daily butonu: sayı #N ve kalan deneme; kapalıysa gizlenir. */
  setDaily(on: boolean, n = 0, left = 0): void {
    this.dailyOn = on;
    this.daily.enabled = left > 0;
    this.daily.root.setAlpha(left > 0 ? 1 : 0.5);
    this.dailySub = fmt(STRINGS.dailyBtn, { n, k: left });
    if (this.daily.sub) setText(this.daily.sub, this.dailySub);
  }

  show(v: boolean): void {
    this.root.setVisible(v);
    for (const b of this.buttons) b.setVisible(v && (b !== this.daily || this.dailyOn));
    if (v) this.daily.root.setVisible(this.dailyOn);
  }

  update(W: number, H: number, best: number, tag: string | null, meta: MetaState): void {
    this.logo.setX(W / 2);
    setText(this.bestText, tag ?? `${STRINGS.best} ${best}`);
    const compact = H < 840;
    const cardH = this.missions.height(compact);
    const cardY = H - BOTTOM_OFFSET - BTN_H / 2 - 14 - cardH / 2;
    this.missions.update(meta, compact);
    this.missions.root.setPosition(W / 2, cardY);
    // el ve ipucu: logo ile görev kartı arasının ortası
    const midY = (LOGO_Y + 70 + (cardY - cardH / 2)) / 2;
    this.hand.setPosition(W / 2 - 35, midY);
    this.hint.setPosition(W / 2, midY + 56);
    const list = this.dailyBtns.filter((b) => b !== this.daily || this.dailyOn);
    const total = list.length * BTN_W + (list.length - 1) * BTN_GAP;
    list.forEach((b, i) => b.setPosition(W / 2 - total / 2 + BTN_W / 2 + i * (BTN_W + BTN_GAP), H - BOTTOM_OFFSET));
    this.daily.root.setVisible(this.dailyOn && this.root.visible);
  }
}
