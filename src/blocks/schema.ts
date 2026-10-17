import { z } from 'astro/zod';

// Blocks: the pieces pages are made of. Each block type is a zod schema of its
// slots; src/blocks/Blocks.astro maps `type` to the component that draws it.
// Blocks are atomic: they hold slots, never other blocks. Pages arrange blocks
// in regions (TEMPLATES below), so nesting stops at page → region → block.
//
// The desk turns these schemas into forms (z.toJSONSchema). `title` and
// `description` label the fields; `widget: 'rich'` marks text that allows
// ==mark== and *em*.

const text = (title: string, description?: string) => z.string().meta({ title, description });
const rich = (title: string, description?: string) => z.string().meta({ title, description, widget: 'rich' });
const list = <T extends z.ZodType>(title: string, item: T) => z.array(item).meta({ title });

export const BLOCKS = {
  header: z
    .object({
      type: z.literal('header'),
      brand: text('Brand'),
      nav: list('Links', z.object({ label: text('Label'), href: text('Link', 'A #section links to that part of the home page from any page.') })),
      status: text('Status line'),
    })
    .meta({ title: 'Header', description: 'The bar at the top of every page.' }),

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
    .meta({ title: 'Footer', description: 'The strip at the bottom of every page.' }),

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
    .meta({ title: 'Hero', description: 'The big wordmark, the thesis and the dictionary entry.' }),

  killfeed: z
    .object({
      type: z.literal('killfeed'),
      items: list(
        'Feed',
        z.object({
          who: text('Who'),
          verb: text('Verb'),
          what: text('What'),
          style: z.enum(['good', 'bad']).meta({ title: 'Color', description: 'good is blue, bad is red.' }),
        }),
      ),
    })
    .meta({ title: 'Killfeed', description: 'The ticker of things that happened.' }),

  postlog: z
    .object({
      type: z.literal('postlog'),
      label: text('Label'),
      empty: text('When there are no posts'),
    })
    .meta({ title: 'Post log', description: 'Every post, newest first, with tag filters.' }),

  inventory: z
    .object({
      type: z.literal('inventory'),
      label: text('Label'),
      items: list(
        'Slots',
        z.object({
          name: text('Name'),
          note: text('Note'),
          status: z.enum(['live', 'empty']).meta({ title: 'Status', description: 'empty draws a dashed placeholder.' }),
          href: text('Link').optional(),
        }),
      ),
    })
    .meta({ title: 'Inventory', description: 'Products, live or still empty slots.' }),

  rules: z
    .object({
      type: z.literal('rules'),
      label: text('Label'),
      items: list('Rules', text('Rule')),
    })
    .meta({ title: 'House rules', description: 'A numbered list.' }),

  scoreboard: z
    .object({
      type: z.literal('scoreboard'),
      label: text('Label'),
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).meta({ title: 'Counting days since', description: 'YYYY-MM-DD' }),
      posts: text('Posts label'),
      shipped: text('Shipped label'),
      killed: text('Killed label'),
      days: text('Days label'),
    })
    .meta({ title: 'Scoreboard', description: 'Post counts and days since a date.' }),
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
