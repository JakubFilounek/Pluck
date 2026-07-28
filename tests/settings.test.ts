import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Settings round-trip.
 *
 * The active person is stored here, and "it forgot who I was after a restart" is
 * only diagnosable if the load/save pair is known-good — so it is pinned down.
 */

/** Minimal stand-in for browser.storage.local, backed by a plain object. */
function fakeBrowser() {
  let store: Record<string, unknown> = {};

  return {
    reset: () => {
      store = {};
    },
    raw: () => store,
    storage: {
      local: {
        get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
        set: vi.fn(async (values: Record<string, unknown>) => {
          Object.assign(store, values);
        }),
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  };
}

const fake = fakeBrowser();
vi.stubGlobal('browser', fake);

const { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings, otherPerson } = await import(
  '@/src/settings'
);

beforeEach(() => {
  fake.reset();
  vi.clearAllMocks();
});

describe('loadSettings', () => {
  it('falls back to the defaults on a fresh profile', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('fills in keys a newer version added, rather than losing them', async () => {
    // A settings object written by an older build, missing newer fields.
    await fake.storage.local.set({ [SETTINGS_KEY]: { activePerson: 'b' } });

    const settings = await loadSettings();
    expect(settings.activePerson).toBe('b');
    expect(settings.defaultCurrency).toBe(DEFAULT_SETTINGS.defaultCurrency);
    expect(settings.personNames).toEqual(DEFAULT_SETTINGS.personNames);
  });
});

describe('saveSettings', () => {
  it('persists the active person and reads it back', async () => {
    await saveSettings({ activePerson: 'b' });

    // Re-read through a fresh load, which is what a restart does.
    expect((await loadSettings()).activePerson).toBe('b');
  });

  it('writes under the key the extension actually reads', async () => {
    await saveSettings({ activePerson: 'b' });
    expect(fake.raw()[SETTINGS_KEY]).toBeTruthy();
  });

  it('keeps unrelated settings when patching one field', async () => {
    await saveSettings({ personNames: { a: 'Jakub', b: 'Bára' } });
    await saveSettings({ activePerson: 'b' });

    const settings = await loadSettings();
    expect(settings.activePerson).toBe('b');
    expect(settings.personNames.a).toBe('Jakub');
    expect(settings.personNames.b).toBe('Bára');
  });

  it('survives repeated switches', async () => {
    for (const person of ['b', 'a', 'b'] as const) await saveSettings({ activePerson: person });
    expect((await loadSettings()).activePerson).toBe('b');
  });
});

describe('otherPerson', () => {
  it('is its own inverse', () => {
    expect(otherPerson('a')).toBe('b');
    expect(otherPerson(otherPerson('a'))).toBe('a');
  });
});
