"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { BlogStatusBadge } from "@/components/badges";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import {
  blogPostsAdminService,
  type CreateBlogPostPayload,
  type UpdateBlogPostPayload,
} from "@/lib/api/blog-posts-admin";
import type { BlogPost, BlogPostStatus } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const statusValues = [
  "DRAFT",
  "PUBLISHED",
  "SCHEDULED",
  "ARCHIVED",
] as const;

const imageSchema = z.object({
  file: z
    .any()
    .refine(
      (value) => typeof File !== "undefined" && value instanceof File,
      "Selecione uma imagem",
    ),
  altText: z.string().optional().or(z.literal("")),
  caption: z.string().optional().or(z.literal("")),
  isCover: z.boolean().optional(),
});

const schema = z.object({
  title: z.string().min(3, "Informe o título"),
  slug: z.string().optional().or(z.literal("")),
  excerpt: z.string().optional().or(z.literal("")),
  content: z.string().min(10, "Escreva o conteúdo"),
  status: z.enum(statusValues),
  publishedAt: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  readingTimeMinutes: z.string().optional().or(z.literal("")),
  seoTitle: z.string().optional().or(z.literal("")),
  seoDescription: z.string().max(320).optional().or(z.literal("")),
  seoKeywords: z.string().optional().or(z.literal("")),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  clearImages: z.boolean().optional(),
  images: z.array(imageSchema),
});

type FormValues = z.infer<typeof schema>;

export function BlogPostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const isEdit = Boolean(post);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(post),
  });

  const imagesFA = useFieldArray({ control: form.control, name: "images" });
  const imageRows = useWatch({ control: form.control, name: "images" });
  const clearImages = useWatch({ control: form.control, name: "clearImages" });
  const status = useWatch({ control: form.control, name: "status" });
  const content = useWatch({ control: form.control, name: "content" });

  useEffect(() => {
    form.reset(buildDefaultValues(post));
  }, [form, post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (post) {
        return blogPostsAdminService.update(post.id, toUpdatePayload(values));
      }

      return blogPostsAdminService.create(toCreatePayload(values));
    },
    onSuccess: (savedPost) => {
      qc.setQueryData(queryKeys.blogPosts.byId(savedPost.id), savedPost);
      qc.invalidateQueries({ queryKey: queryKeys.blogPosts.all() });
      toast.success(
        isEdit ? t("blogCms.toast.updated") : t("blogCms.toast.created"),
      );
      router.push(`/blog-posts/${savedPost.id}`);
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : isEdit
            ? t("blogCms.error.update")
            : t("blogCms.error.create"),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!post) throw new Error("Post is required");
      return blogPostsAdminService.remove(post.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.blogPosts.all() });
      toast.success(t("blogCms.toast.deleted"));
      router.push("/blog-posts");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError ? err.displayMessage : t("blogCms.error.delete"),
      );
    },
  });

  const submit = (values: FormValues) => saveMutation.mutate(values);

  const submitAsPublished = () => {
    form.setValue("status", "PUBLISHED", { shouldDirty: true });
    if (!form.getValues("publishedAt")) {
      form.setValue("publishedAt", toDateTimeLocal(new Date()), {
        shouldDirty: true,
      });
    }
    void form.handleSubmit(submit)();
  };

  const handleEditorImageUpload = async (file: File) => {
    try {
      const uploaded = await blogPostsAdminService.uploadEditorImage(file);
      toast.success(t("blogCms.toast.imageUploaded"));
      return uploaded.url;
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : t("blogCms.error.imageUpload"),
      );
      throw err;
    }
  };

  const existingImages = post?.images ?? [];
  const canEdit = isAdmin && !saveMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/blog-posts">
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={post?.title ?? t("blogCms.new.title")}
        description={
          isEdit ? t("blogCms.edit.description") : t("blogCms.new.description")
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {post && (
              <BlogStatusBadge
                status={post.status}
                label={t(`blogCms.status.${post.status}`)}
              />
            )}
            {post?.status === "PUBLISHED" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/blog/${post.slug}`} target="_blank">
                  <ExternalLink className="size-4" />
                  {t("blogCms.form.viewPublic")}
                </Link>
              </Button>
            )}
            {post && isAdmin && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="size-4" />
                    {t("common.delete")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("blogCms.form.deleteTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("blogCms.form.deleteDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">{t("common.cancel")}</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      {t("common.delete")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <form
        onSubmit={form.handleSubmit(submit)}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
        noValidate
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("blogCms.form.main")}</CardTitle>
              <CardDescription>
                {t("blogCms.form.mainDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FieldError
                className="sm:col-span-2"
                label={t("blogCms.form.title")}
                htmlFor="blog-title"
                error={form.formState.errors.title?.message}
              >
                <Input
                  id="blog-title"
                  disabled={!canEdit}
                  {...form.register("title")}
                />
              </FieldError>

              <FieldError
                label={t("blogCms.form.slug")}
                htmlFor="blog-slug"
                error={form.formState.errors.slug?.message}
                hint={t("blogCms.form.slugHelp")}
              >
                <Input
                  id="blog-slug"
                  disabled={!canEdit}
                  {...form.register("slug")}
                />
              </FieldError>

              <div className="space-y-2">
                <Label htmlFor="blog-status">{t("blogCms.form.status")}</Label>
                <Select
                  value={status}
                  disabled={!canEdit}
                  onValueChange={(value) =>
                    form.setValue("status", value as BlogPostStatus, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="blog-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusValues.map((statusValue) => (
                      <SelectItem key={statusValue} value={statusValue}>
                        {t(`blogCms.status.${statusValue}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FieldError
                className="sm:col-span-2"
                label={t("blogCms.form.excerpt")}
                htmlFor="blog-excerpt"
                error={form.formState.errors.excerpt?.message}
              >
                <Textarea
                  id="blog-excerpt"
                  rows={3}
                  disabled={!canEdit}
                  placeholder={t("blogCms.form.excerptPlaceholder")}
                  {...form.register("excerpt")}
                />
              </FieldError>

              <FieldError
                label={t("blogCms.form.publishedAt")}
                htmlFor="blog-published-at"
                error={form.formState.errors.publishedAt?.message}
              >
                <Input
                  id="blog-published-at"
                  type="datetime-local"
                  disabled={!canEdit}
                  {...form.register("publishedAt")}
                />
              </FieldError>

              <FieldError
                label={t("blogCms.form.readingTime")}
                htmlFor="blog-reading-time"
                error={form.formState.errors.readingTimeMinutes?.message}
                hint={t("blogCms.form.readingTimeHelp")}
              >
                <Input
                  id="blog-reading-time"
                  type="number"
                  min={1}
                  max={120}
                  disabled={!canEdit}
                  {...form.register("readingTimeMinutes")}
                />
              </FieldError>

              <FieldError
                className="sm:col-span-2"
                label={t("blogCms.form.tags")}
                htmlFor="blog-tags"
                error={form.formState.errors.tags?.message}
                hint={t("blogCms.form.tagsHelp")}
              >
                <Input
                  id="blog-tags"
                  disabled={!canEdit}
                  placeholder={t("blogCms.form.tagsPlaceholder")}
                  {...form.register("tags")}
                />
              </FieldError>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("blogCms.form.content")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={content}
                disabled={!canEdit}
                placeholder={t("blogCms.form.editorPlaceholder")}
                onChange={(value) =>
                  form.setValue("content", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onImageUpload={handleEditorImageUpload}
              />
              {form.formState.errors.content && (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {form.formState.errors.content.message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("blogCms.form.coverImages")}</CardTitle>
                <CardDescription>
                  {t("blogCms.form.coverImagesDescription")}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEdit || clearImages}
                className="w-full sm:w-auto"
                onClick={() =>
                  imagesFA.append({
                    file: undefined,
                    altText: "",
                    caption: "",
                    isCover: imagesFA.fields.length === 0,
                  })
                }
              >
                <Plus className="size-4" />
                {t("blogCms.form.addImage")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingImages.length > 0 && !clearImages && (
                <div className="grid grid-cols-3 gap-2">
                  {existingImages
                    .toSorted((a, b) => a.position - b.position)
                    .map((image) => (
                      <figure
                        key={image.id}
                        className="overflow-hidden rounded-md border border-border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={image.altText ?? ""}
                          className="aspect-square w-full object-cover"
                        />
                        {image.isCover && (
                          <figcaption className="px-2 py-1 text-[11px] text-muted-foreground">
                            {t("blogCms.form.imageCover")}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                </div>
              )}

              {post && existingImages.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!clearImages}
                    disabled={!canEdit || imagesFA.fields.length > 0}
                    onCheckedChange={(checked) =>
                      form.setValue("clearImages", checked === true, {
                        shouldDirty: true,
                      })
                    }
                  />
                  {t("blogCms.form.clearImages")}
                </label>
              )}

              {imagesFA.fields.length === 0 && (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <ImageIcon className="size-4" />
                  {t("common.none")}
                </div>
              )}

              {imagesFA.fields.map((field, index) => {
                const selectedFile =
                  typeof File !== "undefined" &&
                  imageRows?.[index]?.file instanceof File
                    ? imageRows[index].file
                    : null;

                return (
                  <div
                    key={field.id}
                    className="space-y-3 rounded-md border border-border p-3"
                  >
                    <div className="flex flex-col gap-3 min-[420px]:flex-row">
                      <ImageFilePreview
                        file={selectedFile}
                        alt={
                          selectedFile
                            ? `${t("common.preview")} ${selectedFile.name}`
                            : t("common.preview")
                        }
                        className="size-24 shrink-0 min-[420px]:size-20"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          type="file"
                          accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                          className="w-full"
                          disabled={!canEdit}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            form.setValue(`images.${index}.file`, file, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                        />
                        {selectedFile && (
                          <p className="truncate text-xs text-muted-foreground">
                            {selectedFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <Input
                      placeholder={t("blogCms.form.imageAlt")}
                      disabled={!canEdit}
                      {...form.register(`images.${index}.altText` as const)}
                    />
                    <Input
                      placeholder={t("blogCms.form.imageCaption")}
                      disabled={!canEdit}
                      {...form.register(`images.${index}.caption` as const)}
                    />

                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <Checkbox
                          checked={!!imageRows?.[index]?.isCover}
                          disabled={!canEdit}
                          onCheckedChange={(checked) => {
                            if (checked === true) {
                              imagesFA.fields.forEach((_, fieldIndex) => {
                                form.setValue(
                                  `images.${fieldIndex}.isCover`,
                                  fieldIndex === index,
                                  { shouldDirty: true },
                                );
                              });
                              return;
                            }
                            form.setValue(`images.${index}.isCover`, false, {
                              shouldDirty: true,
                            });
                          }}
                        />
                        {t("blogCms.form.imageCover")}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        disabled={!canEdit}
                        aria-label={t("common.remove")}
                        onClick={() => imagesFA.remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {form.formState.errors.images?.[index]?.file && (
                      <p className="text-xs text-destructive" role="alert">
                        {String(
                          form.formState.errors.images[index]?.file?.message,
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("blogCms.form.seo")}</CardTitle>
              <CardDescription>
                {t("blogCms.form.seoDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldError
                label={t("blogCms.form.seoTitle")}
                htmlFor="blog-seo-title"
                error={form.formState.errors.seoTitle?.message}
              >
                <Input
                  id="blog-seo-title"
                  disabled={!canEdit}
                  {...form.register("seoTitle")}
                />
              </FieldError>

              <FieldError
                label={t("blogCms.form.seoMetaDescription")}
                htmlFor="blog-seo-description"
                error={form.formState.errors.seoDescription?.message}
              >
                <Textarea
                  id="blog-seo-description"
                  rows={3}
                  disabled={!canEdit}
                  {...form.register("seoDescription")}
                />
              </FieldError>

              <FieldError
                label={t("blogCms.form.seoKeywords")}
                htmlFor="blog-seo-keywords"
                error={form.formState.errors.seoKeywords?.message}
              >
                <Input
                  id="blog-seo-keywords"
                  disabled={!canEdit}
                  {...form.register("seoKeywords")}
                />
              </FieldError>

              <FieldError
                label={t("blogCms.form.canonicalUrl")}
                htmlFor="blog-canonical-url"
                error={form.formState.errors.canonicalUrl?.message}
              >
                <Input
                  id="blog-canonical-url"
                  type="url"
                  disabled={!canEdit}
                  {...form.register("canonicalUrl")}
                />
              </FieldError>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 sm:flex-row xl:flex-col">
            <Button
              type="submit"
              disabled={!canEdit}
              className={cn(!isAdmin && "pointer-events-none")}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isEdit ? t("blogCms.form.update") : t("blogCms.form.saveDraft")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit}
              onClick={submitAsPublished}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("blogCms.form.publish")}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}

function FieldError({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function buildDefaultValues(post?: BlogPost): FormValues {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    status: post?.status ?? "DRAFT",
    publishedAt: post?.publishedAt ? toDateTimeLocal(post.publishedAt) : "",
    tags: post?.tags.map((tag) => tag.name).join(", ") ?? "",
    readingTimeMinutes: post?.readingTimeMinutes
      ? String(post.readingTimeMinutes)
      : "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    seoKeywords: post?.seoKeywords ?? "",
    canonicalUrl: post?.canonicalUrl ?? "",
    clearImages: false,
    images: [],
  };
}

function toCreatePayload(values: FormValues): CreateBlogPostPayload {
  return {
    ...toSharedPayload(values),
    title: values.title,
    content: values.content,
  };
}

function toUpdatePayload(values: FormValues): UpdateBlogPostPayload {
  return toSharedPayload(values);
}

function toSharedPayload(values: FormValues): UpdateBlogPostPayload {
  return {
    title: values.title,
    slug: values.slug || undefined,
    excerpt: values.excerpt || undefined,
    content: values.content,
    contentFormat: "HTML",
    status: values.status,
    publishedAt: values.publishedAt
      ? new Date(values.publishedAt).toISOString()
      : undefined,
    tags: splitTags(values.tags),
    readingTimeMinutes: values.readingTimeMinutes
      ? Number(values.readingTimeMinutes)
      : undefined,
    seoTitle: values.seoTitle || undefined,
    seoDescription: values.seoDescription || undefined,
    seoKeywords: values.seoKeywords || undefined,
    canonicalUrl: values.canonicalUrl || undefined,
    clearImages: values.clearImages || undefined,
    images: values.images.map((image, index) => ({
      file: image.file as File,
      altText: image.altText || undefined,
      caption: image.caption || undefined,
      position: index,
      isCover: image.isCover ?? index === 0,
    })),
  };
}

function splitTags(value?: string) {
  return (
    value
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? []
  );
}

function toDateTimeLocal(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}
