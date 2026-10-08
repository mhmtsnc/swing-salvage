export const TUNING = {
  world: {
    baseWidth: 540, baseHeight: 960,
    seaFromBottom: 220,            // seaY = H - 220
    gravityY: 1.0,
    positionIterations: 10, velocityIterations: 8, constraintIterations: 4,
  },
  heli: {
    startXFrac: 0.66, startY: 230,
    followGain: 6.0,               // 1/s
    maxSpeed: 430,                 // px/s
    accelTau: 0.16,                // s
    maxAccel: 1600,                // px/s^2
    dragRatio: 1.0,
    marginX: 55, minY: 140, maxYAboveSea: 165,   // y <= seaY - 165
    tiltPerVx: 0.0008, tiltMax: 0.30, tiltSmooth: 10, flipHysteresisVx: 40,
    winchOffsetY: 31,
    hitboxW: 110, hitboxH: 50,
    spriteScale: 1.0,              // mockup yerel helikopter birimleri x1.0
    windResponse: 0.30,
  },
  rope: { length: 190, stiffness: 0.92, damping: 0.06, reelTime: 0.35 },
  hook: { radius: 10, density: 0.004, frictionAir: 0.03, pickupRadius: 26 },
  cargoCommon: { friction: 0.8, frictionStatic: 1.0, restitution: 0, frictionAir: 0.015, slop: 0.02 },
  cargo: {
    crate:  { w: 72,  h: 56, density: 0.0020, handling: 1.00, points: 1, minScore: 0,  weight: 60, chamfer: 3 },
    wide:   { w: 116, h: 44, density: 0.0018, handling: 0.95, points: 1, minScore: 5,  weight: 25, chamfer: 3 },
    barrel: { w: 50,  h: 72, density: 0.0022, handling: 0.95, points: 1, minScore: 9,  weight: 20, chamfer: 8 },
    gold:   { w: 62,  h: 46, density: 0.0024, handling: 0.90, points: 3, minScore: 7,  weight: 6,  chamfer: 4, maxPerShip: 1 },
    piano:  { w: 104, h: 70, density: 0.0035, handling: 0.75, points: 2, minScore: 14, weight: 14, chamfer: 4 },
  },
  ship: {
    deckLeftX: 60, deckRightX: 260, deckAboveSea: 100,   // deckY = seaY - 100
    bridgeLeftX: -30, bridgeHeight: 105,
    mastX: 15, mastHeight: 175,
    lipWidth: 12, lipHeight: 14,
    bowTipX: 310,
    pivotX: 135, pivotAboveSea: 10,
    slotCentersX: [110, 210],
    friction: 0.9, frictionStatic: 1.2,
    heaveAmp: 3,
    quota: [5, 6, 7],              // sonrasi hep 7
    swapExitTime: 1.2, swapEnterTime: 1.2, swapBannerTime: 0.6,
    shipBonus: 2,
  },
  rules: {
    releaseContactTime: 0.18, releaseMaxSpeed: 150,
    nextSpawnDelay: 0.4,
    settleTime: 0.45, settleMaxSpeed: 14, settleMaxAngSpeed: 0.5,   // rad/s
    perfectMaxDx: 7, perfectMaxAngleDeg: 4, perfectMaxImpact: 170,
    perfectBonus: 1, steadyEvery: 5, steadyBonus: 3,
    waterMargin: 6, carriedGrace: 0.8,
    toppleDrop: 20, toppleAngleDeg: 35,
    hardLandingImpact: 220,
  },
  difficulty: [   // s = skor; aralarda lineer interpolasyon; 60 ustu sabit
    { s: 0,  windBase: 0.00, gustInterval: 9.0, gustForce: 0.00, rollAmpDeg: 1.5, rollPeriod: 4.6, waveAmp: 5,  rain: 0.20 },
    { s: 5,  windBase: 0.10, gustInterval: 9.0, gustForce: 0.60, rollAmpDeg: 2.5, rollPeriod: 4.4, waveAmp: 8,  rain: 0.40 },
    { s: 10, windBase: 0.18, gustInterval: 7.5, gustForce: 0.90, rollAmpDeg: 3.5, rollPeriod: 4.1, waveAmp: 11, rain: 0.60 },
    { s: 20, windBase: 0.25, gustInterval: 6.5, gustForce: 1.20, rollAmpDeg: 4.5, rollPeriod: 3.8, waveAmp: 14, rain: 0.80 },
    { s: 35, windBase: 0.32, gustInterval: 5.5, gustForce: 1.45, rollAmpDeg: 5.5, rollPeriod: 3.5, waveAmp: 17, rain: 1.00 },
    { s: 60, windBase: 0.40, gustInterval: 5.0, gustForce: 1.70, rollAmpDeg: 6.5, rollPeriod: 3.3, waveAmp: 20, rain: 1.00 },
  ],
  weather: {
    windAccelPerUnit: 120, gustAccelPerUnit: 300,   // px/s^2
    gustFromScore: 4,
    gustTelegraph: 1.0, gustDuration: 1.2, gustRamp: 0.2, gustIntervalJitter: 0.25,
    stackGustFactor: 0.05,
    lightningFromScore: 10, lightningMin: 10, lightningMax: 18,
  },
  spawn: { minSeparation: 40 },
  medals: { bronze: 10, silver: 25, gold: 45, platinum: 70 },
  fx: { failSlowMo: 0.3, failSlowMoTime: 0.7, gameOverInputLock: 0.4, shakeHard: 3, shakeFail: 6 },
  ads: { secondChanceMinScore: 5, interstitialEveryRuns: 3, interstitialMinGapSec: 150, interstitialMinSessionRuns: 4, interstitialMinRunSec: 25 },
  daily: { attemptsPerDay: 3, epochUtc: '2026-11-01' },
  unlocks: { sunny: 30, mint: 100, navy: 250, paperDays: 5 },
} as const;

export type Tuning = typeof TUNING;

const TUNING_KEY = 'ss.tuning';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge(base: unknown, over: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (isPlainObject(base) && isPlainObject(over)) {
    const out: Record<string, unknown> = { ...base };
    for (const k of Object.keys(over)) {
      out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
    }
    return out;
  }
  return over === undefined || typeof over !== typeof base ? base : over;
}

/** TUNING varsayılanları ile localStorage `ss.tuning` geçersiz kılmalarını derin birleştirir. */
export function getTuning(): Tuning {
  try {
    const raw = globalThis.localStorage?.getItem(TUNING_KEY);
    if (!raw) return TUNING;
    return deepMerge(TUNING, JSON.parse(raw)) as Tuning;
  } catch {
    return TUNING;
  }
}
