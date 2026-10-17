import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PAGE_TEMPLATES } from '../blocks/schema';
import { getPosts, getSeries, postUrl, LABELS } from '../lib/posts';

// Every public page: home, archive, tags, series, posts and pages made in the desk.
export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const pages = await getCollection('pages', ({ data }) => (PAGE_TEMPLATES as readonly string[]).includes(data.template) && !data.draft);
  const urls: [string, Date?][] = [
    ['/', posts[0]?.data.date],
    ['/log/', posts[0]?.data.date],
    ...Object.keys(LABELS).map((t): [string] => [`/tag/${t}/`]),
    ...getSeries(posts).flatMap((s): [string, Date][] => [[s.url, s.posts.at(-1)!.data.date]]),
    ...posts.map((p): [string, Date] => [postUrl(p), p.data.date]),
    ...pages.map((p): [string] => [`/${p.id}/`]),
  ];
  const body = urls
    .map(([path, date]) => `  <url><loc>${new URL(path, site)}</loc>${date ? `<lastmod>${date.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml' },
  });
};
