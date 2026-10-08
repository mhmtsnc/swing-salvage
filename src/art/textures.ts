import Phaser from 'phaser';

/** Canvas2D ile kodla üretilen dokular (sıfır görsel dosya). F5'te genişler. */
function makeCanvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

export const RAIN_TILE = 256;

export function makeWeatherTextures(scene: Phaser.Scene): void {
  // Yağmur: sağdan sola eğik ince çizgiler. İki katman farklı yoğunlukta kullanır.
  makeCanvas(scene, 'rain_a', RAIN_TILE, RAIN_TILE, (ctx) => {
    ctx.strokeStyle = 'rgba(244,241,232,0.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const drops = [[20, 30], [90, 150], [150, 70], [210, 200], [60, 220], [180, 10], [120, 110]];
    for (const [x, y] of drops) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y + 26);
      ctx.stroke();
    }
  });
  makeCanvas(scene, 'rain_b', RAIN_TILE, RAIN_TILE, (ctx) => {
    ctx.strokeStyle = 'rgba(244,241,232,0.7)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const drops = [[40, 60], [130, 20], [200, 130], [100, 190], [230, 240], [10, 160]];
    for (const [x, y] of drops) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + 34);
      ctx.stroke();
    }
  });
}
