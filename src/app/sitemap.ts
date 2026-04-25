import type { MetadataRoute } from "next";
import {
  getAllPublishedBlogPosts,
  getBlogPostCover,
} from "@/lib/api/blog-posts";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const posts = (await getAllPublishedBlogPosts(100, { strict: true })).filter(
    (post) => !post.canonicalUrl || post.canonicalUrl.startsWith(siteUrl),
  );

  return [
    {
      url: absoluteUrl("/blog"),
      lastModified: posts[0]?.updatedAt ?? new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...posts.map((post) => {
      const cover = getBlogPostCover(post);

      return {
        url: post.canonicalUrl ?? absoluteUrl(`/blog/${post.slug}`),
        lastModified: post.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        images: cover ? [cover.url] : undefined,
      };
    }),
  ];
}
