// Saf gemi geometrisi ve yalpa pozu (Phaser'sız). Oyun ve testler aynı modülü kullanır.
// Koordinatlar dünya koordinatıdır: gemi dinlenme konumunda iken (θ = 0, heave = 0) dünya koordinatı = gemi yerel koordinatı.
import type { Tuning } from '../config/tuning';

/** Tuning.ship ile aynı alanlar; `as const` literal tipleri genişletilmiş (testler değer değiştirebilsin). */
export type ShipCfg = { [K in keyof Tuning['ship']]: Tuning['ship'][K] extends readonly number[] ? readonly number[] : number };

export interface Pt { x: number; y: number }
export interface Rect { cx: number; cy: number; w: number; h: number }

export interface ShipParams {
  seaY: number;
  rollAmpDeg: number;
  rollPeriod: number;
  ship: ShipCfg;
}

/** Pivotun dünyadaki anlık konumu ve gemi açısı. */
export interface ShipPose { x: number; y: number; angle: number }

const toRad = (d: number) => (d * Math.PI) / 180;

export function deckY(seaY: number, ship: ShipCfg): number {
  return seaY - ship.deckAboveSea;
}

export function pivotRest(seaY: number, ship: ShipCfg): Pt {
  return { x: ship.pivotX, y: seaY - ship.pivotAboveSea };
}

/** Parça dikdörtgenleri (§6.4): gövde levhası, köprü, pruva dudağı. */
export function shipParts(seaY: number, ship: ShipCfg): { hull: Rect; bridge: Rect; lip: Rect } {
  const dy = deckY(seaY, ship);
  const box = (x0: number, x1: number, y0: number, y1: number): Rect => ({
    cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0,
  });
  return {
    hull: box(-40, 288, dy, dy + 24),
    bridge: box(ship.bridgeLeftX, ship.deckLeftX, dy - ship.bridgeHeight, dy),
    lip: box(ship.deckRightX, ship.deckRightX + ship.lipWidth, dy - ship.lipHeight, dy),
  };
}

/** θ(t) = rad(rollAmpDeg)·sin(2πt/rollPeriod), heave(t) = heaveAmp·sin(4πt/rollPeriod + 1). */
export function shipPose(t: number, p: ShipParams): ShipPose {
  const pv = pivotRest(p.seaY, p.ship);
  const angle = toRad(p.rollAmpDeg) * Math.sin((2 * Math.PI * t) / p.rollPeriod);
  const heave = p.ship.heaveAmp * Math.sin((4 * Math.PI * t) / p.rollPeriod + 1);
  return { x: pv.x, y: pv.y + heave, angle };
}

/** Dinlenme konumundaki gemi noktasını (yerel) anlık dünya koordinatına çevirir. */
export function shipToWorld(pose: ShipPose, p: ShipParams, local: Pt): Pt {
  const pv = pivotRest(p.seaY, p.ship);
  const dx = local.x - pv.x;
  const dy = local.y - pv.y;
  const c = Math.cos(pose.angle);
  const s = Math.sin(pose.angle);
  return { x: pose.x + dx * c - dy * s, y: pose.y + dx * s + dy * c };
}

/** Dünya noktasını gemi yerel koordinatına çevirir (shipToWorld'ün tersi). */
export function worldToShip(pose: ShipPose, p: ShipParams, world: Pt): Pt {
  const pv = pivotRest(p.seaY, p.ship);
  const dx = world.x - pose.x;
  const dy = world.y - pose.y;
  const c = Math.cos(-pose.angle);
  const s = Math.sin(-pose.angle);
  return { x: pv.x + dx * c - dy * s, y: pv.y + dx * s + dy * c };
}

/** Slot merkezleri (yerel x, güverte yüzeyinde) gemi dönüşümüyle dünya koordinatına. */
export function slotCentersWorld(pose: ShipPose, p: ShipParams): Pt[] {
  const dy = deckY(p.seaY, p.ship);
  return p.ship.slotCentersX.map((x) => shipToWorld(pose, p, { x, y: dy }));
}

/** Direk dikdörtgeni (§7.5 F2): x [mastX−5, mastX+5], y [deckY−mastHeight, deckY−bridgeHeight]. */
export function mastRect(seaY: number, ship: ShipCfg): Rect {
  const dy = deckY(seaY, ship);
  const y0 = dy - ship.mastHeight;
  const y1 = dy - ship.bridgeHeight;
  return { cx: ship.mastX, cy: (y0 + y1) / 2, w: 10, h: y1 - y0 };
}

/** Gemi dönüşümü uygulanmış dikdörtgenin dünya sınır kutusu. */
export function rectWorldAabb(pose: ShipPose, p: ShipParams, r: Rect): { x0: number; y0: number; x1: number; y1: number } {
  const pts = [
    { x: r.cx - r.w / 2, y: r.cy - r.h / 2 }, { x: r.cx + r.w / 2, y: r.cy - r.h / 2 },
    { x: r.cx + r.w / 2, y: r.cy + r.h / 2 }, { x: r.cx - r.w / 2, y: r.cy + r.h / 2 },
  ].map((q) => shipToWorld(pose, p, q));
  return {
    x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)),
    y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)),
  };
}
