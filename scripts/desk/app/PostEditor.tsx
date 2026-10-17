import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { api, send, type BlocksMeta, type Meta } from './api';
import { BlockForm } from './forms';
import { useHistory } from './history';
import { IMAGE, POST_BLOCKS, markdown } from '../../../src/lib/post-blocks.mjs';
import type { EditorHandle, EditorProps } from './App';

// A post block in the Markdown body: its type, its lines (0-based, inclusive) and slot data.
type Found = { type: string; start: number; end: number; data: any };

// The post block on a line of the body, if there is one: a ```fence around it,
// or a framed image on it.
function blockAt(body: string, line: number): Found | null {
  const lines = body.split('\n');
  const img = lines[line]?.match(/^!\[([^\]]*)\]\((\S+)\s+"([^"]*)"\)\s*$/);
  const frame = img && IMAGE.parse(img[3]);
  if (img && frame) return { type: 'image', start: line, end: line, data: { src: img[2], alt: img[1], ...frame } };
  let open = -1;
  let type = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^```(\w*)\s*$/);
    if (!m) continue;
    if (open < 0) {
      open = i;
      type = m[1];
      continue;
    }
    if (open <= line && line <= i && type in POST_BLOCKS) return { type, start: open, end: i, data: (POST_BLOCKS as any)[type].parse(lines.slice(open + 1, i)) };
    if (i > line) return null;
    open = -1;
  }
  return null;
}

const toMarkdown = (b: Found) => (b.type === 'image' ? IMAGE.markdown(b.data) : markdown(b.type, b.data));

type Post = {
  id: string;
  data: Record<string, any>;
  body: string;
  auto: { image: string; none: string };
  images: string[];
};

// One post: front matter, cover, and the Markdown body. Saves itself 700ms after
// the last change.
export default forwardRef<EditorHandle, EditorProps & { id: string; meta: Meta; blocks: BlocksMeta; catalog: boolean; setPath: (p: string) => void }>(function PostEditor(
  { id, meta, blocks, catalog, setPath, onState, onSaved },
  ref,
) {
  const [post, setPost] = useState<Post | null>(null);
  const timer = useRef(0);
  const current = useRef<Post | null>(null);
  current.current = post;
  const body = useRef<HTMLTextAreaElement>(null);
  // The post block open in the form above the body, and the one the caret is in.
  const [blk, setBlk] = useState<Found | null>(null);
  const [here, setHere] = useState<Found | null>(null);
  const [cardV, setCardV] = useState(() => Date.now());
  const flushNow = async () => {
    if (timer.current) await save();
  };

  useEffect(() => {
    let live = true;
    api<Post>('/api/post?id=' + encodeURIComponent(id)).then((p) => {
      if (!live) return;
      p.data.cover = { ...(p.data.cover ?? {}) };
      setPost(p);
    });
    return () => {
      live = false;
    };
  }, [id]);

  const d = post?.data;
  const layout = d ? d.layout || (d.image ? post!.auto.image : post!.auto.none) : '';

  // The preview shows the post, or the catalog for it.
  useEffect(() => {
    if (!post) return;
    if (!catalog) return setPath(`/log/${post.id}/`);
    const q = new URLSearchParams({ tab: localStorage.getItem('desk.catTab') ?? 'heroes', layout, palette: d!.palette ?? '' });
    setPath(`/desk/catalog/${post.id}/?${q}`);
  }, [post?.id, catalog, catalog && layout, catalog && d?.palette]);

  async function save() {
    clearTimeout(timer.current);
    timer.current = 0;
    const p = current.current;
    if (!p) return;
    const data = { ...p.data };
    data.cover = Object.fromEntries(Object.entries(p.data.cover).filter(([, x]) => String(x).trim()));
    for (const k of ['title', 'label', 'summary', 'layout', 'palette', 'image_alt']) if (typeof data[k] === 'string') data[k] = data[k].trim();
    if (!data.image) {
      delete data.image;
      delete data.image_alt;
    }
    try {
      await send('/api/post?id=' + p.id, 'PUT', { data, body: p.body });
      onState('saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      onSaved();
    } catch (e: any) {
      onState('save failed: ' + e.message, 'err');
    }
  }

  const history = useHistory<Post>();

  function change(fn: (p: Post) => Post) {
    if (current.current) history.record(current.current);
    setPost((p) => (p ? fn(p) : p));
    onState('unsaved', 'dirty');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 700);
  }

  // Undo and redo replace the whole post, then save it.
  function travel(to: Post | null, word: string) {
    if (!to) return onState('nothing to ' + word);
    setBlk(null);
    current.current = to;
    setPost(to);
    onState('unsaved', 'dirty');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 300);
  }
  const set = (k: string, v: unknown) => change((p) => ({ ...p, data: { ...p.data, [k]: v } }));
  const setSlot = (k: string, v: string) => change((p) => ({ ...p, data: { ...p.data, cover: { ...p.data.cover, [k]: v } } }));

  function insert(text: string) {
    const ta = body.current!;
    const [a, b] = [ta.selectionStart, ta.selectionEnd];
    const before = ta.value.slice(0, a);
    const after = ta.value.slice(b);
    const pad = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    // Blocks need a blank line on both sides, or Markdown runs them into the paragraph.
    const tail = !after || after.startsWith('\n') ? '\n' : '\n\n';
    const value = before + pad + text + tail + after;
    const caret = (before + pad + text + tail).length;
    change((p) => ({ ...p, body: value }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  async function upload(file: File) {
    onState('uploading…', 'dirty');
    const name = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    const r = await api(`/api/upload?id=${id}&name=${encodeURIComponent(name)}`, { method: 'PUT', body: file });
    setPost((p) => (p ? { ...p, images: r.images } : p));
    onState('uploaded ' + r.name);
    return r.name as string;
  }

  // Show a block's lines in the body and open it in the form.
  function openBlock(found: Found | null) {
    setBlk(found);
    if (!found) return;
    const ta = body.current!;
    const lines = ta.value.split('\n');
    const from = lines.slice(0, found.start).join('\n').length + (found.start ? 1 : 0);
    const to = from + lines.slice(found.start, found.end + 1).join('\n').length;
    ta.setSelectionRange(from, to);
    ta.blur();
    ta.focus({ preventScroll: true });
    ta.scrollTop = Math.max(0, (found.start - 3) * parseFloat(getComputedStyle(ta).lineHeight));
  }

  // The form changed a block: write its Markdown back over its lines.
  function editBlock(data: any) {
    setBlk((b) => {
      if (!b) return b;
      const next = { ...b, data };
      const text = toMarkdown(next).split('\n');
      change((p) => {
        const lines = p.body.split('\n');
        lines.splice(b.start, b.end - b.start + 1, ...text);
        return { ...p, body: lines.join('\n') };
      });
      return { ...next, end: b.start + text.length - 1 };
    });
  }

  const caretLine = () => {
    const ta = body.current!;
    return ta.value.slice(0, ta.selectionStart).split('\n').length - 1;
  };

  useImperativeHandle(ref, () => ({
    undo: () => current.current && travel(history.undo(current.current), 'undo'),
    redo: () => current.current && travel(history.redo(current.current), 'redo'),
    reload: () =>
      api<Post>('/api/post?id=' + encodeURIComponent(id)).then((p) => {
        p.data.cover = { ...(p.data.cover ?? {}) };
        setBlk(null);
        setPost(p);
      }),
    // Lines from the preview are 1-based lines of the body.
    selectMd: (line) => openBlock(blockAt(current.current?.body ?? '', line - 1)),
    flush: async () => {
      if (timer.current) await save();
    },
    insert,
    pickCover: (pick) => change((p) => ({ ...p, data: { ...p.data, layout: pick.layout, ...(pick.palette ? { palette: pick.palette } : {}) } })),
  }));

  if (!post || !d) return <main className="empty">loading…</main>;

  const slots = meta.slots[layout] ?? {};
  const own = (def: string) => def.replace('{title}', d.title ?? '').replace('{summary}', d.summary || d.title || '');
  const img = d.image?.replace(/^\.\//, '');
  const tools = Object.fromEntries(meta.blocks.filter((b) => b.group !== 'frame' || b.name === 'offset').map((b) => [b.group === 'frame' ? 'image' : b.name, b.md]));
  const shuffle = () => {
    const pool = d.image ? [...meta.image, ...meta.type] : meta.type;
    set('layout', pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <main>
      <input className="title" value={d.title ?? ''} placeholder="Title" onChange={(e) => set('title', e.target.value)} />
      <div className="row">
        <label>
          date
          <input type="date" value={String(d.date ?? '').slice(0, 10)} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label>
          tag
          <select value={d.tag} onChange={(e) => set('tag', e.target.value)}>
            {meta.tags.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>
          label
          <input value={d.label ?? ''} placeholder="v0.0.2" size={10} onChange={(e) => set('label', e.target.value)} />
        </label>
        <label className="grow">
          summary
          <input value={d.summary ?? ''} placeholder="One line for RSS and link previews" onChange={(e) => set('summary', e.target.value)} />
        </label>
        <label className="chk">
          <input type="checkbox" checked={d.draft === true} onChange={(e) => set('draft', e.target.checked)} /> draft
        </label>
      </div>

      <fieldset>
        <legend>Cover</legend>
        <div className="thumbs">
          <span className={`none ${img ? '' : 'cur'}`} onClick={() => set('image', '')}>no image</span>
          {post.images.map((n) => (
            <img key={n} src={`/img/${post.id}/${encodeURIComponent(n)}`} title={n} className={n === img ? 'cur' : ''} onClick={() => set('image', './' + n)} />
          ))}
        </div>
        <div className="row">
          <label className="grow">
            image alt
            <input value={d.image_alt ?? ''} placeholder="What the image shows" onChange={(e) => set('image_alt', e.target.value)} />
          </label>
          <label className="btn">
            upload image…
            <input type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && set('image', './' + (await upload(e.target.files[0])))} />
          </label>
        </div>
        <div className="row">
          <label>
            layout
            <select value={d.layout ?? ''} onChange={(e) => set('layout', e.target.value)}>
              <option value="">auto</option>
              <optgroup label={`image layouts${d.image ? '' : ' (need an image)'}`}>
                {meta.image.map((l) => <option key={l}>{l}</option>)}
              </optgroup>
              <optgroup label="type layouts">
                {meta.type.map((l) => <option key={l}>{l}</option>)}
              </optgroup>
            </select>
          </label>
          <button type="button" onClick={shuffle} title="Random layout">shuffle</button>
          <label>
            palette
            <select value={d.palette ?? ''} onChange={(e) => set('palette', e.target.value)}>
              <option value="">auto</option>
              {meta.palettes.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>
        {!d.layout && (
          <p className="hint">
            {d.image
              ? `auto: the filename picks from all ${meta.image.length + meta.type.length} layouts (${layout}).`
              : `auto: no image, so the filename picks from the ${meta.type.length} type layouts (${layout}).`}
          </p>
        )}
        <div className="row slots">
          {Object.keys(slots).length === 0 && <p className="hint">This layout only shows the title and summary.</p>}
          {Object.entries(slots).map(([k, def]) => (
            <label key={k} className={k === 'title' || k === 'summary' ? 'grow' : ''}>
              {k}
              <input value={d.cover[k] ?? ''} placeholder={own(def)} size={Math.min(28, Math.max(8, own(def).length))} onChange={(e) => setSlot(k, e.target.value)} />
            </label>
          ))}
        </div>
        <div className="row card">
          <img src={`/og/${post.id}.jpg?v=${cardV}`} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} onLoad={(e) => (e.currentTarget.style.visibility = '')} />
          <div>
            <p className="hint">
              Social card: the cover as link previews show it (public/og/{post.id}.jpg). Publishing retakes it.
            </p>
            <button
              type="button"
              onClick={async () => {
                await flushNow();
                onState('taking the card…', 'dirty');
                try {
                  await api('/api/cards?id=' + post.id, { method: 'POST' });
                  setCardV(Date.now());
                  onState('card retaken');
                } catch (e: any) {
                  onState('card failed: ' + e.message, 'err');
                }
              }}
            >
              retake card
            </button>
          </div>
        </div>
        <p className="hint">Cover text: blank uses the layout's default, and title and summary default to the post's own. Tokens: {'{date} {dd} {mm} {label} {title} {summary} {tag} {kicker} {script} {initial}'}.</p>
      </fieldset>

      <div className="tools">
        {Object.entries(tools).map(([k, md]) => (
          <button key={k} type="button" onClick={() => insert(md)}>
            {k}
          </button>
        ))}
        {here && !blk && (
          <button type="button" className="on" onClick={() => openBlock(here)} title="Edit the block the cursor is in">
            edit {blocks.schemas[here.type]?.title?.toLowerCase() ?? here.type} ✎
          </button>
        )}
      </div>
      {blk && blocks.schemas[blk.type] && (
        <fieldset className="bpanel">
          <legend>
            {blocks.schemas[blk.type].title} · lines {blk.start + 1}–{blk.end + 1}
          </legend>
          <button type="button" className="close" onClick={() => setBlk(null)} title="Close">
            ×
          </button>
          <div className="bform">
            <BlockForm
              key={`${blk.type}:${blk.start}`}
              schema={blocks.schemas[blk.type]}
              data={{ ...blk.data, type: blk.type }}
              idPrefix="pb"
              context={{ images: post.images.map((n) => './' + n), thumb: (src) => `/img/${post.id}/${encodeURIComponent(src.replace(/^\.\//, ''))}`, upload: async (f) => './' + (await upload(f)) }}
              onChange={({ type, ...data }) => editBlock(data)}
            />
          </div>
        </fieldset>
      )}
      <textarea
        ref={body}
        className="body"
        spellCheck
        value={post.body}
        onChange={(e) => {
          const v = e.target.value;
          // Typing in the body itself closes the block form, whose lines may have moved.
          setBlk(null);
          change((p) => ({ ...p, body: v }));
        }}
        onSelect={() => setHere(blockAt(body.current!.value, caretLine()))}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('drop');
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drop')}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drop');
          for (const file of [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))) {
            const name = await upload(file);
            insert(`![${name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}](./${name} "offset | ")`);
          }
        }}
      />
      <p className="hint">Drop an image on the text to upload it and insert it with a frame. Frames: offset, teal, bracket, rounded, quarter, tape. The catalog shows them all.</p>
    </main>
  );
});
