import { previousDay } from '../core/daily';
import type { MetaState } from '../core/storage';

export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;

export interface LoginResult {
  login: MetaState['login'];
  /** Bugün verilen günlük hediye kasa sayısı (0 = bugün zaten alınmış) */
  giftCrates: number;
  newDay: boolean;
  usedFreeze: boolean;
  /** Seri kırıldı mı */
  broke: boolean;
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000);
}

/**
 * Affedici giriş serisi (saf). Bir gün kaçırılırsa ve kalkan varsa seri korunur (kalkan harcanır);
 * her 7. günde bir kalkan kazanılır. Her yeni gün 1 kasa; 7'nin katı günlerde +1.
 */
export function loginUpdate(login: MetaState['login'], today: string): LoginResult {
  if (login.last === today) return { login, giftCrates: 0, newDay: false, usedFreeze: false, broke: false };
  let streak = login.streak;
  let freezes = login.freezes;
  let usedFreeze = false;
  let broke = false;
  if (!login.last) {
    streak = 1;
  } else {
    const gap = dayDiff(login.last, today);
    if (gap <= 1) {
      streak += 1;
    } else if (gap === 2 && freezes > 0 && previousDay(today) !== login.last) {
      freezes -= 1;
      usedFreeze = true;
      streak += 1;
    } else {
      broke = streak > 1;
      streak = 1;
    }
  }
  let gift = 1;
  if (streak > 0 && streak % FREEZE_EVERY === 0) {
    gift += 1;
    freezes = Math.min(MAX_FREEZES, freezes + 1);
  }
  return {
    login: { last: today, streak, freezes, bestStreak: Math.max(login.bestStreak, streak) },
    giftCrates: gift,
    newDay: true,
    usedFreeze,
    broke,
  };
}
