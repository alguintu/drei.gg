// The site's colors as editable tokens. The defaults are what global.css and
// cover.css ship with; src/data/theme.json holds only what's been changed, and
// Base.astro adds a small <style> with just those changes. Nothing changed,
// nothing added.

export const THEME = {
  light: {
    paper: '#e8eaee', panel: '#f5f6f8', ink: '#15171d', mute: '#5b6070', line: '#c9ccd5',
    team: '#2b3cf0', ribbon: '#c8221a', marker: '#ffd23f', dead: '#c8221a', aeris: '#2bb3ad',
  },
  dark: {
    paper: '#0f1117', panel: '#171a23', ink: '#e7e9ef', mute: '#9298a8', line: '#2a2e3b',
    team: '#8a94ff', ribbon: '#ff4d3d', marker: '#ffd23f', dead: '#ff4d3d', aeris: '#35c2bb',
  },
  // Cover palettes (cover.css): ground, text, the main color, text on it, and a soft fill.
  marker: { ground: '#fbfbfa', text: '#15171d', main: '#ffd23f', 'on-main': '#15171d', soft: '#ececec' },
  aeris: { ground: '#fbfbfa', text: '#15171d', main: '#2bb3ad', 'on-main': '#10191b', soft: '#e8eeee' },
  ink: { ground: '#15171d', text: '#f1f2f4', main: '#ffd23f', 'on-main': '#15171d', soft: '#23262f' },
} as const;

export type Theme = { [G in keyof typeof THEME]?: Partial<Record<keyof (typeof THEME)[G], string>> };

// What each token is for, for the desk.
export const NOTES: Record<string, string> = {
  paper: 'page background', panel: 'boxes on the page', ink: 'text', mute: 'quiet text', line: 'rules and borders',
  team: 'links, numbers, tags', ribbon: 'red accents', marker: 'yellow highlight', dead: 'dead tag, "bad" feed', aeris: 'teal',
  ground: 'cover background', text: 'cover text', main: 'cover color', 'on-main': 'text on the cover color', soft: 'soft fill',
};

const HEX = /^#[0-9a-f]{6}$/i;
const decls = (vars: Record<string, string | undefined>) =>
  Object.entries(vars)
    .filter(([, v]) => v && HEX.test(v))
    .map(([k, v]) => `--${k}: ${v};`)
    .join(' ');

// The CSS for the tokens that differ from the defaults, or '' when none do.
export function themeCss(theme: Theme) {
  const diff = <G extends keyof typeof THEME>(g: G) =>
    Object.fromEntries(Object.entries(theme[g] ?? {}).filter(([k, v]) => v && v.toLowerCase() !== (THEME[g] as any)[k]?.toLowerCase())) as Record<string, string>;
  const light = decls(diff('light'));
  const dark = decls(diff('dark'));
  const out = [];
  // One step more specific than global.css and cover.css, so the order they load in
  // doesn't matter; a layout's own palette tweaks in cover.css still win.
  if (light) out.push(`html:root { ${light} }`);
  if (dark) out.push(`@media (prefers-color-scheme: dark) { html:root:not([data-theme="light"]) { ${dark} } }`, `html:root[data-theme="dark"] { ${dark} }`);
  for (const p of ['marker', 'aeris', 'ink'] as const) {
    const d = decls(diff(p));
    if (d) out.push(`.cv.pal-${p} { ${d} }`);
  }
  return out.join('\n');
}
