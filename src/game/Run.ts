import type { Tuning } from '../config/tuning';
import type { Grade, ScoreResult } from './scoring';

export type RunState = 'READY' | 'PLAYING' | 'SWAPPING' | 'FAILING' | 'GAME_OVER' | 'PAUSED' | 'RESUMING';
export type FailKind = 'splash' | 'crash' | 'topple';
export type RunMode = 'normal' | 'daily';


/** Koşu durumu ve puanlama (saf). Fizik kuralları GameScene'dedir. */
export class Run {
  state: RunState = 'READY';
  score = 0;
  /** Zorluk ilerlemesi (eski ölçekli puan: temel + perfect +1 + gemi bonusu). Çarpanlı skordan ayrıdır. */
  progress = 0;
  /** Ardışık PERFECT serisi */
  streak = 0;
  /** Hasarsız teslimat serisi */
  cleanStreak = 0;
  shipIndex = 0;
  /** Bu gemide STACKED sayısı */
  stacked = 0;
  delivered = 0;
  perfects = 0;
  failKind: FailKind | null = null;
  mode: RunMode = 'normal';
  secondChanceUsed = false;
  /** Teslim edilen her kargo: 'c' sıradan, 'p' PERFECT (paylaşım satırı) */
  log: ('c' | 'p')[] = [];
  /** PAUSED öncesi durum */
  private pausedFrom: RunState = 'PLAYING';

  constructor(private t: Tuning) {}

  reset(state: RunState = 'READY', startScore = 0): void {
    this.state = state;
    this.score = startScore;
    this.progress = startScore;
    this.streak = 0;
    this.cleanStreak = 0;
    this.shipIndex = 0;
    this.stacked = 0;
    this.delivered = 0;
    this.perfects = 0;
    this.failKind = null;
    this.log = [];
    this.secondChanceUsed = false;
  }

  get quota(): number {
    const q = this.t.ship.quota;
    return q[Math.min(this.shipIndex, q.length - 1)];
  }

  get active(): boolean {
    return this.state === 'PLAYING' || this.state === 'SWAPPING';
  }

  start(): void {
    if (this.state === 'READY') this.state = 'PLAYING';
  }

  /** STACKED olduğunda: `scorePlacement` sonucunu işler. */
  commit(r: ScoreResult, grade: Grade): void {
    this.score += r.gained;
    this.progress += r.progressGain;
    this.streak = r.perfectStreak;
    this.cleanStreak = r.cleanStreak;
    if (grade !== 'normal') this.perfects++;
    this.stacked++;
    this.delivered++;
    this.log.push(grade !== 'normal' ? 'p' : 'c');
  }

  beginSwap(): number {
    this.state = 'SWAPPING';
    this.score += this.t.ship.shipBonus;
    this.progress += this.t.ship.shipBonus;
    return this.t.ship.shipBonus;
  }

  endSwap(): void {
    this.shipIndex++;
    this.stacked = 0;
    this.state = 'PLAYING';
  }

  fail(kind: FailKind): void {
    if (this.state === 'FAILING' || this.state === 'GAME_OVER') return;
    this.failKind = kind;
    this.state = 'FAILING';
  }

  gameOver(): void {
    this.state = 'GAME_OVER';
  }

  /** Gemi dolu mu (STACKED = kota)? */
  get shipFull(): boolean {
    return this.stacked >= this.quota;
  }

  /** PLAYING/SWAPPING iken duraklatır. Değişiklik olduysa true. */
  pause(): boolean {
    if (this.state !== 'PLAYING' && this.state !== 'SWAPPING') return false;
    this.pausedFrom = this.state;
    this.state = 'PAUSED';
    return true;
  }

  resume(): boolean {
    if (this.state !== 'PAUSED') return false;
    this.state = this.pausedFrom;
    return true;
  }
}
