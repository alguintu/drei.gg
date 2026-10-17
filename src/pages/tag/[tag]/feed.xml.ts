import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../../../lib/posts';

// One feed per tag, at /tag/<tag>/feed.xml.
export function getStaticPaths() {
  return ['ship', 'build', 'rant', 'dead'].map((tag) => ({ params: { tag } }));
}

export async function GET(context: APIContext) {
  const tag = context.params.tag!;
  const posts = (await getPosts()).filter((p) => p.data.tag === tag);
  return rss({
    title: `drei.gg · ${tag}`,
    description: `drei.gg posts tagged ${tag}.`,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      categories: [post.data.tag],
      link: postUrl(post),
    })),
  });
}
