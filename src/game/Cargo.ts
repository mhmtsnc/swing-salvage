import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import type { Tuning } from '../config/tuning';
import { waterY } from './Sea';
import type { PlacementResult } from './placement';

export type CargoType = keyof Tuning['cargo'];
export type CargoState = 'FLOATING' | 'CARRIED' | 'SETTLING' | 'STACKED';

const FILL: Record<CargoType, string> = {
  crate: PALETTE.crate,
  wide: PALETTE.wide,
  barrel: PALETTE.barrel,
  gold: PALETTE.gold,
  piano: PALETTE.piano,
};

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
  readonly w: number;
  readonly h: number;
  private gfx: Phaser.GameObjects.Rectangle;
  private x = 0;
  private y = 0;
  private angle = 0;
  private phase: number;

  constructor(
    scene: Phaser.Scene,
    private t: Tuning,
    readonly type: CargoType,
    private baseX: number,
  ) {
    const def = t.cargo[type];
    this.w = def.w;
    this.h = def.h;
    this.phase = baseX * 0.05;
    this.x = baseX;
    this.gfx = scene.add.rectangle(baseX, 0, this.w, this.h, hex(FILL[type])).setDepth(9);
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
    this.gfx.setPosition(local.x, local.y).setRotation(angle);
  }

  get handling(): number {
    return this.t.cargo[this.type].handling;
  }

  /** Yüzen kargo fizik gövdesi değildir, dalgayla oynayan bir sprite'tır (§10.3). */
  updateFloating(time: number, seaY: number, amp: number): void {
    if (this.state !== 'FLOATING') return;
    this.x = this.baseX + BOB_AMP * Math.sin((2 * Math.PI * time) / BOB_PERIOD + this.phase);
    const slope = (waterY(this.x + 1, time, seaY, amp) - waterY(this.x - 1, time, seaY, amp)) / 2;
    this.angle = Phaser.Math.Clamp(0.4 * Math.atan(slope), -MAX_FLOAT_ANGLE, MAX_FLOAT_ANGLE);
    this.y = waterY(this.x, time, seaY, amp) - 0.1 * this.h;
    this.gfx.setPosition(this.x, this.y).setRotation(this.angle);
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
    this.body = matter.add.rectangle(this.x, this.y, this.w, this.h, {
      angle: this.angle,
      chamfer: { radius: def.chamfer },
      density: def.density,
      friction: c.friction,
      frictionStatic: c.frictionStatic,
      restitution: c.restitution,
      frictionAir: c.frictionAir,
      slop: c.slop,
    });
    this.state = 'CARRIED';
    this.pickedAt = time;
    this.gfx.setDepth(14);
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
  }
}
