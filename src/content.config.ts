import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { ALL_LAYOUTS, PALETTES } from './lib/cover';
import { Page } from './blocks/schema';

// One Markdown file per post. A post with images can be a folder:
// src/content/posts/my-post/index.md with its images beside it.
const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      tag: z.enum(['ship', 'build', 'rant', 'dead']),
      // Shown in the meta column: a version for ship posts, anything short otherwise.
      label: z.string().optional(),
      summary: z.string().optional(),
      // Cover poster. Leave these out and the slug picks them.
      layout: z.enum(ALL_LAYOUTS).optional(),
      palette: z.enum(PALETTES).optional(),
      // Cover text by slot: kicker, foot, more... Each layout lists its slots in
      // SLOTS (src/lib/cover.ts); a slot left out uses the layout's default.
      cover: z.record(z.string(), z.coerce.string()).optional(),
      // Optional photo; layouts with a frame show it.
      image: image().optional(),
      image_alt: z.string().optional(),
      draft: z.boolean().default(false),
      // A project page (src/content/pages/<id>.json) this post belongs to; its Post list can show only these.
      project: z.string().optional(),
    }),
});

// Pages made of blocks (src/blocks). `frame` is the header and footer every page shares.
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '*.json' }),
  schema: Page,
});

export const collections = { posts, pages };
