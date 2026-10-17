// npm run test:desk — drives the real desk in Chrome, end to end. Needs the desk
// running (npm run desk) and Chrome or Chromium on the machine (or CHROME_PATH).
// It only touches content it makes itself, a page and a post, and removes both.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const DESK = `http://127.0.0.1:${process.env.DESK_PORT || 4320}`;
const CHROMES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const api = (path, opts) => fetch(DESK + path, opts).then((r) => r.json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Poll until a check passes; the desk saves 300–700ms after an edit, then the preview swaps.
async function until(what, fn, ms = 10000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      if ((last = await fn())) return last;
    } catch (e) {
      last = e;
    }
    await wait(150);
  }
  throw new Error(`timed out: ${what}${last instanceof Error ? ` (${last.message})` : ''}`);
}

try {
  await fetch(DESK + '/api/status');
} catch {
  console.error('The desk is not running; start it with npm run desk.');
  process.exit(1);
}

const executablePath = CHROMES.find((p) => p && existsSync(p));
if (!executablePath) throw new Error('No Chrome or Chromium; set CHROME_PATH.');
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
await page.addInitScript(() => localStorage.setItem('desk.pv', 'split'));
const frame = () => page.frameLocator('.stage iframe:not(.next)');
let pageId, postId;
const step = (name) => console.log(`  ✓ ${name}`);

try {
  await page.goto(DESK);
  await page.locator('.state', { hasText: 'ready' }).waitFor();
  step('desk loads');

  // A new page, made in the desk.
  await page.getByRole('button', { name: '+ new page' }).click();
  await page.locator('dialog input').fill('E2E test page');
  await page.locator('dialog button[value="ok"]').click();
  pageId = await until('the page opens', async () => (await page.locator('aside a.cur .m').textContent())?.match(/^\/(.+)\/$/)?.[1]);
  await frame().locator('.page-head h1', { hasText: 'E2E test page' }).waitFor();
  step(`new page at /${pageId}/ shows in the preview`);

  // Click-to-edit: double-click the heading in the preview and retype it.
  const h1 = frame().locator('.page-head h1');
  await h1.dblclick();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Edited in place');
  await page.keyboard.press('Enter');
  await until('the heading saves', async () => (await api(`/api/page?id=${pageId}`)).data.regions.main[0].title === 'Edited in place');
  step('a double-click edit in the preview saves to the page');

  // Add a block from the picker, then undo it.
  await page.locator('select.add').first().selectOption('tape');
  await until('the tape block saves', async () => (await api(`/api/page?id=${pageId}`)).data.regions.main.some((b) => b.type === 'tape'));
  await frame().locator('.blk-tape').waitFor();
  step('a block added from the picker shows in the preview');
  await page.locator('main').click({ position: { x: 5, y: 5 } });
  await page.getByTitle(/^Undo/).click();
  await until('undo removes it', async () => !(await api(`/api/page?id=${pageId}`)).data.regions.main.some((b) => b.type === 'tape'));
  step('undo takes it back out');

  // A post, a block inserted from the toolbar, then edited by clicking it in the preview.
  await page.getByRole('button', { name: '+ new post' }).click();
  await page.locator('dialog input').first().fill('E2E test post');
  await page.locator('dialog button[value="ok"]').click();
  await page.locator('textarea.body').waitFor();
  postId = await until('the post opens', async () => (await api('/api/posts')).find((p) => p.title === 'E2E test post')?.id);
  await page.locator('.tools button', { hasText: /^callout$/ }).click();
  await until('the callout saves', async () => (await api(`/api/post?id=${postId}`)).body.includes('```callout'));
  await frame().locator('.blk-callout').click();
  await page.locator('fieldset.bpanel').waitFor();
  await page.locator('#pb_heading').fill('Clicked and changed');
  await until('the fence is rewritten', async () => (await api(`/api/post?id=${postId}`)).body.includes('```callout\nClicked and changed\n'));
  await frame().locator('.blk-callout .lead', { hasText: 'Clicked and changed' }).waitFor();
  step('a post block clicked in the preview edits as a form, and the Markdown follows');

  // Ctrl+K finds the page again.
  await page.locator('main').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+k');
  await page.locator('.palette input').fill('e2e test page');
  await page.keyboard.press('Enter');
  await until('the palette opens the page', async () => (await page.locator('aside a.cur .m').textContent()) === `/${pageId}/`);
  step('Ctrl+K jumps to it');

  console.log('\ndesk end-to-end: all good');
} catch (e) {
  await page.screenshot({ path: 'desk-e2e-failure.png' }).catch(() => {});
  console.error('\nFAILED:', e.message, '\n(screenshot: desk-e2e-failure.png)');
  process.exitCode = 1;
} finally {
  if (pageId) await api(`/api/page?id=${pageId}`, { method: 'DELETE' }).catch(() => {});
  if (postId) await rm(new URL(`../src/content/posts/${postId}`, import.meta.url), { recursive: true, force: true });
  await browser.close();
}
