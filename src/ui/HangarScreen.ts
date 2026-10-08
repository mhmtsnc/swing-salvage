import Phaser from 'phaser';
import { PAINTS, PALETTE, hex, type PaintId } from '../config/palette';
import { STRINGS } from '../config/strings';
import { getItem } from '../core/storage';
import { paintRequirement } from '../core/unlocks';
import { Button, icon, label } from './components';

const COLS = 2;
const CARD_W = 150;
const CARD_H = 168;
const GAP = 14;

/** §11.5 HANGAR: 2×3 boya ızgarası. */
export class HangarScreen {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[] = [];
  private dim: Phaser.GameObjects.Rectangle;
  private cards: { id: PaintId; btn: Button; bg: Phaser.GameObjects.Graphics; status: Phaser.GameObjects.Text; req: Phaser.GameObjects.Text; lock: Phaser.GameObjects.Graphics; heli: Phaser.GameObjects.Image }[] = [];
  private back: Button;
  private title: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private cb: { onSelect: (id: PaintId) => void; onBack: () => void }) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, hex(PALETTE.sky), 0.96).setOrigin(0, 0).setInteractive();
    this.title = label(scene, STRINGS.hangar, 36);
    this.back = new Button(scene, 120, 52, [icon(scene, 'back').setPosition(-30, 0), label(scene, STRINGS.back, 16).setPosition(10, 0)], cb.onBack);
    this.buttons.push(this.back);
    const kids: Phaser.GameObjects.GameObject[] = [this.dim, this.title, this.back.root];
    for (const p of PAINTS) {
      const bg = scene.add.graphics();
      const heli = scene.add.image(0, -34, `heli_${p.id}`).setScale(0.62);
      const name = label(scene, STRINGS.paints[p.id], 14, PALETTE.uiText, '600').setY(30);
      const status = label(scene, '', 12, PALETTE.uiTextSoft, '600').setY(52);
      const req = label(scene, '', 12, PALETTE.uiTextSoft, '500').setY(68);
      const lock = icon(scene, 'lock', PALETTE.uiTextSoft, 22).setPosition(0, -34);
      const btn = new Button(scene, CARD_W, CARD_H, [bg, heli, lock, name, status, req], () => this.tap(p.id));
      // Button kendi kart zeminini çizer; bizimki üstüne gelir ve duruma göre boyanır.
      this.cards.push({ id: p.id, btn, bg, status, req, lock, heli });
      this.buttons.push(btn);
      kids.push(btn.root);
    }
    this.root = scene.add.container(0, 0, kids).setVisible(false);
  }

  private tap(id: PaintId): void {
    const c = this.cards.find((x) => x.id === id);
    if (c && c.btn.enabled) this.cb.onSelect(id);
  }

  /** Kart durumlarını yeniler (kilit ilerlemesi, seçim). */
  refresh(unlocked: readonly PaintId[], selected: PaintId): void {
    const stats = getItem('ss.stats');
    const daily = getItem('ss.daily');
    for (const c of this.cards) {
      const open = unlocked.includes(c.id);
      const sel = open && c.id === selected;
      c.bg.clear();
      if (sel) c.bg.lineStyle(4, hex(PALETTE.uiTeal), 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
      c.heli.setAlpha(open ? 1 : 0.35);
      c.lock.setVisible(!open);
      c.btn.enabled = open;
      if (open) {
        c.status.setText(sel ? STRINGS.selected : STRINGS.tapToUse).setColor(sel ? PALETTE.uiTeal : PALETTE.uiTextSoft);
        c.req.setText('');
      } else {
        const r = paintRequirement(c.id, stats, daily);
        c.status.setText(r ? r.text : '').setColor(PALETTE.uiTextSoft);
        c.req.setText(r ? `${r.have}/${r.need}` : '');
      }
    }
  }

  show(v: boolean): void {
    this.root.setVisible(v);
    for (const b of this.buttons) b.setVisible(v);
  }

  layout(W: number, H: number): void {
    this.dim.setSize(W, H);
    const rows = Math.ceil(PAINTS.length / COLS);
    const totalH = rows * CARD_H + (rows - 1) * GAP;
    const top = H / 2 - totalH / 2 + 20;
    this.title.setPosition(W / 2, top - 70);
    this.cards.forEach((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      c.btn.setPosition(W / 2 + (col - 0.5) * (CARD_W + GAP), top + CARD_H / 2 + row * (CARD_H + GAP));
    });
    this.back.setPosition(W / 2, top + totalH + 56);
  }
}
