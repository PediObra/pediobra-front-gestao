import { getRecentBlogPosts } from "./blog-listing";
import type { BlogPost } from "./api/types";

const post = (id: number): BlogPost =>
  ({
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    status: "PUBLISHED",
    content: "<p>conteudo</p>",
    contentFormat: "HTML",
    readingTimeMinutes: 1,
    publishedAt: "2026-04-25T03:44:48.546Z",
    createdAt: "2026-04-25T03:44:48.597Z",
    updatedAt: "2026-04-25T03:44:48.597Z",
    authorUserId: 1,
    ctaOpenInNewTab: false,
    images: [],
    tags: [],
    author: null,
  }) as BlogPost;

describe("getRecentBlogPosts", () => {
  it("keeps the featured post visible in the recent article grid", () => {
    const posts = [post(1), post(2)];

    expect(getRecentBlogPosts(posts)).toEqual(posts);
  });
});
