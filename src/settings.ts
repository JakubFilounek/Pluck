import type { PersonId } from './domain/types';

/**
 * Settings live in browser.storage.local rather than in IndexedDB. They are tiny,
 * and storage.onChanged gives every surface (popup, dashboard, background) a free
 * live-update channel — which matters most for the active-person toggle, where a
 * stale value in one window would defeat surprise mode.
 */

export const SETTINGS_KEY = 'pluck.settings.v1';

export type ViewMode = 'grid' | 'list';

export type Settings = {
  activePerson: PersonId;
  personNames: Record<PersonId, string>;
  viewMode: ViewMode;
  theme: 'light' | 'dark' | 'system';
  /** Hide gifts intended for the active person. Can be turned off entirely. */
  surpriseMode: boolean;
  /** ISO date of the last successful JSON export, used for the backup nag. */
  lastExportAt?: string;
  /** Default currency used when a page gives a bare number with no symbol. */
  defaultCurrency: string;
};

export const DEFAULT_SETTINGS: Settings = {
  activePerson: 'a',
  personNames: { a: 'Me', b: 'Her' },
  viewMode: 'grid',
  theme: 'system',
  surpriseMode: true,
  defaultCurrency: 'CZK',
};

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const value = stored[SETTINGS_KEY] as Partial<Settings> | undefined;

  // Merge rather than replace so a settings key added in a later version doesn't
  // read back as undefined for existing installs.
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    personNames: { ...DEFAULT_SETTINGS.personNames, ...value?.personNames },
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await browser.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

/** Subscribe to settings changes from any extension surface. Returns an unsubscribe fn. */
export function watchSettings(onChange: (settings: Settings) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ) => {
    if (areaName !== 'local') return;

    const change = changes[SETTINGS_KEY];
    if (!change?.newValue) return;

    const value = change.newValue as Partial<Settings>;
    onChange({
      ...DEFAULT_SETTINGS,
      ...value,
      personNames: { ...DEFAULT_SETTINGS.personNames, ...value.personNames },
    });
  };

  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

export function otherPerson(person: PersonId): PersonId {
  return person === 'a' ? 'b' : 'a';
}
