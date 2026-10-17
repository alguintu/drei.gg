import { z } from 'astro/zod';
import { ALL_LAYOUTS, PALETTES } from '../lib/cover.ts';
import { FRAMES } from '../lib/post-blocks.mjs';

// Blocks: the pieces pages are made of. Each block type is a zod schema of its
// slots; src/blocks/Blocks.astro maps `type` to the component that draws it.
// Blocks are atomic: they hold slots, never other blocks. Pages arrange blocks
// in regions (TEMPLATES below), so nesting stops at page → region → block.
//
// Two groups: page blocks (header, hero, post log...) and post blocks (callout,
// pull quote, image frame...), which posts write as Markdown fences and pages can
// use too (src/lib/post-blocks.mjs reads, writes and draws those).
//
// The desk turns these schemas into forms (z.toJSONSchema). `title` and
// `description` label the fields; `widget` picks a special input: 'rich' is text
// that allows ==mark== and *em*, 'long' is multi-line text, 'post' picks a post.

const text = (title: string, description?: string) => z.string().meta({ title, description });
const rich = (title: string, description?: string) => z.string().meta({ title, description, widget: 'rich' });
const long = (title: string, description?: string) => z.string().meta({ title, description, widget: 'long' });
const list = <T extends z.ZodType>(title: string, item: T) => z.array(item).meta({ title });
const page = { group: 'page' };
const post = { group: 'post' };

export const BLOCKS = {
  header: z
    .object({
      type: z.literal('header'),
      brand: text('Brand'),
      nav: list('Links', z.object({ label: text('Label'), href: text('Link', 'A #section links to that part of the home page from any page.') })),
      status: text('Status line'),
    })
    .meta({ title: 'Header', description: 'The bar at the top of every page.', ...page }),

  footer: z
    .object({
      type: z.literal('footer'),
      big: text('Big word'),
      feed_label: text('Feed label'),
      feed_href: text('Feed link'),
      feed_text: text('Feed text'),
      tagline: text('Tagline'),
      owner: text('Copyright', 'The year is added.'),
    })
    .meta({ title: 'Footer', description: 'The strip at the bottom of every page.', ...page }),

  hero: z
    .object({
      type: z.literal('hero'),
      name: text('Name'),
      tld: text('Domain ending'),
      thesis: rich('Thesis'),
      word: text('Defined word'),
      ipa: text('Pronunciation'),
      pos: text('Part of speech'),
      senses: list('Definitions', z.object({ tag: text('Tag'), text: rich('Definition') })),
    })
    .meta({ title: 'Hero', description: 'The big wordmark, the thesis and the dictionary entry.', ...page }),

  killfeed: z
    .object({
      type: z.literal('killfeed'),
      items: list(
        'Feed',
        z.object({
          who: text('Who'),
          verb: text('Verb'),
          what: text('What'),
          style: z.enum(['good', 'bad']).meta({ title: 'Color', description: 'good is blue, bad is red.', ...page }),
        }),
      ),
    })
    .meta({ title: 'Killfeed', description: 'The ticker of things that happened.', ...page }),

  postlog: z
    .object({
      type: z.literal('postlog'),
      label: text('Label'),
      empty: text('When there are no posts'),
    })
    .meta({ title: 'Post log', description: 'Every post, newest first, with tag filters.', ...page }),

  inventory: z
    .object({
      type: z.literal('inventory'),
      label: text('Label'),
      items: list(
        'Slots',
        z.object({
          name: text('Name'),
          note: text('Note'),
          status: z.enum(['live', 'empty']).meta({ title: 'Status', description: 'empty draws a dashed placeholder.', ...page }),
          href: text('Link').optional(),
        }),
      ),
    })
    .meta({ title: 'Inventory', description: 'Products, live or still empty slots.', ...page }),

  rules: z
    .object({
      type: z.literal('rules'),
      label: text('Label'),
      items: list('Rules', text('Rule')),
    })
    .meta({ title: 'House rules', description: 'A numbered list.', ...page }),

  scoreboard: z
    .object({
      type: z.literal('scoreboard'),
      label: text('Label'),
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).meta({ title: 'Counting days since', description: 'YYYY-MM-DD', ...page }),
      posts: text('Posts label'),
      shipped: text('Shipped label'),
      killed: text('Killed label'),
      days: text('Days label'),
    })
    .meta({ title: 'Scoreboard', description: 'Post counts and days since a date.', ...page }),

  cover: z
    .object({
      type: z.literal('cover'),
      post: z.string().meta({ title: 'Post', widget: 'post' }),
      layout: z.enum(['', ...ALL_LAYOUTS]).meta({ title: 'Layout', description: 'Empty uses the post’s own.' }),
      palette: z.enum(['', ...PALETTES]).meta({ title: 'Palette', description: 'Empty uses the post’s own.' }),
      size: z.enum(['card', 'full']).meta({ title: 'Size' }),
      link: z.boolean().meta({ title: 'Links to the post' }),
    })
    .meta({ title: 'Cover', description: 'A post’s cover, linking to it.', ...page }),

  // ---- Post blocks ----
  callout: z
    .object({ type: z.literal('callout'), heading: text('Heading'), body: long('Text') })
    .meta({ title: 'Callout', description: 'The one thing a reader shouldn’t miss, in yellow.', ...post }),
  aeris: z
    .object({ type: z.literal('aeris'), heading: text('Heading'), body: long('Text') })
    .meta({ title: 'Aeris note', description: 'A callout in teal, for workstation notes.', ...post }),
  pull: z
    .object({ type: z.literal('pull'), quote: long('Quote'), by: text('By') })
    .meta({ title: 'Pull quote', description: 'A line worth pulling out.', ...post }),
  bignum: z
    .object({ type: z.literal('bignum'), number: text('Number'), caption: long('Caption') })
    .meta({ title: 'Big number', description: 'A huge number and what it means.', ...post }),
  shout: z
    .object({ type: z.literal('shout'), lines: list('Lines', text('Line')).max(4) })
    .meta({ title: 'Shout', description: 'One to four short lines, set huge. One line gets repeated.', ...post }),
  tape: z
    .object({ type: z.literal('tape'), text: text('Text') })
    .meta({ title: 'Tape', description: 'A line on black tape.', ...post }),
  notes: z
    .object({
      type: z.literal('notes'),
      items: list(
        'Notes',
        z.object({
          kind: z.enum(['plus', 'minus', 'tilde', 'bang', 'plain']).meta({ title: 'Kind', description: 'plus added, minus removed, tilde changed, bang broke.' }),
          text: text('Text'),
        }),
      ),
    })
    .meta({ title: 'Patch notes', description: 'Added, removed, changed, broke.', ...post }),
  image: z
    .object({
      type: z.literal('image'),
      src: text('Image', 'In a post: ./file.png beside it. On a page: a URL.'),
      alt: text('Alt text'),
      frame: z.enum(FRAMES as [string, ...string[]]).meta({ title: 'Frame' }),
      caption: text('Caption'),
    })
    .meta({ title: 'Framed image', description: 'An image in one of the frames.', ...post }),
};

export type BlockType = keyof typeof BLOCKS;
export const Block = z.discriminatedUnion('type', Object.values(BLOCKS) as [z.ZodObject, ...z.ZodObject[]]);
export type BlockData<T extends BlockType = BlockType> = z.infer<(typeof BLOCKS)[T]>;

// Templates: the regions a page has, in order. The template's component decides
// where each region sits on the page.
export const TEMPLATES = {
  home: ['top', 'main', 'aside'],
  frame: ['header', 'footer'],
} as const;

export const Page = z.object({
  title: z.string(),
  template: z.enum(Object.keys(TEMPLATES) as [keyof typeof TEMPLATES]),
  regions: z.record(z.string(), z.array(Block)),
});
