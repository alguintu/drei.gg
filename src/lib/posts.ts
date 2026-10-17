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
