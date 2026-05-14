"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { BlogPost } from "@/lib/api/types";
import { getAuthSnapshot } from "@/lib/auth/store";
import {
  normalizePublicBlogSlugs,
  PUBLIC_BLOG_REVALIDATION_ENDPOINT,
} from "@/lib/public-blog-cache";
import { queryKeys } from "@/lib/query-keys";

type BlogPostCacheTarget = Pick<BlogPost, "id" | "slug">;

export interface BlogPostCacheSyncOptions {
  savedPost?: BlogPost;
  previousPost?: BlogPostCacheTarget | null;
  deletedPosts?: Array<BlogPostCacheTarget | null | undefined>;
  deletedPostIds?: number[];
}

export async function syncBlogPostMutationCaches(
  queryClient: QueryClient,
  {
    savedPost,
    previousPost,
    deletedPosts = [],
    deletedPostIds = [],
  }: BlogPostCacheSyncOptions,
) {
  if (savedPost) {
    queryClient.setQueryData(queryKeys.blogPosts.byId(savedPost.id), savedPost);
  }

  const deletedIds = new Set([
    ...deletedPostIds,
    ...deletedPosts
      .map((post) => post?.id)
      .filter((id): id is number => typeof id === "number"),
  ]);

  for (const id of deletedIds) {
    queryClient.removeQueries({
      queryKey: queryKeys.blogPosts.byId(id),
      exact: true,
    });
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.blogPosts.tags() }),
  ]);

  await revalidatePublicBlogCache({
    slugs: [
      previousPost?.slug,
      savedPost?.slug,
      ...deletedPosts.map((post) => post?.slug),
    ],
  });
}

async function revalidatePublicBlogCache({ slugs }: { slugs: unknown[] }) {
  const token = getAuthSnapshot().accessToken;

  if (!token) {
    warnCacheRevalidation("Missing access token for blog cache revalidation.");
    return;
  }

  try {
    const response = await fetch(PUBLIC_BLOG_REVALIDATION_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slugs: normalizePublicBlogSlugs(slugs),
      }),
    });

    if (!response.ok) {
      throw new Error(`Blog cache revalidation failed: ${response.status}`);
    }
  } catch (error) {
    warnCacheRevalidation(error);
  }
}

function warnCacheRevalidation(error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.warn(error);
  }
}
