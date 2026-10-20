// Genera le icone PNG da public/icon.svg (iOS vuole PNG senza trasparenza; gli angoli li arrotonda iOS).
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const src = fileURLToPath(new URL('../public/icon.svg', import.meta.url));
const out = (f) => fileURLToPath(new URL(`../public/${f}`, import.meta.url));
for (const [f, s] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(src, { density: 300 }).resize(s, s).flatten({ background: '#34C759' }).png().toFile(out(f));
  console.log(f, s);
}
