import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import type { UiSchema } from '@rjsf/utils';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, send, type Block, type BlocksMeta, type JSONSchema, type PageData } from './api';
import type { EditorHandle, EditorProps } from './App';

// A page made of blocks (src/content/pages/<id>.json). Each region of the
// page's template is a list of blocks: drag to reorder, add from the block
// types, remove, and edit the selected block's slots in a form built from its
// schema (src/blocks/schema.ts).

// A fresh block of a type: empty text, empty lists, the first choice.
function blank(schema: JSONSchema): any {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === 'array') return [];
  if ((schema as any).pattern === '^\\d{4}-\\d{2}-\\d{2}$') return new Date().toISOString().slice(0, 10);
  if (schema.type === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, s] of Object.entries(schema.properties ?? {})) if (schema.required?.includes(k)) out[k] = blank(s);
    return out;
  }
  return '';
}

// Form layout from the schema: hide `type`, give rich text a textarea.
function ui(schema: JSONSchema): UiSchema {
  const out: UiSchema = { 'ui:submitButtonOptions': { norender: true } };
  for (const [k, s] of Object.entries(schema.properties ?? {})) {
    if (k === 'type') out[k] = { 'ui:widget': 'hidden' };
    else if (s.widget === 'rich') out[k] = { 'ui:widget': 'textarea', 'ui:options': { rows: 2 }, 'ui:help': '==mark== *italic*' };
    else if (s.type === 'array' && s.items?.type === 'object') out[k] = { items: ui(s.items) };
  }
  return out;
}

// A one-line summary of a block for its card: its first bit of text.
function gist(block: Block) {
  for (const [k, v] of Object.entries(block)) if (k !== 'type' && typeof v === 'string' && v) return v.replace(/==|\*/g, '');
  return '';
}

const idFor = (region: string, i: number) => `b_${region}_${i}`;

function Card({ id, title, gist, selected, onSelect, onRemove, regions, region, onMove, children }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} className={`bcard${selected ? ' sel' : ''}${isDragging ? ' drag' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className="bhead">
        <span className="grip" {...attributes} {...listeners} title="Drag to reorder">
          ⋮⋮
        </span>
        <button type="button" className="bname" onClick={onSelect}>
          <b>{title}</b> <span>{gist}</span>
        </button>
        {regions.length > 1 && (
          <select value={region} onChange={(e) => onMove(e.target.value)} title="Move to region">
            {regions.map((r: string) => <option key={r}>{r}</option>)}
          </select>
        )}
        <button type="button" onClick={onRemove} title="Remove block">
          ×
        </button>
      </div>
      {selected && <div className="bform">{children}</div>}
    </div>
  );
}

export default forwardRef<EditorHandle, EditorProps & { id: string; blocks: BlocksMeta; setPath: (p: string) => void; onPick: (path: string | null) => void }>(function PageEditor(
  { id, blocks, setPath, onState, onSaved, onPick },
  ref,
) {
  const [page, setPage] = useState<PageData | null>(null);
  const [sel, setSel] = useState<{ region: string; index: number } | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const timer = useRef(0);
  const current = useRef<PageData | null>(null);
  current.current = page;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    let live = true;
    api<{ data: PageData }>('/api/page?id=' + id).then((r) => live && setPage(r.data));
    setSel(null);
    // The home page previews at /; the frame shows on whatever page is up; others at /<id>/.
    if (id === 'home') setPath('/');
    else if (id !== 'frame') setPath(`/${id}/`);
    return () => {
      live = false;
    };
  }, [id]);

  // The preview outlines whichever block is open here.
  useEffect(() => onPick(sel ? `${id}:regions.${sel.region}.${sel.index}` : null), [id, sel?.region, sel?.index]);

  // A field picked in the preview: focus its input once the form is up.
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(focus) as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFocus(null);
  });

  async function save() {
    clearTimeout(timer.current);
    timer.current = 0;
    if (!current.current) return;
    try {
      await send('/api/page?id=' + id, 'PUT', current.current);
      onState('saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      onSaved();
    } catch (e: any) {
      onState('save failed: ' + e.message, 'err');
    }
  }

  function change(fn: (p: PageData) => PageData, delay = 700) {
    setPage((p) => {
      const next = p ? fn(structuredClone(p)) : p;
      current.current = next;
      return next;
    });
    onState('unsaved', 'dirty');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(save, delay);
  }

  // "home:regions.top.0.senses.1.text" → region top, block 0, field senses.1.text
  function locate(path: string) {
    const [pid, rest] = path.split(':');
    if (pid !== id) return null;
    const [, region, index, ...field] = rest.split('.');
    return { region, index: Number(index), field };
  }

  useImperativeHandle(ref, () => ({
    flush: async () => {
      if (timer.current) await save();
    },
    select: (path) => {
      const at = locate(path);
      if (!at) return;
      setSel({ region: at.region, index: at.index });
      setFocus(at.field.length ? [idFor(at.region, at.index), ...at.field].join('_') : null);
      if (!at.field.length) setTimeout(() => document.getElementById(idFor(at.region, at.index))?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    },
    apply: (path, value) => {
      const at = locate(path);
      if (!at) return;
      change((p) => {
        let obj: any = p.regions[at.region][at.index];
        const keys = [...at.field];
        const last = keys.pop()!;
        for (const k of keys) obj = obj[k];
        obj[last] = value;
        return p;
      }, 0);
    },
  }));

  if (!page) return <main className="empty">loading…</main>;

  const regions = blocks.templates[page.template] ?? Object.keys(page.regions);
  const types = Object.entries(blocks.schemas);

  function onDragEnd(region: string, e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = page!.regions[region].map((_, i) => idFor(region, i));
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    change((p) => ({ ...p, regions: { ...p.regions, [region]: arrayMove(p.regions[region], from, to) } }));
    if (sel?.region === region) setSel({ region, index: arrayMove(ids.map((_, i) => i), from, to).indexOf(sel.index) });
  }

  return (
    <main>
      <input className="title" value={page.title} onChange={(e) => change((p) => ({ ...p, title: e.target.value }))} />
      <p className="hint">
        {id === 'frame' ? 'The header and footer every page shares.' : `A page made of blocks, template "${page.template}".`} Click anything in the preview to edit it here; double-click plain text to edit it in place.
      </p>
      {regions.map((region) => {
        const list = page.regions[region] ?? [];
        return (
          <fieldset key={region} className="region">
            <legend>{region}</legend>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd(region, e)}>
              <SortableContext items={list.map((_, i) => idFor(region, i))} strategy={verticalListSortingStrategy}>
                {list.map((block, i) => {
                  const schema = blocks.schemas[block.type];
                  const selected = sel?.region === region && sel.index === i;
                  return (
                    <div key={idFor(region, i)} id={idFor(region, i)}>
                      <Card
                        id={idFor(region, i)}
                        title={schema?.title ?? block.type}
                        gist={gist(block)}
                        selected={selected}
                        regions={regions}
                        region={region}
                        onSelect={() => setSel(selected ? null : { region, index: i })}
                        onRemove={() => {
                          if (!confirm(`Remove this ${schema?.title ?? block.type} block?`)) return;
                          setSel(null);
                          change((p) => ({ ...p, regions: { ...p.regions, [region]: p.regions[region].filter((_, j) => j !== i) } }));
                        }}
                        onMove={(to: string) => {
                          setSel(null);
                          change((p) => {
                            const [b] = p.regions[region].splice(i, 1);
                            (p.regions[to] ??= []).push(b);
                            return p;
                          });
                        }}
                      >
                        {schema && (
                          <Form
                            schema={schema as any}
                            uiSchema={ui(schema)}
                            formData={block}
                            validator={validator}
                            idPrefix={idFor(region, i)}
                            noValidate
                            showErrorList={false}
                            onChange={(e) => change((p) => {
                              p.regions[region][i] = e.formData;
                              return p;
                            })}
                          />
                        )}
                      </Card>
                    </div>
                  );
                })}
              </SortableContext>
            </DndContext>
            <select
              className="add"
              value=""
              onChange={(e) => {
                const type = e.target.value;
                if (!type) return;
                change((p) => {
                  (p.regions[region] ??= []).push(blank(blocks.schemas[type]));
                  return p;
                });
                setSel({ region, index: list.length });
              }}
            >
              <option value="">+ add a block…</option>
              {types.map(([type, s]) => (
                <option key={type} value={type}>
                  {s.title ?? type}
                  {s.description ? ` · ${s.description}` : ''}
                </option>
              ))}
            </select>
          </fieldset>
        );
      })}
    </main>
  );
});
