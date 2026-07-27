import type { PersonId } from '../domain/types';
import type { Settings } from '../settings';

/**
 * Drives the two theming attributes on <html>:
 *
 *   data-person  a | b     — which palette and motif (blue/tech vs pink/cats)
 *   data-theme   light | dark
 *
 * 'system' follows the OS setting and keeps following it, so the extension changes
 * with the rest of the desktop at dusk. Returns a cleanup function that detaches the
 * media listener.
 */
export function applyAppearance(theme: Settings['theme'], person: PersonId): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const resolve = () => {
    const dark = theme === 'dark' || (theme === 'system' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.person = person;
  };

  resolve();

  if (theme !== 'system') return () => {};

  media.addEventListener('change', resolve);
  return () => media.removeEventListener('change', resolve);
}
