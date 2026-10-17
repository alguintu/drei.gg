# drei.gg

A devlog. We build things and post about them. Static Astro site, hosted on DigitalOcean App Platform.

## Run it

```sh
npm install
npm run dev      # http://localhost:4321, drafts included
npm run build    # static output in dist/
```

Node 22.12 or newer.

## Write a post

```sh
npm run new -- "Post title" ship   # ship | build | rant | dead
```

That creates `src/content/posts/post-title.md` with `draft: true`. Drafts show in `npm run dev` only; delete the line to publish.

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
| `kicker`  | no       | Short word on the cover, up to 14 characters. Defaults to the tag |
| `image`   | no       | The cover image (`./shot.png`). Every layout is built around it |
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

Every post gets a cover built around its `image`: the photo is the main element and the layout frames it with color blocks, dot grids, hatching, corner brackets, a stamp or a brush stroke. Red only ever shows up as small ticks and dots. There are 12 layouts (`giveaway`, `streetwear`, `everyday`, `offset`, `overlay`, `bracket`, `tiles`, `caption`, `quarter`, `spread`, `lshape`, `mono`) in 3 palettes. Leave `layout` and `palette` out and the post's filename picks them, which keeps neighbouring posts from looking alike. A post with no image still gets a cover; the image slot becomes a hatched panel. Run `npm run dev` and open `/blocks` to see every combination.

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

## Edit the home page

`src/data/site.ts` holds the killfeed ticker, the inventory slots and the house rules. Styles are in `src/styles/global.css`; colors are tokens at the top (ink, ribbon red, marker yellow, with blue only for links, numbers and tags).

## Deploy

Every push to `main` rebuilds and deploys. First-time setup:

1. Create the app from the spec: `doctl apps create --spec .do/app.yaml` (or in the DigitalOcean dashboard, Create App → this repo, which picks up `.do/app.yaml`).
2. Point drei.gg's nameservers at DigitalOcean (`ns1/ns2/ns3.digitalocean.com`). The spec adds `drei.gg` and `www.drei.gg`; DigitalOcean issues the certificates.
