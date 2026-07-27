import type { PartialCandidate } from './jsonld';
import { priceFromParts } from './price';
import { resolveUrl } from './url';

/**
 * OpenGraph and Twitter card tags. Almost every shop has these because they drive
 * link previews on social media — so even sites with no structured product data
 * usually give a decent title and image here.
 */

function readMeta(doc: Document, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    const value =
      element?.getAttribute('content') ?? element?.getAttribute('value') ?? undefined;

    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return undefined;
}

export function extractFromOpenGraph(
  doc: Document,
  pageUrl: string,
  fallbackCurrency: string,
): PartialCandidate | undefined {
  const title = readMeta(doc, ['meta[property="og:title"]', 'meta[name="og:title"]']);

  const candidate: PartialCandidate = {
    title,
    imageUrl: resolveUrl(
      readMeta(doc, [
        'meta[property="og:image:secure_url"]',
        'meta[property="og:image"]',
        'meta[name="og:image"]',
      ]),
      pageUrl,
    ),
    notes: readMeta(doc, ['meta[property="og:description"]', 'meta[name="description"]']),
    brand: readMeta(doc, ['meta[property="product:brand"]', 'meta[name="brand"]']),
    price: priceFromParts(
      readMeta(doc, [
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
        'meta[itemprop="price"]',
      ]),
      readMeta(doc, [
        'meta[property="product:price:currency"]',
        'meta[property="og:price:currency"]',
        'meta[itemprop="priceCurrency"]',
      ]),
      fallbackCurrency,
    ),
    availability: readMeta(doc, ['meta[property="product:availability"]']),
  };

  return candidate.title || candidate.imageUrl || candidate.price ? candidate : undefined;
}

export function extractFromTwitterCard(
  doc: Document,
  pageUrl: string,
): PartialCandidate | undefined {
  const title = readMeta(doc, ['meta[name="twitter:title"]', 'meta[property="twitter:title"]']);
  const imageUrl = resolveUrl(
    readMeta(doc, ['meta[name="twitter:image"]', 'meta[property="twitter:image"]']),
    pageUrl,
  );

  if (!title && !imageUrl) return undefined;

  return {
    title,
    imageUrl,
    notes: readMeta(doc, ['meta[name="twitter:description"]']),
  };
}
