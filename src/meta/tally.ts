/** Bir koşuda ölçülen ve görev/başarım hesabına giren sayılar. "sum" metrikleri toplanır, "best" metrikleri koşu içi en iyi alınır. */
export interface RunMetrics {
  // sum
  delivered: number;
  perfects: number;
  flawless: number;
  sweet: number;
  saved: number;
  closeCall: number;
  gustDrops: number;
  swing: number;
  speedy: number;
  pianos: number;
  balls: number;
  tall: number;
  wedge: number;
  hardLandings: number;
  snaps: number;
  runs: number;
  // best
  streak: number;
  clean: number;
  ships: number;
  score: number;
}

export const SUM_KEYS = [
  'delivered', 'perfects', 'flawless', 'sweet', 'saved', 'closeCall', 'gustDrops', 'swing', 'speedy',
  'pianos', 'balls', 'tall', 'wedge', 'hardLandings', 'snaps', 'runs',
] as const satisfies readonly (keyof RunMetrics)[];

export const BEST_KEYS = ['streak', 'clean', 'ships', 'score'] as const satisfies readonly (keyof RunMetrics)[];

export type MetricKey = keyof RunMetrics;

export function emptyMetrics(): RunMetrics {
  return {
    delivered: 0, perfects: 0, flawless: 0, sweet: 0, saved: 0, closeCall: 0, gustDrops: 0, swing: 0, speedy: 0,
    pianos: 0, balls: 0, tall: 0, wedge: 0, hardLandings: 0, snaps: 0, runs: 0,
    streak: 0, clean: 0, ships: 0, score: 0,
  };
}

/** Bir yerleştirme olayından metrik artışları. */
export interface PlacementEvent {
  type: string;
  grade: 'normal' | 'perfect' | 'flawless';
  sweet: boolean;
  saved: boolean;
  closeCall: boolean;
  gustLanding: boolean;
  swingPoints: number;
  speedyPoints: number;
  hard: boolean;
  streak: number;
  clean: number;
  score: number;
  ships: number;
}

export function applyPlacement(m: RunMetrics, e: PlacementEvent): RunMetrics {
  const out = { ...m };
  out.delivered++;
  if (e.grade !== 'normal') out.perfects++;
  if (e.grade === 'flawless') out.flawless++;
  if (e.sweet) out.sweet++;
  if (e.saved) out.saved++;
  if (e.closeCall) out.closeCall++;
  if (e.gustLanding) out.gustDrops++;
  if (e.swingPoints > 0) out.swing++;
  if (e.speedyPoints > 0) out.speedy++;
  if (e.hard) out.hardLandings++;
  if (e.type === 'piano') out.pianos++;
  if (e.type === 'ball') out.balls++;
  if (e.type === 'tall') out.tall++;
  if (e.type === 'wedge') out.wedge++;
  out.streak = Math.max(out.streak, e.streak);
  out.clean = Math.max(out.clean, e.clean);
  out.score = Math.max(out.score, e.score);
  out.ships = Math.max(out.ships, e.ships);
  return out;
}

/** İkinci şans gibi devam eden koşularda önceden sayılanı çıkarır: toplamlar fark, "best"ler güncel değer. */
export function deltaMetrics(cur: RunMetrics, prev: RunMetrics | null): RunMetrics {
  if (!prev) return { ...cur };
  const out = { ...cur };
  for (const k of SUM_KEYS) out[k] = cur[k] - prev[k];
  return out;
}
