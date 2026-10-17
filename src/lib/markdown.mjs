// How Markdown renders, for posts (astro.config.mjs) and for Text blocks on pages
// (src/blocks/Prose.astro), so both look the same.
import rehypeNotes from './rehype-notes.mjs';

export const markdown = {
  syntaxHighlight: { type: 'shiki', excludeLangs: ['notes', 'callout', 'aeris', 'pull', 'bignum', 'shout', 'tape', 'math'] },
  shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  rehypePlugins: [rehypeNotes],
};
