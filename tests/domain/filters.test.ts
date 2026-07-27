import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  combinedWant,
  filterItems,
  isHiddenFromViewer,
  matchesFilters,
  totalWant,
} from '@/src/domain/filters';
import type { Item } from '@/src/domain/types';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    title: 'Merino Wool Throw',
    url: 'https://shop.com/throw',
    canonicalUrl: 'https://shop.com/throw',
    site: 'Shop',
    tagIds: [],
    want: {},
    status: 'wanted',
    addedBy: 'a',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('surprise mode', () => {
  it('hides a gift from the person it is meant for', () => {
    const gift = makeItem({ giftFor: 'b' });

    expect(isHiddenFromViewer(gift, 'b', true)).toBe(true);
    expect(isHiddenFromViewer(gift, 'a', true)).toBe(false);
  });

  it('hides nothing when surprise mode is switched off', () => {
    const gift = makeItem({ giftFor: 'b' });
    expect(isHiddenFromViewer(gift, 'b', false)).toBe(false);
  });

  it('leaves items with no gift recipient visible to everyone', () => {
    const plain = makeItem();

    expect(isHiddenFromViewer(plain, 'a', true)).toBe(false);
    expect(isHiddenFromViewer(plain, 'b', true)).toBe(false);
  });

  it('hides gifts even when they would otherwise match the filters', () => {
    const items = [
      makeItem({ id: 'visible', title: 'Wool Throw' }),
      makeItem({ id: 'gift', title: 'Wool Throw', giftFor: 'b' }),
    ];

    const seenByB = filterItems(items, { ...DEFAULT_FILTERS, search: 'wool' }, 'b', true);
    const seenByA = filterItems(items, { ...DEFAULT_FILTERS, search: 'wool' }, 'a', true);

    // The search box must not become a way around surprise mode.
    expect(seenByB.map((item) => item.id)).toEqual(['visible']);
    expect(seenByA.map((item) => item.id).sort()).toEqual(['gift', 'visible']);
  });
});

describe('search', () => {
  it('matches title, brand, site and notes', () => {
    const item = makeItem({ brand: 'Nordic', notes: 'oatmeal colour' });

    for (const search of ['merino', 'nordic', 'shop', 'oatmeal']) {
      expect(matchesFilters(item, { ...DEFAULT_FILTERS, search })).toBe(true);
    }
  });

  it('requires every term, so more words narrow the results', () => {
    const item = makeItem({ brand: 'Nordic' });

    expect(matchesFilters(item, { ...DEFAULT_FILTERS, search: 'merino nordic' })).toBe(true);
    expect(matchesFilters(item, { ...DEFAULT_FILTERS, search: 'merino cotton' })).toBe(false);
  });
});

describe('status filter', () => {
  it('defaults to the working list only', () => {
    expect(matchesFilters(makeItem({ status: 'wanted' }), DEFAULT_FILTERS)).toBe(true);
    expect(matchesFilters(makeItem({ status: 'bought' }), DEFAULT_FILTERS)).toBe(false);
    expect(matchesFilters(makeItem({ status: 'dropped' }), DEFAULT_FILTERS)).toBe(false);
  });

  it('treats an empty status list as no filter', () => {
    const filters = { ...DEFAULT_FILTERS, statuses: [] };

    expect(matchesFilters(makeItem({ status: 'dropped' }), filters)).toBe(true);
  });
});

describe('tag filter', () => {
  const item = makeItem({ tagIds: ['tag-christmas', 'tag-onsale'] });

  it("matches any tag in 'any' mode", () => {
    const filters = { ...DEFAULT_FILTERS, tagIds: ['tag-christmas', 'tag-birthday'], tagMode: 'any' as const };
    expect(matchesFilters(item, filters)).toBe(true);
  });

  it("requires every tag in 'all' mode", () => {
    const filters = { ...DEFAULT_FILTERS, tagIds: ['tag-christmas', 'tag-birthday'], tagMode: 'all' as const };
    expect(matchesFilters(item, filters)).toBe(false);
  });
});

describe('want filter', () => {
  it('passes when either person clears the threshold', () => {
    const item = makeItem({ want: { a: 1, b: 5 } });
    const filters = { ...DEFAULT_FILTERS, minWant: 4, wantOf: 'either' as const };

    expect(matchesFilters(item, filters)).toBe(true);
  });

  it('can be pinned to one person', () => {
    const item = makeItem({ want: { a: 1, b: 5 } });

    expect(matchesFilters(item, { ...DEFAULT_FILTERS, minWant: 4, wantOf: 'a' })).toBe(false);
    expect(matchesFilters(item, { ...DEFAULT_FILTERS, minWant: 4, wantOf: 'b' })).toBe(true);
  });

  it('treats an unrated item as zero', () => {
    expect(matchesFilters(makeItem(), { ...DEFAULT_FILTERS, minWant: 1 })).toBe(false);
  });
});

describe('price filter', () => {
  it('applies both bounds', () => {
    const item = makeItem({ price: { amount: 500, currency: 'CZK', raw: '500' } });

    expect(matchesFilters(item, { ...DEFAULT_FILTERS, priceMin: 400, priceMax: 600 })).toBe(true);
    expect(matchesFilters(item, { ...DEFAULT_FILTERS, priceMax: 400 })).toBe(false);
  });

  it('excludes unpriced items from a price range rather than treating them as free', () => {
    expect(matchesFilters(makeItem(), { ...DEFAULT_FILTERS, priceMax: 400 })).toBe(false);
  });
});

describe('want helpers', () => {
  it('combines by highest and totals for tie-breaking', () => {
    expect(combinedWant(makeItem({ want: { a: 2, b: 5 } }))).toBe(5);
    expect(totalWant(makeItem({ want: { a: 2, b: 5 } }))).toBe(7);
    expect(combinedWant(makeItem())).toBe(0);
  });
});
