import type { PartialCandidate } from './jsonld';
import { priceFromParts } from './price';
import { resolveUrl } from './url';

/**
 * schema.org microdata (itemscope/itemprop attributes). Older than JSON-LD but still
 * common, especially on shop platforms that haven't been rebuilt in a while.
 */

/** Reads an itemprop's value from whichever attribute that element type carries it in. */
function readProp(scope: Element, name: string): string | undefined {
  const element = scope.querySelector(`[itemprop="${name}"]`);
  if (!element) return undefined;

  // Order matters: an explicit content attribute is the machine-readable value, and
  // only if there isn't one do we fall back to the element's natural value attribute.
  // <link itemprop="availability" href="..."> is common enough to be worth naming.
  const attributeValue =
    element.getAttribute('content') ??
    (element instanceof HTMLImageElement ? element.getAttribute('src') : null) ??
    (element instanceof HTMLAnchorElement || element instanceof HTMLLinkElement
      ? element.getAttribute('href')
      : null) ??
    (element instanceof HTMLTimeElement ? element.getAttribute('datetime') : null);

  const value = attributeValue ?? element.textContent;
  return value?.replace(/\s+/g, ' ').trim() || undefined;
}

function normalizeAvailability(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const bare = value.replace(/^.*schema\.org\//i, '').replace(/[-_]/g, ' ').trim();
  if (!bare) return undefined;

  const spaced = bare.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function extractFromMicrodata(
  doc: Document,
  pageUrl: string,
  fallbackCurrency: string,
): PartialCandidate | undefined {
  const scope = doc.querySelector('[itemscope][itemtype*="schema.org/Product" i]');
  if (!scope) return undefined;

  const title = readProp(scope, 'name');
  if (!title) return undefined;

  return {
    title,
    imageUrl: resolveUrl(readProp(scope, 'image'), pageUrl),
    brand: readProp(scope, 'brand'),
    notes: readProp(scope, 'description'),
    price: priceFromParts(
      readProp(scope, 'price'),
      readProp(scope, 'priceCurrency'),
      fallbackCurrency,
    ),
    availability: normalizeAvailability(readProp(scope, 'availability')),
  };
}
