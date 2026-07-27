/**
 * The icon set.
 *
 * Everything is hand-drawn on a 24×24 grid so the whole UI shares one visual
 * language and one weight. Emoji were the alternative and are a poor fit here:
 * they render differently on every platform, ignore the theme entirely, and can't
 * take `currentColor` — so a category chip would stay glossy full-colour inside a
 * flat pastel or terminal-blue palette.
 *
 * `stroke` paths are drawn as outlines and `fill` paths as solids; most icons use
 * only one of the two.
 */

export type IconDef = {
  stroke?: string[];
  fill?: string[];
};

/** Small helper for the circular shapes, which are otherwise unreadable as arc soup. */
function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
}

const STAR =
  'M12 3.4l2.65 5.55 5.95.85-4.3 4.25 1.02 6.05L12 17.25 6.68 20.1l1.02-6.05L3.4 9.8l5.95-.85Z';

export const ICONS = {
  /* ------------------------------------------------ category icons */
  box: {
    stroke: ['M3.5 7.6 12 3.5l8.5 4.1v8.8L12 20.5l-8.5-4.1Z', 'M3.5 7.6 12 11.7l8.5-4.1', 'M12 11.7v8.8'],
  },
  laptop: {
    stroke: ['M5 5.5h14a1 1 0 0 1 1 1v9H4v-9a1 1 0 0 1 1-1Z', 'M2 18.5h20'],
  },
  home: {
    stroke: ['M3.5 10.5 12 3.8l8.5 6.7', 'M6 9.6V20.2h12V9.6', 'M10 20.2v-5.2h4v5.2'],
  },
  kitchen: {
    stroke: ['M4 11.6h11.5v1.6a5.75 5.75 0 0 1-11.5 0Z', 'M15.5 12.4h4.5', 'M7 8.4V5.6', 'M11 8.4V5.6'],
  },
  clothing: {
    stroke: ['M8.6 4.2 5 6.2l-1.4 4 3 1.1V20h10.8v-8.7l3-1.1-1.4-4-3.6-2', 'M8.6 4.2a3.4 3.4 0 0 0 6.8 0'],
  },
  beauty: {
    stroke: ['M9 20.5h6V12H9Z', 'M9.9 12V7.3l4.2-3V12'],
  },
  book: {
    stroke: ['M4.5 5.2A1.7 1.7 0 0 1 6.2 3.5H19v14.2H6.2a1.7 1.7 0 0 0-1.7 1.7Z', 'M4.5 19.4a1.7 1.7 0 0 0 1.7 1.7H19v-3.4'],
  },
  hobby: {
    stroke: [
      'M12 3.5a8.5 8.5 0 1 0 0 17h1.4a1.7 1.7 0 0 0 0-3.4H13a1.6 1.6 0 0 1 0-3.2h2.9a4.6 4.6 0 0 0 0-9.2Z',
    ],
    fill: [circle(8.6, 8.4, 1.25), circle(12.4, 6.9, 1.25), circle(16.2, 8.9, 1.25)],
  },
  garden: {
    stroke: [
      'M12 20.5v-7.2',
      'M12 13.3c0-3.1 2.1-5.2 5.2-5.2 0 3.1-2.1 5.2-5.2 5.2Z',
      'M12 15.4c0-2.6-1.9-4.6-4.6-4.6 0 2.7 2 4.6 4.6 4.6Z',
    ],
  },
  bag: {
    stroke: ['M5.6 8.4h12.8l1 12.1H4.6Z', 'M9 8.4V6.9a3 3 0 0 1 6 0v1.5'],
  },
  cup: {
    stroke: ['M5 6.6h11v6.9a5.5 5.5 0 0 1-11 0Z', 'M16 8.6h1.7a2.7 2.7 0 0 1 0 5.4H16', 'M4.5 20.4h12'],
  },
  tool: {
    stroke: [
      'M14.6 4.6a5 5 0 0 0-4.5 7l-5.4 5.4a1.85 1.85 0 0 0 2.6 2.6l5.4-5.4a5 5 0 0 0 6.2-6.4l-2.9 2.9-2.6-2.6 2.9-2.9a5 5 0 0 0-1.7-.6Z',
    ],
  },
  music: {
    stroke: ['M9 17.6V6l10.5-2v11.6', 'M9 17.6a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Z', 'M19.5 15.6a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Z'],
  },
  camera: {
    stroke: ['M3.5 8.4h4L9 5.9h6l1.5 2.5h4v11.2h-17Z', circle(12, 13.6, 3.5)],
  },
  car: {
    stroke: ['M4 15.4h16v3.6h-3.2v-1.6H7.2V19H4Z', 'M5.6 15.4 7.2 9.2h9.6l1.6 6.2'],
    fill: [circle(7.4, 13, 0.9), circle(16.6, 13, 0.9)],
  },
  sport: {
    stroke: ['M3 10.4v3.2', 'M6.2 8v8', 'M17.8 8v8', 'M21 10.4v3.2', 'M6.2 12h11.6'],
  },
  heart: {
    stroke: ['M12 20.4S3.6 15 3.6 9.6A4.5 4.5 0 0 1 12 7.3a4.5 4.5 0 0 1 8.4 2.3c0 5.4-8.4 10.8-8.4 10.8Z'],
  },
  /* ------------------------------------------------------ UI icons */
  gift: {
    stroke: [
      'M4.2 11.4h15.6v9.1H4.2Z',
      'M2.8 7.6h18.4v3.8H2.8Z',
      'M12 7.6v12.9',
      'M12 7.6S9.2 7.6 8.2 6.6a2.05 2.05 0 1 1 3.1-2.6C12.1 5 12 7.6 12 7.6Z',
      'M12 7.6s2.8 0 3.8-1a2.05 2.05 0 1 0-3.1-2.6C11.9 5 12 7.6 12 7.6Z',
    ],
  },
  close: { stroke: ['M6.2 6.2 17.8 17.8', 'M17.8 6.2 6.2 17.8'] },
  check: { stroke: ['M4.6 12.4 9.6 17.4 19.4 6.6'] },
  settings: {
    stroke: ['M3.6 7.4h5.6', 'M13 7.4h7.4', 'M3.6 16.6h7.4', 'M15.2 16.6h5.2'],
    fill: [circle(11.1, 7.4, 2.1), circle(13.3, 16.6, 2.1)],
  },
  grid: {
    stroke: ['M4 4.6h6.2v6.2H4Z', 'M13.8 4.6H20v6.2h-6.2Z', 'M4 13.2h6.2v6.2H4Z', 'M13.8 13.2H20v6.2h-6.2Z'],
  },
  list: {
    stroke: ['M4 6.2h2.8v2.8H4Z', 'M9.6 7.6h10.4', 'M4 15h2.8v2.8H4Z', 'M9.6 16.4h10.4'],
  },
  star: { fill: [STAR] },
  'star-empty': { stroke: [STAR] },
  arrowRight: { stroke: ['M4.6 12h14', 'M13 6.4 18.6 12 13 17.6'] },
  external: { stroke: ['M13.6 4.6h5.8v5.8', 'M19.4 4.6 10.8 13.2', 'M17.8 14v5.4H4.6V6.2H10'] },
  plus: { stroke: ['M12 5.2v13.6', 'M5.2 12h13.6'] },
  paw: {
    fill: [
      'M12 20c-2.9 0-4.7-1.5-4.7-3.4 0-1.8 1.9-3.3 4.7-3.3s4.7 1.5 4.7 3.3c0 1.9-1.8 3.4-4.7 3.4Z',
      circle(6.7, 10.8, 2.1),
      circle(10.5, 7.8, 2.2),
      circle(14.6, 8, 2.2),
      circle(17.6, 11.2, 2),
    ],
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

/**
 * Icons offered when creating a category. Deliberately a subset — the UI-only icons
 * above (close, check, chevrons) would be meaningless as a category marker.
 */
export const CATEGORY_ICONS: IconName[] = [
  'box',
  'laptop',
  'home',
  'kitchen',
  'clothing',
  'beauty',
  'book',
  'hobby',
  'garden',
  'bag',
  'cup',
  'tool',
  'music',
  'camera',
  'car',
  'sport',
  'heart',
  'paw',
  'gift',
  'star',
];

/**
 * Category icons are persisted, and a backup file can carry anything — including an
 * emoji written by an older version. Unknown names fall back to the box rather than
 * rendering an empty hole.
 */
export function resolveIcon(name: string | undefined): IconName {
  return name && name in ICONS ? (name as IconName) : 'box';
}
