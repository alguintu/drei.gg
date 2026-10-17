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

Patch notes go in a `notes` block:

````md
```notes
+ added something
- removed something
~ changed something
! broke something
```
````

## Images

Put a post in its own folder and keep its images beside it:

```
src/content/posts/my-post/index.md
src/content/posts/my-post/screenshot.png
```

Reference them relatively, `![what it shows](./screenshot.png)`. Astro resizes and compresses them at build time. Videos, GIFs and downloads go in a DigitalOcean Space with the CDN on; link to them from the post.

## Edit the home page

`src/data/site.ts` holds the killfeed ticker, the inventory slots and the house rules. Styles are in `src/styles/global.css`; colors are tokens at the top (ink, ribbon red, marker yellow, with blue only for links, numbers and tags).

## Deploy

Every push to `main` rebuilds and deploys. First-time setup:

1. Create the app from the spec: `doctl apps create --spec .do/app.yaml` (or in the DigitalOcean dashboard, Create App → this repo, which picks up `.do/app.yaml`).
2. Point drei.gg's nameservers at DigitalOcean (`ns1/ns2/ns3.digitalocean.com`). The spec adds `drei.gg` and `www.drei.gg`; DigitalOcean issues the certificates.
