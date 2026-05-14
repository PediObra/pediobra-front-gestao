import { isPublicBlogPost } from "@/lib/blog-visibility";
import { shouldUseUnoptimizedBlogImage } from "./blog-posts";
import type { BlogPost } from "./types";

const basePost: BlogPost = {
  id: 1,
  authorUserId: 7,
  title: "Guia de materiais",
  slug: "guia-de-materiais",
  excerpt: null,
  content: "<p>conteudo</p>",
  contentFormat: "HTML",
  status: "PUBLISHED",
  seoTitle: null,
  seoDescription: null,
  seoKeywords: null,
  canonicalUrl: null,
  ctaTitle: null,
  ctaDescription: null,
  ctaButtonText: null,
  ctaHref: null,
  ctaOpenInNewTab: false,
  readingTimeMinutes: 1,
  publishedAt: "2026-04-24T12:00:00.000Z",
  createdAt: "2026-04-24T11:00:00.000Z",
  updatedAt: "2026-04-24T11:00:00.000Z",
  images: [],
  tags: [],
  author: null,
};

describe("isPublicBlogPost", () => {
  it("only allows published posts whose publish date has arrived", () => {
    const now = new Date("2026-04-24T12:30:00.000Z");

    expect(isPublicBlogPost(basePost, now)).toBe(true);
    expect(isPublicBlogPost({ ...basePost, status: "DRAFT" }, now)).toBe(false);
    expect(
      isPublicBlogPost(
        { ...basePost, publishedAt: "2026-04-24T13:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });
});

describe("shouldUseUnoptimizedBlogImage", () => {
  it("bypasses Next Image optimization for local media origins", () => {
    expect(
      shouldUseUnoptimizedBlogImage("http://localhost:9000/bucket/image.png"),
    ).toBe(true);
    expect(
      shouldUseUnoptimizedBlogImage("http://127.0.0.1:9000/bucket/image.png"),
    ).toBe(true);
  });

  it("keeps remote production media optimized", () => {
    expect(
      shouldUseUnoptimizedBlogImage("https://media.pediobra.com.br/image.png"),
    ).toBe(false);
  });
});
