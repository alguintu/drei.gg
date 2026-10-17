# drei.gg

A devlog. We build things and post about them. Static Astro site, hosted on DigitalOcean App Platform.

## Run it

```sh
npm install
npm run dev      # http://localhost:4321, drafts included
npm run build    # static output in dist/
```

Node 22.12 or newer.

## Write a post in the desk

```sh
npm run desk
```

Open http://localhost:4320. The desk is a local editor: post list on the left, a form for the front matter and cover (image, layout, palette, and one box per text slot on the chosen layout), the Markdown body with buttons for every block, and the real site running in `astro dev` as a live preview, split beside the editor or in a popup, at desktop or phone width. Every change saves straight to `src/content/posts` and the preview reloads. Drop an image on the body to upload it beside the post and insert it with a frame. **publish** commits the post and pushes the current branch; the live site redeploys when `main` changes. It only listens on localhost.

The sidebar has **Pages** (the home page, and the header & footer every page shares) above **Posts**. A page is a stack of blocks in regions: drag a block to reorder it, move it to another region, remove it, or add one, and edit the open block's slots in its form. The preview is also the editor: hover to see blocks and slots outlined, click one to open it in the form with the field focused, and double-click plain text to edit it in place (Enter saves, Esc cancels). **catalog** turns the preview into a catalog for the open post: every cover layout drawn with the post's own words and image (click one to use it, with a palette toggle), and every block and image frame (click one to insert it at the cursor). The catalog is a dev-only page; it's never built for the live site.

More in the desk: **↶ ↷** undo and redo (Ctrl+Z / Ctrl+Shift+Z outside a text field) across forms, blocks and edits made in the preview; **discard** puts the open post or page back to its last published version; **⌘K** (Ctrl+K) opens a palette to jump to anything, add a block, switch the preview, or publish. **publish** runs a real `astro build` first and refuses to push if the site doesn't build.

Social cards: every post's cover becomes its link-preview image, `public/og/<post>.jpg` (and `site.jpg`, the top of the home page, for everything else). The desk takes them with the Chrome or Chromium on the machine (set `CHROME_PATH` if it's elsewhere): **retake card** in a post, "Retake all social cards" in the palette, and automatically on publish. Pages without a card simply have no `og:image`.

The desk's editor is a small React app in `scripts/desk/app`, built by Vite each time the desk starts. React and the editor's other packages are dev dependencies; the live site ships none of it.

## Write a post

```sh
npm run new -- "Post title" ship   # ship | build | rant | dead
```

That creates `src/content/posts/post-title/index.md` with `draft: true`. Drafts show in `npm run dev` only; delete the line to publish.

Front matter:

| field     | required | notes                                                     |
|-----------|----------|-----------------------------------------------------------|
| `title`   | yes      |                                                           |
| `date`    | yes      | `2026-10-17`                                              |
| `tag`     | yes      | `ship`, `build`, `rant` or `dead`                         |
| `label`   | no       | Short text in the meta column, e.g. `v0.0.2`              |
| `summary` | no       | Used for the RSS feed and link previews                   |
| `draft`   | no       | `true` hides the post from the built site                 |
| `layout`  | no       | Cover layout (see below). Picked from the filename if unset |
| `palette` | no       | `marker` (white and yellow), `aeris` (white and teal) or `ink` (black and yellow). Picked from the filename if unset |
| `cover`   | no       | The cover's words, one per text slot (see below). Blank slots use the layout's default |
| `image`   | no       | The cover image (`./shot.png`). Posts with one get an image layout |
| `image_alt` | no     | Alt text for `image`                                      |

Patch notes go in a `notes` block:

````md
```notes
+ added something
- removed something
~ changed something
! broke something
```
````

## Covers and blocks

Every post gets a cover. Image layouts make the post's `image` the main element and frame it with color blocks, dot grids, hatching, corner brackets, a stamp, a brush stroke, a polaroid, a filmstrip or a browser window. Type layouts work with words alone (the kicker repeated, a giant number, spaced letters over a brush stroke, a script hashtag, a terminal), and each also has an image slot that appears when the post has an image, so they double as image layouts. Red only ever shows up as small ticks and dots.

Image layouts (28): `giveaway`, `streetwear`, `everyday`, `offset`, `bracket`, `tiles`, `caption`, `quarter`, `spread`, `lshape`, `split`, `circle`, `twin`, `ushape`, `bleed`, `arch`, `polaroid`, `filmstrip`, `browser`, `bubbles`, `porthole`, `triptych`, `slab`, `quadrant`, `banner`, `tilt`, `glow`, `duo`.

Type layouts (18): `repeat`, `arc`, `stripes`, `bignum`, `collection`, `clearance`, `wild`, `promo`, `quote`, `term`, `tips`, `xband`, `marquee`, `orb`, `glyph`, `pill`, `poster`, `tower`.

Each comes in 3 palettes. Leave `layout` and `palette` out and the post's filename picks them, from all 46 when the post has an image and from the 18 type layouts when it doesn't, which keeps neighbouring posts from looking alike. Run `npm run dev` and open `/blocks` to see every combination.

### Cover text

Every word on a cover is a text slot: the title and summary (they default to the post's own, so a cover can carry a shorter line), the kicker, the footer line, "read it", "new post", the stamp ring, the terminal command and so on. Each layout lists its slots and their defaults in `SLOTS` in `src/lib/cover.ts`, and `/blocks` prints them under each layout. Fill the ones you want under `cover:`; the rest keep their defaults.

```yaml
layout: promo
cover:
  kicker: v0.2
  pre: hot take
  foot: "filed {date} from aeris"
```

Defaults and your own values can use tokens: `{date}` (16 Oct 2026), `{dd}`, `{mm}`, `{label}` (" · v0.1", or nothing), `{title}`, `{summary}`, `{tag}` (shipped, build, rant, rip), `{kicker}`, `{script}` (the kicker as one lowercase word) and `{initial}` (its first character). The kicker defaults to the tag; for `bignum` and `tips` set it to a number (`kicker: "80%"`), and for `glyph` set `glyph: "?"`. Quote a value that starts with `{`.

Inside a post, fenced blocks turn into designed blocks:

| fence      | what it makes                                                       |
|------------|---------------------------------------------------------------------|
| `notes`    | Patch notes (`+` added, `-` removed, `~` changed, `!` broke)         |
| `callout`  | Yellow box with corner brackets. First line is the heading          |
| `aeris`    | Same, in teal                                                        |
| `pull`     | Pull quote. A line starting with `-- ` is the attribution           |
| `bignum`   | Giant number; first line is the number, the rest is the caption     |
| `shout`    | One to four short lines set huge: solid, outline, then on yellow. One line repeats |
| `tape`     | A line of text on black tape                                         |

## Images

Put a post in its own folder and keep its images beside it:

```
src/content/posts/my-post/index.md
src/content/posts/my-post/screenshot.png
```

Reference them relatively, `![what it shows](./screenshot.png)`. Astro resizes and compresses them at build time.

Give an image a frame with its title, `"frame | caption"`:

```md
![the home page](./home.png "offset | the new home page")
```

Frames: `offset` (on a yellow block), `teal` (on teal), `bracket` (corner brackets), `rounded` (rounded corner with a yellow tab), `quarter` (black and white with a yellow quarter circle), `tape` (caption on black tape). Videos, GIFs and downloads go in a DigitalOcean Space with the CDN on; link to them from the post.

## The desk for agents (MCP)

`npm run desk:mcp` runs the desk as an MCP server over stdio, so an agent can do what the desk does: `desk_status`, `block_types` (every block's schema, the templates, cover layouts), `read_post` / `new_post` / `write_post` / `insert_post_block`, `read_page` / `new_page` / `write_page` / `edit_page_block`, `preview` (a screenshot of any page, desktop or phone, so the agent can look at what it made), `retake_cards`, `discard`, and `publish`. It talks to the running desk, so start `npm run desk` first; every write goes through the desk's checks (page schemas, allowed layouts and tags, and the build before publishing).

Claude Code picks it up from `.mcp.json` in the repo. For Codex, add to `~/.codex/config.toml`:

```toml
[mcp_servers.drei-desk]
command = "node"
args = ["/path/to/drei.gg/scripts/desk-mcp.mjs"]
```

## Pages and blocks

Pages are made of blocks. A block is an Astro component in `src/blocks/` whose slots (its text, lists and choices) are a zod schema in `src/blocks/schema.ts`. Blocks are atomic: they hold slots, never other blocks. A page is a JSON file in `src/content/pages/`: a template, and for each of the template's regions, a list of blocks with their slot values. `home.json` is the home page (regions `top`, `main`, `aside`); `frame.json` is the header and footer on every page. In rich text slots, `==text==` is highlighted and `*text*` is italic.

Templates: `home` (regions `top`, `main`, `aside`), `frame` (`header`, `footer`), `post` (`top` and `bottom`, around the article on every post page; `post.json`), and `basic`, one column at `/<id>/`. **+ new page** in the desk makes a basic page from a title (About → `/about/`) starting with a Heading and a Text block; Text blocks take Markdown with the same fenced blocks and frames as posts. Link a new page from the header to put it in the nav. Images for pages upload to `public/media/` and are served at `/media/<file>`; image slots in the desk pick from those, or from a post's own images in a post, with an upload button.

To add a block type: write its schema in `BLOCKS`, its component in `src/blocks/`, and map it in `src/blocks/Blocks.astro`. The desk builds its form from the schema. In dev, blocks and slots carry `data-desk-*` attributes so the desk can map clicks in the preview to fields; production builds have none.

There are two kinds. Page blocks (header, footer, hero, killfeed, post log, inventory, rules, scoreboard, heading, text, **post list** for the newest posts of a tag as rows or covers, **embed** for a YouTube video, GitHub repo card or link card, and **cover**, which shows any post's cover and links to it) live on pages. Post blocks (callout, aeris, pull, bignum, shout, tape, notes, and the framed image) are what a post's Markdown fences write, and pages can use them too. Each post block is defined once in `src/lib/post-blocks.mjs`: how to read it from its fence, write it back as Markdown, and draw it. The Markdown renderer, page blocks, the desk's toolbar and the catalog all use that one definition.

In the desk, click a post block in a post's preview (or put the cursor in one and press **edit ✎**) and it opens in a form above the body; the form writes the Markdown back as you type. Styles are in `src/styles/global.css`; colors are tokens at the top (ink, ribbon red, marker yellow, with blue only for links, numbers and tags).

## Deploy

Every push to `main` rebuilds and deploys. First-time setup:

1. Create the app from the spec: `doctl apps create --spec .do/app.yaml` (or in the DigitalOcean dashboard, Create App → this repo, which picks up `.do/app.yaml`).
2. Point drei.gg's nameservers at DigitalOcean (`ns1/ns2/ns3.digitalocean.com`). The spec adds `drei.gg` and `www.drei.gg`; DigitalOcean issues the certificates.
