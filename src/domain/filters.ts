import type { Item, ItemStatus, PersonId } from './types';

/**
 * Pure filtering logic. Kept free of Dexie and browser APIs so the rules — especially
 * surprise mode — can be tested directly.
 */

export type TagMode = 'any' | 'all';

export type ItemFilters = {
  /** Free text matched against title, brand, site, notes. */
  search: string;
  /** Empty means "no status filter". */
  statuses: ItemStatus[];
  categoryIds: string[];
  tagIds: string[];
  tagMode: TagMode;
  /** Restrict to items added by a specific person. */
  addedBy?: PersonId;
  /** Whose want-rating minWant applies to. 'either' passes if any person clears it. */
  wantOf: 'either' | PersonId;
  /** 0 disables the want threshold. */
  minWant: number;
  priceMin?: number;
  priceMax?: number;
  sites: string[];
};

export const DEFAULT_FILTERS: ItemFilters = {
  search: '',
  // Wanted-only by default: bought and dropped items are history, not the working list.
  statuses: ['wanted'],
  categoryIds: [],
  tagIds: [],
  tagMode: 'any',
  wantOf: 'either',
  minWant: 0,
  sites: [],
};

export function isDefaultFilters(filters: ItemFilters): boolean {
  return (
    filters.search === '' &&
    filters.categoryIds.length === 0 &&
    filters.tagIds.length === 0 &&
    filters.addedBy === undefined &&
    filters.minWant === 0 &&
    filters.priceMin === undefined &&
    filters.priceMax === undefined &&
    filters.sites.length === 0
  );
}

/**
 * Surprise mode. An item flagged as a gift for someone is hidden from that person
 * while they are the active person, so two people sharing one browser profile can
 * keep Christmas lists on it without spoiling each other.
 *
 * This is a courtesy screen, not security — the person toggle is one click away.
 * That caveat is surfaced in the settings UI rather than pretended away here.
 */
export function isHiddenFromViewer(
  item: Item,
  viewer: PersonId,
  surpriseMode: boolean,
): boolean {
  if (!surpriseMode) return false;
  return item.giftFor === viewer;
}

/** Highest want rating on the item across both people. */
export function combinedWant(item: Item): number {
  return Math.max(item.want.a ?? 0, item.want.b ?? 0);
}

/** Sum of both ratings — used to break ties when the maximums match. */
export function totalWant(item: Item): number {
  return (item.want.a ?? 0) + (item.want.b ?? 0);
}

function matchesSearch(item: Item, query: string): boolean {
  if (!query) return true;

  const haystack = [item.title, item.brand, item.site, item.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Every whitespace-separated term must appear, so typing more words narrows the
  // result set instead of accidentally widening it.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function matchesTags(item: Item, tagIds: string[], mode: TagMode): boolean {
  if (tagIds.length === 0) return true;

  return mode === 'all'
    ? tagIds.every((id) => item.tagIds.includes(id))
    : tagIds.some((id) => item.tagIds.includes(id));
}

function matchesWant(item: Item, wantOf: ItemFilters['wantOf'], minWant: number): boolean {
  if (minWant <= 0) return true;

  if (wantOf === 'either') {
    return (item.want.a ?? 0) >= minWant || (item.want.b ?? 0) >= minWant;
  }

  return (item.want[wantOf] ?? 0) >= minWant;
}

function matchesPrice(item: Item, min?: number, max?: number): boolean {
  if (min === undefined && max === undefined) return true;

  // An item with no detected price can't satisfy a price range, so exclude it rather
  // than letting unpriced rows leak into a "under 500" view.
  if (!item.price) return false;

  if (min !== undefined && item.price.amount < min) return false;
  if (max !== undefined && item.price.amount > max) return false;

  return true;
}

export function matchesFilters(item: Item, filters: ItemFilters): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false;
  if (filters.categoryIds.length > 0) {
    if (!item.categoryId || !filters.categoryIds.includes(item.categoryId)) return false;
  }
  if (filters.addedBy && item.addedBy !== filters.addedBy) return false;
  if (filters.sites.length > 0 && !filters.sites.includes(item.site)) return false;
  if (!matchesTags(item, filters.tagIds, filters.tagMode)) return false;
  if (!matchesWant(item, filters.wantOf, filters.minWant)) return false;
  if (!matchesPrice(item, filters.priceMin, filters.priceMax)) return false;
  if (!matchesSearch(item, filters.search)) return false;

  return true;
}

export function filterItems(
  items: Item[],
  filters: ItemFilters,
  viewer: PersonId,
  surpriseMode: boolean,
): Item[] {
  return items.filter(
    (item) => !isHiddenFromViewer(item, viewer, surpriseMode) && matchesFilters(item, filters),
  );
}
