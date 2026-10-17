import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { api, send } from './api';
import type { EditorHandle, EditorProps } from './App';
import { useHistory } from './history';

// The site's colors (src/lib/theme.ts). Only changed tokens are saved
// (src/data/theme.json), and the site adds just those to its CSS.

type Tokens = Record<string, Record<string, string>>;

const GROUPS: [string, string][] = [
  ['light', 'Site, light'],
  ['dark', 'Site, dark'],
  ['marker', 'Cover palette: marker'],
  ['aeris', 'Cover palette: aeris'],
  ['ink', 'Cover palette: ink'],
];

export default forwardRef<EditorHandle, EditorProps>(function ThemeEditor({ onState, onSaved }, ref) {
  const [defaults, setDefaults] = useState<Tokens | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Tokens>({});
  const current = useRef<Tokens>({});
  const timer = useRef(0);
  const history = useHistory<Tokens>();

  const load = () =>
    api('/api/theme').then((r) => {
      setDefaults(r.defaults);
      setNotes(r.notes);
      setValues(r.values);
      current.current = r.values;
    });
  useEffect(() => void load(), []);

  async function save() {
    clearTimeout(timer.current);
    timer.current = 0;
    try {
      await send('/api/theme', 'PUT', current.current);
      onState('saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      onSaved();
    } catch (e: any) {
      onState('save failed: ' + e.message, 'err');
    }
  }

  function commit(next: Tokens, record = true) {
    if (record) history.record(current.current);
    current.current = next;
    setValues(next);
    onState('unsaved', 'dirty');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 400);
  }

  function set(group: string, key: string, value: string | null) {
    const next = structuredClone(current.current);
    next[group] ??= {};
    if (value === null) delete next[group][key];
    else next[group][key] = value;
    commit(next);
  }

  useImperativeHandle(ref, () => ({
    flush: async () => {
      if (timer.current) await save();
    },
    undo: () => {
      const prev = history.undo(current.current);
      prev ? commit(prev, false) : onState('nothing there');
    },
    redo: () => {
      const next = history.redo(current.current);
      next ? commit(next, false) : onState('nothing there');
    },
    reload: load,
  }));

  if (!defaults) return <main className="empty">loading…</main>;

  return (
    <main>
      <p className="title">Theme</p>
      <p className="hint">
        The site's colors. Changes show in the preview as you pick them; only what differs from the defaults is saved, and ↺ puts a color back. The preview follows your system's light or dark mode, or the site's own toggle.
      </p>
      {GROUPS.map(([group, label]) => (
        <fieldset key={group}>
          <legend>{label}</legend>
          <div className="tokens">
            {Object.entries(defaults[group]).map(([key, def]) => {
              const v = values[group]?.[key] ?? def;
              const changed = values[group]?.[key] !== undefined;
              return (
                <label key={key} className={`token${changed ? ' changed' : ''}`} title={notes[key]}>
                  <input type="color" value={v} onChange={(e) => set(group, key, e.target.value)} />
                  <span className="name">
                    {key}
                    <small>{notes[key]}</small>
                  </span>
                  <input className="hex" value={v} size={8} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && set(group, key, e.target.value)} />
                  <button type="button" disabled={!changed} onClick={() => set(group, key, null)} title={`Back to ${def}`}>
                    ↺
                  </button>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </main>
  );
});
