import { useEffect, useRef, useState } from 'react';
import { api, send, store, type BlocksMeta, type Meta, type Open } from './api';
import PostEditor from './PostEditor';
import PageEditor from './PageEditor';
import ThemeEditor from './ThemeEditor';
import Preview, { type PreviewHandle } from './Preview';

// What App can ask of whichever editor is open.
export type EditorHandle = {
  flush: () => Promise<void>;
  insert?: (md: string) => void;
  pickCover?: (pick: { layout: string; palette?: string }) => void;
  select?: (path: string) => void;
  selectMd?: (line: number) => void;
  apply?: (path: string, value: string) => void;
  undo?: () => void;
  redo?: () => void;
  addBlock?: (type: string) => void;
  reload?: () => Promise<unknown>;
  // Put an older version in place, as an edit (so it saves, and undo takes it back).
  restore?: (version: any) => void;
};
export type EditorProps = { onState: (text: string, cls?: string) => void; onSaved: () => void };

type ListItem = { id: string; title: string; date?: string; tag?: string; draft?: boolean; template?: string };

// Home first, then pages made in the desk, then the shared frame and post template.
const rank = (p: ListItem) => (p.id === 'home' ? 0 : p.id === 'frame' ? 2 : p.id === 'post' ? 3 : 1);

const openFrom = (v: string): Open => (v === 'theme' ? { kind: 'theme', id: 'theme' } : v.startsWith('page:') ? { kind: 'page', id: v.slice(5) } : v ? { kind: 'post', id: v } : null);

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [blocks, setBlocks] = useState<BlocksMeta | null>(null);
  const [posts, setPosts] = useState<ListItem[]>([]);
  const [pages, setPages] = useState<ListItem[]>([]);
  const [open, setOpen] = useState<Open>(null);
  const [status, setStatus] = useState({ text: 'loading', cls: '' });
  const [pv, setPv] = useState(store.get('pv', 'split'));
  const [phone, setPhone] = useState(store.get('w', 'desk') === 'phone');
  const [catalog, setCatalog] = useState(false);
  const [path, setPath] = useState('/');
  const [dialog, setDialog] = useState<null | 'new' | 'page' | 'publish' | 'history'>(null);
  const [palette, setPalette] = useState(false);
  const editor = useRef<EditorHandle>(null);
  const preview = useRef<PreviewHandle>(null);
  const popup = useRef<Window | null>(null);
  // Something to do in a page editor that's about to open (a click in the preview).
  const queued = useRef<((e: EditorHandle) => void) | null>(null);

  const onState = (text: string, cls = '') => setStatus({ text, cls });
  const lists = () => Promise.all([api('/api/posts').then(setPosts), api('/api/pages').then(setPages)]);
  const onSaved = () => {
    lists();
    preview.current?.refreshSoon();
  };

  useEffect(() => {
    Promise.all([api<Meta>('/api/meta').then(setMeta), api<BlocksMeta>('/api/blocks').then(setBlocks), lists()])
      .then(() => {
        setOpen(openFrom(store.get('open', 'page:home')));
        onState('ready');
      })
      .catch((e) => onState('could not start: ' + e.message, 'err'));
  }, []);

  useEffect(() => {
    if (!open) return;
    store.set('open', open.kind === 'page' ? 'page:' + open.id : open.id);
    if (open.kind !== 'post') setCatalog(false);
  }, [open?.kind, open?.id]);

  // Run anything queued for the editor once it's mounted.
  useEffect(() => {
    if (!queued.current) return;
    const t = setInterval(() => {
      if (editor.current?.select && queued.current) {
        queued.current(editor.current);
        queued.current = null;
        clearInterval(t);
      }
    }, 50);
    return () => clearInterval(t);
  }, [open?.id]);

  useEffect(() => {
    if (pv === 'popup' && popup.current && !popup.current.closed) popup.current.location.href = path;
  }, [path]);

  async function go(next: Open) {
    await editor.current?.flush();
    setOpen(next);
  }

  // A block or slot clicked or edited in the preview: open its page if needed, then act.
  async function onPreview(target: string, act: (e: EditorHandle) => void) {
    // A block in the open post's Markdown.
    if (target.startsWith('md:')) return editor.current?.selectMd?.(Number(target.slice(3).split('-')[0]));
    const pid = target.split(':')[0];
    if (open?.kind === 'page' && open.id === pid && editor.current) return act(editor.current);
    queued.current = act;
    await go({ kind: 'page', id: pid });
  }

  function setPreviewMode(mode: string) {
    store.set('pv', mode);
    setPv(mode);
    if (mode === 'popup') popup.current = window.open(path, 'desk-preview', 'width=960,height=1000');
  }

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') {
        e.preventDefault();
        editor.current?.flush();
      }
      if (mod && e.key === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
      // In a text field, undo is the field's own; elsewhere it's the editor's.
      const typing = (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]');
      if (mod && !typing && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? editor.current?.redo?.() : editor.current?.undo?.();
      }
      if (mod && !typing && e.key === 'y') {
        e.preventDefault();
        editor.current?.redo?.();
      }
    };
    addEventListener('keydown', keys);
    const leave = () => void editor.current?.flush();
    addEventListener('beforeunload', leave);
    return () => {
      removeEventListener('keydown', keys);
      removeEventListener('beforeunload', leave);
    };
  }, []);

  // Back to the last published (committed) version of what's open.
  async function discard() {
    if (!open) return;
    const what = open.kind === 'theme' ? 'the theme' : open.kind === 'post' ? posts.find((p) => p.id === open.id)?.title : open.id === 'frame' ? 'the header and footer' : `the ${open.id} page`;
    if (!confirm(`Throw away every change to ${what} since it was last published? New images stay.`)) return;
    await editor.current?.flush();
    try {
      await send('/api/discard', 'POST', open);
      await editor.current?.reload?.();
      lists();
      preview.current?.refresh();
      onState('discarded');
    } catch (e: any) {
      onState('discard failed: ' + e.message, 'err');
    }
  }

  // The palette's commands: everything to open, plus actions.
  const commands = [
    ...pages.map((p) => ({ kind: 'page', label: p.id === 'frame' ? 'Header & footer' : p.title, run: () => go({ kind: 'page', id: p.id }) })),
    ...posts.map((p) => ({ kind: 'post', label: p.title, run: () => go({ kind: 'post', id: p.id }) })),
    { kind: 'open', label: 'Theme', run: () => go({ kind: 'theme', id: 'theme' }) },
    { kind: 'new', label: 'New post', run: () => setDialog('new') },
    { kind: 'new', label: 'New page', run: () => setDialog('page') },
    ...(open?.kind === 'page' && blocks
      ? Object.entries(blocks.schemas).map(([type, s]) => ({ kind: 'add', label: `Add ${s.title ?? type}`, run: () => editor.current?.addBlock?.(type) }))
      : []),
    ...(open?.kind === 'post' ? [{ kind: 'view', label: catalog ? 'Close the catalog' : 'Open the catalog', run: () => setCatalog(!catalog) }] : []),
    { kind: 'edit', label: 'Undo', run: () => editor.current?.undo?.() },
    { kind: 'edit', label: 'Redo', run: () => editor.current?.redo?.() },
    { kind: 'edit', label: 'Discard changes', run: discard },
    { kind: 'edit', label: 'History', run: () => setDialog('history') },
    ...['split', 'popup', 'off'].map((m) => ({ kind: 'view', label: `Preview: ${m}`, run: () => setPreviewMode(m) })),
    { kind: 'view', label: phone ? 'Preview at desktop width' : 'Preview at phone width', run: () => (store.set('w', phone ? 'desk' : 'phone'), setPhone(!phone)) },
    { kind: 'site', label: 'Retake all social cards', run: () => api('/api/cards', { method: 'POST' }).then(() => onState('cards retaken')) },
    { kind: 'site', label: 'Publish', run: () => setDialog('publish') },
  ];

  const isCur = (kind: string, id: string) => open?.kind === kind && open.id === id;

  return (
    <div className={`desk${pv === 'split' ? '' : ' pv-off'}`}>
      <header>
        <span className="brand">
          desk<b>.</b>
        </span>
        <span className={`state ${status.cls}`}>{status.text}</span>
        <span className="sp" />
        <span className="seg">
          <button title="Undo (Ctrl+Z outside a text field)" disabled={!open} onClick={() => editor.current?.undo?.()}>
            ↶
          </button>
          <button title="Redo (Ctrl+Shift+Z)" disabled={!open} onClick={() => editor.current?.redo?.()}>
            ↷
          </button>
        </span>
        <button title="Throw away changes since the last publish" disabled={!open} onClick={discard}>
          discard
        </button>
        <button title="Every published version" disabled={!open} onClick={() => setDialog('history')}>
          history
        </button>
        <button title="Everything, by name (Ctrl+K)" onClick={() => setPalette(true)}>
          ⌘K
        </button>
        <span className="seg" title="Preview">
          {['split', 'popup', 'off'].map((m) => (
            <button key={m} className={pv === m ? 'on' : ''} onClick={() => setPreviewMode(m)}>
              {m}
            </button>
          ))}
        </span>
        <button
          className={catalog ? 'on' : ''}
          disabled={open?.kind !== 'post'}
          title="Every cover for this post, and every block, in the preview"
          onClick={() => {
            setCatalog(!catalog);
            if (pv === 'off') setPreviewMode('split');
          }}
        >
          catalog
        </button>
        <button className="go" onClick={() => setDialog('publish')}>
          publish
        </button>
      </header>

      <aside>
        <p className="group">Pages</p>
        <button className="new" onClick={() => setDialog('page')}>
          + new page
        </button>
        <nav>
          {[...pages].sort((a, b) => rank(a) - rank(b)).map((p) => (
            <a key={p.id} className={isCur('page', p.id) ? 'cur' : ''} onClick={() => go({ kind: 'page', id: p.id })}>
              <div className="t">{p.id === 'frame' ? 'Header & footer' : p.title}</div>
              <div className="m">{p.id === 'frame' ? 'on every page' : p.id === 'post' ? 'around every post' : p.id === 'home' ? '/' : `/${p.id}/`}</div>
            </a>
          ))}
          <a className={open?.kind === 'theme' ? 'cur' : ''} onClick={() => go({ kind: 'theme', id: 'theme' })}>
            <div className="t">Theme</div>
            <div className="m">the site's colors</div>
          </a>
        </nav>
        <p className="group">Posts</p>
        <button className="new" onClick={() => setDialog('new')}>
          + new post
        </button>
        <nav>
          {posts.map((p) => (
            <a key={p.id} className={isCur('post', p.id) ? 'cur' : ''} onClick={() => go({ kind: 'post', id: p.id })}>
              <div className="t">{p.title}</div>
              <div className="m">
                {p.date} · {p.tag}
                {p.draft && (
                  <>
                    {' · '}
                    <span className="d">draft</span>
                  </>
                )}
              </div>
            </a>
          ))}
        </nav>
      </aside>

      {!open || !meta || !blocks ? (
        <main className="empty">pick a page or a post</main>
      ) : open.kind === 'theme' ? (
        <ThemeEditor key="theme" ref={editor} onState={onState} onSaved={onSaved} />
      ) : open.kind === 'post' ? (
        <PostEditor key={open.id} ref={editor} id={open.id} meta={meta} blocks={blocks} projects={pages.filter((p) => p.template === 'basic')} catalog={catalog} setPath={setPath} onState={onState} onSaved={onSaved} />
      ) : (
        <PageEditor key={open.id} ref={editor} id={open.id} blocks={blocks} posts={posts} setPath={setPath} onState={onState} onSaved={onSaved} onPick={(p) => preview.current?.mark(p)} onDeleted={() => (lists(), setOpen({ kind: 'page', id: 'home' }))} />
      )}

      <section className="preview">
        <div className="bar">
          <span className="url">{meta ? meta.site + path : ''}</span>
          <span className="seg">
            <button className={phone ? '' : 'on'} onClick={() => (store.set('w', 'desk'), setPhone(false))}>
              desktop
            </button>
            <button className={phone ? 'on' : ''} onClick={() => (store.set('w', 'phone'), setPhone(true))}>
              phone
            </button>
          </span>
          <button title="Reload preview" onClick={() => preview.current?.refresh()}>
            ↻
          </button>
        </div>
        {pv === 'split' && (
          <Preview
            ref={preview}
            path={path}
            phone={phone}
            editable={!catalog}
            onSelect={(target) => onPreview(target, (e) => e.select?.(target))}
            onInline={(target, value) => onPreview(target, (e) => e.apply?.(target, value))}
            onCatalog={(msg) => {
              if (msg.tab) store.set('catTab', msg.tab);
              if (msg.insert) editor.current?.insert?.(msg.insert);
              if (msg.pick) editor.current?.pickCover?.(msg.pick);
            }}
          />
        )}
      </section>

      {dialog === 'history' && open && (
        <History
          open={open}
          onClose={() => setDialog(null)}
          onRestore={async (v) => {
            await editor.current?.flush();
            editor.current?.restore?.(v);
            onState('restored an older version (undo takes it back)');
          }}
        />
      )}
      {palette && <Palette commands={commands} onClose={() => setPalette(false)} />}
      {dialog === 'page' && <NewPage onClose={() => setDialog(null)} onCreate={(id) => (lists(), go({ kind: 'page', id }))} />}
      {dialog === 'new' && meta && <NewPost meta={meta} onClose={() => setDialog(null)} onCreate={(id) => (lists(), go({ kind: 'post', id }))} />}
      {dialog === 'publish' && (
        <Publish
          open={open}
          title={open?.kind === 'theme' ? 'the theme' : open?.kind === 'post' ? posts.find((p) => p.id === open.id)?.title : open?.kind === 'page' ? (open.id === 'frame' ? 'the header and footer' : `the ${open.id} page`) : undefined}
          draft={open?.kind === 'post' && !!posts.find((p) => p.id === open.id)?.draft}
          flush={() => editor.current?.flush() ?? Promise.resolve()}
          onState={onState}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function Dialog({ title, children, ok, onOk, onClose }: { title: string; children: React.ReactNode; ok: string; onOk?: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog ref={ref} onClose={onClose}>
      <form
        method="dialog"
        onSubmit={(e) => {
          // ok runs the action and lets it decide when to close; cancel just closes.
          const v = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
          if (v === 'ok' && onOk) {
            e.preventDefault();
            onOk();
          }
        }}
      >
        <h3>{title}</h3>
        {children}
        <p className="row">
          <span className="sp" />
          {onOk && <button value="cancel">cancel</button>}
          <button value="ok" className="go">
            {ok}
          </button>
        </p>
      </form>
    </dialog>
  );
}

// Published versions from git; restoring one loads it into the editor as an edit.
function History({ open, onClose, onRestore }: { open: NonNullable<Open>; onClose: () => void; onRestore: (version: any) => void }) {
  const [list, setList] = useState<{ rev: string; date: string; message: string }[] | null>(null);
  useEffect(() => {
    api(`/api/history?kind=${open.kind}&id=${encodeURIComponent(open.id)}`).then(setList);
  }, []);
  return (
    <Dialog title="History" ok="close" onClose={onClose}>
      {!list ? (
        <p className="hint">loading…</p>
      ) : !list.length ? (
        <p className="hint">Never published, so there's no history yet.</p>
      ) : (
        <ul className="history">
          {list.map((v, i) => (
            <li key={v.rev}>
              <span className="when">{new Date(v.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <span className="msg">
                {v.message}
                {i === 0 && <small> · last published</small>}
              </span>
              <button
                type="button"
                onClick={async () => {
                  onRestore(await api(`/api/version?kind=${open.kind}&id=${encodeURIComponent(open.id)}&rev=${v.rev}`));
                  onClose();
                }}
              >
                restore
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Restoring loads that version into the editor and saves it; ↶ undo brings back what you had.</p>
    </Dialog>
  );
}

// Ctrl+K: type to filter, arrows to move, Enter to run.
function Palette({ commands, onClose }: { commands: { kind: string; label: string; run: () => unknown }[]; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = commands.filter((c) => words.every((w) => `${c.kind} ${c.label}`.toLowerCase().includes(w))).slice(0, 40);
  const run = (i: number) => {
    const c = shown[i];
    if (!c) return;
    onClose();
    c.run();
  };
  return (
    <div className="palette" onClick={onClose}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          placeholder="Open, add, publish…"
          onChange={(e) => (setQ(e.target.value), setAt(0))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') (e.preventDefault(), setAt((a) => Math.min(shown.length - 1, a + 1)));
            if (e.key === 'ArrowUp') (e.preventDefault(), setAt((a) => Math.max(0, a - 1)));
            if (e.key === 'Enter') run(at);
          }}
        />
        <ul>
          {shown.map((c, i) => (
            <li key={c.kind + c.label} className={i === at ? 'on' : ''} onMouseEnter={() => setAt(i)} onClick={() => run(i)}>
              <span className="k">{c.kind}</span>
              {c.label}
            </li>
          ))}
          {!shown.length && <li>Nothing matches.</li>}
        </ul>
      </div>
    </div>
  );
}

function NewPage({ onClose, onCreate }: { onClose: () => void; onCreate: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('plain');
  return (
    <Dialog
      title="New page"
      ok="create"
      onClose={onClose}
      onOk={async () => {
        if (!title.trim()) return;
        const { id } = await send('/api/pages', 'POST', { title, kind });
        onClose();
        onCreate(id);
      }}
    >
      <div className="row">
        <label className="grow">
          title
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="About" />
        </label>
        <label>
          kind
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="plain">plain page</option>
            <option value="project">project</option>
          </select>
        </label>
      </div>
      <p className="hint">
        Its address comes from the title (About → /about/). A plain page starts with a heading and text; a project starts with its name, status and pitch, text, and a log of the posts you file under it.
      </p>
    </Dialog>
  );
}

function NewPost({ meta, onClose, onCreate }: { meta: Meta; onClose: () => void; onCreate: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('build');
  return (
    <Dialog
      title="New post"
      ok="create"
      onClose={onClose}
      onOk={async () => {
        if (!title.trim()) return;
        const { id } = await send('/api/new', 'POST', { title, tag });
        onClose();
        onCreate(id);
      }}
    >
      <div className="row">
        <label className="grow">
          title
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          tag
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            {meta.tags.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <p className="hint">Starts as a draft. Drafts show in the preview, never on the live site.</p>
    </Dialog>
  );
}

function Publish({ open, title, draft, flush, onState, onClose }: { open: Open; title?: string; draft: boolean; flush: () => Promise<void>; onState: EditorProps['onState']; onClose: () => void }) {
  const [st, setSt] = useState<{ branch: string; changes: string } | null>(null);
  const [msg, setMsg] = useState(open?.kind === 'post' ? `Post: ${title}` : open?.kind === 'page' ? `Page: ${open.id}` : open?.kind === 'theme' ? 'Theme: colors' : 'Update content');
  const [log, setLog] = useState<string | null>(null);
  useEffect(() => {
    flush().then(() => api('/api/status').then(setSt));
  }, []);
  if (log !== null) return <Dialog title="Published" ok="ok" onClose={onClose}><pre>{log}</pre></Dialog>;
  if (!st) return null;
  return (
    <Dialog
      title="Publish"
      ok="commit & push"
      onClose={onClose}
      onOk={async () => {
        onState('publishing…', 'dirty');
        try {
          const r = await send('/api/publish', 'POST', { id: open?.kind === 'post' ? open.id : undefined, page: open?.kind === 'page' ? open.id : undefined, theme: open?.kind === 'theme', message: msg });
          onState('published');
          setLog(r.log);
        } catch (e: any) {
          onState('publish failed', 'err');
          setLog(e.message);
        }
      }}
    >
      <p>
        Commits <b>{title ?? 'all content changes'}</b> and pushes branch <b>{st.branch}</b>. The live site redeploys when <b>main</b> changes.
      </p>
      {draft && <p className="hint">This post is still a draft, so it will not show on the site. Untick draft first to publish it.</p>}
      <pre>{st.changes || 'No uncommitted content changes.'}</pre>
      <label className="grow">
        commit message
        <input value={msg} onChange={(e) => setMsg(e.target.value)} />
      </label>
    </Dialog>
  );
}
