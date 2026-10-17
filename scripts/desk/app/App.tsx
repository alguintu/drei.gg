import { useEffect, useRef, useState } from 'react';
import { api, send, store, type BlocksMeta, type Meta, type Open } from './api';
import PostEditor from './PostEditor';
import PageEditor from './PageEditor';
import Preview, { type PreviewHandle } from './Preview';

// What App can ask of whichever editor is open.
export type EditorHandle = {
  flush: () => Promise<void>;
  insert?: (md: string) => void;
  pickCover?: (pick: { layout: string; palette?: string }) => void;
  select?: (path: string) => void;
  apply?: (path: string, value: string) => void;
};
export type EditorProps = { onState: (text: string, cls?: string) => void; onSaved: () => void };

type ListItem = { id: string; title: string; date?: string; tag?: string; draft?: boolean; template?: string };

const openFrom = (v: string): Open => (v.startsWith('page:') ? { kind: 'page', id: v.slice(5) } : v ? { kind: 'post', id: v } : null);

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
  const [dialog, setDialog] = useState<null | 'new' | 'publish'>(null);
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
    if (open.kind === 'page') setCatalog(false);
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
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        editor.current?.flush();
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

  const isCur = (kind: string, id: string) => open?.kind === kind && open.id === id;

  return (
    <div className={`desk${pv === 'split' ? '' : ' pv-off'}`}>
      <header>
        <span className="brand">
          desk<b>.</b>
        </span>
        <span className={`state ${status.cls}`}>{status.text}</span>
        <span className="sp" />
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
        <nav>
          {pages.map((p) => (
            <a key={p.id} className={isCur('page', p.id) ? 'cur' : ''} onClick={() => go({ kind: 'page', id: p.id })}>
              <div className="t">{p.id === 'frame' ? 'Header & footer' : p.title}</div>
              <div className="m">{p.id === 'frame' ? 'on every page' : `${p.id} · ${p.template}`}</div>
            </a>
          ))}
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
      ) : open.kind === 'post' ? (
        <PostEditor key={open.id} ref={editor} id={open.id} meta={meta} catalog={catalog} setPath={setPath} onState={onState} onSaved={onSaved} />
      ) : (
        <PageEditor key={open.id} ref={editor} id={open.id} blocks={blocks} setPath={setPath} onState={onState} onSaved={onSaved} onPick={(p) => preview.current?.mark(p)} />
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

      {dialog === 'new' && meta && <NewPost meta={meta} onClose={() => setDialog(null)} onCreate={(id) => (lists(), go({ kind: 'post', id }))} />}
      {dialog === 'publish' && (
        <Publish
          open={open}
          title={open?.kind === 'post' ? posts.find((p) => p.id === open.id)?.title : open?.kind === 'page' ? (open.id === 'frame' ? 'the header and footer' : `the ${open.id} page`) : undefined}
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
  const [msg, setMsg] = useState(open?.kind === 'post' ? `Post: ${title}` : open?.kind === 'page' ? `Page: ${open.id}` : 'Update content');
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
          const r = await send('/api/publish', 'POST', { id: open?.kind === 'post' ? open.id : undefined, page: open?.kind === 'page' ? open.id : undefined, message: msg });
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
