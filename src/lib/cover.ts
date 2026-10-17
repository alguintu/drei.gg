// Poster-style post covers. Every post gets one; front matter can pick the
// layout and palette, otherwise both are picked from the post's slug so
// neighbouring posts rarely look alike.

export const LAYOUTS = [
  'stamp',
  'vertical',
  'echo',
  'split',
  'bignum',
  'brush',
  'spaced',
  'tape',
  'xmark',
  'hashtag',
  'quote',
  'hatch',
] as const;

export const PALETTES = ['ink', 'ribbon', 'marker', 'aeris', 'paper'] as const;

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

export function pickCover(opts: {
  id: string;
  tag: string;
  layout?: Layout;
  palette?: Palette;
  kicker?: string;
}) {
  const h = hash(opts.id);
  return {
    layout: opts.layout ?? LAYOUTS[h % LAYOUTS.length],
    palette: opts.palette ?? PALETTES[(h >>> 8) % PALETTES.length],
    kicker: (opts.kicker ?? KICKERS[opts.tag] ?? opts.tag).toUpperCase(),
  };
}

// A short number for the bignum layout: the version's last part, or the day.
export function bigNumber(label: string | undefined, date: Date) {
  const digits = label?.match(/\d+(?!.*\d)/)?.[0];
  return (digits ?? String(date.getUTCDate())).padStart(2, '0');
}
