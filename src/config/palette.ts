export const PALETTE = {
  sky: '#BCCBC7',
  cloudBack: '#A3B5B1',
  cloudFront: '#E9ECE4',
  lightning: '#F3C44E',
  seaBack: '#86AFA9',
  seaMid: '#659592',
  seaFront: '#477779',
  seaDeep: '#2E5A5F',
  foam: '#F4F1E8',
  shadow: '#1D2C2E',
  heliRed: '#D8573E',
  heliGlass: '#D6EBE8',
  ink: '#34474B',
  crate: '#E8AE3C',
  crateLine: '#B98221',
  wide: '#8FA65A',
  wideLine: '#667A3C',
  barrel: '#8C5A3C',
  barrelHoop: '#34474B',
  gold: '#F3C44E',
  goldLine: '#B98221',
  piano: '#24353A',
  pianoKeys: '#F2ECDF',
  tall: '#7C9CB5',
  tallLine: '#546E86',
  wedge: '#C98B5B',
  wedgeLine: '#8F5E38',
  ball: '#D8573E',
  ballBand: '#F7F3EA',
  hull: '#2F4858',
  hullStripe: '#F2ECDF',
  bridge: '#F2ECDF',
  deck: '#CDB497',
  roof: '#D8573E',
  rope: '#5A4636',
  uiPaper: '#F7F3EA',
  uiText: '#24353A',
  uiTextSoft: '#5B6E70',
  uiRed: '#BF4630',
  uiRedBase: '#8E3322',
  uiTeal: '#477779',
} as const;

/** Phaser renk sayısı (0xRRGGBB). */
export function hex(color: string): number {
  return parseInt(color.slice(1), 16);
}

/** Helikopter boyaları (§15.1). Kilit şartları src/core/unlocks.ts'de. */
export const PAINTS = [
  { id: 'rescue', color: '#D8573E' },
  { id: 'sunny', color: '#F3C44E' },
  { id: 'mint', color: '#5FB7A5' },
  { id: 'navy', color: '#2F4858' },
  { id: 'paper', color: '#F2ECDF' },
  { id: 'gold', color: '#D9A82E' },
] as const;
export type PaintId = (typeof PAINTS)[number]['id'];

export const MEDAL_COLORS = {
  bronze: '#C47F45',
  silver: '#A9B4B8',
  gold: '#E8AE3C',
  platinum: '#CFE6E4',
} as const;
