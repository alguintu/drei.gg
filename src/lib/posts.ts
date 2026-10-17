import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

// Published posts, newest first. Drafts, and posts dated in the future (scheduled),
// show up in `npm run dev` only; a build on or after a post's date publishes it.
export async function getPosts(): Promise<Post[]> {
  const now = Date.now();
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || (!data.draft && data.date.valueOf() <= now));
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function postUrl(post: Post) {
  return `/log/${post.id}/`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const LABELS: Record<Post['data']['tag'], string> = {
  ship: 'ship',
  build: 'notes',
  rant: 'rant',
  dead: 'rip',
};

export interface Series {
  name: string;
  slug: string;
  url: string;
  // Oldest first: part 1 is the earliest post.
  posts: Post[];
}

export function seriesSlug(name: string) {
  return name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-') || 'series';
}

// Every series, newest activity first. Posts are matched by series name, case and spacing ignored.
export function getSeries(posts: Post[]): Series[] {
  const all = new Map<string, Series>();
  for (const post of [...posts].sort((a, b) => a.data.date.valueOf() - b.data.date.valueOf())) {
    if (!post.data.series) continue;
    const slug = seriesSlug(post.data.series);
    const s = all.get(slug) ?? { name: post.data.series, slug, url: `/log/series/${slug}/`, posts: [] };
    s.posts.push(post);
    all.set(slug, s);
  }
  return [...all.values()].sort((a, b) => b.posts.at(-1)!.data.date.valueOf() - a.posts.at(-1)!.data.date.valueOf());
}
