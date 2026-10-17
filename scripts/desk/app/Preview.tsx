import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// The live preview. The site loads through the desk (same origin), so a new
// render loads in a hidden frame behind the current one and swaps in at the same
// scroll position once it's ready: no blank page between saves.
//
// It's also the visual editor. Blocks and slots on the page carry data-desk-*
// attributes in dev (src/blocks/desk.ts): hovering outlines them, a click selects
// that block in the editor, and a double-click edits a plain text slot in place.

export type PreviewHandle = { refresh: () => void; refreshSoon: () => void; mark: (path: string | null) => void };

type Props = {
  path: string;
  phone: boolean;
  editable: boolean;
  onSelect: (path: string) => void;
  onInline: (path: string, value: string) => void;
  onCatalog: (msg: { tab?: string; pick?: { layout: string; palette?: string }; insert?: string }) => void;
};

const STYLE = `
[data-desk-block], [data-desk-slot] { cursor: pointer; }
.desk-hover { outline: 2px dashed #2b3cf0 !important; outline-offset: 2px; }
.desk-sel { outline: 2px solid #2b3cf0 !important; outline-offset: 2px; }
[contenteditable].desk-editing { outline: 2px solid #ffd23f !important; outline-offset: 2px; cursor: text; }
`;

export default forwardRef<PreviewHandle, Props>(function Preview({ path, phone, editable, onSelect, onInline, onCatalog }, ref) {
  const stage = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLIFrameElement | null>(null);
  const pending = useRef<HTMLIFrameElement | null>(null);
  const fallback = useRef<number>(0);
  // Handlers change every render; the frames keep calling the latest ones.
  const latest = useRef({ path, editable, onSelect, onInline, onCatalog });
  latest.current = { path, editable, onSelect, onInline, onCatalog };

  function refresh() {
    clearTimeout(fallback.current);
    const box = stage.current;
    if (!box) return;
    const old = front.current;
    const target = latest.current.path;
    pending.current?.remove();
    const next = document.createElement('iframe');
    next.title = 'Preview';
    next.className = 'next';
    pending.current = next;
    next.addEventListener(
      'load',
      () => {
        if (pending.current !== next) return;
        pending.current = null;
        // Same page: keep the reader where they were.
        try {
          if (old && old.contentWindow!.location.pathname === new URL(target, location.href).pathname) next.contentWindow!.scrollTo(0, old.contentWindow!.scrollY);
        } catch {}
        wire(next);
        next.className = '';
        old?.remove();
        front.current = next;
        mark(marked.current, false);
      },
      { once: true },
    );
    next.src = target;
    box.append(next);
  }

  // Click-to-edit, wired into each page as it loads.
  function wire(frame: HTMLIFrameElement) {
    const doc = frame.contentDocument;
    if (!doc) return;
    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.append(style);
    let hovered: Element | null = null;
    const target = (e: Event) => (e.target as Element).closest?.('[data-desk-slot], [data-desk-block]') ?? null;
    doc.addEventListener('mouseover', (e) => {
      if (!latest.current.editable) return;
      hovered?.classList.remove('desk-hover');
      hovered = target(e);
      hovered?.classList.add('desk-hover');
    });
    doc.addEventListener('mouseleave', () => hovered?.classList.remove('desk-hover'));
    doc.addEventListener(
      'click',
      (e) => {
        const el = target(e);
        if (!latest.current.editable || !el || (el as HTMLElement).isContentEditable) return;
        e.preventDefault();
        latest.current.onSelect(el.getAttribute('data-desk-slot') ?? el.getAttribute('data-desk-block')!);
      },
      true,
    );
    doc.addEventListener('dblclick', (e) => {
      const el = (e.target as Element).closest?.('[data-desk-slot]') as HTMLElement | null;
      if (!latest.current.editable || !el || el.hasAttribute('data-desk-rich')) return;
      e.preventDefault();
      edit(el);
    });
  }

  function edit(el: HTMLElement) {
    const before = el.textContent ?? '';
    el.contentEditable = 'plaintext-only';
    el.classList.add('desk-editing');
    el.focus();
    el.ownerDocument.getSelection()?.selectAllChildren(el);
    const done = (commit: boolean) => {
      el.removeEventListener('keydown', key);
      el.removeEventListener('blur', blur);
      el.contentEditable = 'false';
      el.classList.remove('desk-editing');
      const value = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!commit || value === before) return void (el.textContent = before);
      latest.current.onInline(el.getAttribute('data-desk-slot')!, value);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); done(true); }
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
    };
    const blur = () => done(true);
    el.addEventListener('keydown', key);
    el.addEventListener('blur', blur);
  }

  // Outline the block that's open in the editor, and bring it into view.
  const marked = useRef<string | null>(null);
  function mark(path: string | null, scroll = true) {
    marked.current = path;
    const doc = front.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('.desk-sel').forEach((x) => x.classList.remove('desk-sel'));
    const el = path ? doc.querySelector(`[data-desk-block="${path}"]`) : null;
    el?.classList.add('desk-sel');
    if (el && scroll) el.scrollIntoView({ block: 'nearest' });
  }

  useImperativeHandle(ref, () => ({
    mark,
    refresh,
    refreshSoon: () => {
      clearTimeout(fallback.current);
      fallback.current = window.setTimeout(refresh, 2500);
    },
  }));

  // A new path loads straight away.
  useEffect(refresh, [path]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      // Astro rebuilt the page after a save. Both frames hear it while one loads;
      // let the burst settle into one refresh.
      if (e.data?.desk === 'reload') {
        clearTimeout(fallback.current);
        fallback.current = window.setTimeout(refresh, 100);
      }
      if (e.data?.desk === 'catalog') latest.current.onCatalog(e.data);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, []);

  return <div className={`stage${phone ? ' phone' : ''}`} ref={stage} />;
});
