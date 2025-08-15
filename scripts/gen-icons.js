#!/usr/bin/env node
/*
  Generate PNG icons from existing AVIF icons using sharp.
  Inputs (must exist):
    public/Favicon/apple-touch-icon.avif
    public/Favicon/web-app-manifest-192x192.avif
    public/Favicon/web-app-manifest-512x512.avif
  Outputs:
    public/Favicon/apple-touch-icon.png (180x180)
    public/Favicon/icon-192.png
    public/Favicon/icon-512.png
*/

const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('\nError: sharp is not installed. Run:\n\n  npm i -D sharp\n');
    process.exit(1);
  }

  const root = process.cwd();
  const favDir = path.join(root, 'public', 'Favicon');

  const inputs = [
    { src: 'apple-touch-icon.avif', out: 'apple-touch-icon.png', size: 180 },
    { src: 'web-app-manifest-192x192.avif', out: 'icon-192.png', size: 192 },
    { src: 'web-app-manifest-512x512.avif', out: 'icon-512.png', size: 512 },
  ];

  for (const item of inputs) {
    const inPath = path.join(favDir, item.src);
    const outPath = path.join(favDir, item.out);

    if (!fs.existsSync(inPath)) {
      console.warn(`Skip: missing ${item.src}`);
      continue;
    }

    console.log(`Converting ${item.src} -> ${item.out} (${item.size}x${item.size})`);
    await sharp(inPath)
      .resize({ width: item.size, height: item.size, fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
  }

  console.log('\nDone. Ensure _document.tsx and site.webmanifest reference PNGs.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
