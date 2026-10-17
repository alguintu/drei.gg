import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import type { UiSchema, WidgetProps } from '@rjsf/utils';
import type { JSONSchema } from './api';

// Forms for blocks, built from each block's schema (src/blocks/schema.ts) by
// react-jsonschema-form. The schema's `widget` picks special inputs.

// A fresh block of a type: empty text, empty lists, the first choice.
export function blank(schema: JSONSchema): any {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === 'array') return [];
  if (schema.type === 'boolean') return true;
  if ((schema as any).pattern === '^\\d{4}-\\d{2}-\\d{2}$') return new Date().toISOString().slice(0, 10);
  if (schema.type === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, s] of Object.entries(schema.properties ?? {})) if (schema.required?.includes(k)) out[k] = blank(s);
    return out;
  }
  return '';
}

// Form layout from the schema: hide `type`, pick inputs by `widget`.
export function ui(schema: JSONSchema): UiSchema {
  const out: UiSchema = { 'ui:submitButtonOptions': { norender: true } };
  for (const [k, s] of Object.entries(schema.properties ?? {})) {
    if (k === 'type') out[k] = { 'ui:widget': 'hidden' };
    else if (s.widget === 'rich') out[k] = { 'ui:widget': 'textarea', 'ui:options': { rows: 2 }, 'ui:help': '==mark== *italic*' };
    else if (s.widget === 'long') out[k] = { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } };
    else if (s.widget === 'post') out[k] = { 'ui:widget': 'post' };
    else if (s.type === 'array' && s.items?.type === 'object') out[k] = { items: ui(s.items) };
  }
  return out;
}

export type PostRef = { id: string; title: string };

// Picks a post by title; the form context carries the list.
function PostWidget({ id, value, onChange, registry }: WidgetProps) {
  const posts: PostRef[] = (registry.formContext as any)?.posts ?? [];
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">pick a post…</option>
      {posts.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title}
        </option>
      ))}
    </select>
  );
}

export function BlockForm({ schema, data, idPrefix, posts = [], onChange }: { schema: JSONSchema; data: any; idPrefix: string; posts?: PostRef[]; onChange: (d: any) => void }) {
  return (
    <Form
      schema={schema as any}
      uiSchema={ui(schema)}
      formData={data}
      validator={validator}
      idPrefix={idPrefix}
      widgets={{ post: PostWidget }}
      formContext={{ posts }}
      noValidate
      showErrorList={false}
      onChange={(e) => onChange(e.formData)}
    />
  );
}
