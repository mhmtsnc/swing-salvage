import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';

export const FONT = 'Fredoka';
export const MIN_TAP = 48;
const CARD_RADIUS = 14;

export type IconKind = 'play' | 'pause' | 'calendar' | 'heli' | 'gear' | 'share' | 'home' | 'lock' | 'chevrons' | 'back' | 'check';

export function label(
  scene: Phaser.Scene,
  text: string,
  size: number,
  color: string = PALETTE.uiText,
  weight = '700',
): Phaser.GameObjects.Text {
  return scene.add.text(0, 0, text, { fontFamily: FONT, fontStyle: weight, fontSize: `${size}px`, color }).setOrigin(0.5);
}

/** Kâğıt kart: zemin #F7F3EA, r14, (0,+3) α0,18 ve (0,+6) α0,18 gölge. */
export function drawCard(g: Phaser.GameObjects.Graphics, w: number, h: number, fill: string = PALETTE.uiPaper, radius = CARD_RADIUS, stroke?: string): void {
  g.clear();
  g.fillStyle(hex(PALETTE.shadow), 0.1).fillRoundedRect(-w / 2 - 1, -h / 2 + 7, w + 2, h, radius);
  g.fillStyle(hex(PALETTE.shadow), 0.18).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, radius);
  g.fillStyle(hex(fill), 1).fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  if (stroke) g.lineStyle(2, hex(stroke), 1).strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
}

export function card(scene: Phaser.Scene, w: number, h: number, fill: string = PALETTE.uiPaper, stroke?: string): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawCard(g, w, h, fill, CARD_RADIUS, stroke);
  return g;
}

/** Çizgi ikonlar: 2,2 px çizgi, yuvarlak uç; 24×24 kutuda, merkez (0,0). */
export function icon(scene: Phaser.Scene, kind: IconKind, color: string = PALETTE.uiText, size = 24): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const k = size / 24;
  g.lineStyle(2.2, hex(color), 1);
  const P = (pts: [number, number][], close = false) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
    if (close) g.closePath();
    g.strokePath();
  };
  switch (kind) {
    case 'play':
      g.fillStyle(hex(color), 1).fillTriangle(-6 * k, -9 * k, -6 * k, 9 * k, 9 * k, 0);
      break;
    case 'pause':
      g.fillStyle(hex(color), 1);
      g.fillRoundedRect(-7 * k, -8 * k, 5 * k, 16 * k, 2 * k);
      g.fillRoundedRect(2 * k, -8 * k, 5 * k, 16 * k, 2 * k);
      break;
    case 'calendar':
      g.strokeRoundedRect(-9 * k, -8 * k, 18 * k, 17 * k, 3 * k);
      P([[-9, -3], [9, -3]]);
      P([[-4, -11], [-4, -6]]);
      P([[4, -11], [4, -6]]);
      g.fillStyle(hex(color), 1).fillCircle(-3 * k, 3 * k, 1.3 * k).fillCircle(3 * k, 3 * k, 1.3 * k);
      break;
    case 'heli':
      g.strokeRoundedRect(-8 * k, -3 * k, 14 * k, 9 * k, 4 * k);
      P([[6, 0], [11, -3]]);
      P([[-9, -7], [9, -7]]);
      P([[0, -7], [0, -3]]);
      P([[-8, 9], [7, 9]]);
      break;
    case 'gear': {
      g.strokeCircle(0, 0, 4 * k);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        P([[Math.cos(a) * 7, Math.sin(a) * 7], [Math.cos(a) * 10, Math.sin(a) * 10]]);
      }
      g.strokeCircle(0, 0, 7.5 * k);
      break;
    }
    case 'share':
      g.strokeCircle(-6 * k, 0, 2.6 * k).strokeCircle(6 * k, -6 * k, 2.6 * k).strokeCircle(6 * k, 6 * k, 2.6 * k);
      P([[-4, -1], [4, -5]]);
      P([[-4, 1], [4, 5]]);
      break;
    case 'home':
      P([[-10, 0], [0, -9], [10, 0]]);
      P([[-7, -2], [-7, 9], [7, 9], [7, -2]]);
      P([[-2.5, 9], [-2.5, 3], [2.5, 3], [2.5, 9]]);
      break;
    case 'lock':
      g.strokeRoundedRect(-7 * k, -1 * k, 14 * k, 10 * k, 3 * k);
      g.beginPath();
      g.arc(0, -2 * k, 5 * k, Math.PI, 0, false);
      g.strokePath();
      break;
    case 'chevrons':
      P([[-9, -7], [-2, 0], [-9, 7]]);
      P([[2, -7], [9, 0], [2, 7]]);
      break;
    case 'back':
      P([[6, -8], [-3, 0], [6, 8]]);
      break;
    case 'check':
      P([[-7, 0], [-2, 5], [7, -6]]);
      break;
  }
  return g;
}

export interface ButtonOpts {
  w: number;
  h: number;
  fill?: string;
  base?: string;
  stroke?: string;
  radius?: number;
}

/** Dokunulabilir kâğıt buton: basınca 0,95 ölçek, parmak buton üstündeyken bırakılınca tetiklenir. */
export class Button {
  readonly root: Phaser.GameObjects.Container;
  private zone: Phaser.GameObjects.Zone;
  enabled = true;
  /** iconButton alt satır metni */
  sub?: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    readonly w: number,
    readonly h: number,
    children: Phaser.GameObjects.GameObject[],
    private onTap: () => void,
    opts: Partial<ButtonOpts> = {},
  ) {
    const g = this.scene.add.graphics();
    const radius = opts.radius ?? CARD_RADIUS;
    const base = opts.base;
    if (base) {
      g.fillStyle(hex(base), 1).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, radius);
    } else {
      g.fillStyle(hex(PALETTE.shadow), 0.1).fillRoundedRect(-w / 2 - 1, -h / 2 + 7, w + 2, h, radius);
      g.fillStyle(hex(PALETTE.shadow), 0.18).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, radius);
    }
    g.fillStyle(hex(opts.fill ?? PALETTE.uiPaper), 1).fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    if (opts.stroke) g.lineStyle(2.5, hex(opts.stroke), 1).strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    const hw = Math.max(w, MIN_TAP);
    const hh = Math.max(h, MIN_TAP);
    this.zone = scene.add.zone(0, 0, hw, hh).setInteractive({ useHandCursor: true });
    this.root = scene.add.container(0, 0, [g, ...children, this.zone]);
    this.root.setSize(w, h);

    this.zone.on('pointerdown', () => {
      if (!this.enabled) return;
      scene.tweens.add({ targets: this.root, scale: 0.95, duration: 60 });
    });
    const release = (fire: boolean) => {
      scene.tweens.add({ targets: this.root, scale: 1, duration: 80 });
      if (fire && this.enabled && this.root.visible) this.onTap();
    };
    this.zone.on('pointerup', () => release(true));
    this.zone.on('pointerout', () => release(false));
  }

  setPosition(x: number, y: number): this {
    this.root.setPosition(x, y);
    return this;
  }

  setVisible(v: boolean): this {
    this.root.setVisible(v);
    this.zone.input && (this.zone.input.enabled = v);
    return this;
  }

  /** Dünya koordinatında dokunma dikdörtgeni (GameScene'in giriş engelleme listesi için). */
  rect(): { x: number; y: number; w: number; h: number } | null {
    if (!this.root.visible || !this.visibleInTree()) return null;
    const hw = Math.max(this.w, MIN_TAP);
    const hh = Math.max(this.h, MIN_TAP);
    const m = this.root.getWorldTransformMatrix();
    return { x: m.tx - hw / 2, y: m.ty - hh / 2, w: hw, h: hh };
  }

  private visibleInTree(): boolean {
    let p: Phaser.GameObjects.Container | null = this.root.parentContainer;
    while (p) {
      if (!p.visible) return false;
      p = p.parentContainer;
    }
    return true;
  }
}

/** Metinli büyük buton (AGAIN gibi). */
export function bigButton(
  scene: Phaser.Scene,
  w: number,
  h: number,
  text: string,
  size: number,
  onTap: () => void,
  fill: string = PALETTE.uiRed,
  base: string = PALETTE.uiRedBase,
  sub?: string,
): Button {
  const kids: Phaser.GameObjects.GameObject[] = [];
  const t = label(scene, text, size, PALETTE.uiPaper);
  kids.push(t);
  if (sub) {
    t.setY(-8);
    kids.push(label(scene, sub, 12, PALETTE.uiPaper, '500').setY(14));
  }
  return new Button(scene, w, h, kids, onTap, { fill, base });
}

/** İkon + etiket taşıyan küçük kart buton (88×76). */
export function iconButton(scene: Phaser.Scene, kind: IconKind, text: string, w: number, h: number, onTap: () => void, sub?: string): Button {
  const ic = icon(scene, kind).setY(-14);
  const t = label(scene, text, 12, PALETTE.uiText, '600').setY(sub !== undefined ? 12 : 16);
  const kids: Phaser.GameObjects.GameObject[] = [ic, t];
  const subText = sub !== undefined ? label(scene, sub, 11, PALETTE.uiTextSoft, '500').setY(26) : undefined;
  if (subText) kids.push(subText);
  const btn = new Button(scene, w, h, kids, onTap);
  btn.sub = subText;
  return btn;
}

/** Aç/kapa anahtarı. */
export class Toggle {
  readonly root: Phaser.GameObjects.Container;
  private knob: Phaser.GameObjects.Arc;
  private track: Phaser.GameObjects.Graphics;
  private zone: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, private value: boolean, private onChange: (v: boolean) => void) {
    this.track = scene.add.graphics();
    this.knob = scene.add.circle(0, 0, 13, hex(PALETTE.uiPaper));
    this.zone = scene.add.zone(0, 0, 76, MIN_TAP).setInteractive({ useHandCursor: true });
    this.root = scene.add.container(0, 0, [this.track, this.knob, this.zone]);
    this.zone.on('pointerup', () => this.set(!this.value, true));
    this.paint();
  }

  set(v: boolean, notify = false): void {
    this.value = v;
    this.paint();
    if (notify) this.onChange(v);
  }

  private paint(): void {
    this.track.clear();
    this.track.fillStyle(hex(this.value ? PALETTE.uiTeal : PALETTE.uiTextSoft), 1).fillRoundedRect(-26, -15, 52, 30, 15);
    this.knob.setPosition(this.value ? 11 : -11, 0);
  }
}

/** Metin değişmediyse yeniden çizme (Phaser Text her setText'te canvas'ı yeniler). */
export function setText(t: Phaser.GameObjects.Text, s: string): void {
  if (t.text !== s) t.setText(s);
}
