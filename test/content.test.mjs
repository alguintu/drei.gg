// Fast checks that need no browser and no running desk: npm test.
// The desk's own end-to-end test is test/desk.e2e.mjs (npm run test:desk).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { EXAMPLES, IMAGE, POST_BLOCKS, markdown } from '../src/lib/post-blocks.mjs';
import { parse, stringify } from '../scripts/desk/frontmatter.mjs';
import { BLOCKS, Page, TEMPLATES, PAGE_TEMPLATES } from '../src/blocks/schema.ts';
import { STARTERS, STARTER_GROUPS, fromStarter } from '../src/blocks/starters.ts';
import { THEME, themeCss } from '../src/lib/theme.ts';
import { z } from 'astro/zod';

const fenceBody = (md) => md.split('\n').slice(1, -1);

test('every post block survives Markdown and back', () => {
  for (const [type, data] of Object.entries(EXAMPLES)) {
    const md = markdown(type, data);
    assert.match(md, new RegExp('^```' + type + '\\n'));
    assert.deepEqual(POST_BLOCKS[type].parse(fenceBody(md)), data, type);
  }
});

test('post blocks read the fences people actually write', () => {
  assert.deepEqual(POST_BLOCKS.pull.parse(['The quote', 'goes on.', '-- drei']), { quote: 'The quote goes on.', by: 'drei' });
  assert.deepEqual(POST_BLOCKS.notes.parse(['+ added', '', 'plain line', '! broke']).items.map((i) => i.kind), ['plus', 'plain', 'bang']);
  assert.deepEqual(POST_BLOCKS.callout.parse(['Heads up', 'one', '', 'two']), { heading: 'Heads up', body: 'one\n\ntwo' });
  assert.equal(POST_BLOCKS.shout.hast({ lines: ['GG'] }).children.length, 3, 'one line repeats three times');
});

test('image frames read and write their title', () => {
  const data = { src: './a.png', alt: 'An A', frame: 'tape', caption: 'on tape | with a bar' };
  const md = IMAGE.markdown(data);
  const title = md.match(/"(.*)"\)$/)[1];
  assert.deepEqual({ ...IMAGE.parse(title), src: './a.png', alt: 'An A' }, data);
  assert.equal(IMAGE.parse('just a title'), null);
});

test('front matter round-trips, quoting what YAML would misread', () => {
  const data = { title: 'Yes: no', date: '2026-10-17', tag: 'rant', label: '0.1', summary: '#1 thing', layout: 'arc', cover: { kicker: 'GG', title: 'on: off' }, draft: true };
  const text = stringify(data, 'Body\n');
  const back = parse(text);
  assert.deepEqual(back.data, data);
  assert.equal(back.body, 'Body\n');
  assert.doesNotMatch(stringify({ ...data, draft: false, label: '' }, ''), /draft|label/, 'false drafts and empty fields are left out');
});

test('the pages in the repo match the block schemas', () => {
  for (const f of readdirSync('src/content/pages').filter((f) => f.endsWith('.json'))) {
    const page = JSON.parse(readFileSync(`src/content/pages/${f}`, 'utf8'));
    const check = Page.safeParse(page);
    assert.ok(check.success, `${f}: ${check.error?.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`);
    for (const region of Object.keys(page.regions)) assert.ok(TEMPLATES[page.template].includes(region), `${f}: unknown region ${region}`);
  }
});

test('every page template makes a page that matches the block schemas', () => {
  for (const [key, s] of Object.entries(STARTERS)) {
    const page = fromStarter(key, 'Sample page', 'sample-page');
    const check = Page.safeParse(page);
    assert.ok(check.success, `${key}: ${check.error?.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`);
    assert.ok(PAGE_TEMPLATES.includes(page.template), `${key}: ${page.template} isn't served at /<id>/`);
    assert.deepEqual(Object.keys(page.regions).sort(), [...TEMPLATES[page.template]].sort(), `${key}: fills every region of ${page.template}, and only those`);
    assert.ok(STARTER_GROUPS.includes(s.group), `${key}: group`);
  }
});

test('every block schema turns into a form schema', () => {
  for (const [type, schema] of Object.entries(BLOCKS)) {
    const json = z.toJSONSchema(schema, { target: 'draft-7' });
    assert.equal(json.properties.type.const, type);
    assert.ok(json.title, `${type} has a title for the desk`);
  }
});

test('an untouched theme adds no CSS; a change adds just that', () => {
  assert.equal(themeCss({}), '');
  assert.equal(themeCss({ light: { marker: THEME.light.marker } }), '', 'a default value is not a change');
  assert.equal(themeCss({ light: { marker: '#ff8a00' } }), 'html:root { --marker: #ff8a00; }');
  assert.equal(themeCss({ light: { marker: 'red;}</style>' } }), '', 'only #rrggbb gets through');
});

// After `npm run build`: nothing meant for the desk ships.
test('the built site carries no desk markup', { skip: !existsSync('dist/index.html') && 'run npm run build first' }, () => {
  const html = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? html(`${dir}/${e.name}`) : e.name.endsWith('.html') ? [`${dir}/${e.name}`] : []));
  const files = html('dist');
  assert.ok(files.length > 3);
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /data-desk|desk\/catalog|desk\/og/, f);
  assert.ok(!existsSync('dist/desk'), 'no desk pages in the build');
});
