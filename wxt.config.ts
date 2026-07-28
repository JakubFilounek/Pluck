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
    description: 'Ukládej produkty, které chcete, hodnoť je, štítkuj podle příležitostí a označuj koupené.',
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
      default_title: 'Uložit do Plucku',
    },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Ctrl+Shift+S' },
        description: 'Uložit aktuální stránku do Plucku',
      },
      'open-dashboard': {
        suggested_key: { default: 'Ctrl+Shift+E' },
        description: 'Otevřít přehled Plucku',
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
     * Belt and braces: assert no host permission ever creeps back in.
     *
     * Capture injects into the current tab from a user gesture, which activeTab
     * covers on its own. An earlier version declared a content script, which made
     * WXT infer <all_urls> — asking for permanent access to every site at install
     * time for no functional gain. There is no content script now, so this should
     * find nothing; it fails the build loudly if that ever changes by accident.
     */
    'build:manifestGenerated'(_wxt, manifest) {
      if (manifest.host_permissions?.length) {
        throw new Error(
          `Unexpected host_permissions: ${manifest.host_permissions.join(', ')}. ` +
            'Capture uses activeTab; broad host access must be an explicit decision.',
        );
      }
    },
  },
});
