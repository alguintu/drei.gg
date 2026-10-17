// @ts-check
import { defineConfig } from 'astro/config';
import { markdown } from './src/lib/markdown.mjs';

export default defineConfig({
  site: 'https://drei.gg',
  trailingSlash: 'ignore',
  markdown,
});
