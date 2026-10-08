import type { FailKind } from '../game/Run';

export type ShareSymbol = 'c' | 'p';

export interface ShareInput {
  mode: 'daily' | 'normal';
  dailyNumber?: number;
  score: number;
  ships: number;
  perfects: number;
  /** Teslim edilen her kargo: 'c' sıradan, 'p' PERFECT */
  log: readonly ShareSymbol[];
  death: FailKind | null;
  storeUrl: string;
}

export const MAX_SYMBOLS = 20;
const DEATH: Record<FailKind, string> = { splash: '💦', crash: '💥', topple: '🙃' };

/** §15.3 paylaşım metni (saf). En fazla 20 sembol gösterilir, fazlası "+k". */
export function buildShareText(i: ShareInput): string {
  const title =
    i.mode === 'daily' ? `Swing Salvage · Daily Storm #${i.dailyNumber ?? 1}` : `Swing Salvage · I scored ${i.score}!`;
  const ships = `${i.ships} ${i.ships === 1 ? 'ship' : 'ships'}`;
  const stats = `📦 ${i.score} pts · 🚢 ${ships} · ⭐ ${i.perfects} perfect`;
  const shown = i.log.slice(0, MAX_SYMBOLS).map((s) => (s === 'p' ? '⭐' : '🟧')).join('');
  const extra = i.log.length > MAX_SYMBOLS ? `+${i.log.length - MAX_SYMBOLS}` : '';
  const row = `${shown}${extra}${i.death ? DEATH[i.death] : ''}`;
  return [title, stats, row, i.storeUrl].join('\n');
}
