// localStorage sarmalayıcı: `ss.` öneki, her erişim try/catch içinde, yoksa bellekte çalışır.
export const SCHEMA_VERSION = 1;

export interface Stats {
  runs: number;
  cratesLifetime: number;
  perfectsLifetime: number;
  bestShip: number;
  medals: { bronze: number; silver: number; gold: number; platinum: number };
}
export interface DailyState {
  date: string;
  attemptsUsed: number;
  best: number;
  playedDays: string[];
  streak: number;
}

export interface GhostData {
  score: number;
  /** Örnekleme aralığı, sn */
  dt: number;
  /** x, y, yön (−1/+1) üçlüleri düz dizi */
  samples: number[];
  /** [zaman, skor] çiftleri */
  scores: [number, number][];
}

export interface StorageSchema {
  'ss.v': number;
  'ss.best': number;
  'ss.stats': Stats;
  'ss.paint': string;
  'ss.unlocks': string[];
  'ss.settings': { sound: boolean; haptics: boolean };
  'ss.onboard': { drag: boolean; hook: boolean; drop: boolean };
  'ss.daily': DailyState;
  'ss.ads': { lastInterstitialAt: number; runsSinceInterstitial: number };
  'ss.tuning': Record<string, unknown>;
  'ss.ghost': GhostData;
}
export type StorageKey = keyof StorageSchema;

export const DEFAULTS: StorageSchema = {
  'ss.v': SCHEMA_VERSION,
  'ss.best': 0,
  'ss.stats': {
    runs: 0,
    cratesLifetime: 0,
    perfectsLifetime: 0,
    bestShip: 0,
    medals: { bronze: 0, silver: 0, gold: 0, platinum: 0 },
  },
  'ss.paint': 'rescue',
  'ss.unlocks': [],
  'ss.settings': { sound: true, haptics: true },
  'ss.onboard': { drag: false, hook: false, drop: false },
  'ss.daily': { date: '', attemptsUsed: 0, best: 0, playedDays: [], streak: 0 },
  'ss.ads': { lastInterstitialAt: 0, runsSinceInterstitial: 0 },
  'ss.tuning': {},
  'ss.ghost': { score: 0, dt: 0.2, samples: [], scores: [] },
};

const memory = new Map<string, string>();

function backend(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function getItem<K extends StorageKey>(key: K): StorageSchema[K] {
  let raw: string | null | undefined;
  try {
    raw = backend()?.getItem(key);
  } catch {
    raw = undefined;
  }
  if (raw == null) raw = memory.get(key);
  if (raw == null) return clone(DEFAULTS[key]);
  try {
    const parsed = JSON.parse(raw) as StorageSchema[K];
    const def = DEFAULTS[key];
    if (typeof def === 'object' && def !== null && !Array.isArray(def) && typeof parsed === 'object' && parsed !== null) {
      return { ...clone(def), ...parsed };
    }
    return parsed;
  } catch {
    return clone(DEFAULTS[key]);
  }
}

export function setItem<K extends StorageKey>(key: K, value: StorageSchema[K]): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    backend()?.setItem(key, raw);
  } catch {
    /* bellekteki kopya yeterli */
  }
}

/** Açılışta şema sürümünü işaretler. */
export function initStorage(): void {
  if (getItem('ss.v') !== SCHEMA_VERSION) setItem('ss.v', SCHEMA_VERSION);
}
