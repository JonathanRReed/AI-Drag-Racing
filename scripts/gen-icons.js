#!/usr/bin/env node
/*
  Generate the raster icon set from the vector mark.

  Input:
    public/Favicon/favicon.svg   the site mark: three lanes, one car, one finish block
  Outputs:
    public/Favicon/apple-touch-icon.png  180x180
    public/Favicon/icon-192.png          192x192, maskable safe zone
    public/Favicon/icon-512.png          512x512, maskable safe zone
    public/Favicon/favicon.ico           16, 32 and 48 px PNG entries

  Run: node scripts/gen-icons.js
*/

const fs = require('fs');
const path = require('path');

/** An .ico file is a small directory followed by the images; PNG entries are allowed. */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;
  images.forEach(({ size, data }, index) => {
    const at = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, at);
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1);
    directory.writeUInt8(0, at + 2);
    directory.writeUInt8(0, at + 3);
    directory.writeUInt16LE(1, at + 4);
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('\nError: sharp is not installed. Run:\n\n  bun install\n');
    process.exit(1);
  }

  const favDir = path.join(process.cwd(), 'public', 'Favicon');
  const source = fs.readFileSync(path.join(favDir, 'favicon.svg'), 'utf8');
  // App icons are full-bleed squares: the platform applies its own mask.
  const square = Buffer.from(source.replace(' rx="12"', ''));
  const rounded = Buffer.from(source);
  const render = (svg, size) => sharp(svg, { density: 72 * (size / 64) * 2 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

  for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    fs.writeFileSync(path.join(favDir, name), await render(square, size));
    console.log(`Wrote ${name}`);
  }

  const icoImages = [];
  for (const size of [16, 32, 48]) icoImages.push({ size, data: await render(rounded, size) });
  fs.writeFileSync(path.join(favDir, 'favicon.ico'), buildIco(icoImages));
  console.log('Wrote favicon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
