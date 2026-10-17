import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { ALL_LAYOUTS, PALETTES } from './lib/cover';

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
    }),
});

export const collections = { posts };
