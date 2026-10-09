export const RANK_TITLES = [
  'Deckhand', 'Rigger', 'Winch Hand', 'Cargo Pilot', 'Storm Flyer', 'Salvage Ace',
  'Hook Master', 'Gale Rider', 'Sky Captain', 'Tempest King', 'Legend of the Deep',
] as const;

/** Rütbe n → n+1 için gereken XP. */
export function xpForRank(rank: number): number {
  return 100 + 45 * rank;
}

export interface RankInfo {
  rank: number;
  title: string;
  /** Bu rütbede biriken XP */
  into: number;
  /** Sonraki rütbe için gereken */
  need: number;
}

export function rankFor(xp: number): RankInfo {
  let rank = 0;
  let left = Math.max(0, Math.floor(xp));
  while (left >= xpForRank(rank)) {
    left -= xpForRank(rank);
    rank++;
  }
  const title = RANK_TITLES[Math.min(rank, RANK_TITLES.length - 1)];
  return { rank, title: rank >= RANK_TITLES.length ? `${title} ${rank - RANK_TITLES.length + 2}` : title, into: left, need: xpForRank(rank) };
}

/** Koşu XP'si: skorun bir kısmı, teslimat ve perfect. */
export function runXp(score: number, delivered: number, perfects: number): number {
  return Math.floor(score * 0.4) + delivered * 2 + perfects;
}
