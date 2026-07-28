import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  canSeeList,
  filterItems,
  indexLists,
  isHiddenFromViewer,
} from '@/src/domain/filters';
import type { Item, PluckList } from '@/src/domain/types';

/**
 * List privacy. A private list is the mechanism that keeps a surprise off the other
 * person's screen, so these rules get tested directly rather than trusted.
 */

function list(overrides: Partial<PluckList> & { id: string }): PluckList {
  return {
    name: overrides.id,
    icon: 'box',
    color: '#000000',
    visibility: 'shared',
    ownerId: 'a',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    title: 'Kávovar',
    url: 'https://alza.cz/kavovar',
    canonicalUrl: 'https://alza.cz/kavovar',
    site: 'Alza',
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

const LISTS = indexLists([
  list({ id: 'shared', visibility: 'shared', ownerId: 'a' }),
  list({ id: 'private-a', visibility: 'private', ownerId: 'a' }),
  list({ id: 'private-b', visibility: 'private', ownerId: 'b' }),
]);

describe('canSeeList', () => {
  it('shows shared lists to both people', () => {
    const shared = list({ id: 'shared' });
    expect(canSeeList(shared, 'a')).toBe(true);
    expect(canSeeList(shared, 'b')).toBe(true);
  });

  it('shows a private list only to its owner', () => {
    const mine = list({ id: 'p', visibility: 'private', ownerId: 'b' });
    expect(canSeeList(mine, 'b')).toBe(true);
    expect(canSeeList(mine, 'a')).toBe(false);
  });

  it('treats an unknown list as invisible rather than visible', () => {
    // Failing open here would expose items whose list row went missing.
    expect(canSeeList(undefined, 'a')).toBe(false);
  });
});

describe('item visibility', () => {
  it('shows unfiled items to everyone', () => {
    expect(isHiddenFromViewer(item(), 'a', true, LISTS)).toBe(false);
    expect(isHiddenFromViewer(item(), 'b', true, LISTS)).toBe(false);
  });

  it('hides an item filed only in the other person’s private list', () => {
    const hidden = item({ listIds: ['private-b'] });

    expect(isHiddenFromViewer(hidden, 'a', true, LISTS)).toBe(true);
    expect(isHiddenFromViewer(hidden, 'b', true, LISTS)).toBe(false);
  });

  it('keeps an item visible if any of its lists is visible', () => {
    // Filing something into a private list must not retract it from the shared list
    // you both already see.
    const both = item({ listIds: ['private-b', 'shared'] });

    expect(isHiddenFromViewer(both, 'a', true, LISTS)).toBe(false);
  });

  it('hides an item whose only lists are all private to others', () => {
    const hidden = item({ listIds: ['private-b'] });
    expect(isHiddenFromViewer(hidden, 'a', false, LISTS)).toBe(true);
  });

  it('applies list privacy even when surprise mode is off', () => {
    // Surprise mode governs gifts. A private list is a separate promise and must not
    // be switched off by it.
    const hidden = item({ listIds: ['private-b'] });
    expect(isHiddenFromViewer(hidden, 'a', false, LISTS)).toBe(true);
  });

  it('still hides gifts for the viewer', () => {
    const gift = item({ giftFor: 'a', listIds: ['shared'] });

    expect(isHiddenFromViewer(gift, 'a', true, LISTS)).toBe(true);
    expect(isHiddenFromViewer(gift, 'b', true, LISTS)).toBe(false);
  });

  it('hides an item referencing a list that no longer exists', () => {
    expect(isHiddenFromViewer(item({ listIds: ['gone'] }), 'a', true, LISTS)).toBe(true);
  });

  it('tolerates items written before lists existed', () => {
    const legacy = { ...item(), listIds: undefined } as unknown as Item;
    expect(isHiddenFromViewer(legacy, 'a', true, LISTS)).toBe(false);
  });
});

describe('filtering by list', () => {
  const items = [
    item({ id: 'unfiled' }),
    item({ id: 'in-shared', listIds: ['shared'] }),
    item({ id: 'in-private-b', listIds: ['private-b'] }),
  ];

  it('never returns items hidden from the viewer, whatever the filter', () => {
    const seenByA = filterItems(items, DEFAULT_FILTERS, 'a', true, LISTS);
    expect(seenByA.map((entry) => entry.id).sort()).toEqual(['in-shared', 'unfiled']);
  });

  it('restricts to the chosen lists', () => {
    const filtered = filterItems(
      items,
      { ...DEFAULT_FILTERS, listIds: ['shared'] },
      'a',
      true,
      LISTS,
    );

    expect(filtered.map((entry) => entry.id)).toEqual(['in-shared']);
  });

  it('cannot be used to reach into a list the viewer cannot see', () => {
    // Even asked for by id directly, a private list stays private.
    const filtered = filterItems(
      items,
      { ...DEFAULT_FILTERS, listIds: ['private-b'] },
      'a',
      true,
      LISTS,
    );

    expect(filtered).toEqual([]);
  });
});
