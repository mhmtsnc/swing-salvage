import Phaser from 'phaser';
import { PALETTE, hex, type PaintId } from '../config/palette';
import { STRINGS } from '../config/strings';
import { getItem } from '../core/storage';
import { paintRequirement } from '../core/unlocks';
import { COSMETICS, cosmeticById, type Rarity } from '../meta/cosmetics';
import { loadMeta, unlockedPaints, unlockedTrails } from '../meta/store';
import { Button, icon, label, setText } from './components';

const COLS = 3;
const ROWS = 3;
const PER_PAGE = COLS * ROWS;
const CARD_W = 108;
const CARD_H = 132;
const GAP = 10;
const RARITY_COLOR: Record<Rarity, string> = { common: '#8FA65A', rare: '#477779', epic: '#BF4630' };

export const TRAIL_NAMES: Record<string, string> = {
  none: 'NO TRAIL', sparks: 'SPARKS', bubbles: 'BUBBLES', smoke: 'SMOKE', leaves: 'LEAVES', confetti: 'CONFETTI', stars: 'STARS',
};

type Tab = 'paint' | 'trail';

interface CardView {
  btn: Button;
  bg: Phaser.GameObjects.Graphics;
  heli: Phaser.GameObjects.Image;
  trailIcon: Phaser.GameObjects.Graphics;
  lock: Phaser.GameObjects.Graphics;
  name: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Text;
  id: string;
}

/** HANGAR: koleksiyon (BOYA / İZ sekmeleri), sayfalı 3×3 ızgara, NEW rozeti ve kasa açma girişi. */
export class HangarScreen {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[] = [];
  private dim: Phaser.GameObjects.Rectangle;
  private views: CardView[] = [];
  private back: Button;
  private title: Phaser.GameObjects.Text;
  private tabPaint: Button;
  private tabTrail: Button;
  private tabPaintLabel: Phaser.GameObjects.Text;
  private tabTrailLabel: Phaser.GameObjects.Text;
  private prev: Button;
  private next: Button;
  private pageText: Phaser.GameObjects.Text;
  private crateBtn: Button;
  private crateLabel: Phaser.GameObjects.Text;
  private tab: Tab = 'paint';
  private page = 0;

  constructor(
    scene: Phaser.Scene,
    private cb: { onSelect: (kind: Tab, id: string) => void; onBack: () => void; onOpenCrates: () => void },
  ) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, hex(PALETTE.sky), 0.97).setOrigin(0, 0);
    this.title = label(scene, STRINGS.hangar, 34);
    this.back = new Button(scene, 120, 52, [icon(scene, 'back').setPosition(-30, 0), label(scene, STRINGS.back, 16).setPosition(10, 0)], cb.onBack);
    this.tabPaintLabel = label(scene, 'PAINT', 15);
    this.tabTrailLabel = label(scene, 'TRAIL', 15);
    this.tabPaint = new Button(scene, 120, 44, [this.tabPaintLabel], () => this.setTab('paint'));
    this.tabTrail = new Button(scene, 120, 44, [this.tabTrailLabel], () => this.setTab('trail'));
    this.prev = new Button(scene, 52, 40, [icon(scene, 'prev')], () => this.turn(-1));
    this.next = new Button(scene, 52, 40, [icon(scene, 'next')], () => this.turn(1));
    this.pageText = label(scene, '', 13, PALETTE.uiTextSoft, '700');
    this.crateLabel = label(scene, '', 15, PALETTE.uiPaper, '700');
    this.crateBtn = new Button(scene, 250, 52, [icon(scene, 'crate', PALETTE.uiPaper).setPosition(-96, 0), this.crateLabel.setPosition(10, 0)], cb.onOpenCrates, {
      fill: PALETTE.uiRed,
      base: PALETTE.uiRedBase,
    });
    this.buttons.push(this.back, this.tabPaint, this.tabTrail, this.prev, this.next, this.crateBtn);

    const kids: Phaser.GameObjects.GameObject[] = [
      this.dim, this.title, this.tabPaint.root, this.tabTrail.root, this.prev.root, this.next.root, this.pageText,
    ];
    for (let i = 0; i < PER_PAGE; i++) {
      const bg = scene.add.graphics();
      const heli = scene.add.image(0, -22, 'heli_rescue').setScale(0.46);
      const trailIcon = scene.add.graphics();
      const lock = icon(scene, 'lock', PALETTE.uiTextSoft, 20).setPosition(0, -22);
      const name = label(scene, '', 12, PALETTE.uiText, '700').setY(28);
      const status = label(scene, '', 11, PALETTE.uiTextSoft, '600').setY(46);
      const badge = label(scene, 'NEW', 11, PALETTE.uiPaper, '700').setPosition(CARD_W / 2 - 22, -CARD_H / 2 + 14).setVisible(false);
      const view: CardView = { btn: null as unknown as Button, bg, heli, trailIcon, lock, name, status, badge, id: '' };
      view.btn = new Button(scene, CARD_W, CARD_H, [bg, heli, trailIcon, lock, name, status, badge], () => this.tap(view));
      this.views.push(view);
      this.buttons.push(view.btn);
      kids.push(view.btn.root);
    }
    kids.push(this.crateBtn.root, this.back.root);
    this.root = scene.add.container(0, 0, kids).setVisible(false);
  }

  private setTab(t: Tab): void {
    this.tab = t;
    this.page = 0;
    this.refresh();
  }

  private items(): string[] {
    return COSMETICS.filter((c) => c.kind === this.tab).map((c) => c.id);
  }

  private turn(d: number): void {
    const pages = Math.max(1, Math.ceil(this.items().length / PER_PAGE));
    this.page = (this.page + d + pages) % pages;
    this.refresh();
  }

  private tap(v: CardView): void {
    if (v.btn.enabled && v.id) this.cb.onSelect(this.tab, v.id);
  }

  /** Kart durumlarını yeniler (kilit ilerlemesi, seçim, NEW rozeti). */
  refresh(): void {
    const meta = loadMeta();
    const stats = getItem('ss.stats');
    const daily = getItem('ss.daily');
    const open: string[] = this.tab === 'paint' ? unlockedPaints() : unlockedTrails();
    const selected = this.tab === 'paint' ? (getItem('ss.paint') as string) : meta.trail;
    const ids = this.items();
    const pages = Math.max(1, Math.ceil(ids.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    const slice = ids.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE);

    this.tabPaint.root.setAlpha(this.tab === 'paint' ? 1 : 0.55);
    this.tabTrail.root.setAlpha(this.tab === 'trail' ? 1 : 0.55);
    setText(this.pageText, `${this.page + 1}/${pages}  ·  ${open.filter((id) => ids.includes(id)).length}/${ids.length}`);
    setText(this.crateLabel, meta.crates > 0 ? `OPEN CRATE  (${meta.crates})` : 'NO CRATES YET');
    this.crateBtn.enabled = meta.crates > 0;
    this.crateBtn.root.setAlpha(meta.crates > 0 ? 1 : 0.55);

    this.views.forEach((v, i) => {
      const id = slice[i];
      const on = !!id;
      v.btn.setVisible(on && this.root.visible);
      v.btn.root.setVisible(on);
      v.id = id ?? '';
      if (!id) return;
      const c = cosmeticById(id)!;
      const isOpen = open.includes(id);
      const sel = isOpen && id === selected;
      v.bg.clear();
      if (sel) v.bg.lineStyle(4, hex(PALETTE.uiTeal), 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
      v.bg.fillStyle(hex(RARITY_COLOR[c.rarity]), 1).fillRoundedRect(-CARD_W / 2 + 8, -CARD_H / 2 + 8, 8, 8, 4);
      v.btn.enabled = isOpen;
      v.lock.setVisible(!isOpen);
      v.badge.setVisible(isOpen && meta.fresh.includes(id));
      const isPaint = this.tab === 'paint';
      v.heli.setVisible(isPaint);
      v.trailIcon.setVisible(!isPaint);
      if (isPaint) {
        v.heli.setTexture(`heli_${id}`).setAlpha(isOpen ? 1 : 0.35);
        setText(v.name, STRINGS.paints[id as PaintId] ?? id.toUpperCase());
      } else {
        this.drawTrailIcon(v.trailIcon, id, isOpen);
        setText(v.name, TRAIL_NAMES[id] ?? id.toUpperCase());
      }
      if (isOpen) {
        setText(v.status, sel ? STRINGS.selected : STRINGS.tapToUse);
        v.status.setColor(sel ? PALETTE.uiTeal : PALETTE.uiTextSoft);
      } else if (c.source === 'cond' && isPaint) {
        const r = paintRequirement(id as PaintId, stats, daily);
        setText(v.status, r ? `${r.text} ${r.have}/${r.need}` : 'LOCKED');
        v.status.setColor(PALETTE.uiTextSoft);
      } else {
        setText(v.status, 'FOUND IN CRATES');
        v.status.setColor(PALETTE.uiTextSoft);
      }
    });
  }

  private drawTrailIcon(g: Phaser.GameObjects.Graphics, id: string, open: boolean): void {
    g.clear();
    const a = open ? 1 : 0.35;
    const colors: Record<string, number> = { sparks: 0xf3c44e, bubbles: 0xd6ebe8, smoke: 0x6d7c80, leaves: 0x8fa65a, confetti: 0xd8573e, stars: 0xffffff, none: 0xb0b8b6 };
    const col = colors[id] ?? 0xb0b8b6;
    g.fillStyle(0x34474b, a).fillRoundedRect(-22, -30, 44, 16, 8);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(col, a * (1 - i * 0.16)).fillCircle(-4 - i * 11, -22 + (i % 2) * 6 - 3, 5 - i * 0.6);
    }
    if (id === 'none') g.lineStyle(3, 0xbf4630, a).lineBetween(-20, -10, 20, 10);
  }

  show(v: boolean): void {
    this.root.setVisible(v);
    for (const b of this.buttons) b.setVisible(v);
    if (v) {
      this.page = 0;
      this.refresh();
    }
  }

  layout(W: number, H: number): void {
    this.dim.setSize(W, H);
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const gridH = ROWS * CARD_H + (ROWS - 1) * GAP;
    const top = H / 2 - gridH / 2 + 30;
    this.title.setPosition(W / 2, top - 112);
    this.tabPaint.setPosition(W / 2 - 66, top - 62);
    this.tabTrail.setPosition(W / 2 + 66, top - 62);
    this.views.forEach((v, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      v.btn.setPosition(W / 2 - gridW / 2 + CARD_W / 2 + col * (CARD_W + GAP), top + CARD_H / 2 + row * (CARD_H + GAP));
    });
    this.pageText.setPosition(W / 2, top + gridH + 26);
    this.prev.setPosition(W / 2 - gridW / 2 + 26, top + gridH + 26);
    this.next.setPosition(W / 2 + gridW / 2 - 26, top + gridH + 26);
    this.crateBtn.setPosition(W / 2, top + gridH + 80);
    this.back.setPosition(W / 2, top + gridH + 142);
  }
}
