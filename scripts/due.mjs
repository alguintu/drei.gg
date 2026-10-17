// Is a scheduled post due today? Prints the ids of published (non-draft) posts
// dated today (UTC), one per line. The scheduled workflow redeploys when there
// are any, since a static build only publishes posts dated on or before it.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './desk/frontmatter.mjs';

const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const dir = 'src/content/posts';
for (const e of readdirSync(dir, { withFileTypes: true })) {
  const file = e.isDirectory() ? join(dir, e.name, 'index.md') : e.name.endsWith('.md') ? join(dir, e.name) : null;
  if (!file || !existsSync(file)) continue;
  const { data } = parse(readFileSync(file, 'utf8'));
  if (String(data.date) === today && data.draft !== true) console.log(e.name.replace(/\.md$/, ''));
}
