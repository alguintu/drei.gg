// npm run desk: a local post editor. It serves the editor on :4320, runs
// `astro dev` on :4321 for the live preview, and reads and writes the post
// files in src/content/posts directly. Publishing commits and pushes them.
// Local only: it listens on 127.0.0.1 and has no auth.
import { createServer } from 'node:http';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { readFile, writeFile, readdir, mkdir, rename, stat } from 'node:fs/promises';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src/content/posts');
const UI = join(ROOT, 'scripts/desk/index.html');
const DESK_PORT = Number(process.env.DESK_PORT || 4320);
const SITE_PORT = Number(process.env.SITE_PORT || 4321);
const run = promisify(execFile);

// Front matter keys in the order we write them. Unknown keys are kept after these.
const KEYS = ['title', 'date', 'tag', 'label', 'summary', 'layout', 'palette', 'kicker', 'image', 'image_alt', 'draft'];
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|webp|gif|avif|svg)$/i;

// ---- Front matter: the flat key: value subset our posts use ----

function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v === 'true' || v === 'false') v = v === 'true';
    else if (/^".*"$/.test(v)) v = JSON.parse(v);
    else if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'");
    data[kv[1]] = v;
  }
  return { data, body: m[2].replace(/^\r?\n/, '') };
}

// Plain YAML where it is safe, quoted where YAML would misread it.
function scalar(v) {
  if (typeof v === 'boolean') return String(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const risky = /^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(s) || /:(\s|$)|\s#|\s$|\n/.test(s) || /^(true|false|yes|no|on|off|null|~)$/i.test(s) || /^[-+.\d][\d._eE+-]*$/.test(s);
  return risky ? JSON.stringify(s) : s;
}

function stringify(data, body) {
  const keys = [...KEYS.filter((k) => k in data), ...Object.keys(data).filter((k) => !KEYS.includes(k))];
  const lines = keys.filter((k) => data[k] !== '' && data[k] !== undefined && data[k] !== null && !(k === 'draft' && data[k] === false)).map((k) => `${k}: ${scalar(data[k])}`);
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '')}`;
}

// ---- Posts on disk: either slug.md or slug/index.md ----

function fileFor(id) {
  if (!SLUG.test(id)) throw httpError(400, 'bad post id');
  const folder = join(POSTS, id, 'index.md');
  if (existsSync(folder)) return folder;
  const flat = join(POSTS, `${id}.md`);
  if (existsSync(flat)) return flat;
  throw httpError(404, 'no such post');
}

// Images live beside the post, so a flat post becomes a folder the first time it gets one.
async function folderFor(id) {
  const file = fileFor(id);
  if (file.endsWith('index.md')) return dirname(file);
  const dir = join(POSTS, id);
  await mkdir(dir, { recursive: true });
  await rename(file, join(dir, 'index.md'));
  return dir;
}

async function listPosts() {
  const out = [];
  for (const entry of await readdir(POSTS, { withFileTypes: true })) {
    let id, file;
    if (entry.isDirectory() && existsSync(join(POSTS, entry.name, 'index.md'))) [id, file] = [entry.name, join(POSTS, entry.name, 'index.md')];
    else if (entry.isFile() && entry.name.endsWith('.md')) [id, file] = [entry.name.slice(0, -3), join(POSTS, entry.name)];
    else continue;
    const { data } = parse(await readFile(file, 'utf8'));
    out.push({ id, title: data.title ?? id, date: String(data.date ?? ''), tag: data.tag ?? '', draft: data.draft === true });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

async function images(id) {
  const file = fileFor(id);
  if (!file.endsWith('index.md')) return [];
  return (await readdir(dirname(file))).filter((f) => FILE.test(f));
}

// Layout and palette names come straight from src/lib/cover.ts so the editor never drifts.
async function meta() {
  const src = await readFile(join(ROOT, 'src/lib/cover.ts'), 'utf8');
  const list = (name) => [...(src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\]`))?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  return { image: list('LAYOUTS'), type: list('TYPE_LAYOUTS'), palettes: list('PALETTES'), tags: ['ship', 'build', 'rant', 'dead'], site: `http://localhost:${SITE_PORT}` };
}

function slugify(title) {
  return title.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'post';
}

async function git(...args) {
  const { stdout, stderr } = await run('git', args, { cwd: ROOT });
  return (stdout + stderr).trim();
}

// ---- HTTP ----

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

const routes = {
  'GET /api/meta': () => meta(),
  'GET /api/posts': () => listPosts(),
  'GET /api/post': async (q) => {
    const id = q.get('id');
    const { data, body } = parse(await readFile(fileFor(id), 'utf8'));
    return { id, data, body, images: await images(id) };
  },
  'PUT /api/post': async (q, req) => {
    const id = q.get('id');
    const { data, body: text } = JSON.parse(await body(req));
    await writeFile(fileFor(id), stringify(data, text));
    return { ok: true };
  },
  'POST /api/new': async (q, req) => {
    const { title, tag = 'build' } = JSON.parse(await body(req));
    if (!title?.trim()) throw httpError(400, 'title required');
    let id = slugify(title);
    while (existsSync(join(POSTS, id)) || existsSync(join(POSTS, `${id}.md`))) id += '-2';
    await mkdir(join(POSTS, id), { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    await writeFile(join(POSTS, id, 'index.md'), stringify({ title: title.trim(), date, tag, draft: true }, 'Write here.\n'));
    return { id };
  },
  'PUT /api/upload': async (q, req) => {
    const id = q.get('id');
    const name = q.get('name').replace(/\s+/g, '-');
    if (!FILE.test(name)) throw httpError(400, 'images only: png, jpg, webp, gif, avif, svg');
    const dir = await folderFor(id);
    await writeFile(join(dir, name), await body(req));
    return { name, images: await images(id) };
  },
  'GET /api/status': async () => ({ branch: await git('branch', '--show-current'), changes: await git('status', '--short', '--', 'src/content/posts') }),
  'POST /api/publish': async (q, req) => {
    const { id, message } = JSON.parse(await body(req));
    const target = id ? (fileFor(id).endsWith('index.md') ? join('src/content/posts', id) : join('src/content/posts', `${id}.md`)) : 'src/content/posts';
    const log = [];
    log.push(await git('add', '-A', '--', target));
    const staged = await git('diff', '--cached', '--name-only');
    if (!staged) return { log: 'Nothing to publish.' };
    log.push(await git('commit', '-m', message || 'Update post'));
    try {
      log.push(await git('push'));
    } catch (e) {
      log.push(String(e.stderr || e.message).trim(), 'Committed locally; push failed.');
    }
    return { log: log.filter(Boolean).join('\n') };
  },
};

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(await readFile(UI));
    }
    // Post images, for thumbnails in the editor.
    const img = url.pathname.match(/^\/img\/([a-z0-9-]+)\/([^/]+)$/);
    if (req.method === 'GET' && img) {
      if (!SLUG.test(img[1]) || !FILE.test(img[2])) throw httpError(400, 'bad path');
      const p = join(POSTS, img[1], img[2]);
      await stat(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] ?? 'application/octet-stream' });
      return res.end(await readFile(p));
    }
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) throw httpError(404, 'not found');
    const out = await handler(url.searchParams, req);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out));
  } catch (e) {
    res.writeHead(e.status || (e.code === 'ENOENT' ? 404 : 500), { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(DESK_PORT, '127.0.0.1', () => {
  console.log(`\n  desk     http://localhost:${DESK_PORT}\n  preview  http://localhost:${SITE_PORT}\n`);
});

// The preview is the real site in dev mode, so drafts show and saves hot-reload.
// Outside a terminal Astro may move its dev server to the background, so on the
// way out we also ask it to stop.
if (!process.env.DESK_NO_SITE) {
  const site = spawn('npx', ['astro', 'dev', '--port', String(SITE_PORT)], { cwd: ROOT, stdio: 'inherit' });
  let quitting = false;
  const stop = async () => {
    quitting = true;
    site.kill();
    await run('npx', ['astro', 'dev', 'stop'], { cwd: ROOT }).catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  site.on('exit', (code) => {
    if (quitting) return;
    if (code) process.exit(code);
    console.log('  (astro dev moved to the background; Ctrl+C here stops both)');
  });
}
