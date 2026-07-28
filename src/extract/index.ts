import { extractFromHeuristics } from './heuristic';
import { extractFromJsonLd, type PartialCandidate } from './jsonld';
import { extractFromMicrodata } from './microdata';
import { extractFromOpenGraph, extractFromTwitterCard } from './meta';
import { canonicalizeUrl, siteNameFromUrl } from './url';
import type { CaptureCandidate, CaptureSource } from '../domain/types';

/**
 * The extraction pipeline.
 *
 * Extractors run best-first and their results are merged field by field, with the
 * first non-empty value winning. That matters because sources are good at different
 * things: JSON-LD usually has an exact price but a bare image, while OpenGraph almost
 * always has a well-chosen preview image. Merging beats picking one winner outright.
 *
 * No network calls and no model — everything comes from markup the page already
 * shipped, so capture is instant and works offline.
 */

type Extractor = {
  source: CaptureSource;
  run: (doc: Document, pageUrl: string, currency: string) => PartialCandidate | undefined;
};

const EXTRACTORS: Extractor[] = [
  { source: 'json-ld', run: extractFromJsonLd },
  { source: 'microdata', run: extractFromMicrodata },
  { source: 'open-graph', run: extractFromOpenGraph },
  { source: 'twitter', run: (doc, pageUrl) => extractFromTwitterCard(doc, pageUrl) },
  { source: 'heuristic', run: extractFromHeuristics },
];

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** The URL the shop itself considers canonical, when it declares one. */
function preferredUrl(doc: Document, pageUrl: string): string {
  const canonical = doc
    .querySelector('link[rel="canonical" i]')
    ?.getAttribute('href')
    ?.trim();

  if (canonical) {
    try {
      return new URL(canonical, pageUrl).toString();
    } catch {
      // Malformed canonical tag — fall through to the address bar URL.
    }
  }

  return pageUrl;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * True when the title's trailing segment is just the shop naming itself.
 *
 * Compared against both the display label and the full hostname, because titles end
 * with either — "… | Alza.cz" against a site label of "Alza" has to match, and did
 * not when only the label was checked.
 */
function isShopSuffix(tail: string, site: string, hostname: string): boolean {
  const candidate = normalizeName(tail);
  if (!candidate) return false;

  const label = normalizeName(site);
  const host = normalizeName(hostname);

  if (candidate === label || candidate === host) return true;

  // "Alza.cz" against label "alza": same name plus a domain suffix, nothing more.
  return label.length > 2 && candidate.startsWith(label) && candidate.length <= label.length + 4;
}

/**
 * Strips the trailing "| Shop Name" that page titles almost always carry.
 *
 * Only removes the tail when it actually names the shop — a blanket "drop everything
 * after the last separator" rule would happily eat real product detail out of titles
 * like "Nike Air Max | Blue".
 */
function cleanTitle(
  title: string | undefined,
  site: string,
  hostname: string,
): string | undefined {
  if (!title) return undefined;

  let collapsed = title.replace(/\s+/g, ' ').trim();

  // Loop: some shops stack two suffixes, e.g. "Product - Category | Alza.cz".
  for (let pass = 0; pass < 2; pass += 1) {
    const match = /^(.*?)\s*[|\-–—·»]\s*([^|\-–—·»]+)$/.exec(collapsed);
    if (!match?.[1] || !match[2] || !isShopSuffix(match[2], site, hostname)) break;

    collapsed = match[1].trim();
  }

  return collapsed || title.trim();
}

export function extractCandidate(
  doc: Document,
  pageUrl: string,
  fallbackCurrency: string,
): CaptureCandidate {
  const url = preferredUrl(doc, pageUrl);
  const site = siteNameFromUrl(url);

  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // Unparseable URL — suffix stripping falls back to the site label alone.
  }

  const merged: PartialCandidate = {};
  let source: CaptureSource = 'fallback';

  for (const extractor of EXTRACTORS) {
    let result: PartialCandidate | undefined;

    try {
      result = extractor.run(doc, url, fallbackCurrency);
    } catch {
      // A single broken extractor must never take the whole capture down — the
      // pages this runs against are arbitrary and hostile in every possible way.
      continue;
    }

    if (!result) continue;

    for (const [key, value] of Object.entries(result)) {
      if (isEmpty(value)) continue;
      if (!isEmpty(merged[key as keyof PartialCandidate])) continue;

      Object.assign(merged, { [key]: value });
    }

    // Attribute the capture to whichever extractor supplied the title, since that's
    // the field that most determines whether the result looks right.
    if (source === 'fallback' && result.title) source = extractor.source;
  }

  return {
    // Chained with || rather than ??: an extractor that returns an empty string
    // must fall through to the next fallback, not be accepted as a title.
    title:
      cleanTitle(merged.title, site, hostname) ||
      cleanTitle(doc.title, site, hostname) ||
      'Untitled item',
    url,
    canonicalUrl: canonicalizeUrl(url),
    site,
    imageUrl: merged.imageUrl,
    price: merged.price,
    brand: merged.brand,
    availability: merged.availability,
    // Descriptions are frequently a whole marketing paragraph; keep it usable as a note.
    notes: merged.notes ? truncate(merged.notes, 400) : undefined,
    source,
  };
}

function truncate(value: string, limit: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

export { canonicalizeUrl, siteNameFromUrl } from './url';
export { formatPrice, parsePrice } from './price';
