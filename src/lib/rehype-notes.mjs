// Turns fenced blocks in posts into designed blocks. The fence language picks the block:
//
//   ```notes    + added / - removed / ~ changed / ! broke, one per line
//   ```callout  first line is the heading, the rest is body text (yellow, with brackets)
//   ```aeris    same as callout, in teal
//   ```pull     a pull quote; a line starting with "-- " is the attribution
//   ```bignum   first line is the number, the rest is the caption
//   ```shout    one to four short lines, set huge (one line gets repeated)
//   ```tape     a line of text on black tape
//
// and an image alone in a paragraph whose title names a frame becomes a framed
// figure: ![alt](./shot.png "offset | caption"). The blocks themselves are
// defined in src/lib/post-blocks.mjs.
//
// In dev, each block also gets data-desk-md="<first line>-<last line>" (lines of
// the post's Markdown body), so the desk can open the block a click lands on.
import { IMAGE, POST_BLOCKS } from './post-blocks.mjs';

function text(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(text).join('');
}

function blockOf(pre) {
  const code = (pre.children || []).find((c) => c.tagName === 'code');
  const cls = code?.properties?.className || [];
  const fromClass = cls.map((c) => String(c).replace(/^language-/, '')).find((c) => c in POST_BLOCKS);
  const lang = fromClass || pre.properties?.dataLanguage;
  return lang in POST_BLOCKS ? { lang, node: code || pre } : null;
}

function framed(p) {
  const kids = (p.children || []).filter((c) => !(c.type === 'text' && !c.value.trim()));
  if (kids.length !== 1 || kids[0].tagName !== 'img') return null;
  const img = kids[0];
  const frame = IMAGE.parse(img.properties?.title);
  if (!frame) return null;
  delete img.properties.title;
  return IMAGE.hast({ ...frame, alt: img.properties.alt || '' }, img);
}

export default function rehypeNotes() {
  const lines = process.env.NODE_ENV === 'development';
  const mark = (out, from) => {
    if (lines && from.position) out.properties.dataDeskMd = `${from.position.start.line}-${from.position.end.line}`;
    return out;
  };
  const walk = (node) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      if (child.type === 'element' && child.tagName === 'p') {
        const fig = framed(child);
        if (fig) return mark(fig, child);
      }
      if (child.type === 'element' && child.tagName === 'pre') {
        const found = blockOf(child);
        if (found) {
          const block = POST_BLOCKS[found.lang];
          return mark(block.hast(block.parse(text(found.node).replace(/\n+$/, '').split('\n'))), child);
        }
      }
      walk(child);
      return child;
    });
  };
  return walk;
}
