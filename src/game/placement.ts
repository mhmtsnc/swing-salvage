// Saf yerleşim mantığı (§7.4). Phaser'sız, vitest ile test edilir.
export interface Box { x: number; y: number; w: number; h: number }

export interface PlacementRules {
  perfectMaxDx: number;
  perfectMaxAngleDeg: number;
  perfectMaxImpact: number;
  hardLandingImpact: number;
}

export interface PlacementInput {
  /** Bırakma anındaki kargo (merkez x/y, boyut, açı rad) */
  cargo: Box & { angle: number };
  /** Altındaki en üst kargo; yoksa null (doğrudan güverte) */
  below: (Box & { angle: number }) | null;
  /** Gemi dönüşümüyle dünya koordinatındaki slot merkezleri (x) */
  slotCentersX: readonly number[];
  /** Güverte yüzeyinin açısı (gemi açısı, rad); `below` varsa kullanılmaz */
  deckAngle: number;
  /** Temas penceresinde ölçülen en yüksek çarpma hızı (px/s) */
  impact: number;
  rules: PlacementRules;
}

export interface PlacementResult {
  perfect: boolean;
  hard: boolean;
  alignDx: number;
  angleDeg: number;
  impact: number;
}

/** Altta kargonun üst kenarına 8 px yakın ve yatayda örtüşen en üstteki kargo. */
export const SUPPORT_GAP = 8;

export function findBelow<T extends Box>(cargo: Box, others: readonly T[]): T | null {
  const bottom = cargo.y + cargo.h / 2;
  let best: T | null = null;
  for (const o of others) {
    const top = o.y - o.h / 2;
    if (Math.abs(bottom - top) > SUPPORT_GAP) continue;
    const overlap = Math.min(cargo.x + cargo.w / 2, o.x + o.w / 2) - Math.max(cargo.x - cargo.w / 2, o.x - o.w / 2);
    if (overlap <= 0) continue;
    if (!best || o.y < best.y) best = o;
  }
  return best;
}

function angleDiffDeg(a: number, b: number): number {
  let d = a - b;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs((d * 180) / Math.PI);
}

export function classifyPlacement(input: PlacementInput): PlacementResult {
  const { cargo, below, slotCentersX, deckAngle, impact, rules } = input;
  let targetX: number;
  let surfaceAngle: number;
  if (below) {
    targetX = below.x;
    surfaceAngle = below.angle;
  } else {
    surfaceAngle = deckAngle;
    if (cargo.w >= 100 && slotCentersX.length > 1) {
      targetX = slotCentersX.reduce((a, b) => a + b, 0) / slotCentersX.length;
    } else {
      targetX = slotCentersX.reduce((best, s) => (Math.abs(s - cargo.x) < Math.abs(best - cargo.x) ? s : best), slotCentersX[0]);
    }
  }
  const alignDx = cargo.x - targetX;
  const angleDeg = angleDiffDeg(cargo.angle, surfaceAngle);
  const perfect =
    Math.abs(alignDx) <= rules.perfectMaxDx &&
    angleDeg <= rules.perfectMaxAngleDeg &&
    impact <= rules.perfectMaxImpact;
  return { perfect, hard: impact >= rules.hardLandingImpact, alignDx, angleDeg, impact };
}
