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
export function pickCover(opts: { id: string; tag: string; layout?: Layout; palette?: Palette; kicker?: string; hasImage?: boolean }) {
  const h = hash(opts.id);
  const pool: readonly Layout[] = opts.hasImage ? ALL_LAYOUTS : TYPE_LAYOUTS;
  return {
    layout: opts.layout ?? pool[h % pool.length],
    palette: opts.palette ?? PALETTES[(h >>> 8) % PALETTES.length],
    kicker: (opts.kicker ?? KICKERS[opts.tag] ?? opts.tag).toUpperCase(),
  };
}
