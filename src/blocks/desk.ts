// In dev, blocks and their slots carry data-desk-* attributes naming where their
// data lives, so the desk can turn a click in the preview into the right field.
// Production builds get none of this.
export type Path = string;

export const blockAttrs = (path?: Path) => (import.meta.env.DEV && path ? { 'data-desk-block': path } : {});
export const slotAttrs = (path: Path | undefined, slot: string) => (import.meta.env.DEV && path ? { 'data-desk-slot': `${path}.${slot}` } : {});

// The tiny markup rich slots allow: ==mark== and *em*. Everything else is escaped.
export function inline(text: string) {
  return text
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
