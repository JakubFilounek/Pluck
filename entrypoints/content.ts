import { CAPTURE_MESSAGE, type CaptureRequest } from '@/src/capture';
import { extractCandidate } from '@/src/extract';

/**
 * Runs inside the page and does one thing: read product data out of the markup when
 * asked. Registered at runtime rather than declared in the manifest, so it is only
 * ever injected into a page you explicitly capture from.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  registration: 'runtime',
  main() {
    // Injected repeatedly if you capture the same tab twice; the guard keeps a single
    // listener rather than stacking one per injection.
    if ((window as { __pluckReady?: boolean }).__pluckReady) return;
    (window as { __pluckReady?: boolean }).__pluckReady = true;

    browser.runtime.onMessage.addListener((message: CaptureRequest) => {
      if (message?.type !== CAPTURE_MESSAGE) return;

      return Promise.resolve(
        extractCandidate(document, window.location.href, message.fallbackCurrency),
      );
    });
  },
});
