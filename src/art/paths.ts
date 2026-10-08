// docs/art/mockup-b.html'den taşınan SVG yolları (390 px genişlikli mockup koordinatları).
// Helikopter yolları mockup'ta `translate(205 240) rotate(-10) scale(.85)` grubunun yerel koordinatındadır; dönüşüm atlanır.

export const HELI = {
  body: 'M-58 4 C-58 -16 -44 -30 -20 -32 L30 -32 C44 -32 52 -24 54 -12 L58 -2 L120 -8 L124 -2 L58 14 C50 22 40 26 28 26 L-36 26 C-50 26 -58 18 -58 4 Z',
  fin: 'M110 -6 L122 -32 L132 -32 L126 -2 Z',
  shadeBelly: 'M-56 12 C-52 22 -45 26 -36 26 L28 26 C40 26 50 22 57 14 Z',
  shadeBoom: 'M58 6 L122 -4 L124 -2 L58 14 Z',
  window: 'M-54 0 C-52 -16 -40 -26 -20 -27 L-12 -27 L-12 2 Z',
  glint: 'M-44 -12 C-40 -19 -33 -22 -26 -23',
  seam: 'M-6 -30 L-6 24',
  skids: 'M-26 26 L-30 38 M22 26 L26 38 M-44 38 L40 38 M-44 38 Q-52 38 -54 32',
  motion: 'M-82 -56 Q0 -66 84 -56',
} as const;

export const CLOUD_BACK =
  'M-20 262 C14 226 62 230 84 250 C112 214 172 218 196 246 C226 222 276 226 296 252 C326 232 372 236 410 262 L410 0 L-20 0 Z';
export const CLOUD_FRONT =
  'M-20 196 C10 160 58 158 80 178 C102 132 168 130 190 168 C216 140 268 144 284 176 C310 152 368 156 410 190 L410 0 L-20 0 Z';
export const BOLT = 'M78 150 L58 222 L74 219 L50 300 L94 206 L77 209 L94 150 Z';

/** Mockup'tan kargo detay çizgileri (kutu yerel, 0..1 oranlarıyla kullanılır). */
export const MOCKUP_SCALE = 540 / 390;
