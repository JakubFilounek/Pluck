/**
 * URL normalisation. The canonical form is the duplicate-detection key, so the goal
 * is that the same product reached from a newsletter link, a price comparison site
 * and a Google search all collapse to one string.
 */

/** Params that identify a campaign or session rather than a product. */
const TRACKING_PARAM_PATTERNS: RegExp[] = [
  /^utm_/i,
  /^ga_/i,
  /^pk_/i,
  /^mc_/i,
  /^hsa_/i,
  /^_hs/i,
  /^(gclid|dclid|fbclid|msclkid|twclid|igshid|ttclid|yclid|wbraid|gbraid)$/i,
  /^(ref|referrer|referer|source|src|campaign|affiliate|aff|aff_id|partner|promo)$/i,
  /^(sessionid|session_id|sid|phpsessid|jsessionid)$/i,
  /^(trk|trkid|tracking|trackingid|cid|clickid|click_id)$/i,
  // Amazon padding
  /^(pd_rd_|pf_rd_|psc$|th$|linkCode$|tag$|creative$|creativeASIN$|ascsubtag$)/i,
];

function isTrackingParam(key: string): boolean {
  return TRACKING_PARAM_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Strips tracking noise, normalises host and trailing slash, and drops the fragment.
 * Remaining params are sorted so param order can't create a false duplicate miss.
 *
 * Query params that survive are kept deliberately: on plenty of shops the variant
 * (?color=black, ?variant=123) is genuinely a different product.
 */
export function canonicalizeUrl(rawUrl: string): string {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    // Not parseable — return it untouched so it can still be stored and deduped
    // by exact string match.
    return rawUrl.trim();
  }

  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.protocol = url.protocol === 'http:' ? 'https:' : url.protocol;

  // Default ports add nothing and differ between sources.
  if ((url.protocol === 'https:' && url.port === '443') || url.port === '80') {
    url.port = '';
  }

  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !isTrackingParam(key))
    .sort(([a], [b]) => a.localeCompare(b));

  url.search = '';
  for (const [key, value] of kept) url.searchParams.append(key, value);

  // Normalise the trailing slash, but never strip the root path to empty.
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

/** Multi-part suffixes where the meaningful label is one level further left. */
const COMPOUND_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'com.au', 'net.au', 'org.au',
  'co.nz', 'co.jp', 'co.kr', 'com.br', 'com.mx', 'com.tr', 'co.za', 'com.cn',
]);

/**
 * Human-readable shop name from a URL: alza.cz -> 'Alza', shop.example.co.uk -> 'Example'.
 * Purely cosmetic — grouping and filtering use this string, so it only has to be stable.
 */
export function siteNameFromUrl(rawUrl: string): string {
  let hostname: string;

  try {
    hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'Unknown';
  }

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length === 0) return 'Unknown';
  if (parts.length === 1) return titleCase(parts[0]!);

  const lastTwo = parts.slice(-2).join('.');
  // With a compound suffix the label sits third from the right, otherwise second.
  const labelIndex = COMPOUND_SUFFIXES.has(lastTwo) ? parts.length - 3 : parts.length - 2;
  const label = parts[Math.max(labelIndex, 0)];

  return label ? titleCase(label) : titleCase(parts[0]!);
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Absolutises a possibly-relative image or link URL against the page it came from. */
export function resolveUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // data: images are already self-contained.
  if (trimmed.startsWith('data:')) return trimmed;

  try {
    return new URL(trimmed, base).toString();
  } catch {
    return undefined;
  }
}
