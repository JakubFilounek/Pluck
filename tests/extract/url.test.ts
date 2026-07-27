import { describe, expect, it } from 'vitest';
import { canonicalizeUrl, resolveUrl, siteNameFromUrl } from '@/src/extract/url';

describe('canonicalizeUrl', () => {
  it('strips tracking parameters', () => {
    expect(
      canonicalizeUrl('https://shop.com/p/123?utm_source=news&utm_medium=email&fbclid=abc'),
    ).toBe('https://shop.com/p/123');
  });

  it('keeps parameters that select a real variant', () => {
    expect(canonicalizeUrl('https://shop.com/p/123?color=black&utm_source=x')).toBe(
      'https://shop.com/p/123?color=black',
    );
  });

  it('collapses the same product reached different ways to one key', () => {
    const fromNewsletter = canonicalizeUrl('http://www.shop.com/p/123/?utm_campaign=spring#reviews');
    const fromSearch = canonicalizeUrl('https://shop.com/p/123?gclid=xyz');

    expect(fromNewsletter).toBe(fromSearch);
  });

  it('sorts remaining parameters so order cannot cause a duplicate miss', () => {
    expect(canonicalizeUrl('https://shop.com/p?b=2&a=1')).toBe(
      canonicalizeUrl('https://shop.com/p?a=1&b=2'),
    );
  });

  it('leaves the root path alone', () => {
    expect(canonicalizeUrl('https://shop.com/')).toBe('https://shop.com/');
  });

  it('returns unparseable input untouched rather than throwing', () => {
    expect(canonicalizeUrl('not a url')).toBe('not a url');
  });
});

describe('siteNameFromUrl', () => {
  it('reads the label from ordinary domains', () => {
    expect(siteNameFromUrl('https://www.alza.cz/product')).toBe('Alza');
    expect(siteNameFromUrl('https://shop.example.com/x')).toBe('Example');
  });

  it('handles compound public suffixes', () => {
    expect(siteNameFromUrl('https://www.marksandspencer.co.uk/x')).toBe('Marksandspencer');
    expect(siteNameFromUrl('https://shop.example.co.uk/x')).toBe('Example');
  });

  it('title-cases hyphenated labels', () => {
    expect(siteNameFromUrl('https://my-great-shop.com')).toBe('My Great Shop');
  });

  it('does not throw on invalid input', () => {
    expect(siteNameFromUrl('nope')).toBe('Unknown');
  });
});

describe('resolveUrl', () => {
  it('absolutises relative paths', () => {
    expect(resolveUrl('/img/a.jpg', 'https://shop.com/p/1')).toBe('https://shop.com/img/a.jpg');
  });

  it('passes through data URIs and absolute URLs', () => {
    expect(resolveUrl('data:image/png;base64,AAA', 'https://shop.com')).toBe(
      'data:image/png;base64,AAA',
    );
    expect(resolveUrl('https://cdn.com/a.jpg', 'https://shop.com')).toBe('https://cdn.com/a.jpg');
  });

  it('returns undefined for empty input', () => {
    expect(resolveUrl(undefined, 'https://shop.com')).toBeUndefined();
    expect(resolveUrl('   ', 'https://shop.com')).toBeUndefined();
  });
});
