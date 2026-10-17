// npm run desk: a local editor for posts and pages. It builds the editor (a small
// React app in scripts/desk/app) and serves it on :4320, runs `astro dev` on :4321
// for the live preview, and reads and writes the files in src/content directly.
// Publishing commits and pushes them. Local only: it listens on 127.0.0.1 and has no auth.
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { readFile, writeFile, readdir, mkdir, rename, stat, rm } from 'node:fs/promises';
import { join, dirname, extname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, stringify } from './desk/frontmatter.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src/content/posts');
const APP = join(ROOT, 'scripts/desk/app');
const UI = join(ROOT, 'scripts/desk/dist');
const PAGES = join(ROOT, 'src/content/pages');
// Images for pages, served as-is at /media/<name>.
const MEDIA = join(ROOT, 'public/media');
// Social cards: public/og/<post>.jpg, and site.jpg for everything else.
const OG = join(ROOT, 'public/og');
const THEME_FILE = join(ROOT, 'src/data/theme.json');
const DESK_PORT = Number(process.env.DESK_PORT || 4320);
const SITE_PORT = Number(process.env.SITE_PORT || 4321);
const run = promisify(execFile);

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|webp|gif|avif|svg)$/i;

// Front matter reading and writing: scripts/desk/frontmatter.mjs.

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
    out.push({ id, title: data.title ?? id, date: String(data.date ?? ''), tag: data.tag ?? '', series: data.series || undefined, draft: data.draft === true });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

async function images(id) {
  const file = fileFor(id);
  if (!file.endsWith('index.md')) return [];
  return (await readdir(dirname(file))).filter((f) => FILE.test(f));
}

// Layouts, palettes and text slots come straight from src/lib/cover.ts so the editor never
// drifts. Node strips its types; the file's mtime busts the import cache after an edit.
async function cover() {
  const file = join(ROOT, 'src/lib/cover.ts');
  return import(`${pathToFileURL(file)}?v=${(await stat(file)).mtimeMs}`);
}

// Fresh imports of the site's own TypeScript, so edits show without restarting.
async function load(rel) {
  const file = join(ROOT, rel);
  return import(`${pathToFileURL(file)}?v=${(await stat(file)).mtimeMs}`);
}

// The blocks the toolbar inserts, from src/lib/blocks.ts (the catalog page shows the same list).
const blocks = async () => (await load('src/lib/blocks.ts')).BLOCKS;

// Page blocks, from src/blocks/schema.ts: each block type's slots as JSON Schema,
// which the editor turns into forms, plus the templates' regions.
async function pageBlocks() {
  const { BLOCKS, TEMPLATES } = await load('src/blocks/schema.ts');
  const { z } = await import('astro/zod');
  // Defaults, so a new list item in a form starts as '' rather than null.
  const fill = (s) => {
    if (s.type === 'string' && s.default === undefined && s.const === undefined) s.default = s.enum?.[0] ?? '';
    for (const p of Object.values(s.properties ?? {})) fill(p);
    if (s.items) fill(s.items);
    return s;
  };
  const schemas = Object.fromEntries(Object.entries(BLOCKS).map(([type, schema]) => [type, fill(z.toJSONSchema(schema, { target: 'draft-7' }))]));
  return { schemas, templates: TEMPLATES };
}

function pageFile(id) {
  if (!SLUG.test(id)) throw httpError(400, 'bad page id');
  return join(PAGES, `${id}.json`);
}

async function meta() {
  const c = await cover();
  return { image: [...c.LAYOUTS], type: [...c.TYPE_LAYOUTS], palettes: [...c.PALETTES], slots: c.SLOTS, blocks: await blocks(), tags: ['ship', 'build', 'rant', 'dead'], site: `http://localhost:${SITE_PORT}` };
}

// ---- Social cards ----
// Screenshots of each post's cover (src/pages/desk/og) and of the home page's top,
// taken with Chrome or Chromium on this machine through playwright-core.
const CHROMES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];

async function cards(ids, site = false) {
  const executablePath = CHROMES.find((p) => p && existsSync(p));
  if (!executablePath) throw httpError(500, 'no Chrome or Chromium found for social cards; set CHROME_PATH');
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath });
  const made = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, colorScheme: 'dark' });
    await mkdir(OG, { recursive: true });
    const shoot = async (url, name) => {
      await page.goto(`http://127.0.0.1:${SITE_PORT}${url}`, { waitUntil: 'networkidle' });
      // No dev toolbar, and everything at rest (the wordmark's dot blinks); fonts loaded.
      await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; } *, *::before, *::after { animation: none !important; transition: none !important; }' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(OG, name), type: 'jpeg', quality: 88 });
      made.push(`public/og/${name}`);
    };
    for (const id of ids) await shoot(`/desk/og/${id}/`, `${id}.jpg`);
    if (site) await shoot('/', 'site.jpg');
  } finally {
    await browser.close();
  }
  return made;
}

// The one file that holds a post, page or the theme, for its history.
function versioned(kind, id) {
  if (kind === 'theme') return THEME_FILE;
  if (kind === 'page') return pageFile(id);
  return fileFor(id);
}

// Every commit that touched it, with the path it had then (posts can move from
// slug.md to slug/index.md).
async function versions(kind, id) {
  const file = relative(ROOT, versioned(kind, id));
  const out = await git('log', '--follow', '--name-only', '--format=%x00%H\t%aI\t%s', '--', file).catch(() => '');
  return out
    .split('\0')
    .filter((c) => c.trim())
    .map((c) => {
      const [head, ...rest] = c.trim().split('\n');
      const [rev, date, message] = head.split('\t');
      return { rev, date, message, path: rest.map((l) => l.trim()).find(Boolean) ?? file };
    });
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
    // What "auto" resolves to, with and without an image, so the editor can show that layout's slots.
    const { pickCover } = await cover();
    const auto = { image: pickCover({ id, hasImage: true }).layout, none: pickCover({ id, hasImage: false }).layout };
    return { id, data, body, auto, images: await images(id) };
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
  // Pages made of blocks (src/content/pages). Saves are checked against the same
  // zod schema the site builds with, so the desk can't write a page that won't build.
  'GET /api/blocks': () => pageBlocks(),
  'GET /api/pages': async () => {
    const out = [];
    for (const f of (await readdir(PAGES)).filter((f) => f.endsWith('.json')).sort()) {
      const data = JSON.parse(await readFile(join(PAGES, f), 'utf8'));
      out.push({ id: f.slice(0, -5), title: data.title, template: data.template, draft: data.draft === true });
    }
    return out;
  },
  'POST /api/pages': async (q, req) => {
    const { title, kind = 'plain' } = JSON.parse(await body(req));
    if (!title?.trim()) throw httpError(400, 'title required');
    const { RESERVED } = await load('src/blocks/schema.ts');
    let id = slugify(title);
    while (RESERVED.includes(id) || existsSync(join(PAGES, `${id}.json`))) id += '-2';
    const name = title.trim();
    // A plain page starts with a heading and text; a project page with the project's
    // header, some text, and a log of the posts filed under it.
    const main =
      kind === 'project'
        ? [
            { type: 'project', name, status: 'building', pitch: 'What it is, in a line.', links: [] },
            { type: 'prose', markdown: 'Write here.' },
            { type: 'postlist', label: 'Log', tag: '', count: 20, style: 'rows', project: id },
          ]
        : [{ type: 'heading', kicker: '', title: name }, { type: 'prose', markdown: 'Write here.' }];
    const data = { title: name, template: 'basic', regions: { main } };
    await writeFile(join(PAGES, `${id}.json`), JSON.stringify(data, null, 2) + '\n');
    return { id };
  },
  // Only pages made in the desk can go; the home page, frame and post template stay.
  'DELETE /api/page': async (q) => {
    const id = q.get('id');
    const data = JSON.parse(await readFile(pageFile(id), 'utf8'));
    if (data.template !== 'basic') throw httpError(400, 'only basic pages can be deleted');
    await rm(pageFile(id));
    return { ok: true };
  },
  // Make social cards now: ?id=<post>, or ?site=1 for the site card, or neither for all.
  'POST /api/cards': async (q) => {
    const id = q.get('id');
    if (id) fileFor(id); // a real post, and a safe name for the card's file
    const ids = id ? [id] : q.get('site') ? [] : (await listPosts()).map((p) => p.id);
    return { made: await cards(ids, !id) };
  },
  // The site's colors: defaults from src/lib/theme.ts, changes in src/data/theme.json.
  'GET /api/theme': async () => {
    const { THEME, NOTES } = await load('src/lib/theme.ts');
    return { defaults: THEME, notes: NOTES, values: JSON.parse(await readFile(THEME_FILE, 'utf8')) };
  },
  'PUT /api/theme': async (q, req) => {
    const { THEME } = await load('src/lib/theme.ts');
    const values = JSON.parse(await body(req));
    // Only known tokens, only #rrggbb, and only where they differ from the default.
    const clean = {};
    for (const [group, tokens] of Object.entries(THEME)) {
      for (const [k, def] of Object.entries(tokens)) {
        const v = values[group]?.[k];
        if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) && v.toLowerCase() !== def.toLowerCase()) (clean[group] ??= {})[k] = v.toLowerCase();
      }
    }
    await writeFile(THEME_FILE, JSON.stringify(clean, null, 2) + '\n');
    return { ok: true, values: clean };
  },
  'GET /api/media': async () => (existsSync(MEDIA) ? (await readdir(MEDIA)).filter((f) => FILE.test(f)).map((f) => `/media/${f}`) : []),
  'PUT /api/media': async (q, req) => {
    const name = q.get('name').replace(/\s+/g, '-');
    if (!FILE.test(name)) throw httpError(400, 'images only: png, jpg, webp, gif, avif, svg');
    await mkdir(MEDIA, { recursive: true });
    await writeFile(join(MEDIA, name), await body(req));
    return { url: `/media/${name}` };
  },
  'GET /api/page': async (q) => ({ id: q.get('id'), data: JSON.parse(await readFile(pageFile(q.get('id')), 'utf8')) }),
  'PUT /api/page': async (q, req) => {
    const data = JSON.parse(await body(req));
    const { Page } = await load('src/blocks/schema.ts');
    const check = Page.safeParse(data);
    if (!check.success) throw httpError(400, check.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    await writeFile(pageFile(q.get('id')), JSON.stringify(data, null, 2) + '\n');
    return { ok: true };
  },
  // Back to the last commit: a post's folder or file, or a page's JSON. Files added
  // since (new uploads) stay; a post or page that was never committed can't go back.
  'POST /api/discard': async (q, req) => {
    const { kind, id } = JSON.parse(await body(req));
    const target = kind === 'theme' ? relative(ROOT, THEME_FILE) : kind === 'page' ? relative(ROOT, pageFile(id)) : fileFor(id).endsWith('index.md') ? join('src/content/posts', id) : join('src/content/posts', `${id}.md`);
    if (!(await git('ls-files', '--', target))) throw httpError(400, 'never published, so there is nothing to go back to');
    await git('checkout', 'HEAD', '--', target);
    return { ok: true };
  },
  // Published versions of a post, page or the theme, newest first, from git.
  'GET /api/history': async (q) => (await versions(q.get('kind'), q.get('id'))).map(({ path, ...v }) => v),
  // One of those versions, read the way the editor reads the current one.
  'GET /api/version': async (q) => {
    const kind = q.get('kind');
    const v = (await versions(kind, q.get('id'))).find((v) => v.rev === q.get('rev'));
    if (!v) throw httpError(404, 'no such version');
    const text = await git('show', `${v.rev}:${v.path}`);
    return kind === 'post' ? parse(text) : JSON.parse(text);
  },
  'GET /api/status': async () => ({ branch: await git('branch', '--show-current'), changes: await git('status', '--short', '--', 'src/content/posts', 'src/content/pages', 'src/data', 'public/media', 'public/og') }),
  'POST /api/publish': async (q, req) => {
    const { id, page, theme, message } = JSON.parse(await body(req));
    // A page goes with any images uploaded for pages.
    const target = theme ? [relative(ROOT, THEME_FILE)] : page ? [relative(ROOT, pageFile(page)), ...(existsSync(MEDIA) ? ['public/media'] : [])] : id ? (fileFor(id).endsWith('index.md') ? join('src/content/posts', id) : join('src/content/posts', `${id}.md`)) : 'src/content';
    const log = [];
    // Only publish what builds: a real production build of the site first.
    try {
      await run('npx', ['astro', 'build'], { cwd: ROOT, env: { ...process.env, NODE_ENV: 'production' }, maxBuffer: 1 << 24 });
      log.push('build: ok');
    } catch (e) {
      const out = String((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-25).join('\n');
      throw httpError(400, `The site doesn't build, so nothing was published:\n\n${out}`);
    }
    // A post's social card is retaken with it; the home page and frame retake the site card.
    // A missing Chrome shouldn't block publishing, so a failure is only noted.
    try {
      const made = id ? await cards([id]) : page === 'home' || page === 'frame' || theme ? await cards([], true) : [];
      target.push?.(...made);
      if (made.length && !Array.isArray(target)) log.push(await git('add', '--', ...made));
      if (made.length) log.push(`social card: ${made.join(', ')}`);
    } catch (e) {
      log.push(`social card skipped: ${e.message}`);
    }
    // Commit only this post or page (and its card or images), never whatever else
    // happens to be staged.
    const paths = [target].flat();
    log.push(await git('add', '-A', '--', ...paths));
    const staged = await git('diff', '--cached', '--name-only', '--', ...paths);
    if (!staged) return { log: 'Nothing to publish.' };
    log.push(await git('commit', '-m', message || 'Update post', '--', ...paths));
    try {
      log.push(await git('push'));
    } catch (e) {
      log.push(String(e.stderr || e.message).trim(), 'Committed locally; push failed.');
    }
    return { log: log.filter(Boolean).join('\n') };
  },
};

// ---- Preview proxy ----
// The split preview loads the site through the desk, so the editor can reach into
// the frame: it keeps the scroll position and swaps in each new render only once
// it has loaded, instead of letting Astro blank the page on every save. This
// script, added to proxied pages, hands Astro's full-page reloads to the editor
// when the page sits in its frame. The popup talks to Astro directly.
const HOOK = `<script>if (parent !== window) { const W = window.WebSocket; window.WebSocket = class extends W {
  addEventListener(type, fn, opts) {
    super.addEventListener(type, type !== 'message' ? fn : (e) => {
      try { if (JSON.parse(e.data).type === 'full-reload') return parent.postMessage({ desk: 'reload' }, location.origin); } catch {}
      fn(e);
    }, opts);
  }
}; }</script>`;

function proxy(req, res) {
  const up = request({ host: '127.0.0.1', port: SITE_PORT, path: req.url, method: req.method, headers: { ...req.headers, 'accept-encoding': 'identity' } }, (r) => {
    if (!String(r.headers['content-type']).startsWith('text/html')) {
      res.writeHead(r.statusCode, r.headers);
      return r.pipe(res);
    }
    const chunks = [];
    r.on('data', (c) => chunks.push(c));
    r.on('end', () => {
      const html = Buffer.concat(chunks).toString('utf8').replace(/<head[^>]*>/i, (m) => m + HOOK);
      const headers = { ...r.headers };
      delete headers['content-length'];
      res.writeHead(r.statusCode, headers);
      res.end(html);
    });
  });
  up.on('error', () => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('The preview is not running yet. It starts with the desk; give it a few seconds.');
  });
  req.pipe(up);
}

// Astro's hot reload runs over a WebSocket; pass it straight through.
function tunnel(req, socket, head) {
  const up = connect(SITE_PORT, '127.0.0.1', () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    up.write(lines.join('\r\n') + '\r\n\r\n');
    up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
}

const ASSET_TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml' };

// The desk has no login, so it only answers to itself. A web page open in the
// same browser could otherwise send it requests (a plain POST needs no CORS
// preflight), and a DNS-rebound name could pose as localhost. So: the Host must
// be this machine, and a request from a page must come from the desk's own origin.
const LOCAL = new Set([`localhost:${DESK_PORT}`, `127.0.0.1:${DESK_PORT}`, `[::1]:${DESK_PORT}`]);
function trusted(req) {
  if (!LOCAL.has(req.headers.host ?? '')) return false;
  const origin = req.headers.origin;
  if (origin && !LOCAL.has(origin.replace(/^https?:\/\//, ''))) return false;
  return req.headers['sec-fetch-site'] !== 'cross-site';
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!trusted(req)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    return res.end('The desk only answers to itself.');
  }
  try {
    // The editor lives at /; the same path inside the preview frame is the site's home page.
    const inFrame = req.headers['sec-fetch-dest'] === 'iframe';
    if (req.method === 'GET' && !inFrame && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(await readFile(join(UI, 'index.html')));
    }
    // The editor's own scripts and styles, built by Vite under /__desk/.
    const asset = url.pathname.match(/^\/__desk\/(assets\/[\w.-]+)$/);
    if (req.method === 'GET' && asset) {
      const p = join(UI, asset[1]);
      res.writeHead(200, { 'content-type': ASSET_TYPES[extname(p)] ?? 'application/octet-stream', 'cache-control': 'max-age=31536000, immutable' });
      return res.end(await readFile(p));
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
    if (!url.pathname.startsWith('/api/')) return proxy(req, res);
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) throw httpError(404, 'not found');
    const out = await handler(url.searchParams, req);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out));
  } catch (e) {
    res.writeHead(e.status || (e.code === 'ENOENT' ? 404 : 500), { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});
server.on('upgrade', (req, socket, head) => (trusted(req) ? tunnel(req, socket, head) : socket.destroy()));

// Build the editor before serving it. It's small; this takes a second or two.
const { build } = await import('vite');
await build({ configFile: join(ROOT, 'scripts/desk/vite.config.mjs'), logLevel: 'warn' });

server.listen(DESK_PORT, '127.0.0.1', () => {
  console.log(`\n  desk     http://localhost:${DESK_PORT}\n  preview  http://localhost:${SITE_PORT}\n`);
});

// The preview is the real site in dev mode, so drafts show and saves hot-reload.
// Outside a terminal Astro may move its dev server to the background, so on the
// way out we also ask it to stop. It binds 127.0.0.1 because the preview proxy
// connects there; on its own, localhost can resolve to ::1 only.
if (!process.env.DESK_NO_SITE) {
  // Astro keeps parsed content between runs; after a block schema changes it can
  // serve stale data, so the preview starts from the files every time.
  await rm(join(ROOT, '.astro/data-store.json'), { force: true });
  // Building the editor set NODE_ENV=production in this process; the preview is dev.
  const env = { ...process.env, NODE_ENV: 'development' };
  const site = spawn('npx', ['astro', 'dev', '--host', '127.0.0.1', '--port', String(SITE_PORT)], { cwd: ROOT, stdio: 'inherit', env });
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
