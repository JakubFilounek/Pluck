import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { extractCandidate } from '@/src/extract';

/**
 * Fixture-driven tests for the whole extraction pipeline.
 *
 * The fixtures are hand-written but modelled on the markup patterns real shops
 * actually ship — @graph wrappers, offer arrays, microdata in content attributes,
 * struck-through sale prices, logos competing with product photos. To add coverage
 * for a shop that captures badly, save its page into tests/fixtures and assert here.
 */

function loadFixture(name: string, pageUrl: string): Document {
  // Resolved from the project root rather than import.meta.url: the repo path
  // contains a space, which breaks file-URL round-tripping on Windows.
  const html = readFileSync(resolve(process.cwd(), 'tests/fixtures', name), 'utf8');

  const doc = new DOMParser().parseFromString(html, 'text/html');
  // happy-dom does not give a parsed document a location, and the extractors need
  // the page URL to resolve relative image paths — it is passed in explicitly.
  return doc;
}

describe('JSON-LD product page', () => {
  let candidate: ReturnType<typeof extractCandidate>;

  beforeAll(() => {
    const doc = loadFixture('jsonld-graph.html', 'https://www.alza.cz/kavovar-d123.htm?utm_source=x');
    candidate = extractCandidate(doc, 'https://www.alza.cz/kavovar-d123.htm?utm_source=x', 'CZK');
  });

  it('finds the Product node nested inside @graph', () => {
    expect(candidate.title).toBe('DeLonghi Magnifica S ECAM 22.110.B');
    expect(candidate.source).toBe('json-ld');
  });

  it('quotes the cheapest offer, which is what the shopper actually pays', () => {
    expect(candidate.price).toEqual({ amount: 9490, currency: 'CZK', raw: '9490.00 CZK' });
  });

  it('reads brand from an object and takes the first image of an array', () => {
    expect(candidate.brand).toBe('DeLonghi');
    expect(candidate.imageUrl).toBe('https://cdn.alza.cz/foto/big/kavovar-1.jpg');
  });

  it('normalises schema.org availability into something readable', () => {
    expect(candidate.availability).toBe('In stock');
  });

  it('survives a malformed second JSON-LD block', () => {
    expect(candidate.title).toBeTruthy();
  });

  it('prefers the declared canonical URL over the address bar', () => {
    expect(candidate.url).toBe('https://www.alza.cz/kavovar-delonghi-magnifica-s-d123.htm');
    expect(candidate.canonicalUrl).toBe('https://alza.cz/kavovar-delonghi-magnifica-s-d123.htm');
  });
});

describe('microdata product page', () => {
  let candidate: ReturnType<typeof extractCandidate>;

  beforeAll(() => {
    const doc = loadFixture('microdata-product.html', 'https://nordichome.cz/throw');
    candidate = extractCandidate(doc, 'https://nordichome.cz/throw', 'CZK');
  });

  it('reads itemprop values including content attributes', () => {
    expect(candidate.title).toBe('Merino Wool Throw Blanket');
    expect(candidate.brand).toBe('Nordic Home');
    expect(candidate.price).toEqual({ amount: 2490, currency: 'CZK', raw: '2490.00 CZK' });
    expect(candidate.source).toBe('microdata');
  });

  it('resolves a relative image path against the page URL', () => {
    expect(candidate.imageUrl).toBe('https://nordichome.cz/media/products/throw-blanket-large.jpg');
  });

  it('reads availability from a link href', () => {
    expect(candidate.availability).toBe('Out of stock');
  });
});

describe('OpenGraph-only page', () => {
  let candidate: ReturnType<typeof extractCandidate>;

  beforeAll(() => {
    const doc = loadFixture('og-only.html', 'https://makerstudio.com/p/leather-cover');
    candidate = extractCandidate(doc, 'https://makerstudio.com/p/leather-cover', 'CZK');
  });

  it('strips the shop-name suffix from the title', () => {
    expect(candidate.title).toBe('Leather Sketchbook Cover');
  });

  it('uses the meta price and currency', () => {
    expect(candidate.price).toEqual({ amount: 52, currency: 'EUR', raw: '52.00 EUR' });
    expect(candidate.source).toBe('open-graph');
  });

  it('prefers the og image over the twitter one', () => {
    expect(candidate.imageUrl).toBe('https://cdn.makerstudio.com/covers/leather-a5.jpg');
  });
});

describe('page with no structured data', () => {
  let candidate: ReturnType<typeof extractCandidate>;

  beforeAll(() => {
    const doc = loadFixture('bare-product.html', 'https://lightworks.cz/lamps/aurora');
    candidate = extractCandidate(doc, 'https://lightworks.cz/lamps/aurora', 'CZK');
  });

  it('falls back to the product heading', () => {
    expect(candidate.title).toBe('Aurora Standing Desk Lamp');
    expect(candidate.source).toBe('heuristic');
  });

  it('ignores the struck-through original price', () => {
    expect(candidate.price?.amount).toBe(1490);
    expect(candidate.price?.currency).toBe('CZK');
  });

  it('picks the product photo over the header logo and payment icons', () => {
    expect(candidate.imageUrl).toBe('https://lightworks.cz/media/aurora-lamp-hero.jpg');
  });
});

describe('resilience', () => {
  it('always returns something usable, even for an empty document', () => {
    const doc = new DOMParser().parseFromString('<html><head></head><body></body></html>', 'text/html');
    const candidate = extractCandidate(doc, 'https://example.com/thing', 'CZK');

    expect(candidate.title).toBeTruthy();
    expect(candidate.site).toBe('Example');
    expect(candidate.canonicalUrl).toBe('https://example.com/thing');
    expect(candidate.source).toBe('fallback');
  });
});
