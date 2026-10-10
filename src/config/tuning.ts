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
    marginX: 70, minY: 175, maxYAboveSea: 165,   // y <= seaY - 165
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
    // v1.1: farklı boyut ve şekiller
    tall:   { w: 44,  h: 90, density: 0.0020, handling: 0.95, points: 2, minScore: 12, weight: 14, chamfer: 4 },
    wedge:  { w: 84,  h: 52, density: 0.0021, handling: 1.00, points: 2, minScore: 16, weight: 12, chamfer: 2, shape: 'trapezoid', slope: 0.45 },
    ball:   { w: 54,  h: 54, density: 0.0018, handling: 0.95, points: 4, minScore: 24, weight: 8,  chamfer: 0, shape: 'circle' },
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
    // v1.1
    flawlessMaxDx: 3, flawlessMaxAngleDeg: 1.5, flawlessMaxImpact: 90,
    rescueGrace: 0.35,                     // suya batan taşınan kargo bu süre içinde çıkarılırsa kurtarılır
    closeCallDist: 14, closeCallTime: 0.45,
    sweetSpotMaxDx: 14,
    hardKick: 0.3,                         // sert inişte yana kayma katsayısı (px/s etkisi = impact * hardKick)
  },
  // v1.1: puanlama (src/game/scoring.ts)
  scoring: {
    perfectMult: 2, flawlessMult: 3,
    comboStep: 0.1, comboMax: 0.9,          // seri başına +%10, en fazla +%90
    swingMin: [15, 25, 35],                 // derece eşikleri → +1, +2, +3
    risk: { closeCall: 1, gustHook: 1, gustLanding: 2, saved: 3 },
    speedy: [3, 5, 7],                      // sn eşikleri → +3, +2, +1
    sweetSpot: 2,
    streakBonus: { 3: 2, 5: 3, 8: 5, 10: 8 }, repeatEvery: 5, repeatBonus: 8,
    cleanBonus: { 4: 2, 8: 4, 12: 6 }, cleanRepeatEvery: 4, cleanRepeatBonus: 6,
    stormPerPoint: 1 / 120, stormMax: 2.5,   // fırtına çarpanı = 1 + ilerleme/120, en fazla 2.5
  },
  ropeLoad: { breakG: 4.6, breakTime: 0.15, warnFrac: 0.6, smoothTau: 0.1 },   // gövde ivmesine dayalı halat yükü (g)
  ghost: { sampleEvery: 0.2 },
  // v1.1: sonsuz zorluk. 60 puandan sonra parametreler bu sınırlara doğru `span` puan boyunca yaklaşır.
  endless: { span: 140, windBase: 0.65, gustInterval: 3.8, gustForce: 2.3, rollAmpDeg: 8.0, rollPeriod: 2.9, waveAmp: 26, rain: 1.0 },
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
    veerFromScore: 12, veerPeriod: 26,   // v1.1: temel rüzgâr yönü sinüsle değişir (ilerleme puanı ≥ veerFromScore)
  },
  spawn: { minSeparation: 40 },
  medals: { bronze: 20, silver: 60, gold: 120, platinum: 200 },   // v1.1: çarpanlı skora göre
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

/** `over` içindeki sayıları/dizileri `target` üzerine yerinde yazar; bilinmeyen anahtarlar yok sayılır. */
function assignDeep(target: unknown, over: unknown): void {
  if (!isPlainObject(target) || !isPlainObject(over)) return;
  for (const k of Object.keys(over)) {
    if (!(k in target)) continue;
    const t = target[k];
    const o = over[k];
    if (Array.isArray(t)) {
      if (Array.isArray(o)) {
        o.forEach((item, i) => {
          if (i >= t.length) return;
          if (isPlainObject(t[i])) assignDeep(t[i], item);
          else if (typeof item === typeof t[i]) t[i] = item;
        });
      }
    } else if (isPlainObject(t)) {
      assignDeep(t, o);
    } else if (typeof o === typeof t) {
      target[k] = o;
    }
  }
}

function readOverrides(): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(TUNING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let current: Tuning | null = null;

/** TUNING varsayılanları ile `ss.tuning` geçersiz kılmalarının derin birleşimi. Tek örnek: panel bunu canlı düzenler. */
export function getTuning(): Tuning {
  if (!current) {
    current = structuredClone(TUNING) as Tuning;
    assignDeep(current, readOverrides());
  }
  return current;
}

/** Panelden Save: geçerli değerleri `ss.tuning`'e yazar. */
export function saveTuning(): void {
  try {
    globalThis.localStorage?.setItem(TUNING_KEY, JSON.stringify(getTuning()));
  } catch {
    /* kayıt yoksa sessizce geç */
  }
}

/** Panelden Reset: varsayılanlara döner ve `ss.tuning`'i siler. */
export function resetTuning(): void {
  try {
    globalThis.localStorage?.removeItem(TUNING_KEY);
  } catch {
    /* yoksay */
  }
  assignDeep(getTuning(), TUNING);
}
