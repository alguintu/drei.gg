// npm run audit — accessibility check of the built site with axe, in Chrome:
// every page in dist/, light and dark, phone and desktop. Run `npm run build` first.
// Exits non-zero if anything fails.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const PORT = 4499;
const CHROMES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const executablePath = CHROMES.find((p) => p && existsSync(p));
if (!existsSync('dist/index.html')) throw new Error('No build; run npm run build first.');
if (!executablePath) throw new Error('No Chrome or Chromium; set CHROME_PATH.');

const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const pages = (dir, base = '') =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    // /blocks/ is the unlisted gallery of every cover in every palette; posts get checked with the covers they use.
    e.isDirectory() ? (['_astro', 'pagefind', 'og', 'media', 'blocks'].includes(e.name) ? [] : pages(`${dir}/${e.name}`, `${base}/${e.name}`)) : e.name === 'index.html' ? [`${base}/`] : e.name.endsWith('.html') ? [`${base}/${e.name}`] : [],
  );

const server = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], { stdio: 'ignore', detached: true });
const browser = await chromium.launch({ executablePath });
let failures = 0;
try {
  for (let i = 0; i < 50 && !(await fetch(`http://127.0.0.1:${PORT}/`).then((r) => r.ok).catch(() => false)); i++) await new Promise((r) => setTimeout(r, 200));
  for (const colorScheme of ['light', 'dark'])
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
      for (const path of pages('dist')) {
        await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'networkidle' });
        await page.addScriptTag({ content: axe });
        const found = await page.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`));
        for (const f of found) console.log(`✗ ${colorScheme} ${width}px ${path}  ${f}`);
        failures += found.length;
      }
      await page.close();
    }
} finally {
  await browser.close();
  try {
    process.kill(-server.pid);
  } catch {}
}
console.log(failures ? `\n${failures} accessibility problems` : 'axe: no problems on any page, light or dark, phone or desktop');
process.exit(failures ? 1 : 0);
