import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/**
 * Rasterises assets/logo.svg into the PNG sizes the manifest declares.
 *
 * Run with `npm run icons` after changing the logo. The PNGs are generated output —
 * edit the SVG, never the PNGs.
 */

// fileURLToPath, not .pathname — the repo path contains a space.
const root = fileURLToPath(new URL('..', import.meta.url));

/**
 * Per-size tuning.
 *
 * `bolden` strokes each shape in its own fill colour to thicken it. That was needed
 * for an earlier logo drawn from thin strokes; the current one is solid shapes, where
 * bolding only swells them into each other and rounds off the notches. It stays
 * available for whatever the logo becomes next, but is off.
 *
 * Small sizes get less padding instead, so the mark simply fills more of the tile.
 */
const SIZES = [
  { size: 16, padding: 0.01, bolden: 0 },
  { size: 32, padding: 0.03, bolden: 0 },
  { size: 48, padding: 0.05, bolden: 0 },
  { size: 96, padding: 0.06, bolden: 0 },
  { size: 128, padding: 0.06, bolden: 0 },
];

/** Bounding box of the artwork inside the 128 viewBox, measured from the paths. */
const ART = { x: 20, y: 18, width: 88, height: 90 };

const source = await readFile(join(root, 'assets', 'logo.svg'), 'utf8');

/**
 * Centres and scales the artwork to fill the canvas.
 *
 * Drawn as authored, the logo occupies 85×70 of a 128 box and sits off-centre — it
 * would render noticeably small and high. Fitting it is the difference between an
 * icon that reads at 16px and one that does not.
 */
function fitted(padding, bolden) {
  const inner = 1 - padding * 2;
  const scale = Math.min((128 * inner) / ART.width, (128 * inner) / ART.height);

  const offsetX = (128 - ART.width * scale) / 2 - ART.x * scale;
  const offsetY = (128 - ART.height * scale) / 2 - ART.y * scale;

  let body = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

  if (bolden > 0) {
    // Stroke each shape in its own fill colour so it grows outward evenly.
    body = body.replace(
      /<path\s+fill="(#[0-9A-Fa-f]{6})"/g,
      `<path fill="$1" stroke="$1" stroke-width="${bolden}" stroke-linejoin="round" stroke-linecap="round"`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <g transform="translate(${offsetX.toFixed(3)} ${offsetY.toFixed(3)}) scale(${scale.toFixed(5)})">
    ${body.trim()}
  </g>
</svg>`;
}

const outDir = join(root, 'public', 'icon');
await mkdir(outDir, { recursive: true });

for (const { size, padding, bolden } of SIZES) {
  // High density so the 128-unit artwork is rasterised well above the target size
  // and downsampled, rather than drawn directly at 16px.
  await sharp(Buffer.from(fitted(padding, bolden)), { density: 512 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, `${size}.png`));

  console.log(`icon/${size}.png${bolden ? ` (bolded ${bolden})` : ''}`);
}

// Keep the full-size fitted SVG: it is what the large PNGs came from, which matters
// when a size looks wrong and you need to tell bad art from a bad rasterise.
await writeFile(join(outDir, 'logo-fitted.svg'), fitted(0.06, 0));
console.log('icon/logo-fitted.svg');
