// Turns a ```notes fenced block into a patch-notes list.
// Lines start with + (added), - (removed), ~ (changed) or ! (broke).
const KINDS = { '+': 'plus', '-': 'minus', '~': 'tilde', '!': 'bang' };
const GLYPHS = { '+': '+', '-': '−', '~': '~', '!': '!' };

function text(node) {
  if (node.type === 'text') return node.value;
  return (node.children || []).map(text).join('');
}

function el(tagName, className, children) {
  return { type: 'element', tagName, properties: { className }, children };
}

function toList(code) {
  const lines = text(code).split('\n').filter((l) => l.trim());
  return el(
    'ul',
    ['notes'],
    lines.map((line) => {
      const sign = line.trim()[0];
      const kind = KINDS[sign];
      const body = kind ? line.trim().slice(1).trim() : line.trim();
      return el('li', [kind || 'plain'], [
        { type: 'element', tagName: 'span', properties: { className: ['sign'], ariaHidden: 'true' }, children: [{ type: 'text', value: kind ? GLYPHS[sign] : '·' }] },
        { type: 'text', value: body },
      ]);
    }),
  );
}

export default function rehypeNotes() {
  const walk = (node) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      if (child.type === 'element' && child.tagName === 'pre') {
        const code = (child.children || []).find((c) => c.tagName === 'code');
        const cls = code?.properties?.className || [];
        const lang = child.properties?.dataLanguage || '';
        if (cls.includes('language-notes') || lang === 'notes') return toList(code || child);
      }
      walk(child);
      return child;
    });
  };
  return walk;
}
