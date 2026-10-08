import Phaser from 'phaser';
import { PAD, SHIP_TEX } from '../art/textures';
import type { Tuning } from '../config/tuning';
import {
  deckY, pivotRest, shipParts, shipPose, shipToWorld,
  type Rect, type ShipParams, type ShipPose,
} from './shipModel';

const MAX_AMP_RATE = 0.5; // derece/sn: zorluk değişirken yalpa genliği ani sıçramasın
const DT = 1 / 60;

/** Kinematik yalpalayan gemi: birleşik statik gövde (§6.4) + geçici çizim. */
export class Ship {
  readonly body: MatterJS.BodyType;
  readonly container: Phaser.GameObjects.Container;
  /** Gemi x kaydırması (gemi değişimi tween'i) */
  offsetX = 0;
  private restCenter: { x: number; y: number };
  private phase = 0;
  private amp: number;
  private cfg: ShipParams;

  constructor(private scene: Phaser.Scene, private t: Tuning, private seaY: number, startAmpDeg: number) {
    this.amp = startAmpDeg;
    this.cfg = { seaY, rollAmpDeg: startAmpDeg, rollPeriod: 1, ship: t.ship };
    const B = scene.matter.bodies;
    const parts = shipParts(seaY, t.ship);
    const mk = (r: Rect) => B.rectangle(r.cx, r.cy, r.w, r.h);
    // Sürtünme ebeveyne verilir; Matter temas çiftlerinde ebeveynin sürtünmesini kullanır.
    this.body = scene.matter.body.create({
      parts: [mk(parts.hull), mk(parts.bridge), mk(parts.lip)],
      friction: t.ship.friction,
      frictionStatic: t.ship.frictionStatic,
    } as never) as MatterJS.BodyType;
    scene.matter.body.setStatic(this.body, true);
    scene.matter.world.add(this.body);
    this.restCenter = { x: this.body.position.x, y: this.body.position.y };

    const pv = pivotRest(seaY, t.ship);
    this.container = scene.add.container(pv.x, pv.y).setDepth(7);
    this.container.add(this.makeImage(pv));
  }

  get params(): ShipParams {
    return this.cfg;
  }

  pose(): ShipPose {
    return shipPose(this.phase, this.cfg);
  }

  /** Her sabit adımda: faz ilerler, gövde dönme merkezi etrafında konumlanır (updateVelocity = true). */
  step(targetAmpDeg: number, period: number): void {
    const dAmp = Phaser.Math.Clamp(targetAmpDeg - this.amp, -MAX_AMP_RATE * DT, MAX_AMP_RATE * DT);
    this.amp += dAmp;
    this.cfg = { ...this.cfg, rollAmpDeg: this.amp };
    this.phase += DT / period;
    const pose = this.pose();
    const pos = shipToWorld(pose, this.cfg, this.restCenter);
    const Body = this.scene.matter.body as unknown as {
      setPosition(b: MatterJS.BodyType, p: { x: number; y: number }, u?: boolean): void;
      setAngle(b: MatterJS.BodyType, a: number, u?: boolean): void;
    };
    Body.setPosition(this.body, pos, true);
    Body.setAngle(this.body, pose.angle, true);
  }

  render(): void {
    const pose = this.pose();
    this.container.setPosition(pose.x + this.offsetX, pose.y).setRotation(pose.angle);
  }

  /** Sahneden çıkarken fizik gövdesini kaldırır (görsel container kalır). */
  removeBody(): void {
    this.scene.matter.world.remove(this.body);
  }

  destroy(): void {
    this.removeBody();
    this.container.destroy();
  }

  /** Pişirilmiş gemi dokusu (art/textures.ts), dönme merkezine göre konumlandırılır. */
  private makeImage(pv: { x: number; y: number }): Phaser.GameObjects.Image {
    const dy = deckY(this.seaY, this.t.ship);
    return this.scene.add
      .image(SHIP_TEX.x0 - PAD - pv.x, dy + SHIP_TEX.y0 - PAD - pv.y, 'ship')
      .setOrigin(0, 0);
  }
}
