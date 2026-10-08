import Phaser from 'phaser';
import { HELI_ORIGIN, HELI_ROTOR_POS, HELI_TAIL_POS } from '../art/textures';
import { getItem } from '../core/storage';
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
  private root: Phaser.GameObjects.Container;
  private bodyImg: Phaser.GameObjects.Image;
  private rotor: Phaser.GameObjects.Image;
  private arcs: Phaser.GameObjects.Image;
  private tail: Phaser.GameObjects.Image;
  private rotorT = 0;

  constructor(
    scene: Phaser.Scene,
    private t: Tuning,
    private bounds: { W: number; seaY: number },
  ) {
    this.bodyImg = scene.add.image(0, 0, `heli_${getItem('ss.paint')}`).setOrigin(HELI_ORIGIN.x, HELI_ORIGIN.y);
    this.arcs = scene.add.image(HELI_ROTOR_POS.x, HELI_ROTOR_POS.y - 8, 'heli_arcs');
    this.rotor = scene.add.image(HELI_ROTOR_POS.x, HELI_ROTOR_POS.y, 'heli_rotor');
    this.tail = scene.add.image(HELI_TAIL_POS.x, HELI_TAIL_POS.y, 'heli_tail');
    this.root = scene.add.container(0, 0, [this.bodyImg, this.arcs, this.rotor, this.tail]).setDepth(15);
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

  /** Boya değişimi: doku anında yenilenir. */
  setPaint(id: string): void {
    this.bodyImg.setTexture(`heli_${id}`);
  }

  /** Rotor: scaleX = cos(t·42) ile dönüyormuş gibi; kuyruk rotoru rotation += 30·dt. */
  render(dtSec: number): void {
    this.rotorT += dtSec;
    this.rotor.setScale(Math.cos(this.rotorT * 42), 1);
    this.tail.rotation += 30 * dtSec;
    this.arcs.setAlpha(0.5 + 0.2 * Math.sin(this.rotorT * 30));
    const k = this.t.heli.spriteScale;
    this.root.setPosition(this.x, this.y).setRotation(this.tilt).setScale(-this.facing * k, k);
  }
}
