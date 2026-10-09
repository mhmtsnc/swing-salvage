import { dailyInfo } from '../core/daily';
import { createRng } from '../core/rng';
import { getItem, setItem, type MetaState } from '../core/storage';
import { TUNING } from '../config/tuning';
import { COSMETICS, cosmeticById, rollCrate, type CrateReward } from './cosmetics';
import { loginUpdate, type LoginResult } from './login';
import { dailyMissionId, newMissionSet } from './missions';
import { rankFor } from './rank';
import { evaluateUnlocks } from '../core/unlocks';
import type { PaintId } from '../config/palette';

export function loadMeta(): MetaState {
  return getItem('ss.meta');
}

export function saveMeta(m: MetaState): void {
  setItem('ss.meta', m);
}

/** Açılışta: görev setini kur, günlük girişi işle, günlük hediye kasasını ver. */
export function initMeta(now: Date = new Date()): { meta: MetaState; login: LoginResult } {
  const meta = loadMeta();
  if (meta.missions.length !== 3) {
    const set = newMissionSet(meta.missionCounter);
    meta.missions = set.slots;
    meta.missionCounter = set.counter;
  }
  const today = dailyInfo(now, TUNING.daily.epochUtc).date;
  if (!meta.daily || meta.daily.date !== today) {
    meta.daily = { date: today, id: dailyMissionId(today), progress: 0, done: false };
  }
  const login = loginUpdate(meta.login, today);
  meta.login = login.login;
  meta.crates += login.giftCrates;
  saveMeta(meta);
  return { meta, login };
}

/** Açık boyalar: sabit şartlı ve kasadan gelenler. */
export function unlockedPaints(): PaintId[] {
  const meta = loadMeta();
  const base = evaluateUnlocks(getItem('ss.stats'), getItem('ss.daily'));
  const owned = meta.owned.filter((id) => cosmeticById(id)?.kind === 'paint') as PaintId[];
  return [...base, ...owned];
}

export function unlockedTrails(): string[] {
  const meta = loadMeta();
  return ['none', ...meta.owned.filter((id) => cosmeticById(id)?.kind === 'trail')];
}

/** Bir kasa aç (varsa). Ödülü uygular ve kaydeder. */
export function openCrate(seed: number = Date.now() >>> 0): { reward: CrateReward; meta: MetaState } | null {
  const meta = loadMeta();
  if (meta.crates <= 0) return null;
  const rng = createRng(`crate:${seed}:${meta.counters.cratesOpened}`);
  // her 5. kasa en az "rare"/"epic" garantili
  const guarantee = (meta.counters.cratesOpened + 1) % 5 === 0 ? 'rare' : undefined;
  const reward = rollCrate(rng, meta.owned, guarantee);
  meta.crates -= 1;
  meta.counters.cratesOpened += 1;
  if (reward.kind === 'cosmetic') {
    meta.owned.push(reward.item.id);
    meta.fresh.push(reward.item.id);
  } else {
    meta.xp += reward.amount;
  }
  saveMeta(meta);
  return { reward, meta };
}

export function markSeen(id: string): void {
  const meta = loadMeta();
  if (!meta.fresh.includes(id)) return;
  meta.fresh = meta.fresh.filter((x) => x !== id);
  saveMeta(meta);
}

export function setTrail(id: string): void {
  const meta = loadMeta();
  meta.trail = id;
  saveMeta(meta);
}

export function currentRank() {
  return rankFor(loadMeta().xp);
}

export const TOTAL_COSMETICS = COSMETICS.length;
