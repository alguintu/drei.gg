import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getPosts, postUrl, LABELS } from '../lib/posts';

// Every public page: home, archive, tags, posts and pages made in the desk.
export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const pages = await getCollection('pages', ({ data }) => data.template === 'basic');
  const urls: [string, Date?][] = [
    ['/', posts[0]?.data.date],
    ['/log/', posts[0]?.data.date],
    ...Object.keys(LABELS).map((t): [string] => [`/log/tag/${t}/`]),
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
