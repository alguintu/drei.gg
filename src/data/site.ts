// The home page's own content lives in home.json, so the desk can edit it.
// Posts live in src/content/posts.
import home from './home.json';

type Killfeed = { who: string; verb: string; what: string; style: 'good' | 'bad' };
type Item = { name: string; note: string; status: 'live' | 'empty'; href?: string };

export const domainBought = new Date(home.domainBought);

// The line under the big drei.gg. ==text== is highlighted.
export const thesis = home.thesis;

// The .gg definitions. *text* is italic.
export const gloss: { tag: string; text: string }[] = home.gloss;

// The ticker under the hero. style: 'good' is blue, 'bad' is red.
export const killfeed = home.killfeed as Killfeed[];

// Products. status: 'live' fills the slot, 'empty' draws a dashed placeholder.
export const inventory = home.inventory as Item[];

export const rules: string[] = home.rules;

// The tiny markup home.json allows: ==mark== and *em*. Everything else is escaped.
export function inline(text: string) {
  return text
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
