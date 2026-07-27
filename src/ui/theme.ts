import type { Settings } from '../settings';

/**
 * Applies the theme to the document root. 'system' follows the OS setting and keeps
 * following it, so the extension changes with the rest of the desktop at dusk.
 */
export function applyTheme(theme: Settings['theme']): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const resolve = () => {
    const dark = theme === 'dark' || (theme === 'system' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };

  resolve();

  if (theme !== 'system') return () => {};

  media.addEventListener('change', resolve);
  return () => media.removeEventListener('change', resolve);
}
