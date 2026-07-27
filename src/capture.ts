import type { CaptureCandidate } from './domain/types';
import { canonicalizeUrl, siteNameFromUrl } from './extract/url';

/**
 * Bridge between an extension surface and the extraction code that has to run inside
 * the page. Used by both the popup and the background context menu.
 *
 * The content script is injected on demand rather than declared against <all_urls>,
 * so Pluck can only read a page at the moment you explicitly ask it to.
 */

export const CAPTURE_MESSAGE = 'pluck:capture';

export type CaptureRequest = {
  type: typeof CAPTURE_MESSAGE;
  fallbackCurrency: string;
};

export type CaptureResult =
  | { ok: true; candidate: CaptureCandidate }
  | { ok: false; reason: string };

export function isCapturableUrl(url: string | undefined): url is string {
  if (!url) return false;
  // Extension, about: and view-source pages can't be scripted, and there is nothing
  // to save on them anyway.
  return /^https?:\/\//i.test(url);
}

/**
 * Builds a candidate from tab metadata alone. Used when script injection isn't
 * possible — a saved title and URL still beat losing the item entirely.
 */
export function candidateFromTab(tab: {
  url?: string;
  title?: string;
}): CaptureCandidate | undefined {
  if (!isCapturableUrl(tab.url)) return undefined;

  return {
    title: tab.title?.trim() || 'Untitled item',
    url: tab.url,
    canonicalUrl: canonicalizeUrl(tab.url),
    site: siteNameFromUrl(tab.url),
    source: 'fallback',
  };
}

export async function captureTab(
  tabId: number,
  tab: { url?: string; title?: string },
  fallbackCurrency: string,
): Promise<CaptureResult> {
  if (!isCapturableUrl(tab.url)) {
    return { ok: false, reason: 'Pluck can only save regular web pages.' };
  }

  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/content.js'],
    });

    const response = (await browser.tabs.sendMessage(tabId, {
      type: CAPTURE_MESSAGE,
      fallbackCurrency,
    } satisfies CaptureRequest)) as CaptureCandidate | undefined;

    if (response?.title) return { ok: true, candidate: response };
  } catch {
    // Injection is blocked on addons.mozilla.org, PDF viewers and pages served with
    // a restrictive CSP. Fall through to tab metadata rather than failing the save.
  }

  const fallback = candidateFromTab(tab);
  return fallback
    ? { ok: true, candidate: fallback }
    : { ok: false, reason: 'Could not read this page.' };
}

export async function captureActiveTab(fallbackCurrency: string): Promise<CaptureResult> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) return { ok: false, reason: 'No active tab.' };
  return captureTab(tab.id, tab, fallbackCurrency);
}
