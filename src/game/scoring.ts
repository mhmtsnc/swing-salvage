import type { Tuning } from '../config/tuning';

export type Grade = 'normal' | 'perfect' | 'flawless';

export interface RiskFlags {
  closeCall: boolean;
  gustHook: boolean;
  gustLanding: boolean;
  saved: boolean;
}

export interface ScoreInput {
  base: number;
  grade: Grade;
  /** Taşıma sırasında son pencerede ölçülen en büyük salınım açısı (derece) */
  swingDeg: number;
  hard: boolean;
  sweet: boolean;
  risk: RiskFlags;
  /** Kancalamadan bırakmaya geçen süre, sn */
  carrySec: number;
  /** Bu yerleştirmeden ÖNCEKİ seriler */
  perfectStreakBefore: number;
  cleanStreakBefore: number;
  /** Fırtına çarpanı için ilerleme puanı (eski ölçekli) */
  progress: number;
}

export interface ScorePart { key: string; points: number }

export interface ScoreResult {
  gained: number;
  subtotal: number;
  placementMult: number;
  comboMult: number;
  stormMult: number;
  parts: ScorePart[];
  /** Yeni seriler */
  perfectStreak: number;
  cleanStreak: number;
  streakBonus: number;
  cleanBonus: number;
  /** Yerleştirme zaten sert/sorunlu mu */
  damage: boolean;
  /** Eski ölçekte ilerleme puanı (zorluk için) */
  progressGain: number;
}

export function stormMultiplier(progress: number, t: Tuning['scoring']): number {
  return Math.min(t.stormMax, 1 + Math.max(0, progress) * t.stormPerPoint);
}

export function swingBonus(deg: number, t: Tuning['scoring']): number {
  let pts = 0;
  t.swingMin.forEach((min, i) => {
    if (deg >= min) pts = i + 1;
  });
  return pts;
}

export function speedBonus(sec: number, t: Tuning['scoring']): number {
  if (sec <= t.speedy[0]) return 3;
  if (sec <= t.speedy[1]) return 2;
  if (sec <= t.speedy[2]) return 1;
  return 0;
}

function tableBonus(n: number, table: Record<number, number>, every: number, repeat: number): number {
  const last = Math.max(...Object.keys(table).map(Number));
  if (table[n] !== undefined) return table[n];
  if (n > last && n % every === 0) return repeat;
  return 0;
}

export function streakMilestone(streak: number, t: Tuning['scoring']): number {
  return tableBonus(streak, t.streakBonus, t.repeatEvery, t.repeatBonus);
}

export function cleanMilestone(streak: number, t: Tuning['scoring']): number {
  return tableBonus(streak, t.cleanBonus, t.cleanRepeatEvery, t.cleanRepeatBonus);
}

/** Bir yerleştirmenin toplam puanı (saf). Alt toplam × yerleştirme × seri × fırtına çarpanı + kilometre taşı ödülleri. */
export function scorePlacement(i: ScoreInput, t: Tuning['scoring']): ScoreResult {
  const parts: ScorePart[] = [{ key: 'base', points: i.base }];
  const add = (key: string, points: number): void => {
    if (points > 0) parts.push({ key, points });
  };

  add('swing', i.hard ? 0 : swingBonus(i.swingDeg, t));
  add('closeCall', i.risk.closeCall ? t.risk.closeCall : 0);
  add('gustHook', i.risk.gustHook ? t.risk.gustHook : 0);
  add('gustLanding', i.risk.gustLanding ? t.risk.gustLanding : 0);
  add('saved', i.risk.saved ? t.risk.saved : 0);
  add('speedy', speedBonus(i.carrySec, t));
  add('sweet', i.sweet ? t.sweetSpot : 0);

  const subtotal = parts.reduce((a, p) => a + p.points, 0);
  const placementMult = i.grade === 'flawless' ? t.flawlessMult : i.grade === 'perfect' ? t.perfectMult : 1;
  const perfectStreak = i.grade === 'normal' ? 0 : i.perfectStreakBefore + 1;
  const comboMult = 1 + Math.min(t.comboMax, Math.max(0, perfectStreak - 1) * t.comboStep);
  const stormMult = stormMultiplier(i.progress, t);

  const damage = i.hard;
  const cleanStreak = damage ? 0 : i.cleanStreakBefore + 1;
  const streakBonus = i.grade === 'normal' ? 0 : streakMilestone(perfectStreak, t);
  const cleanBonus = damage ? 0 : cleanMilestone(cleanStreak, t);

  const scaled = Math.round(subtotal * placementMult * comboMult * stormMult);
  const gained = scaled + streakBonus + cleanBonus;
  // zorluk ilerlemesi eski ölçekteydi: temel puan + (perfect ise +1)
  const progressGain = i.base + (i.grade === 'normal' ? 0 : 1);
  return {
    gained, subtotal, placementMult, comboMult, stormMult, parts,
    perfectStreak, cleanStreak, streakBonus, cleanBonus, damage, progressGain,
  };
}
