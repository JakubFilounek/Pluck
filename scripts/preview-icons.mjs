import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * Renders the generated icons onto both Firefox toolbar greys, magnified with
 * nearest-neighbour so individual pixels are visible.
 *
 * The point is the 16px tile. A logo that looks fine at 128 routinely turns to
 * mush in the toolbar, and that is the size you actually look at every day — this
 * is the check that catches it before shipping.
 *
 * Output: .output/icon-preview.png (gitignored).
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const icon = (size) => join(root, 'public', 'icon', `${size}.png`);

const CHROME = { light: '#f9f9fb', dark: '#2b2a33' };
const SIZES = [16, 32, 48];
const ZOOM = 8;
const GAP = 10;

const tiles = [];

for (const bg of Object.values(CHROME)) {
  for (const size of SIZES) {
    const padded = await sharp({
      create: { width: size + 8, height: size + 8, channels: 4, background: bg },
    })
      .composite([{ input: icon(size), top: 4, left: 4 }])
      .png()
      .toBuffer();

    tiles.push(
      await sharp(padded)
        .resize((size + 8) * ZOOM, (size + 8) * ZOOM, { kernel: 'nearest' })
        .png()
        .toBuffer(),
    );
  }
}

const metas = await Promise.all(tiles.map((tile) => sharp(tile).metadata()));
const width = metas.reduce((sum, meta) => sum + meta.width + GAP, GAP);
const height = Math.max(...metas.map((meta) => meta.height)) + GAP * 2;

let left = GAP;
const layers = tiles.map((input, index) => {
  const layer = { input, top: GAP, left };
  left += metas[index].width + GAP;
  return layer;
});

await mkdir(join(root, '.output'), { recursive: true });
const out = join(root, '.output', 'icon-preview.png');

await sharp({ create: { width, height, channels: 4, background: '#808080' } })
  .composite(layers)
  .png()
  .toFile(out);

console.log(`icon preview: ${out}`);
console.log('Left group is a light toolbar, right group dark; sizes 16 / 32 / 48.');
