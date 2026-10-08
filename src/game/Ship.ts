import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
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
    this.container.add(this.drawHull(pv));
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

  // Geçici çizim: yerel koordinat = dinlenme dünyası − dönme merkezi.
  private drawHull(pv: { x: number; y: number }): Phaser.GameObjects.Graphics {
    const { seaY, t } = this;
    const s = t.ship;
    const dy = deckY(seaY, s);
    const parts = shipParts(seaY, s);
    const g = this.scene.add.graphics();
    const rect = (color: string, x0: number, y0: number, w: number, h: number) => {
      g.fillStyle(hex(color), 1);
      g.fillRect(x0 - pv.x, y0 - pv.y, w, h);
    };
    rect(PALETTE.hull, parts.hull.cx - parts.hull.w / 2, parts.hull.cy - parts.hull.h / 2, parts.hull.w, parts.hull.h);
    rect(PALETTE.hullStripe, -40, dy + 14, 328, 3);
    rect(PALETTE.deck, s.deckLeftX, dy - 3, s.deckRightX - s.deckLeftX, 3);
    rect(PALETTE.bridge, parts.bridge.cx - parts.bridge.w / 2, parts.bridge.cy - parts.bridge.h / 2, parts.bridge.w, parts.bridge.h);
    rect(PALETTE.roof, s.bridgeLeftX - 4, dy - s.bridgeHeight - 6, s.deckLeftX - s.bridgeLeftX + 8, 6);
    rect(PALETTE.ink, s.mastX - 2, dy - s.mastHeight, 4, s.mastHeight - s.bridgeHeight);
    rect(PALETTE.roof, s.mastX - 5, dy - s.mastHeight - 4, 10, 6);
    rect(PALETTE.hull, parts.lip.cx - parts.lip.w / 2, parts.lip.cy - parts.lip.h / 2, parts.lip.w, parts.lip.h);
    for (const cx of s.slotCentersX) rect(PALETTE.uiTeal, cx - 12, dy - 4, 24, 4);
    return g;
  }
}
