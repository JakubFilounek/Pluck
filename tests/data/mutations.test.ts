import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, seedDefaults } from '@/src/data/db';
import { createItem, setWant, markBought, setStatus, deleteItem } from '@/src/data/mutations';
import { findDuplicate, queryItems } from '@/src/data/queries';
import { DEFAULT_FILTERS } from '@/src/domain/filters';
import type { CaptureCandidate } from '@/src/domain/types';

/**
 * Exercises the real Dexie stack against an in-memory IndexedDB.
 *
 * The write path had no coverage because it needs a browser database, which is
 * precisely where a save can fail silently — the popup awaited createItem with no
 * catch, so any rejection left the UI untouched and the button looked dead.
 */

const CANDIDATE: CaptureCandidate = {
  title: 'AlzaErgo Cat Holder Šedý',
  url: 'https://www.alza.cz/cat-holder-d7654321.htm',
  canonicalUrl: 'https://alza.cz/cat-holder-d7654321.htm',
  site: 'Alza',
  imageUrl: 'https://cdn.alza.cz/foto/cat-holder.jpg',
  price: { amount: 999, currency: 'CZK', raw: '999,-' },
  source: 'heuristic',
};

const CTX = { viewer: 'a' as const, surpriseMode: true };

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('createItem', () => {
  it('writes a capture straight from the extractor', async () => {
    const item = await createItem({ candidate: CANDIDATE, addedBy: 'a' });

    expect(item.id).toBeTruthy();
    expect(await db.items.count()).toBe(1);

    const stored = await db.items.get(item.id);
    expect(stored?.title).toBe('AlzaErgo Cat Holder Šedý');
    expect(stored?.price?.amount).toBe(999);
    expect(stored?.status).toBe('wanted');
  });

  it('accepts the exact shape the popup sends, undefined fields included', async () => {
    // Mirrors the popup's call when nothing optional was filled in — the fields are
    // present but undefined, which is what an indexed store has to tolerate.
    const item = await createItem({
      candidate: CANDIDATE,
      addedBy: 'a',
      want: undefined,
      categoryId: undefined,
      tagIds: [],
      giftFor: undefined,
      notes: undefined,
    });

    expect(await db.items.get(item.id)).toBeTruthy();
  });

  it('materialises reactive Proxy values before writing to IndexedDB', async () => {
    // Svelte 5 wraps component arrays and nested records in Proxy objects. Native
    // IndexedDB rejects those with DataCloneError unless the data boundary removes
    // the proxies first.
    const reactiveTags = new Proxy(['tag-christmas'], {});
    const reactiveLists = new Proxy(['list-nas-seznam'], {});
    const reactivePrice = new Proxy({ amount: 999, currency: 'CZK', raw: '999 Kč' }, {});

    const item = await createItem({
      candidate: { ...CANDIDATE, price: reactivePrice },
      addedBy: 'a',
      tagIds: reactiveTags,
      listIds: reactiveLists,
    });

    const stored = await db.items.get(item.id);
    expect(stored?.tagIds).toEqual(['tag-christmas']);
    expect(stored?.listIds).toEqual(['list-nas-seznam']);
    expect(stored?.price).toEqual({ amount: 999, currency: 'CZK', raw: '999 Kč' });
  });

  it('records the rating against the person who added it', async () => {
    const item = await createItem({ candidate: CANDIDATE, addedBy: 'b', want: 4 });

    expect(item.want).toEqual({ b: 4 });
  });

  it('stores tags and category when given', async () => {
    await seedDefaults();
    const item = await createItem({
      candidate: CANDIDATE,
      addedBy: 'a',
      categoryId: 'cat-home',
      tagIds: ['tag-christmas', 'tag-someday'],
    });

    const stored = await db.items.get(item.id);
    expect(stored?.categoryId).toBe('cat-home');
    expect(stored?.tagIds).toEqual(['tag-christmas', 'tag-someday']);
  });

  it('can be found by tag afterwards, so the multiEntry index works', async () => {
    await createItem({ candidate: CANDIDATE, addedBy: 'a', tagIds: ['tag-christmas'] });

    const found = await db.items.where('tagIds').equals('tag-christmas').toArray();
    expect(found).toHaveLength(1);
  });
});

describe('duplicate detection', () => {
  it('finds an item saved from the same canonical URL', async () => {
    await createItem({ candidate: CANDIDATE, addedBy: 'a' });

    const found = await findDuplicate(CTX, CANDIDATE.canonicalUrl);
    expect(found?.title).toBe('AlzaErgo Cat Holder Šedý');
  });

  it('reports nothing for a URL that has not been saved', async () => {
    expect(await findDuplicate(CTX, 'https://alza.cz/something-else')).toBeUndefined();
  });

  it('hides a duplicate that is a gift for the viewer', async () => {
    await createItem({ candidate: CANDIDATE, addedBy: 'b', giftFor: 'a' });

    // Saying "already saved" here would give the surprise away.
    expect(await findDuplicate(CTX, CANDIDATE.canonicalUrl)).toBeUndefined();
    expect(await findDuplicate({ ...CTX, viewer: 'b' }, CANDIDATE.canonicalUrl)).toBeTruthy();
  });
});

describe('lifecycle', () => {
  it('rates, buys, restores and deletes', async () => {
    const item = await createItem({ candidate: CANDIDATE, addedBy: 'a' });

    await setWant(item.id, 'b', 5);
    expect((await db.items.get(item.id))?.want).toEqual({ b: 5 });

    await setWant(item.id, 'b', 0);
    expect((await db.items.get(item.id))?.want).toEqual({});

    await markBought(item.id, 'a', { amount: 899, currency: 'CZK', raw: '899' });
    const bought = await db.items.get(item.id);
    expect(bought?.status).toBe('bought');
    expect(bought?.boughtPrice?.amount).toBe(899);

    await setStatus(item.id, 'wanted');
    const restored = await db.items.get(item.id);
    expect(restored?.status).toBe('wanted');
    // Purchase details must not linger on an item that is wanted again.
    expect(restored?.boughtPrice).toBeUndefined();

    await deleteItem(item.id);
    expect(await db.items.count()).toBe(0);
  });
});

describe('queryItems', () => {
  it('returns what was just saved under the default filters', async () => {
    await createItem({ candidate: CANDIDATE, addedBy: 'a' });

    const items = await queryItems(CTX, DEFAULT_FILTERS);
    expect(items).toHaveLength(1);
  });
});

describe('seedDefaults', () => {
  it('is safe to run repeatedly', async () => {
    await seedDefaults();
    const first = await db.categories.count();

    await seedDefaults();
    expect(await db.categories.count()).toBe(first);
  });
});
