import { priceFromParts } from './price';
import { resolveUrl } from './url';
import type { CaptureCandidate } from '../domain/types';

/**
 * schema.org JSON-LD extraction — the highest-quality source available, because the
 * shop published it deliberately for exactly this purpose. Tried first.
 *
 * Real-world JSON-LD is messy: multiple script tags, top-level arrays, @graph
 * wrappers, Product nested inside a WebPage, and fields that are sometimes a string
 * and sometimes an object. All of that is handled here rather than assumed away.
 */

export type PartialCandidate = Partial<Omit<CaptureCandidate, 'source'>>;

type JsonValue = unknown;
type JsonObject = Record<string, unknown>;

function isObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Flattens every object reachable in the document, wherever it's nested. */
function collectNodes(value: JsonValue, out: JsonObject[] = [], depth = 0): JsonObject[] {
  // Guard against pathological nesting in hand-written markup.
  if (depth > 8) return out;

  if (Array.isArray(value)) {
    for (const entry of value) collectNodes(entry, out, depth + 1);
    return out;
  }

  if (isObject(value)) {
    out.push(value);
    for (const entry of Object.values(value)) collectNodes(entry, out, depth + 1);
  }

  return out;
}

function hasType(node: JsonObject, type: string): boolean {
  const value = node['@type'];

  if (typeof value === 'string') return value.toLowerCase() === type.toLowerCase();
  if (Array.isArray(value)) {
    return value.some(
      (entry) => typeof entry === 'string' && entry.toLowerCase() === type.toLowerCase(),
    );
  }

  return false;
}

function firstString(value: JsonValue): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstString(entry);
      if (found) return found;
    }
    return undefined;
  }

  // ImageObject / Brand / Organization all carry the useful value under url or name.
  if (isObject(value)) {
    return firstString(value['url'] ?? value['name'] ?? value['@id']);
  }

  return undefined;
}

/** Picks the offer to quote: the lowest current price, which is what a shopper sees. */
function selectOffer(product: JsonObject): JsonObject | undefined {
  const offers = product['offers'];
  const candidates = collectNodes(offers).filter(
    (node) => node['price'] !== undefined || node['lowPrice'] !== undefined,
  );

  if (candidates.length === 0) return isObject(offers) ? offers : undefined;

  return candidates.reduce((cheapest, offer) => {
    const value = Number(offer['price'] ?? offer['lowPrice']);
    const best = Number(cheapest['price'] ?? cheapest['lowPrice']);
    if (!Number.isFinite(value)) return cheapest;
    if (!Number.isFinite(best)) return offer;
    return value < best ? offer : cheapest;
  });
}

function normalizeAvailability(value: string | undefined): string | undefined {
  if (!value) return undefined;

  // "https://schema.org/InStock" -> "In stock"
  const bare = value.replace(/^.*schema\.org\//i, '').replace(/[-_]/g, ' ').trim();
  if (!bare) return undefined;

  const spaced = bare.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function extractFromJsonLd(
  doc: Document,
  pageUrl: string,
  fallbackCurrency: string,
): PartialCandidate | undefined {
  const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];
  const nodes: JsonObject[] = [];

  for (const script of scripts) {
    const text = script.textContent?.trim();
    if (!text) continue;

    try {
      collectNodes(JSON.parse(text), nodes);
    } catch {
      // One malformed block must not stop the others from being read.
      continue;
    }
  }

  const product = nodes.find((node) => hasType(node, 'Product'));
  if (!product) return undefined;

  const offer = selectOffer(product);

  const price = priceFromParts(
    (offer?.['price'] ?? offer?.['lowPrice']) as string | number | undefined,
    firstString(offer?.['priceCurrency']),
    fallbackCurrency,
  );

  const candidate: PartialCandidate = {
    title: firstString(product['name']),
    imageUrl: resolveUrl(firstString(product['image']), pageUrl),
    brand: firstString(product['brand']),
    notes: firstString(product['description']),
    price,
    availability: normalizeAvailability(firstString(offer?.['availability'])),
  };

  // A Product node with no name is not worth reporting as a hit — let the next
  // extractor in the chain have a go.
  return candidate.title ? candidate : undefined;
}
