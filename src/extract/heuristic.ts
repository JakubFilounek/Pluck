import type { PartialCandidate } from './jsonld';
import { parsePrice } from './price';
import { resolveUrl } from './url';

/**
 * Last-resort DOM scraping for pages with no structured data at all.
 *
 * Everything here is a guess, which is precisely why the popup makes the user confirm
 * the capture before it is saved: a wrong guess costs one edit, not a bad row.
 */

const NOISE_IMAGE_PATTERN =
  /(logo|sprite|icon|placeholder|banner|badge|flag|payment|avatar|pixel|tracking|1x1|blank)/i;

/** Class/id fragments that mark a price on almost every shop template. */
const PRICE_HINT_SELECTORS = [
  '[data-testid*="price" i]',
  '[data-price]',
  '[class*="price--final" i]',
  '[class*="price-final" i]',
  '[class*="current-price" i]',
  '[class*="product-price" i]',
  '[id*="price" i]',
  '[class*="price" i]',
];

/** Struck-through or original prices would otherwise win over the price actually charged. */
const CROSSED_OUT_PATTERN = /(old|was|strike|through|original|regular|compare|list|before)/i;

function isCrossedOut(element: Element): boolean {
  if (element.closest('del, s, strike')) return true;

  const signature = `${element.className} ${element.id}`;
  return CROSSED_OUT_PATTERN.test(signature);
}

function extractTitle(doc: Document): string | undefined {
  const candidates = [
    doc.querySelector('h1[class*="product" i]'),
    doc.querySelector('[class*="product-title" i]'),
    doc.querySelector('[class*="product-name" i]'),
    doc.querySelector('main h1'),
    doc.querySelector('article h1'),
    doc.querySelector('h1'),
  ];

  for (const element of candidates) {
    const text = element?.textContent?.replace(/\s+/g, ' ').trim();
    // A one-word h1 is usually the site name; a very long one is usually a paragraph.
    if (text && text.length >= 3 && text.length <= 250) return text;
  }

  return undefined;
}

function extractPrice(doc: Document, fallbackCurrency: string) {
  for (const selector of PRICE_HINT_SELECTORS) {
    for (const element of doc.querySelectorAll(selector)) {
      if (isCrossedOut(element)) continue;

      const text = element.textContent?.replace(/\s+/g, ' ').trim();
      // Long strings are containers holding several prices, not a price itself.
      if (!text || text.length > 40 || !/\d/.test(text)) continue;

      const price = parsePrice(text, fallbackCurrency);
      if (price && price.amount > 0) return price;
    }
  }

  // Nothing labelled a price — look for a currency-shaped string in the body text.
  const bodyText = doc.body?.textContent?.replace(/\s+/g, ' ') ?? '';
  const match =
    /(?:[$€£₹¥]|Kč|CZK|EUR|USD|GBP|PLN|zł)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:Kč|CZK|EUR|USD|GBP|PLN|zł|€|\$|£)/.exec(
      bodyText,
    );

  return match ? parsePrice(match[0], fallbackCurrency) : undefined;
}

/** Explicit width/height attributes are the only size signal available off-screen. */
function imageArea(image: HTMLImageElement): number {
  const width = Number(image.getAttribute('width')) || image.naturalWidth || 0;
  const height = Number(image.getAttribute('height')) || image.naturalHeight || 0;
  return width * height;
}

function extractImage(doc: Document, pageUrl: string): string | undefined {
  const images = [...doc.querySelectorAll('img')] as HTMLImageElement[];

  const scored = images
    .map((image) => {
      const src =
        image.getAttribute('src') ??
        image.getAttribute('data-src') ??
        image.getAttribute('data-lazy-src') ??
        image.srcset?.split(',')[0]?.trim().split(/\s+/)[0];

      if (!src || NOISE_IMAGE_PATTERN.test(src)) return undefined;

      const alt = image.getAttribute('alt') ?? '';
      if (NOISE_IMAGE_PATTERN.test(`${image.className} ${alt}`)) return undefined;

      let score = imageArea(image);

      // Product galleries sit inside the main content, headers and footers don't.
      if (image.closest('main, article, [class*="gallery" i], [class*="product" i]')) {
        score += 100_000;
      }
      if (image.closest('header, footer, nav, aside')) score -= 100_000;

      return { src, score };
    })
    .filter((entry): entry is { src: string; score: number } => entry !== undefined)
    .sort((left, right) => right.score - left.score);

  return resolveUrl(scored[0]?.src, pageUrl);
}

export function extractFromHeuristics(
  doc: Document,
  pageUrl: string,
  fallbackCurrency: string,
): PartialCandidate | undefined {
  const candidate: PartialCandidate = {
    title: extractTitle(doc),
    imageUrl: extractImage(doc, pageUrl),
    price: extractPrice(doc, fallbackCurrency),
  };

  return candidate.title || candidate.imageUrl || candidate.price ? candidate : undefined;
}
