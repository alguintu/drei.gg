// Post blocks: the designed blocks a post's Markdown can hold, and pages can too.
// One place knows each block three ways, so they can never drift apart:
//   parse(lines)  the text inside a ```fence → the block's slot data
//   fence(data)   slot data → the Markdown that writes it
//   hast(data)    slot data → the HTML it draws, as a hast tree
// src/lib/rehype-notes.mjs uses parse + hast on posts; src/blocks/PostBlock.astro
// draws them on pages; the desk uses parse + fence to edit them in a form.
// Their slot schemas live with the other blocks in src/blocks/schema.ts.

const SIGNS = { plus: '+', minus: '-', tilde: '~', bang: '!' };
const KINDS = Object.fromEntries(Object.entries(SIGNS).map(([k, s]) => [s, k]));
const GLYPHS = { plus: '+', minus: '−', tilde: '~', bang: '!', plain: '·' };

export const txt = (value) => ({ type: 'text', value });
export const el = (tagName, className, children = [], extra = {}) => ({
  type: 'element',
  tagName,
  properties: { ...(className ? { className } : {}), ...extra },
  children,
});

function paragraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => el('p', null, [txt(p.replace(/\n/g, ' '))]));
}

const callout = (name) => ({
  parse: ([lead = '', ...rest]) => ({ heading: lead.trim(), body: rest.join('\n').trim() }),
  fence: (d) => [d.heading, d.body].filter(Boolean).join('\n'),
  hast: (d) => el('div', ['blk', `blk-${name}`], [el('strong', ['lead'], [txt(d.heading)]), ...paragraphs(d.body)]),
});

export const POST_BLOCKS = {
  notes: {
    parse: (lines) => ({
      items: lines
        .filter((l) => l.trim())
        .map((line) => {
          const kind = KINDS[line.trim()[0]];
          return { kind: kind ?? 'plain', text: kind ? line.trim().slice(1).trim() : line.trim() };
        }),
    }),
    fence: (d) => d.items.map((i) => (i.kind === 'plain' ? i.text : `${SIGNS[i.kind]} ${i.text}`)).join('\n'),
    hast: (d) =>
      el(
        'ul',
        ['notes'],
        d.items.map((i) => el('li', [i.kind], [el('span', ['sign'], [txt(GLYPHS[i.kind])], { ariaHidden: 'true' }), txt(i.text)])),
      ),
  },
  callout: callout('callout'),
  aeris: callout('aeris'),
  pull: {
    parse: (lines) => {
      const cite = lines.find((l) => /^\s*(--|—)\s/.test(l));
      return { quote: lines.filter((l) => l !== cite).join(' ').trim(), by: cite ? cite.replace(/^\s*(--|—)\s*/, '').trim() : '' };
    },
    fence: (d) => [d.quote, d.by && `-- ${d.by}`].filter(Boolean).join('\n'),
    hast: (d) =>
      el('figure', ['blk', 'blk-pull'], [
        el('span', ['qm'], [txt('“')], { ariaHidden: 'true' }),
        el('blockquote', null, [el('p', null, [txt(d.quote)]), ...(d.by ? [el('cite', null, [txt(`— ${d.by}`)])] : [])]),
      ]),
  },
  bignum: {
    parse: ([n = '', ...rest]) => ({ number: n.trim(), caption: rest.join('\n').trim() }),
    fence: (d) => [d.number, d.caption].filter(Boolean).join('\n'),
    hast: (d) => el('div', ['blk', 'blk-bignum'], [el('span', ['n'], [txt(d.number)]), el('div', null, paragraphs(d.caption))]),
  },
  shout: {
    parse: (lines) => ({ lines: lines.map((l) => l.trim()) }),
    fence: (d) => d.lines.join('\n'),
    hast: (d) => {
      // One line gets repeated three times; up to four lines show as they are.
      const one = d.lines.length === 1;
      const rows = one ? [d.lines[0], d.lines[0], d.lines[0]] : d.lines.slice(0, 4);
      const cls = ['', 'o', 'r', 'o'];
      return el('div', ['blk', 'blk-shout'], rows.map((r, i) => el('span', cls[i] ? [cls[i]] : null, [txt(r)], i && one ? { ariaHidden: 'true' } : {})));
    },
  },
  tape: {
    parse: (lines) => ({ text: lines.join(' ').trim() }),
    fence: (d) => d.text,
    hast: (d) => el('p', ['blk', 'blk-tape'], [el('span', null, [txt(d.text)])]),
  },
};

// Image frames: ![alt](./shot.png "offset | caption"). Not a fence, but a block all the same.
export const FRAMES = ['offset', 'teal', 'bracket', 'rounded', 'quarter', 'tape'];

export const IMAGE = {
  // The title of an image: its frame and caption, or null when it names no frame.
  parse: (title) => {
    const [frame, ...rest] = String(title || '').split('|');
    const name = frame.trim().toLowerCase();
    return FRAMES.includes(name) ? { frame: name, caption: rest.join('|').trim() } : null;
  },
  markdown: (d) => `![${d.alt}](${d.src} "${d.frame} | ${d.caption}")`,
  // `img` is the post's own image node when there is one (Astro still has to process it).
  hast: (d, img = el('img', null, [], { src: d.src, alt: d.alt })) => {
    const classes = ['frm', ...(d.frame === 'teal' ? ['frm-offset', 'frm-teal'] : [`frm-${d.frame}`])];
    const cap = d.frame === 'tape' ? [el('span', null, [txt(d.caption || d.alt || '')])] : [txt(d.caption)];
    return el('figure', classes, [el('span', ['frm-in'], [img]), ...(d.caption || d.frame === 'tape' ? [el('figcaption', null, cap)] : [])]);
  },
};

// The Markdown for a fenced block.
export const markdown = (type, data) => '```' + type + '\n' + POST_BLOCKS[type].fence(data) + '\n```';

// What the desk inserts for a new block, and what the catalog shows.
export const EXAMPLES = {
  callout: { heading: 'Heads up', body: 'The one thing a reader should not miss.' },
  aeris: { heading: 'Built on Aeris', body: 'Workstation notes, setup, things that happened on the machine.' },
  pull: { quote: 'A line worth pulling out.', by: 'drei' },
  bignum: { number: '80%', caption: 'What the number means.' },
  shout: { lines: ['GG'] },
  tape: { text: 'One line on black tape' },
  notes: { items: [{ kind: 'plus', text: 'added' }, { kind: 'minus', text: 'removed' }, { kind: 'tilde', text: 'changed' }, { kind: 'bang', text: 'broke' }] },
};
