import type { BlogPost } from "@/lib/api/types";

export function isPublicBlogPost(post: BlogPost, now = new Date()) {
  return (
    post.status === "PUBLISHED" &&
    (!post.publishedAt || new Date(post.publishedAt).getTime() <= now.getTime())
  );
}
