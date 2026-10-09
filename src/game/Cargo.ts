import Phaser from 'phaser';
import type { Tuning } from '../config/tuning';
import { waterY } from './Sea';
import type { PlacementResult } from './placement';

export type CargoType = keyof Tuning['cargo'];
export type CargoState = 'FLOATING' | 'CARRIED' | 'SETTLING' | 'STACKED';

const BOB_AMP = 4;
const BOB_PERIOD = 3;
const MAX_FLOAT_ANGLE = 0.35;

export class Cargo {
  state: CargoState = 'FLOATING';
  body: MatterJS.BodyType | null = null;
  pickedAt = 0;
  /** Bırakma anında hesaplanan yerleşim (SETTLING/STACKED) */
  placement: PlacementResult | null = null;
  /** Kesintisiz temas süresi (bırakma/oturma sayacı), sn */
  contactTime = 0;
  /** Temas penceresindeki en yüksek çarpma hızı (px/s) */
  impact = 0;
  /** Son temas anı (simTime) — çarpma penceresini sıfırlamak için */
  lastContactAt = -Infinity;
  /** Önceki adımda temas var mıydı / adım öncesi göreli hız (px/s) */
  touching = false;
  preSpeed = 0;
  /** SETTLING: hız eşiğinin altında geçen kesintisiz süre, sn */
  calmTime = 0;
  /** STACKED olduğu andaki gemi-yerel konum/açı (TOPPLE ölçütü) */
  stackedLocal: { x: number; y: number; angle: number } | null = null;
  /** Taşıma sırasında izlenen risk/ödül verileri (v1.1) */
  swingPeak = 0;
  closeT = 0;
  closeCall = false;
  gustHook = false;
  gustLanding = false;
  saved = false;
  submergedT = 0;
  carrySec = 0;
  /** Sert iniş veya halat kopması gibi hasar */
  damaged = false;
  readonly w: number;
  readonly h: number;
  private weightLabel: Phaser.GameObjects.Text;
  private gfx: Phaser.GameObjects.Image;
  private x = 0;
  private y = 0;
  private angle = 0;
  private phase: number;

  constructor(
    scene: Phaser.Scene,
    private t: Tuning,
    readonly type: CargoType,
    private baseX: number,
    /** Bu kargonun yoğunluk çarpanı (koşuya göre değişen ağırlık) */
    readonly weightMul = 1,
  ) {
    const def = t.cargo[type];
    this.w = def.w;
    this.h = def.h;
    this.phase = baseX * 0.05;
    this.x = baseX;
    this.gfx = scene.add.image(baseX, 0, `cargo_${type}`).setDepth(9);
    this.weightLabel = scene.add
      .text(baseX, 0, `${this.massKg()} kg`, { fontFamily: 'Fredoka', fontStyle: '600', fontSize: '12px', color: '#24353A' })
      .setOrigin(0.5)
      .setDepth(9.5)
      .setAlpha(0.8);
  }

  /** Görünen ağırlık (kg): yoğunluk × alan × 10. */
  massKg(): number {
    const d = this.t.cargo[this.type];
    const shape = (d as { shape?: string }).shape;
    const area = shape === 'circle' ? Math.PI * (d.w / 2) ** 2 : shape === 'trapezoid' ? d.w * d.h * (1 - ((d as { slope?: number }).slope ?? 0) / 2) : d.w * d.h;
    return Math.round(d.density * this.weightMul * area * 10);
  }

  get sprite(): Phaser.GameObjects.Image {
    return this.gfx;
  }

  get points(): number {
    return this.t.cargo[this.type].points;
  }

  /** Merkez/boyut/açı (gövde varsa gövdeden). */
  box(): { x: number; y: number; w: number; h: number; angle: number } {
    return this.body
      ? { x: this.body.position.x, y: this.body.position.y, w: this.w, h: this.h, angle: this.body.angle }
      : { x: this.x, y: this.y, w: this.w, h: this.h, angle: this.angle };
  }

  /** Gemi katmanına geç (SETTLING/STACKED: orta dalganın arkası). */
  toShipLayer(): void {
    this.gfx.setDepth(7.5);
  }

  /** Gemi değişiminde: gövdeyi kaldır, sprite'ı gemi konteynerine yerel koordinatla bağla. */
  makeDecor(matter: Phaser.Physics.Matter.MatterPhysics, container: Phaser.GameObjects.Container, local: { x: number; y: number }, angle: number): void {
    if (this.body) matter.world.remove(this.body);
    this.body = null;
    container.add(this.gfx);
    this.weightLabel.destroy();
    this.gfx.setPosition(local.x, local.y).setRotation(angle);
  }

  /** Ağır kargo helikopteri daha çok yavaşlatır. */
  get handling(): number {
    return this.t.cargo[this.type].handling / Math.sqrt(this.weightMul);
  }

  /** Yüzen kargo fizik gövdesi değildir, dalgayla oynayan bir sprite'tır (§10.3). */
  updateFloating(time: number, seaY: number, amp: number): void {
    if (this.state !== 'FLOATING') return;
    this.x = this.baseX + BOB_AMP * Math.sin((2 * Math.PI * time) / BOB_PERIOD + this.phase);
    const slope = (waterY(this.x + 1, time, seaY, amp) - waterY(this.x - 1, time, seaY, amp)) / 2;
    this.angle = Phaser.Math.Clamp(0.4 * Math.atan(slope), -MAX_FLOAT_ANGLE, MAX_FLOAT_ANGLE);
    this.y = waterY(this.x, time, seaY, amp) - 0.1 * this.h;
    this.gfx.setPosition(this.x, this.y).setRotation(this.angle);
    this.weightLabel.setPosition(this.x, this.y - this.h / 2 - 14);
  }

  /** Üst-orta nokta (dünya koordinatı). */
  topCenter(): { x: number; y: number } {
    const p = this.body ? this.body.position : { x: this.x, y: this.y };
    const a = this.body ? this.body.angle : this.angle;
    return { x: p.x + (Math.sin(a) * this.h) / 2, y: p.y - (Math.cos(a) * this.h) / 2 };
  }

  /** Kancalama: aynı konum ve açıyla dinamik gövde oluşturur (§6.3). */
  pickUp(matter: Phaser.Physics.Matter.MatterPhysics, time: number): void {
    const def = this.t.cargo[this.type];
    const c = this.t.cargoCommon;
    const opts = {
      angle: this.angle,
      density: def.density * this.weightMul,
      friction: c.friction,
      frictionStatic: c.frictionStatic,
      restitution: c.restitution,
      frictionAir: c.frictionAir,
      slop: c.slop,
    };
    const shape = (def as { shape?: string }).shape;
    if (shape === 'circle') {
      this.body = matter.add.circle(this.x, this.y, this.w / 2, opts);
    } else if (shape === 'trapezoid') {
      this.body = matter.add.trapezoid(this.x, this.y, this.w, this.h, (def as { slope?: number }).slope ?? 0.4, {
        ...opts,
        chamfer: { radius: def.chamfer },
      });
    } else {
      this.body = matter.add.rectangle(this.x, this.y, this.w, this.h, { ...opts, chamfer: { radius: def.chamfer } });
    }
    this.state = 'CARRIED';
    this.pickedAt = time;
    this.gfx.setDepth(14);
    this.weightLabel.setVisible(false);
  }

  /** Gövdenin en alt noktası (dünya y). */
  bottom(): number {
    return this.body ? this.body.bounds.max.y : this.y + this.h / 2;
  }

  get centerX(): number {
    return this.body ? this.body.position.x : this.x;
  }

  sync(): void {
    if (!this.body) return;
    this.gfx.setPosition(this.body.position.x, this.body.position.y).setRotation(this.body.angle);
  }

  destroy(matter: Phaser.Physics.Matter.MatterPhysics): void {
    if (this.body) matter.world.remove(this.body);
    this.body = null;
    this.gfx.destroy();
    this.weightLabel.destroy();
  }
}
