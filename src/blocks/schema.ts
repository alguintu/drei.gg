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

  links: z
    .object({
      type: z.literal('links'),
      label: text('Label'),
      items: list('Links', z.object({ label: text('Label'), href: text('Link'), note: text('Note', 'A short line under the label. Optional.').optional() })),
    })
    .meta({ title: 'Link stack', description: 'Big stacked links, one per line: a links page, a launch’s calls to action.', ...page }),

  roadmap: z
    .object({
      type: z.literal('roadmap'),
      label: text('Label'),
      columns: list('Columns', z.object({ title: text('Title', 'Now, Next, Later…'), items: list('Items', text('Item')) })).max(4),
    })
    .meta({ title: 'Roadmap', description: 'Two to four columns of what’s now, next and later.', ...page }),

  faq: z
    .object({
      type: z.literal('faq'),
      label: text('Label'),
      items: list('Questions', z.object({ q: text('Question'), a: rich('Answer') })),
    })
    .meta({ title: 'Questions', description: 'Questions and short answers; each opens on click.', ...page }),

  masthead: z
    .object({
      type: z.literal('masthead'),
      kicker: text('Kicker', 'Small line above the title. Optional.'),
      title: rich('Title', '==marked== words get the yellow marker.'),
      lede: rich('Lede', 'One or two sentences under the title. Optional.'),
      image: z.string().optional().meta({ title: 'Image', description: 'Optional; sits beside the title. /media/file.png', widget: 'image' }),
      image_alt: text('Image alt').optional(),
      buttons: list('Buttons', z.object({ label: text('Label'), href: text('Link'), style: z.enum(['solid', 'ghost']).meta({ title: 'Style' }) })),
      size: z.enum(['big', 'huge']).meta({ title: 'Size', description: 'huge is for landing pages.' }),
    })
    .meta({ title: 'Masthead', description: 'A page’s big opening: kicker, title, lede, buttons, an optional image.', ...page }),

  features: z
    .object({
      type: z.literal('features'),
      label: text('Label'),
      columns: z.enum(['2', '3', '4']).meta({ title: 'Columns' }),
      items: list('Features', z.object({ mark: text('Mark', 'A glyph, number or short word shown big: 01, ⌘, GG…'), title: text('Title'), text: rich('Text') })),
    })
    .meta({ title: 'Features', description: 'A grid of features or services, each with a mark, title and line.', ...page }),

  pricing: z
    .object({
      type: z.literal('pricing'),
      label: text('Label'),
      tiers: list(
        'Tiers',
        z.object({
          name: text('Name'),
          price: text('Price', '$0, $9, “ask”…'),
          period: text('Period', '/mo, once, forever… Optional.').optional(),
          pitch: text('Pitch'),
          features: list('Includes', text('Line')),
          cta_label: text('Button'),
          cta_href: text('Button link'),
          featured: z.boolean().meta({ title: 'Featured', description: 'Highlighted in yellow.' }),
        }),
      ).max(4),
      note: text('Note under the tiers', 'Optional.').optional(),
    })
    .meta({ title: 'Pricing', description: 'One to four price tiers side by side.', ...page }),

  testimonials: z
    .object({
      type: z.literal('testimonials'),
      label: text('Label'),
      items: list('Quotes', z.object({ quote: long('Quote'), name: text('Name'), role: text('Role or handle'), href: text('Link', 'Optional.').optional() })),
    })
    .meta({ title: 'Wall of quotes', description: 'Things people said, as a wall of cards.', ...page }),

  people: z
    .object({
      type: z.literal('people'),
      label: text('Label'),
      items: list(
        'People',
        z.object({
          name: text('Name'),
          role: text('Role'),
          image: z.string().optional().meta({ title: 'Photo', description: 'Optional; a monogram if left out.', widget: 'image' }),
          href: text('Link', 'Optional.').optional(),
        }),
      ),
    })
    .meta({ title: 'People', description: 'Cards for a team, collaborators, agents or sponsors.', ...page }),

  timeline: z
    .object({
      type: z.literal('timeline'),
      label: text('Label'),
      items: list('Entries', z.object({ date: text('When'), title: text('Title'), text: rich('Text') })),
    })
    .meta({ title: 'Timeline', description: 'Dated entries down a line: a history, a release log, a story.', ...page }),

  stats: z
    .object({
      type: z.literal('stats'),
      label: text('Label'),
      items: list('Numbers', z.object({ number: text('Number'), label: text('What it counts') })).max(6),
    })
    .meta({ title: 'Stats', description: 'A row of big numbers.', ...page }),

  gallery: z
    .object({
      type: z.literal('gallery'),
      label: text('Label'),
      columns: z.enum(['2', '3', '4']).meta({ title: 'Columns' }),
      images: list(
        'Images',
        z.object({
          src: z.string().optional().meta({ title: 'Image', description: 'Optional; a grey placeholder if left out.', widget: 'image' }),
          alt: text('Alt text'),
          caption: text('Caption', 'Optional.').optional(),
          href: text('Link', 'Optional.').optional(),
        }),
      ),
    })
    .meta({ title: 'Gallery', description: 'A grid of images: work, screenshots, a press kit.', ...page }),

  split: z
    .object({
      type: z.literal('split'),
      kicker: text('Kicker'),
      title: rich('Title'),
      body: z.string().meta({ title: 'Text', description: 'Markdown.', widget: 'markdown' }),
      image: z.string().optional().meta({ title: 'Image', description: 'Optional; a hatched panel if left out.', widget: 'image' }),
      image_alt: text('Image alt').optional(),
      side: z.enum(['left', 'right']).meta({ title: 'Image side' }),
      cta_label: text('Button', 'Optional.').optional(),
      cta_href: text('Button link').optional(),
    })
    .meta({ title: 'Image and text', description: 'An image beside a block of text, either side.', ...page }),

  cta: z
    .object({
      type: z.literal('cta'),
      kicker: text('Kicker'),
      title: rich('Title'),
      text: rich('Text', 'Optional.').optional(),
      buttons: list('Buttons', z.object({ label: text('Label'), href: text('Link'), style: z.enum(['solid', 'ghost']).meta({ title: 'Style' }) })),
      tone: z.enum(['marker', 'ink', 'paper']).meta({ title: 'Tone', description: 'marker is yellow, ink is black, paper is plain.' }),
    })
    .meta({ title: 'Call to action', description: 'A banner that asks for one thing.', ...page }),

  steps: z
    .object({
      type: z.literal('steps'),
      label: text('Label'),
      items: list('Steps', z.object({ title: text('Title'), text: rich('Text') })),
    })
    .meta({ title: 'Steps', description: 'Numbered steps: how it works, how to start.', ...page }),

  logos: z
    .object({
      type: z.literal('logos'),
      label: text('Label'),
      items: list(
        'Names',
        z.object({
          name: text('Name'),
          src: z.string().optional().meta({ title: 'Logo', description: 'Optional; the name is set in type if left out.', widget: 'image' }),
          href: text('Link', 'Optional.').optional(),
        }),
      ),
    })
    .meta({ title: 'Logo strip', description: 'Names or logos in a row: clients, stack, “as seen in”.', ...page }),

  countdown: z
    .object({
      type: z.literal('countdown'),
      label: text('Label'),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/).meta({ title: 'Counting down to', description: 'YYYY-MM-DD or YYYY-MM-DDTHH:MM (Manila time).' }),
      done: text('When it hits zero'),
    })
    .meta({ title: 'Countdown', description: 'Days, hours, minutes to a date: a launch, an event.', ...page }),

  contact: z
    .object({
      type: z.literal('contact'),
      label: text('Label'),
      email: text('Email', 'Shown big, as a mailto link. Optional.').optional(),
      note: rich('Note', 'Optional.').optional(),
      items: list('Elsewhere', z.object({ label: text('Where'), value: text('Handle'), href: text('Link') })),
    })
    .meta({ title: 'Contact', description: 'An email set big, and handles elsewhere.', ...page }),

  specs: z
    .object({
      type: z.literal('specs'),
      label: text('Label'),
      rows: list('Rows', z.object({ key: text('Name'), value: rich('Value') })),
    })
    .meta({ title: 'Spec sheet', description: 'Name and value rows: hardware, facts, terms.', ...page }),

  listing: z
    .object({
      type: z.literal('listing'),
      label: text('Label'),
      items: list(
        'Entries',
        z.object({
          meta: text('Meta', 'Date, type or place, in the left column.'),
          title: text('Title'),
          detail: text('Detail', 'Optional.').optional(),
          tag: text('Tag', 'A small chip on the right: remote, sold out, new… Optional.').optional(),
          href: text('Link', 'Optional.').optional(),
        }),
      ),
    })
    .meta({ title: 'Listing', description: 'Rows with a meta column: events, jobs, talks, press, downloads.', ...page }),

  toc: z
    .object({
      type: z.literal('toc'),
      label: text('Label'),
      items: list('Links', z.object({ label: text('Label'), href: text('Link', '#section or /page/') })),
    })
    .meta({ title: 'Contents', description: 'A compact list of links: a page’s contents, a docs sidebar.', ...page }),

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
  // A full-width page at /<id>/: sections run edge to edge, for landing pages.
  wide: ['main'],
  // A page at /<id>/ with a sidebar: about, uses, a project.
  sidebar: ['main', 'aside'],
  // A docs page at /<id>/: a sticky contents column on the left.
  docs: ['nav', 'main'],
} as const;

// Templates whose pages live at /<id>/ (src/pages/[page].astro); the rest are built in.
export const PAGE_TEMPLATES = ['basic', 'wide', 'sidebar', 'docs'] as const;

// Page ids that would collide with the site's own routes.
export const RESERVED = ['home', 'frame', 'post', 'log', 'blocks', 'desk', 'feed', '404', 'media', '_astro', 'tag', 'og', 'pagefind', 'sitemap', 'templates'];

export const Page = z.object({
  title: z.string(),
  // A draft page shows in the desk's preview, never on the live site.
  draft: z.boolean().optional(),
  template: z.enum(Object.keys(TEMPLATES) as [keyof typeof TEMPLATES]),
  regions: z.record(z.string(), z.array(Block)),
});
