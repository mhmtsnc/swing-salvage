import { ZZFX } from 'zzfx';
import { getItem } from './storage';

// ZzFX parametre sırası:
// [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide,
//  pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo, filter]
type P = (number | undefined)[];

/** Her ses ≤ 1,2 sn. İsimli sabitler (§14). */
export const SOUNDS = {
  spawn: [0.5, , 260, 0.005, 0.02, 0.09, 0, 1.2, 14, , , , , , , , , 0.7, 0.03],
  pickup: [0.6, , 1250, 0.001, 0.01, 0.08, 1, 1.6, , , 420, 0.02, , , , , , 0.6, 0.02],
  release: [0.5, , 110, 0.004, 0.03, 0.12, 0, 1.5, -6, , , , , , , , , , 0.04],
  land: [0.7, 0.05, 190, 0.001, 0.01, 0.09, 4, 2, , , , , , , , , , 0.6, 0.02, , 320],
  land_hard: [0.9, 0.05, 95, 0.001, 0.02, 0.16, 4, 2.5, -4, , , , , 0.2, , , , 0.7, 0.03, , 180],
  perfect: [0.55, , 880, 0.004, 0.05, 0.4, 0, 1.1, , , , , , , , , , 0.8, 0.1, 0.12],
  steady_a: [0.55, , 523, 0.004, 0.04, 0.2, 0, 1.1, , , , , , , , , , 0.8, 0.06],
  gust_warn: [0.4, , 260, 0.7, 0, 0.3, 4, 1.4, 1.2, 0.2, , , , 0.1, , , , 0.9, 0.1, , 600],
  thunder: [0.9, , 48, 0.1, 0.45, 0.65, 4, 2.5, -2, , , , , , , , , 0.6, 0.2, , 120],
  horn_a: [0.55, , 150, 0.03, 0.25, 0.1, 2, 1.3, , , , , , , , , , 0.9, 0.05, , 900],
  horn_b: [0.55, , 112, 0.03, 0.25, 0.1, 2, 1.3, , , , , , , , , , 0.9, 0.05, , 900],
  splash: [0.85, 0.1, 210, 0.005, 0.06, 0.42, 4, 2, -5, , , , , 0.4, , , , 0.5, 0.1, , 700],
  crash: [0.95, 0.1, 130, 0.001, 0.05, 0.4, 4, 3, -8, , , , 0.05, 0.6, , , , 0.6, 0.1, , 400],
  topple: [0.75, 0.1, 160, 0.001, 0.02, 0.35, 4, 1.4, -3, , , , 0.06, 0.4, , , , 0.7, 0.06, , 300],
  new_best_a: [0.55, , 523, 0.004, 0.05, 0.2, 0, 1.1, , , , , , , , , , 0.8, 0.05],
  medal: [0.6, , 1568, 0.002, 0.02, 0.5, 0, 1, , , , , , , , , 0.1, 0.8, 0.12, 0.3],
  tap: [0.35, , 1100, 0.001, 0.005, 0.03, 1, 1.5],
  // v1.1: temas, halat ve ödül sesleri
  creak: [0.3, 0.1, 90, 0.01, 0.08, 0.15, 2, 2, , , , , , 0.1, , , , 0.6, 0.03, , 500],
  clack: [0.5, 0.1, 380, 0.001, 0.01, 0.05, 4, 2, , , , , , 0.2, , , , 0.7, 0.01, , 1500],
  snap: [0.9, 0.1, 700, 0.001, 0.01, 0.12, 4, 3, -30, , , , , 0.7, , , , 0.5, 0.02, , 2500],
  splash_small: [0.5, 0.1, 300, 0.001, 0.03, 0.2, 4, 2, -3, , , , , 0.3, , , , 0.5, 0.05, , 1200],
  save: [0.55, , 660, 0.01, 0.06, 0.25, 0, 1.2, 8, , 220, 0.06, , , , , , 0.8, 0.06],
  sweet: [0.5, , 1320, 0.005, 0.03, 0.3, 0, 1, , , 330, 0.05, , , , , , 0.8, 0.08, 0.1],
} satisfies Record<string, P>;

export type SoundName = keyof typeof SOUNDS | 'steady' | 'horn' | 'new_best';

const SEQUENCES: Record<'steady' | 'horn' | 'new_best', { at: number; name: keyof typeof SOUNDS; semis: number }[]> = {
  steady: [
    { at: 0, name: 'steady_a', semis: 0 },
    { at: 0.09, name: 'steady_a', semis: 4 },
    { at: 0.18, name: 'steady_a', semis: 7 },
  ],
  horn: [
    { at: 0, name: 'horn_a', semis: 0 },
    { at: 0.32, name: 'horn_b', semis: 0 },
  ],
  new_best: [
    { at: 0, name: 'new_best_a', semis: 0 },
    { at: 0.12, name: 'new_best_a', semis: 4 },
    { at: 0.24, name: 'new_best_a', semis: 7 },
    { at: 0.36, name: 'new_best_a', semis: 12 },
  ],
};

const MASTER_VOLUME = 0.6;
const cache = new Map<string, number[]>();
let soundOn = true;
let unlocked = false;

export function refreshAudioSettings(): void {
  soundOn = getItem('ss.settings').sound;
  if (!soundOn) loops.mute();
}

function ctx(): AudioContext {
  return ZZFX.audioContext;
}

function samples(name: keyof typeof SOUNDS): number[] {
  let s = cache.get(name);
  if (!s) {
    s = ZZFX.buildSamples(...(SOUNDS[name] as P));
    cache.set(name, s);
  }
  return s;
}

function playOne(name: keyof typeof SOUNDS, semis: number, vol: number): void {
  try {
    ZZFX.volume = MASTER_VOLUME;
    ZZFX.playSamples([samples(name)], vol, Math.pow(2, semis / 12));
  } catch {
    /* ses asla oyunu bozmasın */
  }
}

/** Ses çal. Ses kapalıyken, kilit açılmadan veya sekme gizliyken hiçbir şey çalmaz. */
export function play(name: SoundName, opts: { semis?: number; vol?: number } = {}): void {
  if (!soundOn || !unlocked || (typeof document !== 'undefined' && document.hidden)) return;
  const semis = opts.semis ?? 0;
  const vol = opts.vol ?? 1;
  if (name in SEQUENCES) {
    for (const step of SEQUENCES[name as keyof typeof SEQUENCES]) {
      setTimeout(() => playOne(step.name, semis + step.semis, vol), step.at * 1000);
    }
    return;
  }
  playOne(name as keyof typeof SOUNDS, semis, vol);
}

/** İlk dokunmada ses bağlamını açar; sekme gizlenince susturur, dönünce açar. */
export function initAudio(): void {
  refreshAudioSettings();
  const unlock = (): void => {
    unlocked = true;
    ctx().resume().catch(() => undefined);
  };
  window.addEventListener('pointerdown', unlock, { once: false, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx().suspend().catch(() => undefined);
    else if (unlocked) ctx().resume().catch(() => undefined);
  });
}

// ───────── Döngü sesleri (OPSİYONEL): rotor ve yağmur ─────────

const ROTOR_VOLUME = 0.05;
const RAIN_VOLUME = 0.05;
const WIND_VOLUME = 0.07;
const LFO_MIN = 14;
const LFO_MAX = 20;

class Loops {
  private built = false;
  private rotorGain!: GainNode;
  private lfo!: OscillatorNode;
  private rainGain!: GainNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;

  private noiseBuffer(): AudioBuffer {
    const c = ctx();
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private build(): void {
    const c = ctx();
    const noise = this.noiseBuffer();

    const rotorSrc = c.createBufferSource();
    rotorSrc.buffer = noise;
    rotorSrc.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    this.rotorGain = c.createGain();
    this.rotorGain.gain.value = 0;
    // 16 Hz LFO kazancı %50 modüle eder
    const mod = c.createGain();
    mod.gain.value = 0.5;
    this.lfo = c.createOscillator();
    this.lfo.frequency.value = 16;
    const lfoDepth = c.createGain();
    lfoDepth.gain.value = 0.5;
    const am = c.createGain();
    am.gain.value = 0.5;
    this.lfo.connect(lfoDepth);
    lfoDepth.connect(am.gain);
    rotorSrc.connect(lp);
    lp.connect(am);
    am.connect(this.rotorGain);
    this.rotorGain.connect(c.destination);
    rotorSrc.start();
    this.lfo.start();
    void mod;

    const rainSrc = c.createBufferSource();
    rainSrc.buffer = noise;
    rainSrc.loop = true;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;
    const lp2 = c.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = 6000;
    this.rainGain = c.createGain();
    this.rainGain.gain.value = 0;
    rainSrc.connect(hp);
    hp.connect(lp2);
    lp2.connect(this.rainGain);
    this.rainGain.connect(c.destination);
    rainSrc.start();

    // rüzgâr uğultusu: bant geçiren gürültü; şiddet arttıkça hem ses hem frekans yükselir
    const windSrc = c.createBufferSource();
    windSrc.buffer = noise;
    windSrc.loop = true;
    this.windFilter = c.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 350;
    this.windFilter.Q.value = 0.9;
    this.windGain = c.createGain();
    this.windGain.gain.value = 0;
    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(c.destination);
    windSrc.start();
    this.built = true;
  }

  mute(): void {
    if (!this.built) return;
    this.rotorGain.gain.value = 0;
    this.rainGain.gain.value = 0;
    this.windGain.gain.value = 0;
  }

  /** `active`: koşu sürüyor mu; `speedFrac`: helikopter hızı / maxSpeed; `rain`: 0..1 */
  update(active: boolean, speedFrac: number, rain: number, wind = 0): void {
    if (!soundOn || !unlocked || document.hidden) {
      this.mute();
      return;
    }
    if (!this.built) this.build();
    const t = ctx().currentTime;
    this.rotorGain.gain.setTargetAtTime(active ? ROTOR_VOLUME : ROTOR_VOLUME * 0.5, t, 0.1);
    this.lfo.frequency.setTargetAtTime(LFO_MIN + (LFO_MAX - LFO_MIN) * Math.min(1, Math.max(0, speedFrac)), t, 0.1);
    this.rainGain.gain.setTargetAtTime(RAIN_VOLUME * rain, t, 0.3);
    this.windGain.gain.setTargetAtTime(active ? WIND_VOLUME * Math.min(1.5, wind) : 0, t, 0.25);
    this.windFilter.frequency.setTargetAtTime(280 + 420 * Math.min(1.5, wind), t, 0.25);
  }
}

export const loops = new Loops();
