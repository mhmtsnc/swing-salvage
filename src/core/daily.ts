import { dailyNumber, dailySeed } from './rng';
import type { DailyState } from './storage';

const DAY_MS = 86_400_000;

export function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function previousDay(date: string): string {
  return utcDateString(new Date(Date.parse(date + 'T00:00:00Z') - DAY_MS));
}

export interface DailyInfo {
  date: string;
  number: number;
  seed: number;
}

/** Bugünün (UTC) Daily Storm bilgisi: tarih, #N ve tohum (`hash("SS-"+tarih)`). */
export function dailyInfo(now: Date, epoch: string): DailyInfo {
  const date = utcDateString(now);
  return { date, number: dailyNumber(date, epoch), seed: dailySeed(date) };
}

/** Yeni güne geçildiyse deneme sayacı ve günün en iyisi sıfırlanır; oynanan günler ve seri korunur. */
export function rollover(state: DailyState, today: string): DailyState {
  if (state.date === today) return state;
  return { ...state, date: today, attemptsUsed: 0, best: 0 };
}

export function triesLeft(state: DailyState, today: string, perDay: number): number {
  const s = rollover(state, today);
  return Math.max(0, perDay - s.attemptsUsed);
}

/** Bir deneme başlar: sayaç artar, gün "oynandı" olarak işaretlenir, seri güncellenir. */
export function startAttempt(state: DailyState, today: string): DailyState {
  const s = rollover(state, today);
  const playedDays = s.playedDays.includes(today) ? s.playedDays : [...s.playedDays, today];
  let streak = s.streak;
  if (!s.playedDays.includes(today)) {
    streak = s.playedDays.includes(previousDay(today)) ? s.streak + 1 : 1;
  }
  return { ...s, attemptsUsed: s.attemptsUsed + 1, playedDays, streak };
}

export function finishAttempt(state: DailyState, today: string, score: number): DailyState {
  const s = rollover(state, today);
  return { ...s, best: Math.max(s.best, score) };
}
