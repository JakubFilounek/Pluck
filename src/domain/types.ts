/**
 * Core domain types. Pure data — nothing in here touches a browser API, so every
 * module that imports this file stays testable under plain Node.
 */

/**
 * Pluck is used by exactly two people sharing one browser profile. There are no
 * accounts and no login; 'a' and 'b' are stable internal ids and the display names
 * are editable in settings.
 */
export type PersonId = 'a' | 'b';

export const PERSON_IDS: readonly PersonId[] = ['a', 'b'];

/**
 * 'dropped' means "not wanted any more" and is deliberately not the same as deleting.
 * Dropped items stay out of sight but remain recoverable.
 */
export type ItemStatus = 'wanted' | 'bought' | 'dropped';

export const ITEM_STATUSES: readonly ItemStatus[] = ['wanted', 'bought', 'dropped'];

/** How much someone wants a thing: 0 (unrated) through 5. */
export type WantLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const MAX_WANT: WantLevel = 5;

export type Price = {
  /** Numeric value in major units, e.g. 1299.00. */
  amount: number;
  /** ISO 4217 where we could determine it, otherwise a best-effort symbol. */
  currency: string;
  /** Exactly what the page showed, kept so a bad parse is still auditable. */
  raw: string;
};

export type Item = {
  id: string;
  title: string;
  /** The URL as saved, including any tracking params the user happened to have. */
  url: string;
  /** Normalised form used for duplicate detection. See src/extract/url.ts. */
  canonicalUrl: string;
  /** Pretty site name, e.g. 'Alza' for alza.cz. */
  site: string;
  imageUrl?: string;
  /** Set only once optional image caching is enabled; points into the thumbnails table. */
  thumbId?: string;
  price?: Price;
  brand?: string;
  availability?: string;
  categoryId?: string;
  tagIds: string[];
  /**
   * Lists this item belongs to. An item in no list at all is "unfiled" and visible to
   * everyone; an item in lists is visible to whoever can see at least one of them.
   */
  listIds: string[];
  /**
   * Independent want-rating per person. This is the heart of the model: "how much I
   * want it" and "how much she wants it" are separate numbers, never averaged away.
   */
  want: Partial<Record<PersonId, WantLevel>>;
  status: ItemStatus;
  /**
   * When set, this item is a gift intended for that person, and it is hidden from
   * them while they are the active person. See src/data/queries.ts.
   */
  giftFor?: PersonId;
  addedBy: PersonId;
  boughtBy?: PersonId;
  boughtAt?: string;
  /** What was actually paid, which is often not the listed price. */
  boughtPrice?: Price;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A named list. Items can belong to any number of them.
 *
 * 'private' means visible only to its owner — that is what keeps a surprise off the
 * other person's screen. 'shared' means both people see it. There is deliberately no
 * middle ground: two users, so anything not private is shared.
 */
export type ListVisibility = 'shared' | 'private';

export type PluckList = {
  id: string;
  name: string;
  /** Icon name from src/ui/icons.ts. */
  icon: string;
  color: string;
  visibility: ListVisibility;
  /** Who created it. Only meaningful for private lists, which only they can see. */
  ownerId: PersonId;
  sortOrder: number;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  /**
   * Name of an icon in src/ui/icons.ts, e.g. 'laptop'. Deliberately typed as a plain
   * string rather than IconName: this value is persisted and can arrive from a backup
   * file written by another version, so the renderer treats unknown names as the
   * fallback icon instead of the type system pretending they can't happen.
   */
  icon: string;
  sortOrder: number;
};

export type Tag = {
  id: string;
  name: string;
  /** Hex colour used for the chip background. */
  color: string;
  sortOrder: number;
};

/** What the extraction pipeline produces before the user confirms it. */
export type CaptureCandidate = {
  title: string;
  url: string;
  canonicalUrl: string;
  site: string;
  imageUrl?: string;
  price?: Price;
  brand?: string;
  availability?: string;
  notes?: string;
  /** Which extractor produced the bulk of this, for debugging bad captures. */
  source: CaptureSource;
};

export type CaptureSource =
  | 'json-ld'
  | 'microdata'
  | 'open-graph'
  | 'twitter'
  | 'heuristic'
  | 'fallback';
