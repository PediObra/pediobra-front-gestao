import { cache } from "react";
import { API_URL } from "./base-url";
import type { BlogPost, Paginated } from "./types";

export interface ListBlogPostsParams {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
}

const BLOG_REVALIDATE_SECONDS = Number(
  process.env.NEXT_PUBLIC_BLOG_REVALIDATE_SECONDS ?? 300,
);

function buildUrl(path: string, params?: ListBlogPostsParams) {
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    API_URL.endsWith("/") ? API_URL : API_URL + "/",
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchBlogJson<T>(
  url: string,
  options: { strict?: boolean } = {},
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: BLOG_REVALIDATE_SECONDS,
        tags: ["blog-posts"],
      },
    });

    if (response.status === 404 && !options.strict) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Blog request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (options.strict) {
      throw error;
    }

    if (process.env.NODE_ENV === "development") {
      console.warn(error);
    }

    return null;
  }
}

export const getBlogPosts = cache(
  async (
    page = 1,
    limit = 12,
    search?: string,
    tag?: string,
    strict = false,
  ): Promise<Paginated<BlogPost>> => {
    const response = await fetchBlogJson<Paginated<BlogPost>>(
      buildUrl("/blog-posts", { page, limit, search, tag }),
      { strict },
    );

    if (!response && strict) {
      throw new Error("Blog posts response was empty.");
    }

    return (
      response ?? {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      }
    );
  },
);

export const getBlogPostBySlug = cache(async (slug: string) => {
  return fetchBlogJson<BlogPost>(
    buildUrl(`/blog-posts/slug/${encodeURIComponent(slug)}`),
  );
});

export async function getAllPublishedBlogPosts(
  limit = 100,
  options: { strict?: boolean } = {},
) {
  const firstPage = await getBlogPosts(
    1,
    limit,
    undefined,
    undefined,
    options.strict,
  );

  if (firstPage.meta.totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
      getBlogPosts(index + 2, limit, undefined, undefined, options.strict),
    ),
  );

  return [...firstPage.data, ...remainingPages.flatMap((page) => page.data)];
}

export function getBlogPostCover(post: BlogPost) {
  const cover =
    post.images.find((image) => image.isCover) ??
    post.images.toSorted((a, b) => a.position - b.position)[0] ??
    null;

  return cover ? { ...cover, url: normalizeMediaUrl(cover.url) } : null;
}

export function getBlogPostDescription(post: BlogPost) {
  return (
    post.seoDescription ??
    post.excerpt ??
    stripHtml(post.content).slice(0, 155)
  ).trim();
}

export function getBlogPostKeywords(post: BlogPost) {
  const explicitKeywords =
    post.seoKeywords
      ?.split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean) ?? [];

  return [
    ...new Set([
      ...explicitKeywords,
      ...post.tags.map((tag) => tag.name),
      "material de construção",
      "obra",
      "PediObra",
    ]),
  ];
}

export function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMediaUrl(value: string) {
  try {
    return new URL(value).toString();
  } catch {
    return new URL(value, API_URL.endsWith("/") ? API_URL : API_URL + "/")
      .toString()
      .replace(/([^:]\/)\/+/g, "$1");
  }
}

export type { BlogPost };
