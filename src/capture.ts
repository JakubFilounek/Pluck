import type { CaptureCandidate } from './domain/types';
import { extractCandidate } from './extract';
import { canonicalizeUrl, siteNameFromUrl } from './extract/url';

/**
 * Reads the current page so it can be turned into an item.
 *
 * The page's markup is pulled back in a single `scripting.executeScript` call and
 * parsed here. An earlier version injected a content-script file and then messaged
 * it, which added two failure modes — the script not registering, and the reply
 * racing — and when either happened the capture fell back to the tab title with no
 * price and no image, silently. One call with a direct return value has neither.
 *
 * Parsing stays on this side, so the whole extraction chain is exercised by the
 * fixture tests rather than only in a live browser.
 */

export type CaptureResult =
  | { ok: true; candidate: CaptureCandidate }
  | { ok: false; reason: string };

export function isCapturableUrl(url: string | undefined): url is string {
  if (!url) return false;
  // Extension, about: and view-source pages can't be scripted, and there is nothing
  // worth saving on them anyway.
  return /^https?:\/\//i.test(url);
}

type PageSnapshot = { html: string; url: string; title: string };

/**
 * Runs in the page. Deliberately self-contained: `func` is serialised by the browser,
 * so it cannot reference anything from this module's scope.
 */
function readPage(): PageSnapshot {
  return {
    html: document.documentElement.outerHTML,
    url: window.location.href,
    title: document.title,
  };
}

/** Tab metadata only. Used when the page genuinely cannot be read. */
export function candidateFromTab(tab: {
  url?: string;
  title?: string;
}): CaptureCandidate | undefined {
  if (!isCapturableUrl(tab.url)) return undefined;

  const site = siteNameFromUrl(tab.url);

  return {
    // Run the tab title through the same cleanup the extractors use, otherwise a
    // fallback capture keeps its "| Shop Name" suffix.
    title: cleanTabTitle(tab.title, site, tab.url) || 'Untitled item',
    url: tab.url,
    canonicalUrl: canonicalizeUrl(tab.url),
    site,
    source: 'fallback',
  };
}

function cleanTabTitle(title: string | undefined, site: string, url: string): string {
  if (!title) return '';

  // Parsing an empty document is enough to reuse the shared title cleanup rules.
  const doc = new DOMParser().parseFromString(
    `<html><head><title>${title.replace(/[<>]/g, '')}</title></head><body></body></html>`,
    'text/html',
  );

  return extractCandidate(doc, url, 'CZK').title;
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
    const [injection] = await browser.scripting.executeScript({
      target: { tabId },
      func: readPage,
    });

    const snapshot = injection?.result as PageSnapshot | undefined;

    if (snapshot?.html) {
      const doc = new DOMParser().parseFromString(snapshot.html, 'text/html');
      return { ok: true, candidate: extractCandidate(doc, snapshot.url, fallbackCurrency) };
    }
  } catch {
    // Injection is refused on addons.mozilla.org, the PDF viewer and reader mode.
    // Those fall through to tab metadata below.
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
