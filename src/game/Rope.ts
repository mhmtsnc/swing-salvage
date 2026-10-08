import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import type { Tuning } from '../config/tuning';
import { STEP_MS } from '../core/time';
import { PAD } from '../art/textures';

const ROPE_WIDTH = 2.6;
const SAG = 6;
const SEGMENTS = 14;

export class Rope {
  hook: MatterJS.BodyType | null = null;
  private constraint: MatterJS.ConstraintType;
  private gfx: Phaser.GameObjects.Graphics;
  private hookImg: Phaser.GameObjects.Image;
  private slings: Phaser.GameObjects.Graphics;
  private slingHalf = 0;
  private reelFrom = 0;
  private reelT = 1;
  /** Taşınan gövde (yoksa kanca) ucundaki dünya noktası için yerel ofset */
  private attachedBody: MatterJS.BodyType | null = null;

  constructor(
    private scene: Phaser.Scene,
    private t: Tuning,
    winch: { x: number; y: number },
  ) {
    this.gfx = scene.add.graphics().setDepth(13);
    this.slings = scene.add.graphics().setDepth(14);
    this.hookImg = scene.add.image(0, 0, 'hook').setDepth(14.5).setOrigin(0.5, (PAD + 33) / (34 + 2 * PAD));
    this.hook = this.makeHook(winch.x, winch.y + t.rope.length);
    this.constraint = scene.matter.add.worldConstraint(this.hook, t.rope.length, t.rope.stiffness, {
      pointA: { x: winch.x, y: winch.y },
      pointB: { x: 0, y: 0 },
      damping: t.rope.damping,
    });
  }

  private makeHook(x: number, y: number): MatterJS.BodyType {
    const h = this.t.hook;
    return this.scene.matter.add.circle(x, y, h.radius, {
      isSensor: true,
      density: h.density,
      frictionAir: h.frictionAir,
    });
  }

  /** Uç gövdesi (kanca veya kargo). */
  get endBody(): MatterJS.BodyType {
    return (this.attachedBody ?? this.hook) as MatterJS.BodyType;
  }

  /** Halatın ucunun dünya koordinatı. */
  endPoint(): { x: number; y: number } {
    const b = this.endBody;
    const p = this.constraint.pointB;
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);
    return { x: b.position.x + p.x * c - p.y * s, y: b.position.y + p.x * s + p.y * c };
  }

  private distance(): number {
    const e = this.endPoint();
    const a = this.constraint.pointA;
    return Math.hypot(e.x - a.x, e.y - a.y);
  }

  private startReel(): void {
    this.reelFrom = this.distance();
    this.reelT = 0;
  }

  /** Kancayı kaldırır, halatı kargoya bağlar. Uzunluk reelTime sürede rope.length'e geçer. */
  attach(body: MatterJS.BodyType, pointB: { x: number; y: number }, halfWidth = 0): void {
    this.slingHalf = halfWidth;
    if (this.hook) {
      this.scene.matter.world.remove(this.hook);
      this.hook = null;
    }
    this.attachedBody = body;
    this.constraint.bodyB = body;
    this.constraint.pointB = { x: pointB.x, y: pointB.y };
    this.startReel();
  }

  /** Kargoyu bırakır: boş kanca ucun olduğu yerde doğar, halat kendi uzunluğuna döner. */
  detachToHook(): void {
    const e = this.endPoint();
    this.attachedBody = null;
    this.slingHalf = 0;
    this.hook = this.makeHook(e.x, e.y);
    this.constraint.bodyB = this.hook;
    this.constraint.pointB = { x: 0, y: 0 };
    this.startReel();
  }

  /** Başlangıç durumu: kanca vinçten sarkıyor. */
  resetHook(winch: { x: number; y: number }): void {
    if (this.hook) this.scene.matter.world.remove(this.hook);
    this.attachedBody = null;
    this.slingHalf = 0;
    this.hook = this.makeHook(winch.x, winch.y + this.t.rope.length);
    this.constraint.bodyB = this.hook;
    this.constraint.pointB = { x: 0, y: 0 };
    this.constraint.pointA = { x: winch.x, y: winch.y };
    this.constraint.length = this.t.rope.length;
    this.reelT = 1;
  }

  /** Her sabit adımda: çapa vinç noktasına taşınır, uzunluk geçişi ilerler. */
  step(winch: { x: number; y: number }): void {
    this.constraint.pointA.x = winch.x;
    this.constraint.pointA.y = winch.y;
    const len = this.t.rope.length;
    if (this.reelT < 1) {
      this.reelT = Math.min(1, this.reelT + STEP_MS / 1000 / this.t.rope.reelTime);
      this.constraint.length = this.reelFrom + (len - this.reelFrom) * this.reelT;
    } else {
      this.constraint.length = len;
    }
  }

  draw(): void {
    const a = this.constraint.pointA;
    const e = this.endPoint();
    const g = this.gfx;
    g.clear();
    g.lineStyle(ROPE_WIDTH, hex(PALETTE.rope), 1);
    const cx = (a.x + e.x) / 2;
    const cy = (a.y + e.y) / 2 + SAG;
    g.beginPath();
    g.moveTo(a.x, a.y);
    for (let i = 1; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS;
      const k = 1 - u;
      g.lineTo(k * k * a.x + 2 * k * u * cx + u * u * e.x, k * k * a.y + 2 * k * u * cy + u * u * e.y);
    }
    g.strokePath();

    // Kanca dokusu halat yönünde; kargo taşırken askı çizgileri üst köşelere iner.
    const dx = e.x - a.x;
    const dy = e.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const lift = this.attachedBody ? 14 : 0;
    const hx = e.x - (dx / len) * lift;
    const hy = e.y - (dy / len) * lift;
    this.hookImg.setPosition(hx, hy).setRotation(Math.atan2(-dx, dy));
    const sl = this.slings;
    sl.clear();
    const b = this.attachedBody;
    if (b && this.slingHalf > 0) {
      const c = Math.cos(b.angle);
      const s2 = Math.sin(b.angle);
      const top = this.constraint.pointB.y;
      sl.lineStyle(1.8, hex(PALETTE.rope), 1);
      for (const sx of [-1, 1]) {
        const lx = sx * (this.slingHalf - 4);
        sl.beginPath();
        sl.moveTo(hx, hy);
        sl.lineTo(b.position.x + lx * c - top * s2, b.position.y + lx * s2 + top * c);
        sl.strokePath();
      }
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.hookImg.destroy();
    this.slings.destroy();
  }
}
