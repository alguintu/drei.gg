// @ts-check
import { defineConfig } from 'astro/config';
import rehypeNotes from './src/lib/rehype-notes.mjs';

export default defineConfig({
  site: 'https://drei.gg',
  trailingSlash: 'ignore',
  markdown: {
    syntaxHighlight: { type: 'shiki', excludeLangs: ['notes', 'callout', 'aeris', 'pull', 'bignum', 'shout', 'tape', 'math'] },
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
    rehypePlugins: [rehypeNotes],
  },
});
