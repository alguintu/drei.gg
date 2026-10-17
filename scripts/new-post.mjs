// npm run new -- "Post title" [tag]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const [title, tag = 'build'] = process.argv.slice(2);
if (!title) {
  console.error('Usage: npm run new -- "Post title" [ship|build|rant|dead]');
  process.exit(1);
}
const slug = title.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dir = `src/content/posts/${slug}`;
const file = `${dir}/index.md`;
if (existsSync(dir) || existsSync(`${dir}.md`)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
writeFileSync(
  file,
  `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\ntag: ${tag}\ndraft: true\n---\n\nWrite here.\n\n\`\`\`notes\n+ \n\`\`\`\n`,
);
console.log(`Created ${file} (draft: true until you remove it)`);
