// The desk server's API (scripts/desk.mjs).
export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(path, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

export const send = (path: string, method: string, data: unknown) =>
  api(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });

// Per-browser preferences: preview mode, width, the last thing open.
export const store = {
  get: (k: string, d: string) => {
    try {
      return localStorage.getItem('desk.' + k) ?? d;
    } catch {
      return d;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem('desk.' + k, v);
    } catch {}
  },
};

export type Meta = {
  image: string[];
  type: string[];
  palettes: string[];
  slots: Record<string, Record<string, string>>;
  blocks: { name: string; group: 'block' | 'frame' | 'inline'; md: string }[];
  tags: string[];
  site: string;
};

export type JSONSchema = {
  type?: string;
  title?: string;
  description?: string;
  widget?: string;
  const?: unknown;
  enum?: string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
};

export type BlocksMeta = { schemas: Record<string, JSONSchema>; templates: Record<string, string[]> };

export type Block = { type: string; [slot: string]: unknown };
export type PageData = { title: string; template: string; regions: Record<string, Block[]> };

// What's open: a post, a page, or nothing yet.
export type Open = { kind: 'post'; id: string } | { kind: 'page'; id: string } | { kind: 'theme'; id: 'theme' } | null;

