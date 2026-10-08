// Shared chart tokens. Series colors are a categorical palette validated for
// the dark surface (lightness band, chroma floor, colorblind separation and
// >= 3:1 contrast vs surface-1) — change them as a set, never one at a time,
// and re-validate if you do. Status colors (emerald/red) are deliberately not
// reused here so "met/missed" never collides with a series identity.

export const SURFACE = '#090d16'; // --color-surface-1

export const SERIES = {
  blue: '#3987e5',
  amber: '#d97706',
  violet: '#8b5cf6',
  teal: '#0d9488',
} as const;

// Fixed channel -> color mapping. Color follows the entity, so filtering a
// channel out never repaints the remaining ones.
export const CHANNEL_COLORS = {
  phone: SERIES.blue,
  email: SERIES.amber,
  ticket: SERIES.violet,
  chat: SERIES.teal,
} as const;

export const AXIS = {
  grid: '#1e293b', // slate-800
  tick: '#64748b', // slate-500
  reference: '#94a3b8', // slate-400
  cursor: '#334155', // slate-700
};

export const TICK_STYLE = { fill: AXIS.tick, fontSize: 10, fontFamily: 'var(--font-mono)' };
