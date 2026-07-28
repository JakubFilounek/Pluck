import { describe, expect, it } from 'vitest';
import { sortItems } from '@/src/domain/sort';
import type { Item, Price } from '@/src/domain/types';

function makeItem(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    title: id,
    url: `https://shop.com/${id}`,
    canonicalUrl: `https://shop.com/${id}`,
    site: 'Shop',
    tagIds: [],
    listIds: [],
    want: {},
    status: 'wanted',
    addedBy: 'a',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const price = (amount: number): Price => ({ amount, currency: 'CZK', raw: String(amount) });

describe('want-combined', () => {
  it('ranks by the highest single rating', () => {
    const items = [
      makeItem('low', { want: { a: 1, b: 1 } }),
      makeItem('high', { want: { b: 5 } }),
      makeItem('mid', { want: { a: 3 } }),
    ];

    expect(sortItems(items, 'want-combined', 'a').map((item) => item.id)).toEqual([
      'high',
      'mid',
      'low',
    ]);
  });

  it('breaks ties in favour of things both people want', () => {
    const items = [
      makeItem('one-sided', { want: { a: 4 } }),
      makeItem('mutual', { want: { a: 4, b: 3 } }),
    ];

    expect(sortItems(items, 'want-combined', 'a')[0]?.id).toBe('mutual');
  });
});

describe('per-person want', () => {
  it("'mine' and 'theirs' follow the active person", () => {
    const items = [makeItem('hers', { want: { b: 5 } }), makeItem('his', { want: { a: 5 } })];

    expect(sortItems(items, 'want-mine', 'a')[0]?.id).toBe('his');
    expect(sortItems(items, 'want-theirs', 'a')[0]?.id).toBe('hers');
    // Same data, other viewer, mirrored result.
    expect(sortItems(items, 'want-mine', 'b')[0]?.id).toBe('hers');
  });
});

describe('price', () => {
  it('sorts ascending and descending', () => {
    const items = [
      makeItem('mid', { price: price(500) }),
      makeItem('cheap', { price: price(100) }),
      makeItem('dear', { price: price(900) }),
    ];

    expect(sortItems(items, 'price-asc', 'a').map((item) => item.id)).toEqual([
      'cheap',
      'mid',
      'dear',
    ]);
    expect(sortItems(items, 'price-desc', 'a').map((item) => item.id)).toEqual([
      'dear',
      'mid',
      'cheap',
    ]);
  });

  it('pushes unpriced items last in both directions instead of treating them as free', () => {
    const items = [makeItem('none'), makeItem('cheap', { price: price(100) })];

    expect(sortItems(items, 'price-asc', 'a').map((item) => item.id)).toEqual(['cheap', 'none']);
    expect(sortItems(items, 'price-desc', 'a').map((item) => item.id)).toEqual(['cheap', 'none']);
  });
});

describe('recency', () => {
  it('sorts newest and oldest first', () => {
    const items = [
      makeItem('old', { createdAt: '2026-01-01T00:00:00.000Z' }),
      makeItem('new', { createdAt: '2026-06-01T00:00:00.000Z' }),
    ];

    expect(sortItems(items, 'newest', 'a')[0]?.id).toBe('new');
    expect(sortItems(items, 'oldest', 'a')[0]?.id).toBe('old');
  });
});

it('does not mutate the array it was given', () => {
  const items = [makeItem('b'), makeItem('a')];
  const original = [...items];

  sortItems(items, 'title', 'a');

  expect(items).toEqual(original);
});
