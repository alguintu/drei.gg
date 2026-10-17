// Cover snapshots: every cover on /blocks/ (all layouts × palettes, the no-image
// fallbacks and the in-post blocks), light and dark, as one PNG each.
//
//   node test/covers.mjs shoot <site dir> <out dir>    screenshot a built site (dist/)
//   node test/covers.mjs diff <before> <after> <out>   compare two shoots, write a report
//
// CI shoots the PR's base and head on the same machine and diffs them, so there are
// no stored baselines to drift between machines. Locally: build, shoot, change
// something, build, shoot again, diff. Needs Chrome or Chromium (or CHROME_PATH).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

function chrome() {
  const all = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const found = all.find((p) => p && existsSync(p));
  if (!found) throw new Error('No Chrome or Chromium; set CHROME_PATH.');
  return found;
}

// A static server for the built site, on a free port.
async function serve(root) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.json': 'application/json' };
  const server = createServer((req, res) => {
    let file = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function shoot(site, out) {
  site = resolve(site);
  await mkdir(out, { recursive: true });
  const server = await serve(site);
  const browser = await chromium.launch({ executablePath: chrome() });
  let count = 0;
  try {
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
      await page.goto(server.url + '/blocks/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // Name each shot by its row (the layout) and its caption (the palette), or its place in the row.
      const shots = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('.layout-row').forEach((row, r) => {
          const name = row.querySelector('h2 code')?.textContent?.replace(/^layout:\s*/, '') ?? row.querySelector('h2')?.textContent ?? `row ${r}`;
          const items = row.querySelector('.swatches')?.children;
          if (items) [...items].forEach((el, i) => {
            el.setAttribute('data-shot', `${r}-${i}`);
            out.push({ id: `${r}-${i}`, name: `${name} ${el.querySelector('.cap code')?.textContent?.replace(/^palette:\s*/, '') ?? i + 1}` });
          });
          else {
            const body = row.querySelector('.prose');
            if (body) body.setAttribute('data-shot', `${r}`), out.push({ id: `${r}`, name });
          }
        });
        return out;
      });
      for (const s of shots) {
        const el = page.locator(`[data-shot="${s.id}"]`).first();
        await el.screenshot({ path: join(out, `${slug(s.name)}--${scheme}.png`), animations: 'disabled', caret: 'hide' });
        count++;
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`${count} shots in ${out}`);
}

const read = async (f) => PNG.sync.read(await readFile(f));

// Writes before/after/diff images, report.html and summary.md to <out>. Returns 0 always:
// a changed cover is something to look at, not necessarily a mistake.
async function diff(before, after, out) {
  await mkdir(join(out, 'img'), { recursive: true });
  const a = new Set((await readdir(before)).filter((f) => f.endsWith('.png')));
  const b = new Set((await readdir(after)).filter((f) => f.endsWith('.png')));
  const changed = [], added = [...b].filter((f) => !a.has(f)).sort(), removed = [...a].filter((f) => !b.has(f)).sort();
  for (const f of [...a].filter((f) => b.has(f)).sort()) {
    const [x, y] = [await read(join(before, f)), await read(join(after, f))];
    const name = f.replace(/\.png$/, '');
    if (x.width !== y.width || x.height !== y.height) {
      changed.push({ name, pct: 100, size: `${x.width}×${x.height} → ${y.width}×${y.height}` });
    } else {
      const d = new PNG({ width: x.width, height: x.height });
      const px = pixelmatch(x.data, y.data, d.data, x.width, x.height, { threshold: 0.1 });
      // A handful of anti-aliasing pixels is noise; anything visible is not.
      if (px <= 20) continue;
      changed.push({ name, pct: (100 * px) / (x.width * x.height) });
      await writeFile(join(out, 'img', `${name}.diff.png`), PNG.sync.write(d));
    }
    await copyFile(join(before, f), join(out, 'img', `${name}.before.png`));
    await copyFile(join(after, f), join(out, 'img', `${name}.after.png`));
  }
  for (const f of added) await copyFile(join(after, f), join(out, 'img', f.replace(/\.png$/, '.after.png')));
  changed.sort((p, q) => q.pct - p.pct);

  const total = new Set([...a, ...b]).size;
  const lines = [`### Cover snapshots`, ''];
  if (!changed.length && !added.length && !removed.length) lines.push(`All ${total} cover shots are unchanged.`);
  else {
    lines.push(`${changed.length} changed, ${added.length} new, ${removed.length} gone, out of ${total}. The before/after/diff images are in the \`cover-snapshots\` artifact (open report.html).`, '');
    for (const c of changed) lines.push(`- changed: \`${c.name}\` (${c.size ?? `${c.pct.toFixed(2)}% of pixels`})`);
    for (const f of added) lines.push(`- new: \`${f.replace(/\.png$/, '')}\``);
    for (const f of removed) lines.push(`- gone: \`${f.replace(/\.png$/, '')}\``);
  }
  await writeFile(join(out, 'summary.md'), lines.join('\n') + '\n');

  const esc = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const row = (name, note, imgs) =>
    `<section><h2>${esc(name)} <small>${esc(note)}</small></h2><div>${imgs.map(([k, f]) => `<figure><img src="img/${encodeURIComponent(f)}" alt=""><figcaption>${k}</figcaption></figure>`).join('')}</div></section>`;
  const html = `<!doctype html><meta charset="utf-8"><title>Cover snapshots</title>
<style>body{font:14px/1.5 ui-monospace,monospace;margin:24px;background:#e8e9ed;color:#15171d}h1{font-size:20px}section{border-top:1px solid #bbb;padding:16px 0}h2{font-size:14px;margin:0 0 8px}small{color:#666;font-weight:400}div{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0}img{max-width:420px;border:1px solid #bbb;display:block;background:#fff}figcaption{color:#666}</style>
<h1>Cover snapshots: ${changed.length} changed, ${added.length} new, ${removed.length} gone of ${total}</h1>
${changed.map((c) => row(c.name, c.size ?? `${c.pct.toFixed(2)}% of pixels`, [['before', `${c.name}.before.png`], ['after', `${c.name}.after.png`], ...(c.size ? [] : [['diff', `${c.name}.diff.png`]])])).join('\n')}
${added.map((f) => row(f.replace(/\.png$/, ''), 'new', [['after', f.replace(/\.png$/, '.after.png')]])).join('\n')}
${removed.map((f) => `<section><h2>${esc(f.replace(/\.png$/, ''))} <small>gone</small></h2></section>`).join('\n')}`;
  await writeFile(join(out, 'report.html'), html);

  console.log(lines.join('\n'));
  // GitHub turns these into annotations on the check, so changes show on the PR.
  if (process.env.GITHUB_ACTIONS) for (const c of changed.slice(0, 10)) console.log(`::warning title=Cover changed::${c.name} (${c.size ?? `${c.pct.toFixed(2)}% of pixels`})`);
  return 0;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'shoot' && args.length === 2) await shoot(...args);
else if (cmd === 'diff' && args.length === 3) process.exitCode = await diff(...args);
else {
  console.error('usage: node test/covers.mjs shoot <site dir> <out dir> | diff <before> <after> <out>');
  process.exit(2);
}
