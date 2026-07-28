import { captureTab, candidateFromTab, isCapturableUrl } from '@/src/capture';
import { seedDefaults } from '@/src/data/db';
import { createItem } from '@/src/data/mutations';
import { countByStatus, findDuplicate } from '@/src/data/queries';
import { canonicalizeUrl, siteNameFromUrl } from '@/src/extract/url';
import { loadSettings, SETTINGS_KEY } from '@/src/settings';
import type { CaptureCandidate } from '@/src/domain/types';

const MENU_SAVE_PAGE = 'pluck-save-page';
const MENU_SAVE_LINK = 'pluck-save-link';

async function buildMenus() {
  await browser.contextMenus.removeAll();

  browser.contextMenus.create({
    id: MENU_SAVE_PAGE,
    title: 'Uložit stránku do Plucku',
    contexts: ['page', 'image', 'selection'],
  });

  browser.contextMenus.create({
    id: MENU_SAVE_LINK,
    title: 'Uložit odkaz do Plucku',
    contexts: ['link'],
  });
}

/**
 * The badge shows how many things are still on the wanted list — but counted for the
 * active person, so a gift hidden from them is not silently included in their total.
 */
async function refreshBadge() {
  const settings = await loadSettings();
  const counts = await countByStatus({
    viewer: settings.activePerson,
    surpriseMode: settings.surpriseMode,
  });

  const wanted = counts['wanted'] ?? 0;

  await browser.action.setBadgeText({ text: wanted > 0 ? String(wanted) : '' });
  await browser.action.setBadgeBackgroundColor({ color: '#b4531f' });
}

/** Briefly overrides the badge to acknowledge a context-menu save. */
async function flashBadge(text: string, color: string) {
  await browser.action.setBadgeText({ text });
  await browser.action.setBadgeBackgroundColor({ color });
  setTimeout(() => void refreshBadge(), 1600);
}

async function saveCandidate(candidate: CaptureCandidate) {
  const settings = await loadSettings();
  const ctx = { viewer: settings.activePerson, surpriseMode: settings.surpriseMode };

  const existing = await findDuplicate(ctx, candidate.canonicalUrl);
  if (existing) {
    await flashBadge('dup', '#6b655d');
    return;
  }

  await createItem({ candidate, addedBy: settings.activePerson });
  await flashBadge('+1', '#2f7d52');
}

export default defineBackground(() => {
  void buildMenus();
  void seedDefaults().then(refreshBadge);

  browser.runtime.onInstalled.addListener(() => {
    void buildMenus();
    void seedDefaults().then(refreshBadge);
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    const settings = await loadSettings();

    if (info.menuItemId === MENU_SAVE_LINK && info.linkUrl) {
      // A link target hasn't been loaded, so there is no markup to read. Save what the
      // page tells us and let the item be filled in later from the dashboard.
      if (!isCapturableUrl(info.linkUrl)) return;

      await saveCandidate({
        title: info.selectionText?.trim() || info.linkUrl,
        url: info.linkUrl,
        canonicalUrl: canonicalizeUrl(info.linkUrl),
        site: siteNameFromUrl(info.linkUrl),
        source: 'fallback',
      });
      return;
    }

    if (info.menuItemId !== MENU_SAVE_PAGE || !tab?.id) return;

    const result = await captureTab(tab.id, tab, settings.defaultCurrency);
    if (result.ok) await saveCandidate(result.candidate);
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'open-dashboard') return;
    await openDashboard();
  });

  // Keep the badge honest: item changes come from the dashboard, and the active
  // person can change from either surface.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[SETTINGS_KEY]) void refreshBadge();
  });

  browser.runtime.onMessage.addListener((message: { type?: string }) => {
    if (message?.type === 'pluck:items-changed') void refreshBadge();
    if (message?.type === 'pluck:open-dashboard') return openDashboard();
  });
});

/** Focuses an already-open dashboard instead of piling up duplicate tabs. */
async function openDashboard() {
  const url = browser.runtime.getURL('/dashboard.html');
  const [existing] = await browser.tabs.query({ url });

  if (existing?.id) {
    await browser.tabs.update(existing.id, { active: true });
    if (existing.windowId) await browser.windows.update(existing.windowId, { focused: true });
    return;
  }

  await browser.tabs.create({ url });
}

export { candidateFromTab };
