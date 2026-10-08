// docs/art/icon-foreground.svg + icon-background.svg → assets/ PNG'leri (sharp).
// Sonra: npx @capacitor/assets generate --android  (npm run icons ikisini birlikte çalıştırır)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const art = path.join(root, 'docs', 'art');
const out = path.join(root, 'assets');
const SKY = '#BCCBC7';
const DARK = '#2E5A5F';
const ICON = 1024;
const SPLASH = 2732;

await mkdir(out, { recursive: true });
const fg = await readFile(path.join(art, 'icon-foreground.svg'));
const bg = await readFile(path.join(art, 'icon-background.svg'));

const render = (svg, size) => sharp(svg, { density: 300 }).resize(size, size).png().toBuffer();

const fgPng = await render(fg, ICON);
const bgPng = await render(bg, ICON);
await writeFile(path.join(out, 'icon-foreground.png'), fgPng);
await writeFile(path.join(out, 'icon-background.png'), bgPng);

// sharp, resize'ı composite'ten ÖNCE uygular: önce tam boyutta birleştir, buffer'a al, sonra ayrı çağrıyla boyutlandır.
const merged = await sharp(bgPng).composite([{ input: fgPng }]).png().toBuffer();
await writeFile(path.join(out, 'icon-only.png'), await sharp(merged).resize(ICON, ICON).png().toBuffer());

// splash: düz zemin + ortada ön plan (zeminin %30'u genişliğinde)
const logoSize = Math.round(SPLASH * 0.3);
const logo = await sharp(fgPng).resize(logoSize, logoSize).png().toBuffer();
for (const [name, color] of [['splash.png', SKY], ['splash-dark.png', DARK]]) {
  const base = await sharp({ create: { width: SPLASH, height: SPLASH, channels: 4, background: color } }).png().toBuffer();
  const composed = await sharp(base)
    .composite([{ input: logo, left: Math.round((SPLASH - logoSize) / 2), top: Math.round((SPLASH - logoSize) / 2) }])
    .png()
    .toBuffer();
  await writeFile(path.join(out, name), composed);
}
console.log('assets/ hazır:', ['icon-only', 'icon-foreground', 'icon-background', 'splash', 'splash-dark'].join(', '));
