import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  srcDir: '.',
  // MV3 rather than WXT's MV2 default for Firefox. Firefox 121+ supports it, and the
  // code depends on MV3 shapes throughout: browser.action (MV2 calls it browserAction),
  // the object form of content_security_policy, and the _execute_action command.
  manifestVersion: 3,
  manifest: {
    name: 'Pluck',
    short_name: 'Pluck',
    description: 'Save products you want, rate them, tag them for occasions, mark them bought.',
    // activeTab + scripting replaces the blanket <all_urls> host permission: Pluck can only
    // read the page you explicitly capture from. Broad host access is requested at runtime,
    // and only if optional features (image caching, price watching) get switched on.
    permissions: ['storage', 'unlimitedStorage', 'contextMenus', 'activeTab', 'scripting'],
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      96: '/icon/96.png',
      128: '/icon/128.png',
    },
    action: {
      default_title: 'Save to Pluck',
    },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+S' },
        description: 'Save the current page to Pluck',
      },
      'open-dashboard': {
        suggested_key: { default: 'Ctrl+Shift+E' },
        description: 'Open the Pluck dashboard',
      },
    },
    // Product images are loaded straight from the shop's CDN, so extension pages need to be
    // allowed to render remote images. Scripts stay locked to 'self'.
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; img-src 'self' data: https: http:;",
    },
    browser_specific_settings: {
      gecko: {
        // Must be email-shaped and globally unique — AMO rejects bare labels, and this
        // id is also the storage origin, so changing it later orphans existing data.
        id: 'pluck@slyjacobthebeast.dev',
        strict_min_version: '121.0',
        // Self-distributed add-ons do not auto-update unless the signed manifest
        // points at an update manifest. Firefox fetches this anonymously, so the
        // repo must stay public or updates silently stop happening.
        // Changing this URL later requires re-signing and a manual reinstall.
        update_url: 'https://raw.githubusercontent.com/JakubFilounek/Pluck/master/updates.json',
        // Required by AMO for new submissions since 3 November 2025. Pluck sends
        // nothing anywhere: no network calls, no analytics, no sync.
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
  hooks: {
    /**
     * Strip the host_permissions WXT infers from the content script's match pattern.
     *
     * The content script is registered as 'runtime', so WXT assumes it will be
     * registered via browser.scripting.registerContentScripts, which would indeed need
     * <all_urls>. Pluck never does that — it only injects on demand from a user
     * gesture, which activeTab already covers. Without this hook the extension would
     * ask for permanent access to every website at install time and gain nothing.
     */
    'build:manifestGenerated'(_wxt, manifest) {
      delete manifest.host_permissions;
    },
  },
});
