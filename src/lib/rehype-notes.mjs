// Turns fenced blocks in posts into designed blocks. The fence language picks the block:
//
//   ```notes    + added / - removed / ~ changed / ! broke, one per line
//   ```callout  first line is the heading, the rest is body text (yellow, with brackets)
//   ```aeris    same as callout, in teal
//   ```pull     a pull quote; a line starting with "-- " is the attribution
//   ```bignum   first line is the number, the rest is the caption
//   ```shout    one to four short lines, set huge (one line gets repeated)
//   ```tape     a line of text on black tape
const KINDS = { '+': 'plus', '-': 'minus', '~': 'tilde', '!': 'bang' };
const GLYPHS = { '+': '+', '-': '−', '~': '~', '!': '!' };
const BLOCKS = new Set(['notes', 'callout', 'aeris', 'pull', 'bignum', 'shout', 'tape']);

const txt = (value) => ({ type: 'text', value });
const el = (tagName, className, children = [], extra = {}) => ({
  type: 'element',
  tagName,
  properties: { ...(className ? { className } : {}), ...extra },
  children,
});

function text(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(text).join('');
}

function paragraphs(lines) {
  return lines
    .join('\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => el('p', null, [txt(p.replace(/\n/g, ' '))]));
}

const builders = {
  notes(lines) {
    return el(
      'ul',
      ['notes'],
      lines.filter((l) => l.trim()).map((line) => {
        const sign = line.trim()[0];
        const kind = KINDS[sign];
        const body = kind ? line.trim().slice(1).trim() : line.trim();
        return el('li', [kind || 'plain'], [el('span', ['sign'], [txt(kind ? GLYPHS[sign] : '·')], { ariaHidden: 'true' }), txt(body)]);
      }),
    );
  },
  callout(lines, name = 'callout') {
    const [lead, ...rest] = lines;
    return el('div', ['blk', `blk-${name}`], [el('strong', ['lead'], [txt(lead.trim())]), ...paragraphs(rest)]);
  },
  aeris(lines) {
    return builders.callout(lines, 'aeris');
  },
  pull(lines) {
    const cite = lines.find((l) => /^\s*(--|—)\s/.test(l));
    const quote = lines.filter((l) => l !== cite).join(' ').trim();
    return el('figure', ['blk', 'blk-pull'], [
      el('span', ['qm'], [txt('“')], { ariaHidden: 'true' }),
      el('blockquote', null, [el('p', null, [txt(quote)]), ...(cite ? [el('cite', null, [txt(cite.replace(/^\s*(--|—)\s*/, '— '))])] : [])]),
    ]);
  },
  bignum(lines) {
    const [n, ...rest] = lines;
    return el('div', ['blk', 'blk-bignum'], [el('span', ['n'], [txt(n.trim())]), el('div', null, paragraphs(rest))]);
  },
  shout(lines) {
    const rows = lines.length === 1 ? [lines[0], lines[0], lines[0]] : lines.slice(0, 4);
    const cls = ['', 'o', 'r', 'o'];
    return el('div', ['blk', 'blk-shout'], rows.map((r, i) => el('span', cls[i] ? [cls[i]] : null, [txt(r.trim())], i && lines.length === 1 ? { ariaHidden: 'true' } : {})));
  },
  tape(lines) {
    return el('p', ['blk', 'blk-tape'], [el('span', null, [txt(lines.join(' ').trim())])]);
  },
};

function blockOf(pre) {
  const code = (pre.children || []).find((c) => c.tagName === 'code');
  const cls = code?.properties?.className || [];
  const fromClass = cls.map((c) => String(c).replace(/^language-/, '')).find((c) => BLOCKS.has(c));
  const lang = fromClass || pre.properties?.dataLanguage;
  return BLOCKS.has(lang) ? { lang, node: code || pre } : null;
}

// A paragraph holding just an image whose title names a frame becomes a framed
// figure: ![alt](./shot.png "offset | caption"). Frames: offset, teal, bracket,
// rounded, quarter, tape.
const FRAMES = new Set(['offset', 'teal', 'bracket', 'rounded', 'quarter', 'tape']);

function framed(p) {
  const kids = (p.children || []).filter((c) => !(c.type === 'text' && !c.value.trim()));
  if (kids.length !== 1 || kids[0].tagName !== 'img') return null;
  const img = kids[0];
  const [frame, ...rest] = String(img.properties?.title || '').split('|');
  const name = frame.trim().toLowerCase();
  if (!FRAMES.has(name)) return null;
  const caption = rest.join('|').trim();
  delete img.properties.title;
  const classes = ['frm', `frm-${name === 'teal' ? 'offset frm-teal' : name}`].join(' ').split(' ');
  const capChildren = name === 'tape' ? [el('span', null, [txt(caption || img.properties.alt || '')])] : [txt(caption)];
  return el('figure', classes, [el('span', ['frm-in'], [img]), ...(caption || name === 'tape' ? [el('figcaption', null, capChildren)] : [])]);
}

export default function rehypeNotes() {
  const walk = (node) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      if (child.type === 'element' && child.tagName === 'p') {
        const fig = framed(child);
        if (fig) return fig;
      }
      if (child.type === 'element' && child.tagName === 'pre') {
        const found = blockOf(child);
        if (found) {
          const lines = text(found.node).replace(/\n+$/, '').split('\n');
          return builders[found.lang](lines);
        }
      }
      walk(child);
      return child;
    });
  };
  return walk;
}
