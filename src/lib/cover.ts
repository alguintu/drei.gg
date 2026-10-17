// Post covers. Every layout is built around an image slot, after the
// social-post templates Drei collected: white or colored ground, one main
// color (marker yellow or Aeris teal), black type, and red only as a small mark.
// Front matter can pick the layout and palette; otherwise the slug picks them.

export const LAYOUTS = [
  'giveaway',
  'streetwear',
  'everyday',
  'offset',
  'overlay',
  'bracket',
  'tiles',
  'caption',
  'quarter',
  'spread',
  'lshape',
  'mono',
] as const;

// marker: yellow on white. aeris: teal on white. ink: yellow on near-black.
export const PALETTES = ['marker', 'aeris', 'ink'] as const;

export type Layout = (typeof LAYOUTS)[number];
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

export function pickCover(opts: { id: string; tag: string; layout?: Layout; palette?: Palette; kicker?: string }) {
  const h = hash(opts.id);
  return {
    layout: opts.layout ?? LAYOUTS[h % LAYOUTS.length],
    palette: opts.palette ?? PALETTES[(h >>> 8) % PALETTES.length],
    kicker: (opts.kicker ?? KICKERS[opts.tag] ?? opts.tag).toUpperCase(),
  };
}
