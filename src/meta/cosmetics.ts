import type { Rng } from '../core/rng';

export type Rarity = 'common' | 'rare' | 'epic';
export type CosmeticKind = 'paint' | 'trail';

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  rarity: Rarity;
  /** free: baştan açık; cond: sabit şart (unlocks.ts); crate: kasadan */
  source: 'free' | 'cond' | 'crate';
}

export const COSMETICS: readonly Cosmetic[] = [
  { id: 'rescue', kind: 'paint', rarity: 'common', source: 'free' },
  { id: 'sunny', kind: 'paint', rarity: 'common', source: 'cond' },
  { id: 'mint', kind: 'paint', rarity: 'common', source: 'cond' },
  { id: 'navy', kind: 'paint', rarity: 'rare', source: 'cond' },
  { id: 'paper', kind: 'paint', rarity: 'rare', source: 'cond' },
  { id: 'gold', kind: 'paint', rarity: 'epic', source: 'cond' },
  { id: 'coral', kind: 'paint', rarity: 'common', source: 'crate' },
  { id: 'lavender', kind: 'paint', rarity: 'common', source: 'crate' },
  { id: 'teal', kind: 'paint', rarity: 'common', source: 'crate' },
  { id: 'charcoal', kind: 'paint', rarity: 'rare', source: 'crate' },
  { id: 'tangerine', kind: 'paint', rarity: 'rare', source: 'crate' },
  { id: 'candy', kind: 'paint', rarity: 'rare', source: 'crate' },
  { id: 'midnight', kind: 'paint', rarity: 'epic', source: 'crate' },
  { id: 'aurora', kind: 'paint', rarity: 'epic', source: 'crate' },
  { id: 'none', kind: 'trail', rarity: 'common', source: 'free' },
  { id: 'sparks', kind: 'trail', rarity: 'common', source: 'crate' },
  { id: 'bubbles', kind: 'trail', rarity: 'common', source: 'crate' },
  { id: 'smoke', kind: 'trail', rarity: 'rare', source: 'crate' },
  { id: 'leaves', kind: 'trail', rarity: 'rare', source: 'crate' },
  { id: 'confetti', kind: 'trail', rarity: 'epic', source: 'crate' },
  { id: 'stars', kind: 'trail', rarity: 'epic', source: 'crate' },
];

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 70, rare: 25, epic: 5 };
/** Kasa açılışında tüm kozmetikler açıksa verilen XP */
export const DUPLICATE_XP = 60;

export type CrateReward = { kind: 'cosmetic'; item: Cosmetic } | { kind: 'xp'; amount: number };

/** Hâlâ kilitli kasa kozmetikleri. */
export function lockedCrateItems(owned: readonly string[]): Cosmetic[] {
  return COSMETICS.filter((c) => c.source === 'crate' && !owned.includes(c.id));
}

/** Kasa aç (saf): nadirliğe göre ağırlıklı, sadece kilitli kozmetikler; hepsi açıksa XP. */
export function rollCrate(rng: Rng, owned: readonly string[], guaranteeRarity?: Rarity): CrateReward {
  let pool = lockedCrateItems(owned);
  if (pool.length === 0) return { kind: 'xp', amount: DUPLICATE_XP };
  if (guaranteeRarity) {
    const better = pool.filter((c) => c.rarity === guaranteeRarity || c.rarity === 'epic');
    if (better.length) pool = better;
  }
  const idx = rng.pick(pool.map((c) => RARITY_WEIGHT[c.rarity]));
  return { kind: 'cosmetic', item: pool[idx] };
}

export function cosmeticById(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}
