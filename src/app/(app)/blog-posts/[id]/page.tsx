"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { RequireAdmin } from "@/components/auth/require-admin";
import { BlogPostForm } from "../blog-post-form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { blogPostsAdminService } from "@/lib/api/blog-posts-admin";
import { queryKeys } from "@/lib/query-keys";

export default function BlogPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RequireAdmin>
      <BlogPostDetailContent params={params} />
    </RequireAdmin>
  );
}

function BlogPostDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const postId = Number(id);

  const query = useQuery({
    queryKey: queryKeys.blogPosts.byId(postId),
    queryFn: () => blogPostsAdminService.getById(postId),
    enabled: Number.isFinite(postId),
  });

  if (query.isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[34rem] w-full" />
        <Skeleton className="h-[34rem] w-full" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Artigo não encontrado.
        </CardContent>
      </Card>
    );
  }

  return <BlogPostForm post={query.data} />;
}
