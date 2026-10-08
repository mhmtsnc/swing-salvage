export const STEP_MS = 1000 / 60;
export const MAX_STEPS_PER_FRAME = 4;

/** Sabit 60 Hz adımlı biriktirici: ekran tazeleme hızından bağımsız. */
export class FixedStepper {
  private acc = 0;

  /** Geçen süreyi (ms) ekler, bu karede atılacak adım sayısını döner (en fazla 4). */
  advance(deltaMs: number): number {
    this.acc += Math.min(deltaMs, STEP_MS * 10);
    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.acc -= STEP_MS;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    return steps;
  }

  reset(): void {
    this.acc = 0;
  }
}

/** Matter hızları adım başına px. px/s → px/adım. */
export function toStepVel(pxPerSec: number): number {
  return pxPerSec / 60;
}

/** px/s² ivmeyi bir adımda eklenecek hız farkına (px/adım) çevirir: v += a/60 (sn) → /60 (adım). */
export function toStepAcc(pxPerSec2: number): number {
  return pxPerSec2 / 3600;
}
