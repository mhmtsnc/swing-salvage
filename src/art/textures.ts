import Phaser from 'phaser';
import { PALETTE, PAINTS } from '../config/palette';
import type { Tuning } from '../config/tuning';
import { BOLT, CLOUD_BACK, CLOUD_FRONT, HELI, MOCKUP_SCALE } from './paths';

/** Her nesne dokusuna kâğıt gölgesi pişirilir (§13 Kural 2): her kenardan 8 px pay. */
export const PAD = 8;
const S = MOCKUP_SCALE;

type Ctx = CanvasRenderingContext2D;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

function shadow(ctx: Ctx, fn: () => void, color = 'rgba(29,44,46,0.30)', offY = 3, blur = 5): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowOffsetY = offY;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function line(ctx: Ctx, color: string, width: number, pts: [number, number][], alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

// ───────── Hava dokuları (yağmur, şimşek, bulut, rüzgâr şeridi) ─────────

export const RAIN_TILE = 256;

function makeWeather(scene: Phaser.Scene): void {
  make(scene, 'rain_a', RAIN_TILE, RAIN_TILE, (ctx) => {
    const k = S;
    const drops: [number, number][] = [[20, 30], [90, 150], [150, 70], [210, 200], [60, 220], [180, 10], [120, 110]];
    for (const [x, y] of drops) line(ctx, '#FFFFFF', 2 * k, [[x, y], [x - 4 * k, y + 11 * k]], 0.75);
  });
  make(scene, 'rain_b', RAIN_TILE, RAIN_TILE, (ctx) => {
    const k = S;
    const drops: [number, number][] = [[40, 60], [130, 20], [200, 130], [100, 190], [230, 240], [10, 160]];
    for (const [x, y] of drops) line(ctx, '#FFFFFF', 1.6 * k, [[x, y], [x - 3 * k, y + 9 * k]], 0.5);
  });

  const cloud = (key: string, path: string, color: string) =>
    make(scene, key, 430 * S, 330 * S, (ctx) => {
      ctx.scale(S, S);
      ctx.translate(20, 0);
      shadow(ctx, () => {
        ctx.fillStyle = color;
        ctx.fill(new Path2D(path));
      }, 'rgba(29,44,46,0.22)', 5, 4);
    });
  cloud('cloud_back', CLOUD_BACK, PALETTE.cloudBack);
  cloud('cloud_front', CLOUD_FRONT, PALETTE.cloudFront);

  make(scene, 'bolt', 60 * S + 2 * PAD, 160 * S + 2 * PAD, (ctx) => {
    ctx.translate(PAD, PAD);
    ctx.scale(S, S);
    ctx.translate(-48, -148);
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.lightning;
      ctx.fill(new Path2D(BOLT));
    });
  });

  make(scene, 'paper_strip', 80 + 2 * PAD, 4 + 2 * PAD, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, PAD, PAD, 80, 4, 2);
    ctx.fill();
  });
}

// ───────── Helikopter ─────────

const HELI_X0 = -60;
const HELI_Y0 = -52;
const HELI_W = 194;
const HELI_H = 92;

/** Helikopter dokusunun yerel (0,0) noktasının doku içindeki oranı (sprite orijini). */
export const HELI_ORIGIN = { x: (PAD - HELI_X0) / (HELI_W + 2 * PAD), y: (PAD - HELI_Y0) / (HELI_H + 2 * PAD) };
export const HELI_TAIL_POS = { x: 126, y: -16 };
export const HELI_ROTOR_POS = { x: 0, y: -46 };

function makeHeli(scene: Phaser.Scene): void {
  for (const paint of PAINTS) {
    make(scene, `heli_${paint.id}`, HELI_W + 2 * PAD, HELI_H + 2 * PAD, (ctx) => {
      ctx.translate(PAD - HELI_X0, PAD - HELI_Y0);
      const fill = (path: string, color: string, alpha = 1) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fill(new Path2D(path));
        ctx.restore();
      };
      shadow(ctx, () => {
        fill(HELI.fin, paint.color);
        fill(HELI.body, paint.color);
        // direk ve göbek
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(-4, -44, 8, 12);
        rr(ctx, -11, -51, 22, 7, 3);
        ctx.fill();
      });
      fill(HELI.shadeBelly, '#000000', 0.16);
      fill(HELI.shadeBoom, '#000000', 0.16);
      fill(HELI.window, PALETTE.heliGlass);
      line(ctx, '#FFFFFF', 2, [[-44, -12], [-40, -19], [-33, -22], [-26, -23]], 0.9);
      ctx.fillStyle = PALETTE.heliGlass;
      rr(ctx, 0, -24, 22, 15, 4);
      ctx.fill();
      line(ctx, '#000000', 1.5, [[-6, -30], [-6, 24]], 0.15);
      // kızaklar
      line(ctx, PALETTE.ink, 3.4, [[-26, 26], [-30, 38]]);
      line(ctx, PALETTE.ink, 3.4, [[22, 26], [26, 38]]);
      line(ctx, PALETTE.ink, 3.4, [[-44, 38], [40, 38]]);
      line(ctx, PALETTE.ink, 3.4, [[-44, 38], [-52, 38], [-54, 32]]);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(-4, 26, 8, 5);
      ctx.fillStyle = PALETTE.lightning;
      ctx.beginPath();
      ctx.arc(124, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  make(scene, 'heli_rotor', 192 + 2 * PAD, 6 + 2 * PAD, (ctx) => {
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.ink;
      rr(ctx, PAD, PAD, 192, 6, 3);
      ctx.fill();
    });
  });
  make(scene, 'heli_arcs', 170 + 2 * PAD, 26 + 2 * PAD, (ctx) => {
    ctx.translate(PAD + 85, PAD + 20);
    line(ctx, '#FFFFFF', 2, [[-82, -8], [-40, -13], [0, -14], [40, -13], [84, -8]], 0.5);
    line(ctx, '#FFFFFF', 2, [[-70, 0], [-30, -4], [0, -5], [30, -4], [70, 0]], 0.5);
  });
  make(scene, 'heli_tail', 28 + 2 * PAD, 30 + 2 * PAD, (ctx) => {
    ctx.translate(PAD + 14, PAD + 15);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    rr(ctx, -2.5, -15, 5, 30, 2.5);
    ctx.fill();
  });
}

// ───────── Kargo ─────────

function makeCargo(scene: Phaser.Scene, T: Tuning): void {
  const sideShade = (ctx: Ctx, w: number, h: number, r: number) => {
    ctx.save();
    rr(ctx, 0, 0, w, h, r);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(w - 7, 0, 7, h);
    ctx.restore();
  };
  const body = (key: keyof Tuning['cargo'], draw: (ctx: Ctx, w: number, h: number, r: number) => void) => {
    const d = T.cargo[key];
    make(scene, `cargo_${key}`, d.w + 2 * PAD, d.h + 2 * PAD, (ctx) => {
      ctx.translate(PAD, PAD);
      draw(ctx, d.w, d.h, d.chamfer + 1);
    });
  };
  const crateLike = (fill: string, ln: string) => (ctx: Ctx, w: number, h: number, r: number) => {
    shadow(ctx, () => {
      ctx.fillStyle = fill;
      rr(ctx, 0, 0, w, h, r);
      ctx.fill();
    });
    sideShade(ctx, w, h, r);
    line(ctx, ln, 2.5, [[5, h * 0.3], [w - 12, h * 0.3]]);
    line(ctx, ln, 2.5, [[5, h * 0.68], [w - 12, h * 0.68]]);
    line(ctx, ln, 2.5, [[6, h - 7], [w - 14, 7]]);
  };
  body('crate', crateLike(PALETTE.crate, PALETTE.crateLine));
  body('wide', crateLike(PALETTE.wide, PALETTE.wideLine));
  body('tall', crateLike(PALETTE.tall, PALETTE.tallLine));
  body('wedge', (ctx, w, h) => {
    const top = w * (1 - 0.45) / 2; // slope 0,45: üst kenar daha dar
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.wedge;
      ctx.beginPath();
      ctx.moveTo(top, 0);
      ctx.lineTo(w - top, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    });
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(w - top, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(w - 8, h);
    ctx.lineTo(w - top - 4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    line(ctx, PALETTE.wedgeLine, 2.5, [[top + 4, h * 0.35], [w - top - 6, h * 0.35]]);
    line(ctx, PALETTE.wedgeLine, 2.5, [[top - 8, h * 0.7], [w - top + 2, h * 0.7]]);
  });
  body('ball', (ctx, w, h) => {
    const r = w / 2;
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.ball;
      ctx.beginPath();
      ctx.arc(r, h / 2, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, h / 2, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = PALETTE.ballBand;
    ctx.fillRect(0, h / 2 - 6, w, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(w - 10, 0, 10, h);
    ctx.restore();
    line(ctx, '#FFFFFF', 2, [[12, 14], [18, 9]], 0.7);
  });
  body('barrel', (ctx, w, h, r) => {
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.barrel;
      rr(ctx, 0, 0, w, h, r + 4);
      ctx.fill();
    });
    sideShade(ctx, w, h, r + 4);
    ctx.fillStyle = PALETTE.barrelHoop;
    ctx.fillRect(0, h * 0.2, w, 6);
    ctx.fillRect(0, h * 0.7, w, 6);
    line(ctx, '#FFFFFF', 2, [[9, h * 0.35], [9, h * 0.6]], 0.25);
  });
  body('gold', (ctx, w, h, r) => {
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.gold;
      rr(ctx, 0, 0, w, h, r);
      ctx.fill();
    });
    sideShade(ctx, w, h, r);
    line(ctx, PALETTE.goldLine, 2.5, [[4, h * 0.36], [w - 4, h * 0.36]]);
    ctx.fillStyle = PALETTE.goldLine;
    rr(ctx, w / 2 - 6, h * 0.36 - 2, 12, 14, 3);
    ctx.fill();
    line(ctx, '#FFFFFF', 2, [[10, 10], [16, 7]], 0.8);
  });
  body('piano', (ctx, w, h, r) => {
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.piano;
      rr(ctx, 0, 0, w, h, r);
      ctx.fill();
    });
    sideShade(ctx, w, h, r);
    ctx.fillStyle = PALETTE.pianoKeys;
    rr(ctx, 5, h - 21, w - 10, 14, 2);
    ctx.fill();
    for (let i = 1; i < 8; i++) line(ctx, PALETTE.piano, 1.5, [[5 + ((w - 10) / 8) * i, h - 21], [5 + ((w - 10) / 8) * i, h - 9]]);
  });
}

// ───────── Kanca, partikül ve gemi ─────────

function makeMisc(scene: Phaser.Scene): void {
  // Kanca: ink 16×13 blok + küçük J. Orijin: J'nin alt ucu (halat ucu).
  make(scene, 'hook', 16 + 2 * PAD, 34 + 2 * PAD, (ctx) => {
    ctx.translate(PAD, PAD);
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.ink;
      rr(ctx, 0, 0, 16, 13, 3);
      ctx.fill();
      line(ctx, PALETTE.ink, 3, [[8, 13], [8, 28], [3, 33]]);
    });
  });
  make(scene, 'drop', 12, 14, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.quadraticCurveTo(12, 8, 6, 13);
    ctx.quadraticCurveTo(0, 8, 6, 1);
    ctx.fill();
  });
  make(scene, 'dust', 16, 16, (ctx) => {
    ctx.fillStyle = PALETTE.foam;
    rr(ctx, 2, 3, 12, 10, 3);
    ctx.fill();
  });
  make(scene, 'sparkle', 16, 16, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(10, 6);
    ctx.lineTo(16, 8);
    ctx.lineTo(10, 10);
    ctx.lineTo(8, 16);
    ctx.lineTo(6, 10);
    ctx.lineTo(0, 8);
    ctx.lineTo(6, 6);
    ctx.fill();
  });
  const colors = [PALETTE.heliRed, PALETTE.crate, PALETTE.seaFront, PALETTE.wide, PALETTE.lightning, PALETTE.uiRed];
  colors.forEach((c, i) =>
    make(scene, `confetti_${i}`, 6, 10, (ctx) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 6, 10);
    }),
  );
}

/** Gemi dokusu koordinatları: x = dünya x, y = güverte yüzeyine göre (deck = 0). */
export const SHIP_TEX = { x0: -48, y0: -190, w: 366, h: 306 };

function makeShip(scene: Phaser.Scene, T: Tuning): void {
  const s = T.ship;
  make(scene, 'ship', SHIP_TEX.w + 2 * PAD, SHIP_TEX.h + 2 * PAD, (ctx) => {
    ctx.translate(PAD - SHIP_TEX.x0, PAD - SHIP_TEX.y0);
    // gövde (güverteden aşağı), pruva yukarı kıvrık
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.hull;
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.lineTo(288, 0);
      ctx.lineTo(s.bowTipX, -16);
      ctx.lineTo(284, 108);
      ctx.lineTo(-20, 108);
      ctx.closePath();
      ctx.fill();
    });
    // gövde şeridi (güvertenin 11–19 px altı)
    ctx.fillStyle = PALETTE.hullStripe;
    ctx.beginPath();
    ctx.moveTo(-38, 11);
    ctx.lineTo(292, 11);
    ctx.lineTo(290, 19);
    ctx.lineTo(-36, 19);
    ctx.closePath();
    ctx.fill();
    // güverte
    ctx.fillStyle = PALETTE.deck;
    ctx.fillRect(s.deckLeftX, 0, s.deckRightX - s.deckLeftX, 7);
    // pruva dudağı
    ctx.fillStyle = PALETTE.hull;
    ctx.fillRect(s.deckRightX, -s.lipHeight, s.lipWidth, s.lipHeight);
    // köprü
    const bw = s.deckLeftX - s.bridgeLeftX;
    shadow(ctx, () => {
      ctx.fillStyle = PALETTE.bridge;
      ctx.fillRect(s.bridgeLeftX, -s.bridgeHeight, bw, s.bridgeHeight);
    });
    ctx.fillStyle = PALETTE.hull;
    for (let i = 0; i < 3; i++) {
      rr(ctx, s.bridgeLeftX + 12 + i * 26, -s.bridgeHeight + 18, 16, 16, 3);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.roof;
    rr(ctx, s.bridgeLeftX - 5, -s.bridgeHeight - 9, bw + 10, 11, 3);
    ctx.fill();
    // direk, çapraz çubuk, lamba
    line(ctx, PALETTE.ink, 3, [[s.mastX, -s.bridgeHeight - 8], [s.mastX, -s.mastHeight]]);
    line(ctx, PALETTE.ink, 3, [[s.mastX - 10, -s.mastHeight + 24], [s.mastX + 10, -s.mastHeight + 24]]);
    ctx.fillStyle = PALETTE.roof;
    ctx.beginPath();
    ctx.arc(s.mastX, -s.mastHeight - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    // slot köşe işaretleri (kesik çizgili köşe parantezleri, hull rengi α0,5)
    for (const cx of s.slotCentersX) {
      const hw = 38;
      const top = -28;
      for (const sx of [-1, 1]) {
        line(ctx, PALETTE.hull, 2.2, [[cx + sx * hw, top + 9], [cx + sx * hw, top], [cx + sx * (hw - 9), top]], 0.5);
        line(ctx, PALETTE.hull, 2.2, [[cx + sx * hw, -9], [cx + sx * hw, 0], [cx + sx * (hw - 9), 0]], 0.5);
      }
    }
  });
}

/** Bütün dokuları bir kez üretir (BootScene). */
export function makeAllTextures(scene: Phaser.Scene, T: Tuning): void {
  makeWeather(scene);
  makeHeli(scene);
  makeCargo(scene, T);
  makeMisc(scene);
  makeShip(scene, T);
}
