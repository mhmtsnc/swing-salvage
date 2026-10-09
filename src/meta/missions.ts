import { createRng, hashString } from '../core/rng';
import type { MissionSlot } from '../core/storage';
import type { MetricKey, RunMetrics } from './tally';

export interface MissionDef {
  id: string;
  metric: MetricKey;
  /** sum: koşular boyunca toplanır; best: tek koşuda ulaşılan en yüksek değer */
  kind: 'sum' | 'best';
  /** kolay / orta / zor hedefler */
  targets: [number, number, number];
  /** "{n}" hedefle değiştirilir */
  text: string;
}

export const MISSIONS: readonly MissionDef[] = [
  { id: 'deliver', metric: 'delivered', kind: 'sum', targets: [8, 22, 50], text: 'Deliver {n} crates' },
  { id: 'perfects', metric: 'perfects', kind: 'sum', targets: [3, 9, 22], text: 'Land {n} PERFECT drops' },
  { id: 'flawless', metric: 'flawless', kind: 'sum', targets: [1, 4, 10], text: 'Land {n} FLAWLESS drops' },
  { id: 'streak', metric: 'streak', kind: 'best', targets: [2, 4, 7], text: 'Chain {n} PERFECTs in one run' },
  { id: 'ships', metric: 'ships', kind: 'best', targets: [2, 3, 5], text: 'Reach ship {n}' },
  { id: 'score', metric: 'score', kind: 'best', targets: [30, 80, 170], text: 'Score {n} in one run' },
  { id: 'sweet', metric: 'sweet', kind: 'sum', targets: [2, 6, 14], text: 'Hit the SWEET SPOT {n} times' },
  { id: 'saved', metric: 'saved', kind: 'sum', targets: [1, 3, 7], text: 'Rescue {n} sinking crates' },
  { id: 'close', metric: 'closeCall', kind: 'sum', targets: [2, 6, 12], text: 'Pull off {n} CLOSE CALLs' },
  { id: 'gust', metric: 'gustDrops', kind: 'sum', targets: [1, 4, 9], text: 'Land {n} crates during gusts' },
  { id: 'speedy', metric: 'speedy', kind: 'sum', targets: [3, 9, 20], text: 'Make {n} SPEEDY deliveries' },
  { id: 'swing', metric: 'swing', kind: 'sum', targets: [2, 6, 15], text: 'Land {n} crates out of a SWING' },
  { id: 'piano', metric: 'pianos', kind: 'sum', targets: [1, 3, 7], text: 'Deliver {n} pianos' },
  { id: 'ball', metric: 'balls', kind: 'sum', targets: [1, 3, 6], text: 'Deliver {n} buoys' },
  { id: 'tall', metric: 'tall', kind: 'sum', targets: [2, 6, 14], text: 'Stack {n} tall crates' },
  { id: 'wedge', metric: 'wedge', kind: 'sum', targets: [2, 6, 14], text: 'Deliver {n} wedges' },
  { id: 'clean', metric: 'clean', kind: 'best', targets: [3, 6, 10], text: 'Deliver {n} in a row with no damage' },
  { id: 'runs', metric: 'runs', kind: 'sum', targets: [2, 4, 8], text: 'Play {n} runs' },
];

export const TIER_NAMES = ['EASY', 'MEDIUM', 'HARD'] as const;
export const TIER_XP = [30, 70, 140] as const;
export const DAILY_MISSION_XP = 60;
/** Zor görev ve günlük görev kasa verir */
export const TIER_CRATES = [0, 0, 1] as const;

export function defById(id: string): MissionDef {
  const d = MISSIONS.find((m) => m.id === id);
  if (!d) throw new Error(`unknown mission ${id}`);
  return d;
}

export function targetOf(slot: Pick<MissionSlot, 'id' | 'tier'>): number {
  return defById(slot.id).targets[slot.tier];
}

export function missionText(slot: Pick<MissionSlot, 'id' | 'tier'>): string {
  return defById(slot.id).text.replace('{n}', String(targetOf(slot)));
}

/** Aynı anda aynı ölçütü iki kez vermemek için seçim (saf, tohumlu). */
export function pickMission(counter: number, tier: 0 | 1 | 2, taken: readonly string[]): string {
  const rng = createRng(`mission:${counter}:${tier}`);
  const pool = MISSIONS.filter((m) => !taken.includes(m.id) && !(tier === 2 && m.id === 'runs'));
  return pool[Math.floor(rng.next() * pool.length)].id;
}

export function newMissionSet(counter: number): { slots: MissionSlot[]; counter: number } {
  const slots: MissionSlot[] = [];
  let c = counter;
  for (const tier of [0, 1, 2] as const) {
    slots.push({ id: pickMission(c++, tier, slots.map((s) => s.id)), tier, progress: 0 });
  }
  return { slots, counter: c };
}

export function advance(slot: { id: string; progress: number }, m: RunMetrics): number {
  const d = defById(slot.id);
  const v = m[d.metric];
  return d.kind === 'sum' ? slot.progress + v : Math.max(slot.progress, v);
}

export interface CompletedMission {
  id: string;
  tier: 0 | 1 | 2;
  target: number;
  daily: boolean;
}

/** Koşu sonu: ilerlemeyi işler; biten görevin yerine AYNI kademeden yenisi gelir. */
export function progressMissions(
  slots: readonly MissionSlot[],
  counter: number,
  m: RunMetrics,
): { slots: MissionSlot[]; counter: number; completed: CompletedMission[] } {
  let c = counter;
  const out: MissionSlot[] = [];
  const completed: CompletedMission[] = [];
  for (const s of slots) {
    const next = advance(s, m);
    if (next >= targetOf(s)) {
      completed.push({ id: s.id, tier: s.tier, target: targetOf(s), daily: false });
      const taken = [...slots.map((x) => x.id), ...out.map((x) => x.id)];
      out.push({ id: pickMission(c++, s.tier, taken), tier: s.tier, progress: 0 });
    } else {
      out.push({ ...s, progress: next });
    }
  }
  return { slots: out, counter: c, completed };
}

/** Koşu içinde canlı bildirim için: şu ana kadarki metriklerle bitecek görev kimlikleri. */
export function wouldComplete(slots: readonly MissionSlot[], m: RunMetrics): string[] {
  return slots.filter((s) => advance(s, m) >= targetOf(s)).map((s) => s.id);
}

/** Günün görevi: tarihe göre deterministik, orta kademe. */
export function dailyMissionId(date: string): string {
  return MISSIONS.filter((m) => m.id !== 'runs')[hashString(`daily-mission:${date}`) % (MISSIONS.length - 1)].id;
}
