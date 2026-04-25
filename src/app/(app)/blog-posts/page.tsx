"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Edit,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { RequireAdmin } from "@/components/auth/require-admin";
import { BlogStatusBadge } from "@/components/badges";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/client";
import {
  blogPostsAdminService,
  type ListAdminBlogPostsParams,
} from "@/lib/api/blog-posts-admin";
import type { BlogPost, BlogPostStatus } from "@/lib/api/types";
import { formatDateTime } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";

const statuses: BlogPostStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "SCHEDULED",
  "ARCHIVED",
];

export default function BlogPostsListPage() {
  return (
    <RequireAdmin>
      <BlogPostsListContent />
    </RequireAdmin>
  );
}

function BlogPostsListContent() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState<BlogPostStatus | "ALL">("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedTag = useDebouncedValue(tag, 300);

  const params: ListAdminBlogPostsParams = useMemo(
    () => ({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      tag: debouncedTag || undefined,
      status: status === "ALL" ? undefined : status,
    }),
    [page, debouncedSearch, debouncedTag, status],
  );

  const query = useQuery({
    queryKey: queryKeys.blogPosts.list(params),
    queryFn: () => blogPostsAdminService.list(params),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => blogPostsAdminService.removeMany([...selectedIds]),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: queryKeys.blogPosts.all() });
      toast.success(
        t("blogCms.toast.bulkDeleted", { count: result.deleted }),
      );
      setSelectedIds(new Set());
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError ? err.displayMessage : t("blogCms.error.delete"),
      );
    },
  });

  const currentPageIds = useMemo(
    () => query.data?.data.map((post) => post.id) ?? [],
    [query.data?.data],
  );

  const allCurrentSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.has(id));

  const toggleAllCurrent = useCallback((checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of currentPageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, [currentPageIds]);

  const toggleOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const columns = useMemo<ColumnDef<BlogPost>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={allCurrentSelected}
            aria-label={t("common.select")}
            onCheckedChange={(checked) => toggleAllCurrent(checked === true)}
          />
        ),
        size: 48,
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            aria-label={`${t("common.select")} ${row.original.title}`}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(checked) =>
              toggleOne(row.original.id, checked === true)
            }
          />
        ),
      },
      {
        id: "image",
        header: "",
        size: 64,
        cell: ({ row }) => {
          const cover =
            row.original.images.find((image) => image.isCover) ??
            row.original.images[0];

          return (
            <div className="flex size-11 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.url}
                  alt={cover.altText ?? row.original.title}
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground" />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: t("blogCms.table.post"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              /blog/{row.original.slug}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("blogCms.table.status"),
        cell: ({ row }) => (
          <BlogStatusBadge
            status={row.original.status}
            label={t(`blogCms.status.${row.original.status}`)}
          />
        ),
      },
      {
        id: "tags",
        header: t("blogCms.table.tags"),
        cell: ({ row }) => (
          <div className="flex max-w-56 flex-wrap gap-1">
            {row.original.tags.slice(0, 3).map((blogTag) => (
              <span
                key={blogTag.id}
                className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {blogTag.name}
              </span>
            ))}
            {row.original.tags.length === 0 && (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: t("blogCms.table.updated"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {row.original.status === "PUBLISHED" && (
              <Button asChild variant="ghost" size="icon" aria-label="Ver">
                <Link
                  href={`/blog/${row.original.slug}`}
                  target="_blank"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" aria-label="Editar">
              <Link
                href={`/blog-posts/${row.original.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                <Edit className="size-4" />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [allCurrentSelected, selectedIds, t, toggleAllCurrent, toggleOne],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("blogCms.list.title")}
        description={t("blogCms.list.description")}
        actions={
          <Button asChild>
            <Link href="/blog-posts/new">
              <Plus className="size-4" />
              {t("blogCms.list.new")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,24rem)_13rem_12rem]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("blogCms.list.searchPlaceholder")}
              className="pl-8"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
            />
          </div>
          <Input
            placeholder={t("blogCms.list.tagPlaceholder")}
            value={tag}
            onChange={(event) => {
              setPage(1);
              setTag(event.target.value);
            }}
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setPage(1);
              setStatus(value as BlogPostStatus | "ALL");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                {t("blogCms.list.allStatuses")}
              </SelectItem>
              {statuses.map((statusOption) => (
                <SelectItem key={statusOption} value={statusOption}>
                  {t(`blogCms.status.${statusOption}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="size-4" />
                {t("blogCms.list.bulkDelete")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("blogCms.list.bulkConfirmTitle")}</DialogTitle>
                <DialogDescription>
                  {t("blogCms.table.selected", { count: selectedIds.size })}
                  {" · "}
                  {t("blogCms.list.bulkConfirmDescription")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">{t("common.cancel")}</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={bulkDeleteMutation.isPending}
                  onClick={() => bulkDeleteMutation.mutate()}
                >
                  {bulkDeleteMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {t("common.delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable
        data={query.data?.data ?? []}
        columns={columns}
        meta={query.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        emptyMessage={t("blogCms.list.empty")}
      />
    </div>
  );
}
