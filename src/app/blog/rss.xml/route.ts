import {
  getAllPublishedBlogPosts,
  getBlogPostDescription,
} from "@/lib/api/blog-posts";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";

export async function GET() {
  let posts;

  try {
    posts = await getAllPublishedBlogPosts(100, { strict: true });
  } catch {
    return new Response("Blog feed temporarily unavailable.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "300",
      },
    });
  }

  const updatedAt = posts[0]?.updatedAt ?? new Date().toISOString();
  const items = posts
    .map(
      (post) => `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${absoluteUrl(`/blog/${post.slug}`)}</link>
  <guid>${absoluteUrl(`/blog/${post.slug}`)}</guid>
  <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
  <description>${escapeXml(getBlogPostDescription(post))}</description>
</item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Blog ${SITE_NAME}</title>
  <link>${absoluteUrl("/blog")}</link>
  <description>Guias práticos sobre materiais de construção, entrega e planejamento de obra.</description>
  <language>pt-BR</language>
  <lastBuildDate>${new Date(updatedAt).toUTCString()}</lastBuildDate>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
