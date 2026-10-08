import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import type { Tuning } from '../config/tuning';

const DT = 1 / 60;

function clampLen(x: number, y: number, max: number): { x: number; y: number } {
  const l = Math.hypot(x, y);
  if (l <= max || l === 0) return { x, y };
  const k = max / l;
  return { x: x * k, y: y * k };
}

export class Helicopter {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  targetX = 0;
  targetY = 0;
  tilt = 0;
  /** −1: burun sola, +1: burun sağa */
  facing = -1;
  private fingerStart: { x: number; y: number } | null = null;
  private targetStart = { x: 0, y: 0 };
  private gfx: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private t: Tuning,
    private bounds: { W: number; seaY: number },
  ) {
    this.gfx = scene.add.graphics().setDepth(15);
    this.drawShape();
    this.reset();
  }

  setBounds(W: number, seaY: number): void {
    this.bounds = { W, seaY };
  }

  reset(): void {
    const h = this.t.heli;
    this.x = this.bounds.W * h.startXFrac;
    this.y = h.startY;
    this.vx = this.vy = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.tilt = 0;
    this.fingerStart = null;
  }

  /** Göreli sürükleme: parmak değdiği an kaydedilir, hedef farka göre kayar. */
  pointerDown(px: number, py: number): void {
    this.fingerStart = { x: px, y: py };
    this.targetStart = { x: this.targetX, y: this.targetY };
  }

  pointerMove(px: number, py: number): void {
    if (!this.fingerStart) return;
    const r = this.t.heli.dragRatio;
    this.targetX = this.targetStart.x + (px - this.fingerStart.x) * r;
    this.targetY = this.targetStart.y + (py - this.fingerStart.y) * r;
    this.clampTarget();
  }

  pointerUp(): void {
    this.fingerStart = null;
  }

  private limits() {
    const h = this.t.heli;
    return {
      minX: h.marginX,
      maxX: this.bounds.W - h.marginX,
      minY: h.minY,
      maxY: this.bounds.seaY - h.maxYAboveSea,
    };
  }

  private clampTarget(): void {
    const l = this.limits();
    this.targetX = Phaser.Math.Clamp(this.targetX, l.minX, l.maxX);
    this.targetY = Phaser.Math.Clamp(this.targetY, l.minY, l.maxY);
  }

  /** Sabit adım (dt = 1/60). `handling`: taşınan kargo tipinden, boşta 1. `windAcc`: px/s² (rüzgâr+gust) */
  step(handling: number, windAccX: number): void {
    const h = this.t.heli;
    this.clampTarget();
    const desired = clampLen((this.targetX - this.x) * h.followGain, (this.targetY - this.y) * h.followGain, h.maxSpeed);
    const acc = clampLen(
      (desired.x - this.vx) / h.accelTau,
      (desired.y - this.vy) / h.accelTau,
      h.maxAccel * handling,
    );
    this.vx += (acc.x + windAccX * h.windResponse) * DT;
    this.vy += acc.y * DT;
    this.x += this.vx * DT;
    this.y += this.vy * DT;

    const l = this.limits();
    if (this.x < l.minX) { this.x = l.minX; this.vx = 0; }
    if (this.x > l.maxX) { this.x = l.maxX; this.vx = 0; }
    if (this.y < l.minY) { this.y = l.minY; this.vy = 0; }
    if (this.y > l.maxY) { this.y = l.maxY; this.vy = 0; }

    const tiltGoal = Phaser.Math.Clamp(this.vx * h.tiltPerVx, -h.tiltMax, h.tiltMax);
    this.tilt += (tiltGoal - this.tilt) * Math.min(1, h.tiltSmooth * DT);
    if (Math.abs(this.vx) > h.flipHysteresisVx) this.facing = this.vx > 0 ? 1 : -1;
  }

  winchPoint(): { x: number; y: number } {
    const o = this.t.heli.winchOffsetY;
    return { x: this.x - Math.sin(this.tilt) * o, y: this.y + Math.cos(this.tilt) * o };
  }

  /** Hitbox (merkezde, döndürülmez). */
  hitbox(): Phaser.Geom.Rectangle {
    const { hitboxW, hitboxH } = this.t.heli;
    return new Phaser.Geom.Rectangle(this.x - hitboxW / 2, this.y - hitboxH / 2, hitboxW, hitboxH);
  }

  render(): void {
    this.gfx.setPosition(this.x, this.y).setRotation(this.tilt).setScale(-this.facing, 1);
  }

  // Geçici çizim (F5'te gerçek doku): burun solda, yerel koordinat merkezde.
  private drawShape(): void {
    const { hitboxW: w, hitboxH: hh } = this.t.heli;
    const g = this.gfx;
    g.fillStyle(hex(PALETTE.heliRed), 1);
    g.fillRoundedRect(-w * 0.32, -hh / 2, w * 0.64, hh, hh * 0.35);
    g.fillRect(w * 0.25, -hh * 0.1, w * 0.4, hh * 0.18);
    g.fillStyle(hex(PALETTE.heliGlass), 1);
    g.fillRoundedRect(-w * 0.3, -hh * 0.35, w * 0.22, hh * 0.4, 6);
    g.fillStyle(hex(PALETTE.ink), 1);
    g.fillRect(-w * 0.5, -hh / 2 - 5, w, 3);
  }
}
