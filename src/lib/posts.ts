import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

// Published posts, newest first. Drafts show up in `npm run dev` only.
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
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
