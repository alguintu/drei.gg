// Post covers. Image layouts are built around an image slot, after the
// social-post templates Drei collected: white or colored ground, one main
// color (marker yellow or Aeris teal), black type, and red only as a small mark.
// Front matter can pick the layout and palette; otherwise the slug picks them.

export const LAYOUTS = [
  'giveaway',
  'streetwear',
  'everyday',
  'offset',
  'bracket',
  'tiles',
  'caption',
  'quarter',
  'spread',
  'lshape',
  'split',
  'circle',
  'twin',
  'ushape',
  'bleed',
  'arch',
  'polaroid',
  'filmstrip',
  'browser',
  'bubbles',
  'porthole',
  'triptych',
  'slab',
  'quadrant',
  'banner',
  'tilt',
  'glow',
  'duo',
] as const;

// Type layouts: built from words and shapes. Each has an optional image slot too.
export const TYPE_LAYOUTS = ['repeat', 'arc', 'stripes', 'bignum', 'collection', 'clearance', 'wild', 'promo', 'quote', 'term',
  'tips', 'xband', 'marquee', 'orb', 'glyph', 'pill', 'poster', 'tower'] as const;
export const ALL_LAYOUTS = [...LAYOUTS, ...TYPE_LAYOUTS] as const;

// marker: yellow on white. aeris: teal on white. ink: yellow on near-black.
export const PALETTES = ['marker', 'aeris', 'ink'] as const;

export type Layout = (typeof ALL_LAYOUTS)[number];
export type Palette = (typeof PALETTES)[number];

const KICKERS: Record<string, string> = {
  ship: 'shipped',
  build: 'build',
  rant: 'rant',
  dead: 'rip',
};

// ---- Text slots ----
// Every word on a cover that isn't the title, the summary or a shape is a slot.
// A post fills them under `cover:` in its front matter; an empty slot uses the
// default here. Defaults and post values can use these tokens:
//   {date} 16 Oct 2026   {dd} 16   {mm} 10   {label} " · v0.1" or nothing
//   {tag} ship   {kicker} the cover's kicker   {script} the kicker as one lowercase word
//   {initial} the kicker's first character
// Order matters: the desk lists slots in this order.
const FOOT = 'drei.gg/log · {date}{label}';
const SEAL = { ring: 'DREI.GG · DEVLOG · BUILD · POST · ', seal: 'drei.gg' };
const K = { kicker: '{tag}' };

export const SLOTS: Record<Layout, Record<string, string>> = {
  giveaway: { ...K, ...SEAL, foot: FOOT },
  streetwear: { ...SEAL, foot: FOOT },
  everyday: { foot: FOOT },
  offset: { foot: FOOT },
  bracket: { foot: FOOT },
  tiles: { ...K, foot: FOOT },
  caption: { ...K, foot: FOOT },
  quarter: { foot: FOOT },
  spread: { ...K },
  lshape: { ...K },
  split: { ...K, foot: FOOT },
  circle: { foot: FOOT },
  twin: { ...K, foot: FOOT },
  ushape: { ...K, script: '#{script}', foot: FOOT },
  bleed: { ...K, foot: FOOT },
  arch: { foot: FOOT },
  polaroid: { script: '{script}', foot: FOOT },
  filmstrip: { foot: FOOT },
  browser: { bar: 'drei.gg/log', ...K, foot: FOOT },
  bubbles: { foot: FOOT },
  porthole: { more: 'read more', foot: FOOT },
  triptych: { foot: FOOT },
  slab: { more: 'read →' },
  quadrant: { foot: FOOT },
  banner: { more: 'read it' },
  tilt: { ...K },
  glow: { ...K, more: '{date}' },
  duo: { pre: 'drei.gg presents', ...K, tag1: 'drei', tag2: '{date}', burst: 'ep.', num: '{dd}', foot: FOOT },
  repeat: { ...K },
  arc: { num: '{dd}', num2: '{mm}', ...K, foot: FOOT },
  stripes: { ...K, foot: FOOT },
  bignum: { kicker: '80%', foot: FOOT },
  collection: { foot: FOOT },
  clearance: { ...K, foot: FOOT },
  wild: { script: '#{script}', foot: FOOT },
  promo: { ...K, pre: 'new post', sub: 'drei.gg/log', foot: FOOT },
  quote: { sign: '— drei · {date}' },
  term: { bar: 'drei@aeris: ~/log', cmd: '$ drei log --tag {tag}', foot: FOOT },
  tips: { kicker: '1', foot: FOOT },
  xband: { ...K, more: 'read it' },
  marquee: { ...K, ...SEAL, foot: FOOT },
  orb: { ...K, foot: FOOT },
  glyph: { glyph: '{initial}', foot: FOOT },
  pill: { foot: FOOT },
  poster: { ...K, foot: FOOT },
  tower: { ...K, foot: FOOT },
};

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Type layouts also take an image, so a post with one draws from every layout;
// a post without one draws from the type layouts.
export function pickCover(opts: { id: string; layout?: Layout; palette?: Palette; hasImage?: boolean }) {
  const h = hash(opts.id);
  const pool: readonly Layout[] = opts.hasImage ? ALL_LAYOUTS : TYPE_LAYOUTS;
  return {
    layout: opts.layout ?? pool[h % pool.length],
    palette: opts.palette ?? PALETTES[(h >>> 8) % PALETTES.length],
  };
}

// The words for one cover: the post's own values over the layout's defaults, tokens filled in.
// The kicker is resolved first so the other slots can use it.
export function coverText(layout: Layout, opts: { tag: string; date: Date; label?: string; text?: Record<string, string> }) {
  const utc = { timeZone: 'UTC' } as const;
  const ctx: Record<string, string> = {
    date: opts.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...utc }),
    dd: opts.date.toLocaleDateString('en-GB', { day: '2-digit', ...utc }),
    mm: opts.date.toLocaleDateString('en-GB', { month: '2-digit', ...utc }),
    label: opts.label ? ` · ${opts.label}` : '',
    tag: KICKERS[opts.tag] ?? opts.tag,
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k) => ctx[k] ?? m);
  const given = opts.text ?? {};
  const pick = (k: string, fallback = '') => fill(given[k]?.trim() || SLOTS[layout]?.[k] || fallback);
  ctx.kicker = pick('kicker', '{tag}').toUpperCase();
  ctx.script = ctx.kicker.toLowerCase().replace(/\s+/g, '');
  ctx.initial = [...ctx.kicker][0] ?? '';
  const out: Record<string, string> = { kicker: ctx.kicker };
  for (const k of Object.keys(SLOTS[layout] ?? {})) if (k !== 'kicker') out[k] = pick(k);
  return out;
}
