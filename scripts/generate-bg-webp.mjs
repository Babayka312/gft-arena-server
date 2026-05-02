import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const root = process.cwd();
const srcDir = path.join(root, 'public', 'images', 'backgrounds');
const outDir = path.join(root, 'public', 'images', 'bg');

const entries = [
  { key: 'home', src: 'home-bg.png' },
  { key: 'arena', src: 'arena-bg.png' },
  { key: 'shop', src: 'home-bg.png' },
  { key: 'squad', src: 'team-bg.png' },
  { key: 'farm', src: 'farm-bg.png' },
  { key: 'progression', src: 'progression-bg.png' },
  { key: 'loading', src: 'loading-bg.png' },
  { key: 'hero-select', src: 'hero-select-bg.png' },
];

await mkdir(outDir, { recursive: true });

for (const entry of entries) {
  const srcPath = path.join(srcDir, entry.src);
  const mobileOut = path.join(outDir, `${entry.key}.webp`);
  const tabletOut = path.join(outDir, `${entry.key}-1440.webp`);

  await sharp(srcPath)
    .resize({ width: 1080, height: 1920, fit: 'cover', position: 'center' })
    .webp({ quality: 70, effort: 6 })
    .toFile(mobileOut);

  await sharp(srcPath)
    .resize({ width: 1440, height: 2560, fit: 'cover', position: 'center' })
    .webp({ quality: 72, effort: 6 })
    .toFile(tabletOut);

  console.log(`generated ${entry.key}: mobile+tablet`);
}

console.log('Done: background webp assets generated in public/images/bg');
