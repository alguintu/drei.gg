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
// that allows ==mark== and *em*, 'long' is multi-line text, 'markdown' is a
// Markdown editor, 'post' picks a post, 'image' picks or uploads an image.

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
          style: z.enum(['good', 'bad']).meta({ title: 'Color', description: 'good is blue, bad is red.' }),
        }),
      ),
      motion: z
        .enum(['scroll', 'still'])
        .optional()
        .meta({ title: 'Motion', description: 'scroll loops the feed sideways, pausing on hover; still holds it in place. Anyone whose system asks for reduced motion always gets still.' }),
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

  postlist: z
    .object({
      type: z.literal('postlist'),
      label: text('Label'),
      tag: z.enum(['', 'ship', 'build', 'rant', 'dead']).meta({ title: 'Tag', description: 'Empty shows every tag.' }),
      count: z.number().int().min(1).max(50).meta({ title: 'How many', description: 'Newest first.' }),
      project: z.string().optional().meta({ title: 'Project', description: 'Only posts filed under this project page (its id). Empty: any.' }),
      style: z.enum(['rows', 'cards']).meta({ title: 'Style', description: 'rows: titles and dates; cards: covers.' }),
    })
    .meta({ title: 'Post list', description: 'The newest posts, optionally one tag, as rows or covers.', ...page }),

  embed: z
    .object({
      type: z.literal('embed'),
      url: text('Link', 'A YouTube video plays in place; a GitHub repo gets a card; anything else, a link card.'),
      caption: text('Caption'),
    })
    .meta({ title: 'Embed', description: 'A video, a GitHub repo, or a link card.', ...page }),

  project: z
    .object({
      type: z.literal('project'),
      name: text('Name'),
      status: z.enum(['idea', 'building', 'live', 'paused', 'dead']).meta({ title: 'Status' }),
      pitch: rich('Pitch', 'One or two lines: what it is and who it’s for.'),
      links: list('Links', z.object({ label: text('Label'), href: text('Link') })),
    })
    .meta({ title: 'Project', description: 'A product’s name, status, pitch and links: the top of a project page.', ...page }),

  // ---- Section blocks: what page templates are made of (src/templates) ----

  features: z
    .object({
      type: z.literal('features'),
      label: text('Label'),
      heading: text('Heading'),
      columns: z.enum(['2', '3', '4']).meta({ title: 'Columns' }),
      items: list('Features', z.object({ glyph: text('Glyph', 'A character or two: +, 01, ⚡, gg.'), title: text('Title'), text: rich('Text') })),
    })
    .meta({ title: 'Features', description: 'A grid of short points with a glyph each.', ...page }),

  pricing: z
    .object({
      type: z.literal('pricing'),
      label: text('Label'),
      heading: text('Heading'),
      note: rich('Note', 'Under the tiers: taxes, trials, fine print.'),
      tiers: list(
        'Tiers',
        z.object({
          name: text('Name'),
          price: text('Price', 'As shown: $0, $9, ₱499, ask.'),
          period: text('Period', '/mo, /yr, once.'),
          pitch: text('Pitch'),
          features: list('Includes', text('Line')),
          cta: text('Button'),
          href: text('Button link'),
          featured: z.boolean().meta({ title: 'Featured', description: 'Drawn in the main color.' }),
        }),
      ),
    })
    .meta({ title: 'Pricing', description: 'Tiers with prices, what each includes, and a button.', ...page }),

  faq: z
    .object({
      type: z.literal('faq'),
      label: text('Label'),
      heading: text('Heading'),
      items: list('Questions', z.object({ q: text('Question'), a: long('Answer') })),
    })
    .meta({ title: 'FAQ', description: 'Questions that open to their answers.', ...page }),

  timeline: z
    .object({
      type: z.literal('timeline'),
      label: text('Label'),
      heading: text('Heading'),
      items: list(
        'Entries',
        z.object({
          date: text('Date'),
          version: text('Version'),
          title: text('Title'),
          text: long('Text'),
          kind: z.enum(['ship', 'build', 'rant', 'dead', 'plain']).meta({ title: 'Kind', description: 'Colors the marker like the tags do.' }),
        }),
      ),
    })
    .meta({ title: 'Timeline', description: 'Dated entries down a line: a changelog, a history, a schedule.', ...page }),

  roadmap: z
    .object({
      type: z.literal('roadmap'),
      label: text('Label'),
      heading: text('Heading'),
      columns: list(
        'Columns',
        z.object({
          name: text('Name', 'now, next, later; or shipped, building, someday.'),
          items: list('Cards', z.object({ title: text('Title'), note: text('Note') })),
        }),
      ),
    })
    .meta({ title: 'Roadmap', description: 'A board of columns of cards.', ...page }),

  stats: z
    .object({
      type: z.literal('stats'),
      label: text('Label'),
      items: list('Numbers', z.object({ number: text('Number'), label: text('Label'), note: text('Note') })),
    })
    .meta({ title: 'Stats', description: 'A row of big numbers.', ...page }),

  cta: z
    .object({
      type: z.literal('cta'),
      heading: text('Heading'),
      text: rich('Text'),
      button: text('Button'),
      href: text('Button link'),
      secondary: text('Second link'),
      secondary_href: text('Second link to'),
      style: z.enum(['marker', 'ink', 'aeris']).meta({ title: 'Color' }),
    })
    .meta({ title: 'Call to action', description: 'A band with a heading, a line and a button.', ...page }),

  quotes: z
    .object({
      type: z.literal('quotes'),
      label: text('Label'),
      heading: text('Heading'),
      items: list('Quotes', z.object({ quote: long('Quote'), who: text('Who'), role: text('Role') })),
    })
    .meta({ title: 'Quotes', description: 'What people said, in cards.', ...page }),

  people: z
    .object({
      type: z.literal('people'),
      label: text('Label'),
      heading: text('Heading'),
      items: list(
        'People',
        z.object({
          name: text('Name'),
          role: text('Role'),
          bio: rich('Bio'),
          href: text('Link'),
          image: z.string().meta({ title: 'Photo', widget: 'image' }),
          tag: text('Tag', 'A short chip: human, agent, machine.'),
        }),
      ),
    })
    .meta({ title: 'People', description: 'Cards for a team, a cast, the credits.', ...page }),

  links: z
    .object({
      type: z.literal('links'),
      label: text('Label'),
      heading: text('Heading'),
      items: list('Links', z.object({ label: text('Label'), href: text('Link'), note: text('Note') })),
    })
    .meta({ title: 'Link list', description: 'Big stacked links, like a link-in-bio page.', ...page }),

  gallery: z
    .object({
      type: z.literal('gallery'),
      label: text('Label'),
      heading: text('Heading'),
      columns: z.enum(['2', '3', '4']).meta({ title: 'Columns' }),
      items: list('Images', z.object({ src: z.string().meta({ title: 'Image', widget: 'image' }), alt: text('Alt text'), caption: text('Caption'), href: text('Link') })),
    })
    .meta({ title: 'Gallery', description: 'A grid of images with captions.', ...page }),

  media: z
    .object({
      type: z.literal('media'),
      label: text('Label'),
      heading: text('Heading'),
      text: rich('Text'),
      image: z.string().meta({ title: 'Image', widget: 'image' }),
      alt: text('Alt text'),
      side: z.enum(['right', 'left']).meta({ title: 'Image side' }),
      button: text('Button'),
      href: text('Button link'),
    })
    .meta({ title: 'Media and text', description: 'An image beside a heading, text and a button.', ...page }),

  archive: z
    .object({
      type: z.literal('archive'),
      label: text('Label'),
      tags: z.boolean().meta({ title: 'Tag links', description: 'Show the tags, with counts, above the list.' }),
    })
    .meta({ title: 'Archive', description: 'Every post, grouped by year.', ...page }),

  table: z
    .object({
      type: z.literal('table'),
      label: text('Label'),
      heading: text('Heading'),
      columns: text('Columns', 'Column names, separated by |.'),
      rows: list('Rows', text('Row', 'Cells, separated by |.')),
    })
    .meta({ title: 'Table', description: 'Rows and columns: specs, comparisons, a kit list.', ...page }),

  status: z
    .object({
      type: z.literal('status'),
      label: text('Label'),
      heading: text('Heading'),
      updated: text('Updated'),
      items: list('Systems', z.object({ name: text('Name'), state: z.enum(['up', 'degraded', 'down', 'maintenance']).meta({ title: 'State' }), note: text('Note') })),
    })
    .meta({ title: 'Status board', description: 'Systems and whether they’re up.', ...page }),

  countdown: z
    .object({
      type: z.literal('countdown'),
      label: text('Label'),
      heading: text('Heading'),
      target: z.string().meta({ title: 'Counting down to', description: 'YYYY-MM-DDTHH:MM, Manila time.' }),
      done: text('When it hits zero'),
    })
    .meta({ title: 'Countdown', description: 'Days, hours, minutes and seconds to a moment.', ...page }),

  contact: z
    .object({
      type: z.literal('contact'),
      label: text('Label'),
      heading: text('Heading'),
      text: rich('Text'),
      email: text('Email'),
      items: list('Elsewhere', z.object({ label: text('Label'), value: text('Handle'), href: text('Link') })),
    })
    .meta({ title: 'Contact', description: 'An email to copy, and where else to find you.', ...page }),

  downloads: z
    .object({
      type: z.literal('downloads'),
      label: text('Label'),
      heading: text('Heading'),
      items: list('Files', z.object({ name: text('Name'), href: text('File'), size: text('Size'), note: text('Note') })),
    })
    .meta({ title: 'Downloads', description: 'Files to grab: logos, a press kit, releases.', ...page }),

  divider: z
    .object({
      type: z.literal('divider'),
      style: z.enum(['line', 'dots', 'zigzag', 'tape', 'gg']).meta({ title: 'Style' }),
      text: text('Text', 'For tape: the words on it.'),
    })
    .meta({ title: 'Divider', description: 'A break between sections.', ...page }),

  search: z
    .object({
      type: z.literal('search'),
      placeholder: text('Placeholder'),
    })
    .meta({ title: 'Search', description: 'Search every post and page (Pagefind). Press / to jump to it.', ...page }),

  heading: z
    .object({
      type: z.literal('heading'),
      kicker: text('Kicker', 'Small line above, like a label. Optional.'),
      title: text('Title'),
    })
    .meta({ title: 'Heading', description: 'A page title.', ...page }),

  prose: z
    .object({
      type: z.literal('prose'),
      markdown: z.string().meta({ title: 'Text', description: 'Markdown, with the same fenced blocks and image frames posts use.', widget: 'markdown' }),
    })
    .meta({ title: 'Text', description: 'Paragraphs of Markdown, like a post body.', ...page }),

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
      src: z.string().meta({ title: 'Image', description: 'Pick one or upload. In a post: ./file.png beside it; on a page: /media/file.png.', widget: 'image' }),
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
  // The home page: a hero row, the log, and a sidebar.
  home: ['top', 'main', 'aside'],
  // The header and footer on every page.
  frame: ['header', 'footer'],
  // A plain page at /<id>/, one column of blocks.
  basic: ['main'],
  // Every post page: blocks above the article and below it.
  post: ['top', 'bottom'],
} as const;

// Page ids that would collide with the site's own routes.
export const RESERVED = ['home', 'frame', 'post', 'log', 'blocks', 'desk', 'feed', '404', 'media', '_astro', 'tag', 'og', 'pagefind', 'sitemap'];

export const Page = z.object({
  title: z.string(),
  // A draft page shows in the desk's preview, never on the live site.
  draft: z.boolean().optional(),
  template: z.enum(Object.keys(TEMPLATES) as [keyof typeof TEMPLATES]),
  regions: z.record(z.string(), z.array(Block)),
});
