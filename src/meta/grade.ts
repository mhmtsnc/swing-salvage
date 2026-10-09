export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface GradeInput {
  score: number;
  delivered: number;
  perfects: number;
}

/** Koşu notu: skor eşikleri; S için ayrıca ≥%50 isabet (perfect/teslimat). */
export function gradeFor(i: GradeInput): Grade {
  const acc = i.delivered > 0 ? i.perfects / i.delivered : 0;
  if (i.score >= 150 && acc >= 0.5) return 'S';
  if (i.score >= 80) return 'A';
  if (i.score >= 40) return 'B';
  if (i.score >= 15) return 'C';
  return 'D';
}

export const GRADE_ORDER: readonly Grade[] = ['D', 'C', 'B', 'A', 'S'];
