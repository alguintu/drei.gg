// npm run desk:mcp — the desk as an MCP server (stdio), so an agent can write
// posts and build pages the way the desk does: read and write content, add and
// move blocks, insert post blocks, set covers, look at the preview, publish.
//
// It talks to the running desk (npm run desk) over its local API, so every write
// goes through the same checks: pages are validated against the block schemas,
// and publish refuses anything that doesn't build. Local only, like the desk.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { IMAGE, markdown } from '../src/lib/post-blocks.mjs';

const DESK = `http://127.0.0.1:${process.env.DESK_PORT || 4320}`;
const SITE = `http://127.0.0.1:${process.env.SITE_PORT || 4321}`;

async function api(path, opts = {}) {
  let r;
  try {
    r = await fetch(DESK + path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers ?? {}) } });
  } catch {
    throw new Error('The desk is not running. Start it with `npm run desk` in the drei.gg repo, then try again.');
  }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
// When this server last changed a file: the preview needs a moment to pick it up.
let wrote = 0;
const put = (path, data) => ((wrote = Date.now()), api(path, { method: 'PUT', body: JSON.stringify(data) }));
const post = (path, data = {}) => ((wrote = Date.now()), api(path, { method: 'POST', body: JSON.stringify(data) }));

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
// Each tool's errors come back as a readable message rather than a crash.
const tool = (fn) => async (args) => {
  try {
    return await fn(args);
  } catch (e) {
    return { ...text(String(e.message || e)), isError: true };
  }
};

const server = new McpServer({ name: 'drei-desk', version: '0.1.0' });

server.registerTool(
  'desk_status',
  {
    title: 'Desk status',
    description: 'The branch, uncommitted content changes, and every post and page. Start here.',
    inputSchema: {},
  },
  tool(async () => {
    const [status, posts, pages] = await Promise.all([api('/api/status'), api('/api/posts'), api('/api/pages')]);
    return text({ ...status, posts, pages, preview: SITE });
  }),
);

server.registerTool(
  'block_types',
  {
    title: 'Block types',
    description:
      'Every block type with its JSON Schema (slots, titles, descriptions), the page templates and their regions, example data for post blocks, and the cover layouts, palettes and per-layout cover text slots. Read this before writing pages or post blocks.',
    inputSchema: {},
  },
  tool(async () => {
    const [blocks, meta] = await Promise.all([api('/api/blocks'), api('/api/meta')]);
    return text({ ...blocks, covers: { image_layouts: meta.image, type_layouts: meta.type, palettes: meta.palettes, slots: meta.slots }, tags: meta.tags });
  }),
);

// ---- Posts ----

server.registerTool(
  'read_post',
  {
    title: 'Read a post',
    description: 'A post: its front matter (title, date, tag, label, summary, draft, layout, palette, cover text, image), Markdown body, images in its folder, and the cover layout "auto" resolves to.',
    inputSchema: { id: z.string().describe('The post id (its folder or file name), from desk_status.') },
  },
  tool(async ({ id }) => text(await api('/api/post?id=' + encodeURIComponent(id)))),
);

server.registerTool(
  'new_post',
  {
    title: 'New post',
    description: 'Starts a draft post from a title and returns its id. Drafts show in the preview, never on the live site.',
    inputSchema: { title: z.string(), tag: z.enum(['ship', 'build', 'rant', 'dead']).default('build') },
  },
  tool(async ({ title, tag }) => text(await post('/api/new', { title, tag }))),
);

server.registerTool(
  'write_post',
  {
    title: 'Write a post',
    description:
      'Updates a post. `data` merges into the front matter (send only the fields to change; a field set to "" is removed; `cover` replaces the cover text map). `body` replaces the whole Markdown body. Set draft: false to make it publishable.',
    inputSchema: {
      id: z.string(),
      data: z.record(z.string(), z.any()).optional().describe('Front matter fields to change.'),
      body: z.string().optional().describe('The full new Markdown body.'),
    },
  },
  tool(async ({ id, data = {}, body }) => {
    const [cur, meta] = await Promise.all([api('/api/post?id=' + encodeURIComponent(id)), api('/api/meta')]);
    // The fields the site's schema restricts, checked here so a bad value can't break the build.
    const allowed = { layout: [...meta.image, ...meta.type], palette: meta.palettes, tag: meta.tags };
    for (const [k, list] of Object.entries(allowed)) {
      if (data[k] && !list.includes(data[k])) throw new Error(`${k} must be one of: ${list.join(', ')}`);
    }
    if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('date must be YYYY-MM-DD');
    const merged = { ...cur.data, ...data };
    for (const [k, v] of Object.entries(merged)) if (v === '' || v === null) delete merged[k];
    await put('/api/post?id=' + encodeURIComponent(id), { data: merged, body: body ?? cur.body });
    return text(`Saved ${id}. Preview: ${SITE}/log/${id}/`);
  }),
);

server.registerTool(
  'insert_post_block',
  {
    title: 'Insert a post block',
    description:
      'Adds a post block (callout, aeris, pull, bignum, shout, tape, notes, or a framed image) to a post body, written as the Markdown the site expects. `data` is the block\'s slots per block_types (e.g. callout: {heading, body}; notes: {items: [{kind, text}]}; image: {src, alt, frame, caption}). Goes at the end unless `after_line` (1-based line of the body) is given.',
    inputSchema: {
      id: z.string(),
      type: z.enum(['callout', 'aeris', 'pull', 'bignum', 'shout', 'tape', 'notes', 'image']),
      data: z.record(z.string(), z.any()),
      after_line: z.number().int().min(0).optional(),
    },
  },
  tool(async ({ id, type, data, after_line }) => {
    const cur = await api('/api/post?id=' + encodeURIComponent(id));
    const md = type === 'image' ? IMAGE.markdown({ src: '', alt: '', caption: '', frame: 'offset', ...data }) : markdown(type, data);
    const lines = cur.body.replace(/\n+$/, '').split('\n');
    const at = after_line ?? lines.length;
    lines.splice(at, 0, '', md, '');
    const body = lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n*$/, '\n');
    await put('/api/post?id=' + encodeURIComponent(id), { data: cur.data, body });
    return text(`Inserted a ${type} block into ${id}:\n\n${md}`);
  }),
);

// ---- Pages ----

server.registerTool(
  'read_page',
  {
    title: 'Read a page',
    description: 'A page made of blocks: its title, template, and for each region the list of blocks with their slot values. "home" is the home page, "frame" the header and footer on every page, "post" the blocks around every post\'s article.',
    inputSchema: { id: z.string() },
  },
  tool(async ({ id }) => text((await api('/api/page?id=' + encodeURIComponent(id))).data)),
);

server.registerTool(
  'new_page',
  {
    title: 'New page',
    description:
      'Makes a page at /<slug>/ from a title (About → /about/) and returns its id. kind "plain" starts with a Heading and a Text block; "project" with a Project block (name, status, pitch, links), text, and a Post list of the posts filed under it (posts set `project: <page id>` in their front matter). Link it from the frame\'s header block, or an inventory slot, to put it in front of people.',
    inputSchema: { title: z.string(), kind: z.enum(['plain', 'project']).default('plain') },
  },
  tool(async ({ title, kind }) => text(await post('/api/pages', { title, kind }))),
);

server.registerTool(
  'write_page',
  {
    title: 'Write a page',
    description: 'Replaces a whole page: {title, template, regions: {<region>: [blocks]}}. Validated against the block schemas; the error says exactly what is wrong. For small changes, edit_page_block is easier.',
    inputSchema: { id: z.string(), page: z.object({ title: z.string(), template: z.string(), regions: z.record(z.string(), z.array(z.record(z.string(), z.any()))) }) },
  },
  tool(async ({ id, page }) => {
    await put('/api/page?id=' + encodeURIComponent(id), page);
    return text(`Saved page ${id}.`);
  }),
);

server.registerTool(
  'edit_page_block',
  {
    title: 'Edit a page block',
    description:
      'One change to one block on a page. add: put `block` (with its `type`) into `region` at `index` (default: the end). update: merge `patch` into the block at `region`/`index`. remove: delete it. move: move it to `to_region`/`to_index`. Returns the page as it now is.',
    inputSchema: {
      id: z.string(),
      op: z.enum(['add', 'update', 'remove', 'move']),
      region: z.string(),
      index: z.number().int().min(0).optional(),
      block: z.record(z.string(), z.any()).optional(),
      patch: z.record(z.string(), z.any()).optional(),
      to_region: z.string().optional(),
      to_index: z.number().int().min(0).optional(),
    },
  },
  tool(async ({ id, op, region, index, block, patch, to_region, to_index }) => {
    const page = (await api('/api/page?id=' + encodeURIComponent(id))).data;
    const list = (page.regions[region] ??= []);
    const need = () => {
      if (index === undefined || !list[index]) throw new Error(`No block at ${region}[${index}]; that region has ${list.length}.`);
    };
    if (op === 'add') {
      if (!block?.type) throw new Error('add needs `block` with a `type`; see block_types.');
      list.splice(index ?? list.length, 0, block);
    } else if (op === 'update') {
      need();
      list[index] = { ...list[index], ...patch };
    } else if (op === 'remove') {
      need();
      list.splice(index, 1);
    } else {
      need();
      const [b] = list.splice(index, 1);
      const dest = (page.regions[to_region ?? region] ??= []);
      dest.splice(to_index ?? dest.length, 0, b);
    }
    await put('/api/page?id=' + encodeURIComponent(id), page);
    return text(page);
  }),
);

// ---- Theme ----

server.registerTool(
  'theme',
  {
    title: 'Theme colors',
    description:
      'The site\'s color tokens. Without `values`, returns the defaults, what each token is for, and the current changes. With `values` ({light|dark|marker|aeris|ink: {token: "#rrggbb"}}), replaces the changes: only tokens that differ from the defaults are kept, so send {} to reset everything.',
    inputSchema: { values: z.record(z.string(), z.record(z.string(), z.string())).optional() },
  },
  tool(async ({ values }) => text(values ? await put('/api/theme', values) : await api('/api/theme'))),
);

// ---- Seeing it ----

const CHROMES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];

server.registerTool(
  'preview',
  {
    title: 'Look at the preview',
    description:
      'A screenshot of a page of the site as it is right now (the dev preview, drafts included), so you can check what you made. `path` like "/", "/about/" or "/log/<post-id>/". Phone width is 390px, desktop 1280px. full_page captures the whole length (can be tall).',
    inputSchema: {
      path: z.string().default('/'),
      width: z.enum(['desktop', 'phone']).default('desktop'),
      full_page: z.boolean().default(false),
      theme: z.enum(['dark', 'light']).default('dark'),
    },
  },
  tool(async ({ path, width, full_page, theme }) => {
    const executablePath = CHROMES.find((p) => p && existsSync(p));
    if (!executablePath) throw new Error('No Chrome or Chromium found; set CHROME_PATH.');
    // Right after a write, give Astro time to re-read the file, or the shot shows the old page.
    await new Promise((r) => setTimeout(r, Math.max(0, wrote + 2000 - Date.now())));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath });
    try {
      const phone = width === 'phone';
      const page = await browser.newPage({ viewport: { width: phone ? 390 : 1280, height: phone ? 844 : 800 }, colorScheme: theme, deviceScaleFactor: 1 });
      const res = await page.goto(SITE + (path.startsWith('/') ? path : '/' + path), { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; } *, *::before, *::after { animation-play-state: paused !important; }' });
      await page.evaluate(() => document.fonts.ready);
      const shot = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: full_page });
      return {
        content: [
          { type: 'text', text: `${SITE}${path} → HTTP ${res?.status()}` },
          { type: 'image', data: shot.toString('base64'), mimeType: 'image/jpeg' },
        ],
      };
    } finally {
      await browser.close();
    }
  }),
);

server.registerTool(
  'retake_cards',
  {
    title: 'Retake social cards',
    description: 'Retakes the link-preview images in public/og: one post\'s card with `id`, or every post\'s plus the site card without.',
    inputSchema: { id: z.string().optional() },
  },
  tool(async ({ id }) => text(await api('/api/cards' + (id ? '?id=' + encodeURIComponent(id) : ''), { method: 'POST' }))),
);

// ---- Undoing and shipping ----

server.registerTool(
  'discard',
  {
    title: 'Discard changes',
    description: 'Puts a post or page back to its last published (committed) version, throwing away everything since. New images stay. Ask the user first.',
    inputSchema: { kind: z.enum(['post', 'page', 'theme']), id: z.string().describe('The post or page id; anything for the theme.') },
    annotations: { destructiveHint: true },
  },
  tool(async ({ kind, id }) => text(await post('/api/discard', { kind, id }))),
);

server.registerTool(
  'publish',
  {
    title: 'Publish',
    description:
      'Builds the site; if it builds, commits the post or page (with its social card and any page images) and pushes the current branch. The live site redeploys when main changes. This pushes to GitHub: only do it when the user has asked to publish.',
    inputSchema: { kind: z.enum(['post', 'page', 'theme']), id: z.string().describe('The post or page id; anything for the theme.'), message: z.string().describe('The commit message.') },
    annotations: { destructiveHint: false, openWorldHint: true },
  },
  tool(async ({ kind, id, message }) => text((await post('/api/publish', kind === 'post' ? { id, message } : kind === 'theme' ? { theme: true, message } : { page: id, message })).log)),
);

await server.connect(new StdioServerTransport());
