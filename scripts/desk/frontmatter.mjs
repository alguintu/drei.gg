// Front matter for posts: the subset they use, flat `key: value` plus one level
// of maps (cover:). Shared by the desk and its tests.

// Keys in the order we write them. Unknown keys are kept after these.
export const KEYS = ['title', 'date', 'tag', 'label', 'summary', 'series', 'layout', 'palette', 'cover', 'image', 'image_alt', 'project', 'draft'];

export function value(v) {
  v = v.trim();
  if (v === 'true' || v === 'false') return v === 'true';
  if (/^".*"$/.test(v)) return JSON.parse(v);
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

export function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  let map = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\s*)([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    if (kv[1] && map) map[kv[2]] = String(value(kv[3]));
    else if (!kv[1] && kv[3].trim() === '') map = data[kv[2]] = {};
    else if (!kv[1]) [map, data[kv[2]]] = [null, value(kv[3])];
  }
  return { data, body: m[2].replace(/^\r?\n/, '') };
}

// Plain YAML where it is safe, quoted where YAML would misread it.
export function scalar(v) {
  if (typeof v === 'boolean') return String(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const risky = /^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(s) || /:(\s|$)|\s#|\s$|\n/.test(s) || /^(true|false|yes|no|on|off|null|~)$/i.test(s) || /^[-+.\d][\d._eE+-]*$/.test(s);
  return risky ? JSON.stringify(s) : s;
}

export function stringify(data, body) {
  const keys = [...KEYS.filter((k) => k in data), ...Object.keys(data).filter((k) => !KEYS.includes(k))];
  const empty = (v) => v === '' || v === undefined || v === null;
  const lines = [];
  for (const k of keys) {
    const v = data[k];
    if (empty(v) || (k === 'draft' && v === false)) continue;
    if (typeof v !== 'object') lines.push(`${k}: ${scalar(v)}`);
    else {
      const entries = Object.entries(v).filter(([, x]) => !empty(x) && String(x).trim() !== '');
      if (entries.length) lines.push(`${k}:`, ...entries.map(([sk, x]) => `  ${sk}: ${scalar(String(x).trim())}`));
    }
  }
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '')}`;
}
