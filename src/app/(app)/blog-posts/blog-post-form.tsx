"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { BlogStatusBadge } from "@/components/badges";
import {
  BlogPostPreview,
  getPreviewCoverImage,
} from "@/components/blog/blog-post-preview";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { KeywordInput } from "@/components/forms/keyword-input";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { TagAutocompleteInput } from "@/components/forms/tag-autocomplete-input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import {
  blogPostsAdminService,
  type CreateBlogPostPayload,
  type UpdateBlogPostPayload,
} from "@/lib/api/blog-posts-admin";
import type { BlogPost } from "@/lib/api/types";
import {
  getPublishFields,
  joinCommaList,
  parseCommaList,
  slugifyBlogSlug,
  toDateTimeLocal,
} from "@/lib/blog-post-editor";
import { syncBlogPostMutationCaches } from "@/lib/blog-post-cache";
import { hasBlogPostCta, isValidBlogCtaHref } from "@/lib/blog-cta";
import { isPublicBlogPost } from "@/lib/blog-visibility";
import { useI18n } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const blogPostStatusValues = [
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
  slug: z.string().min(1, "Informe o slug"),
  excerpt: z.string().optional().or(z.literal("")),
  content: z.string().min(10, "Escreva o conteúdo"),
  status: z.enum(blogPostStatusValues),
  publishedAt: z.string().optional().or(z.literal("")),
  tags: z.string().refine((value) => parseCommaList(value).length > 0, {
    message: "Adicione ao menos uma categoria",
  }),
  readingTimeMinutes: z.string().optional().or(z.literal("")),
  seoTitle: z.string().min(1, "Informe o título SEO"),
  seoDescription: z
    .string()
    .min(1, "Informe a descrição SEO")
    .max(320),
  seoKeywords: z
    .string()
    .refine((value) => parseCommaList(value).length > 0, {
      message: "Adicione ao menos uma palavra-chave",
    }),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  ctaTitle: z.string().max(160).optional().or(z.literal("")),
  ctaDescription: z.string().optional().or(z.literal("")),
  ctaButtonText: z.string().max(80).optional().or(z.literal("")),
  ctaHref: z.string().max(2048).optional().or(z.literal("")),
  ctaOpenInNewTab: z.boolean().optional(),
  clearImages: z.boolean().optional(),
  images: z.array(imageSchema),
}).superRefine((values, ctx) => {
  const hasCtaInput = Boolean(
    values.ctaTitle?.trim() ||
      values.ctaDescription?.trim() ||
      values.ctaButtonText?.trim() ||
      values.ctaHref?.trim() ||
      values.ctaOpenInNewTab,
  );

  if (!hasCtaInput) return;

  if (!values.ctaTitle?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Informe o título do CTA",
      path: ["ctaTitle"],
    });
  }

  if (!values.ctaButtonText?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Informe o texto do botão",
      path: ["ctaButtonText"],
    });
  }

  if (!values.ctaHref?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Informe o link do botão",
      path: ["ctaHref"],
    });
    return;
  }

  if (!isValidBlogCtaHref(values.ctaHref)) {
    ctx.addIssue({
      code: "custom",
      message: "Use https://, /pagina, mailto: ou tel:",
      path: ["ctaHref"],
    });
  }
});

type FormValues = z.infer<typeof schema>;

export function BlogPostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale, t } = useI18n();
  const { isAdmin } = useAuth();
  const isEdit = Boolean(post);
  const autoSlugRef = useRef(shouldAutoSyncSlug(post));
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(post),
  });

  const imagesFA = useFieldArray({ control: form.control, name: "images" });
  const imageRows = useWatch({ control: form.control, name: "images" });
  const clearImages = useWatch({ control: form.control, name: "clearImages" });
  const title = useWatch({ control: form.control, name: "title" });
  const slug = useWatch({ control: form.control, name: "slug" });
  const excerpt = useWatch({ control: form.control, name: "excerpt" });
  const publishedAt = useWatch({ control: form.control, name: "publishedAt" });
  const tags = useWatch({ control: form.control, name: "tags" });
  const readingTimeMinutes = useWatch({
    control: form.control,
    name: "readingTimeMinutes",
  });
  const seoDescription = useWatch({
    control: form.control,
    name: "seoDescription",
  });
  const content = useWatch({ control: form.control, name: "content" });
  const seoKeywords = useWatch({
    control: form.control,
    name: "seoKeywords",
  });
  const ctaTitle = useWatch({ control: form.control, name: "ctaTitle" });
  const ctaDescription = useWatch({
    control: form.control,
    name: "ctaDescription",
  });
  const ctaButtonText = useWatch({
    control: form.control,
    name: "ctaButtonText",
  });
  const ctaHref = useWatch({ control: form.control, name: "ctaHref" });
  const ctaOpenInNewTab = useWatch({
    control: form.control,
    name: "ctaOpenInNewTab",
  });
  const ctaPreviewConfigured = hasBlogPostCta({
    ctaTitle,
    ctaDescription,
    ctaButtonText,
    ctaHref,
  });
  const tagOptionsQuery = useQuery({
    queryKey: queryKeys.blogPosts.tags(),
    queryFn: blogPostsAdminService.listTags,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });
  const categorySuggestions = useMemo(
    () => tagOptionsQuery.data?.map((tag) => tag.name) ?? [],
    [tagOptionsQuery.data],
  );

  useEffect(() => {
    autoSlugRef.current = shouldAutoSyncSlug(post);
    form.reset(buildDefaultValues(post));
  }, [form, post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (post) {
        return blogPostsAdminService.update(post.id, toUpdatePayload(values));
      }

      return blogPostsAdminService.create(toCreatePayload(values));
    },
    onSuccess: async (savedPost) => {
      await syncBlogPostMutationCaches(qc, {
        savedPost,
        previousPost: post,
      });
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
    onSuccess: async (deletedPost) => {
      await syncBlogPostMutationCaches(qc, {
        deletedPosts: [deletedPost ?? post],
        deletedPostIds: post ? [post.id] : [],
      });
      toast.success(t("blogCms.toast.deleted"));
      router.push("/blog-posts");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError
          ? err.displayMessage
          : t("blogCms.error.delete"),
      );
    },
  });

  const existingImages = post?.images ?? [];
  const canEdit = isAdmin && !saveMutation.isPending;

  const saveValues = (values: FormValues) => {
    if (!hasRequiredPostImage(values, existingImages)) {
      form.setError("images", {
        type: "manual",
        message: t("blogCms.form.imageRequired"),
      });
      setActiveTab("edit");
      return;
    }

    form.clearErrors("images");
    saveMutation.mutate(values);
  };

  const submit = (values: FormValues) => {
    saveValues({
      ...values,
      status: post?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    });
  };

  const submitAsPublished = () => {
    form.setValue("status", "PUBLISHED", { shouldDirty: true });
    void form.handleSubmit(saveValues)();
  };

  const setSlugValue = (value: string, shouldDirty = true) => {
    form.setValue("slug", slugifyEditableSlug(value), {
      shouldDirty,
      shouldValidate: true,
    });
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
            {post && isPublicBlogPost(post) && (
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

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "edit" | "preview")}
      >
        <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList aria-label={t("blogCms.preview.tabsLabel")}>
            <TabsTrigger value="edit">
              <Edit3 className="size-4" aria-hidden="true" />
              {t("blogCms.preview.editTab")}
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="size-4" aria-hidden="true" />
              {t("blogCms.preview.previewTab")}
            </TabsTrigger>
          </TabsList>
          <p className="text-xs text-muted-foreground">
            {t("blogCms.preview.helper")}
          </p>
        </div>

        <TabsContent value="edit">
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
                      value={title ?? ""}
                      disabled={!canEdit}
                      onChange={(event) => {
                        const nextTitle = event.target.value;
                        form.setValue("title", nextTitle, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });

                        if (autoSlugRef.current) {
                          setSlugValue(nextTitle);
                        }
                      }}
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
                      value={slug ?? ""}
                      disabled={!canEdit}
                      onChange={(event) => {
                        const nextSlug = slugifyEditableSlug(
                          event.target.value,
                        );
                        autoSlugRef.current =
                          !nextSlug || nextSlug === slugifyEditableSlug(title);
                        setSlugValue(nextSlug);
                      }}
                    />
                  </FieldError>

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
                    hint={t("blogCms.form.publishedAtHelp")}
                  >
                    <DateTimePicker
                      id="blog-published-at"
                      value={publishedAt}
                      disabled={!canEdit}
                      placeholder={t("blogCms.form.publishNow")}
                      dateLabel={t("blogCms.form.publishDate")}
                      timeLabel={t("blogCms.form.publishTime")}
                      clearLabel={t("blogCms.form.clearPublishDate")}
                      nowLabel={t("blogCms.form.useNow")}
                      locale={locale}
                      onChange={(value) =>
                        form.setValue("publishedAt", value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
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
                      placeholder={t("blogCms.form.readingTimePlaceholder")}
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
                    <TagAutocompleteInput
                      id="blog-tags"
                      value={tags}
                      suggestions={categorySuggestions}
                      disabled={!canEdit}
                      placeholder={t("blogCms.form.tagsPlaceholder")}
                      ariaLabel={t("blogCms.form.tags")}
                      addLabel={t("common.add")}
                      removeLabel={t("common.remove")}
                      emptyLabel={t("blogCms.form.noCategories")}
                      createLabel={t("blogCms.form.createCategory")}
                      suggestionsLabel={t("blogCms.form.categorySuggestions")}
                      noSuggestionsLabel={t(
                        "blogCms.form.noCategorySuggestions",
                      )}
                      loading={tagOptionsQuery.isLoading}
                      loadingLabel={t("blogCms.form.loadingCategories")}
                      onChange={(value) =>
                        form.setValue("tags", value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
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

              <Card className="overflow-hidden border-primary/20">
                <CardHeader className="border-b border-border bg-[linear-gradient(135deg,rgba(196,123,36,.10),transparent_44%,rgba(47,125,103,.10))]">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                      <Megaphone className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <CardTitle>{t("blogCms.form.cta")}</CardTitle>
                      <CardDescription>
                        {t("blogCms.form.ctaDescription")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <div className="overflow-hidden rounded-md border border-border bg-[#241f18] text-[#fffaf0] shadow-sm dark:bg-background">
                    <div className="bg-[linear-gradient(90deg,rgba(255,250,240,.08)_1px,transparent_1px),linear-gradient(rgba(255,250,240,.07)_1px,transparent_1px)] bg-[size:22px_22px] p-4">
                      <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f2c77d]">
                        {t("blogCms.form.ctaPreviewEyebrow")}
                      </p>
                      <p className="mt-2 break-words text-lg font-semibold leading-tight">
                        {ctaTitle?.trim() ||
                          t("blogCms.form.ctaPreviewTitle")}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#fff4dc]/75">
                        {ctaDescription?.trim() ||
                          t("blogCms.form.ctaPreviewDescription")}
                      </p>
                      <span className="mt-4 inline-flex max-w-full items-center gap-2 rounded-md bg-[#f2c77d] px-3 py-2 text-xs font-semibold text-[#241f18]">
                        <span className="truncate">
                          {ctaButtonText?.trim() ||
                            t("blogCms.form.ctaPreviewButton")}
                        </span>
                        <LinkIcon className="size-3.5 shrink-0" />
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldError
                      className="sm:col-span-2"
                      label={t("blogCms.form.ctaTitle")}
                      htmlFor="blog-cta-title"
                      error={form.formState.errors.ctaTitle?.message}
                    >
                      <Input
                        id="blog-cta-title"
                        disabled={!canEdit}
                        placeholder={t("blogCms.form.ctaTitlePlaceholder")}
                        {...form.register("ctaTitle")}
                      />
                    </FieldError>

                    <FieldError
                      className="sm:col-span-2"
                      label={t("blogCms.form.ctaDescriptionLabel")}
                      htmlFor="blog-cta-description"
                      error={form.formState.errors.ctaDescription?.message}
                    >
                      <Textarea
                        id="blog-cta-description"
                        rows={3}
                        disabled={!canEdit}
                        placeholder={t(
                          "blogCms.form.ctaDescriptionPlaceholder",
                        )}
                        {...form.register("ctaDescription")}
                      />
                    </FieldError>

                    <FieldError
                      label={t("blogCms.form.ctaButtonText")}
                      htmlFor="blog-cta-button-text"
                      error={form.formState.errors.ctaButtonText?.message}
                    >
                      <Input
                        id="blog-cta-button-text"
                        disabled={!canEdit}
                        placeholder={t("blogCms.form.ctaButtonPlaceholder")}
                        {...form.register("ctaButtonText")}
                      />
                    </FieldError>

                    <FieldError
                      label={t("blogCms.form.ctaHref")}
                      htmlFor="blog-cta-href"
                      error={form.formState.errors.ctaHref?.message}
                      hint={t("blogCms.form.ctaHrefHelp")}
                    >
                      <Input
                        id="blog-cta-href"
                        disabled={!canEdit}
                        placeholder={t("blogCms.form.ctaHrefPlaceholder")}
                        {...form.register("ctaHref")}
                      />
                    </FieldError>
                  </div>

                  <label
                    htmlFor="blog-cta-new-tab"
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/40 p-3"
                  >
                    <Checkbox
                      id="blog-cta-new-tab"
                      checked={ctaOpenInNewTab === true}
                      disabled={!canEdit}
                      onCheckedChange={(checked) =>
                        form.setValue("ctaOpenInNewTab", checked === true, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    <span className="grid gap-1 text-sm">
                      <span className="font-medium">
                        {t("blogCms.form.ctaOpenInNewTab")}
                      </span>
                      <span className="text-xs leading-5 text-muted-foreground">
                        {t("blogCms.form.ctaOpenInNewTabHelp")}
                      </span>
                    </span>
                  </label>

                  {!ctaPreviewConfigured && (
                    <p className="text-xs text-muted-foreground">
                      {t("blogCms.form.ctaOptionalHelp")}
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
                  <div className="rounded-md border border-amber-500/25 bg-amber-500/10 p-3 text-sm dark:border-primary/25 dark:bg-primary/10">
                    <p className="font-semibold text-foreground">
                      {t("blogCms.form.imageSpecsTitle")}
                    </p>
                    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-1">
                      <div>
                        <dt className="font-medium text-muted-foreground">
                          {t("blogCms.form.imageSpecsResolutionLabel")}
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {t("blogCms.form.imageSpecsResolutionValue")}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">
                          {t("blogCms.form.imageSpecsRatioLabel")}
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {t("blogCms.form.imageSpecsRatioValue")}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">
                          {t("blogCms.form.imageSpecsFormatsLabel")}
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {t("blogCms.form.imageSpecsFormatsValue")}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">
                          {t("blogCms.form.imageSpecsSizeLabel")}
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {t("blogCms.form.imageSpecsSizeValue")}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {t("blogCms.form.imageSpecsHelp")}
                    </p>
                  </div>

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
                      {t("blogCms.form.imageRequiredEmpty")}
                    </div>
                  )}

                  {form.formState.errors.images?.message && (
                    <p className="text-xs text-destructive" role="alert">
                      {form.formState.errors.images.message}
                    </p>
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
                                form.setValue(
                                  `images.${index}.isCover`,
                                  false,
                                  {
                                    shouldDirty: true,
                                  },
                                );
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
                              form.formState.errors.images[index]?.file
                                ?.message,
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
                    <KeywordInput
                      id="blog-seo-keywords"
                      value={seoKeywords}
                      disabled={!canEdit}
                      placeholder={t("blogCms.form.seoKeywordsPlaceholder")}
                      addLabel={t("common.add")}
                      removeLabel={t("common.remove")}
                      emptyLabel={t("blogCms.form.noSeoKeywords")}
                      onChange={(value) =>
                        form.setValue("seoKeywords", value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
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
                  {isEdit
                    ? t("blogCms.form.update")
                    : t("blogCms.form.saveDraft")}
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
        </TabsContent>

        <TabsContent value="preview">
          <BlogPostPreview
            title={title}
            slug={slug}
            excerpt={excerpt}
            content={content}
            publishedAt={publishedAt}
            readingTimeMinutes={readingTimeMinutes}
            seoDescription={seoDescription}
            tags={tags}
            cta={{
              ctaTitle,
              ctaDescription,
              ctaButtonText,
              ctaHref,
              ctaOpenInNewTab,
            }}
            authorName={post?.author?.name}
            coverImage={getPreviewCoverImage({
              imageRows,
              existingImages,
              clearImages,
            })}
            onExitPreview={() => setActiveTab("edit")}
          />
        </TabsContent>
      </Tabs>
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
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
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
    tags: joinCommaList(post?.tags.map((tag) => tag.name) ?? []),
    readingTimeMinutes: post?.readingTimeMinutes
      ? String(post.readingTimeMinutes)
      : "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    seoKeywords: joinCommaList(parseCommaList(post?.seoKeywords)),
    canonicalUrl: post?.canonicalUrl ?? "",
    ctaTitle: post?.ctaTitle ?? "",
    ctaDescription: post?.ctaDescription ?? "",
    ctaButtonText: post?.ctaButtonText ?? "",
    ctaHref: post?.ctaHref ?? "",
    ctaOpenInNewTab: post?.ctaOpenInNewTab ?? false,
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
  const publishFields =
    values.status === "PUBLISHED"
      ? getPublishFields(values.publishedAt)
      : undefined;

  return {
    title: values.title,
    slug: values.slug || undefined,
    excerpt: values.excerpt || undefined,
    content: values.content,
    contentFormat: "HTML",
    status: values.status,
    publishedAt:
      publishFields?.publishedAt ??
      (values.publishedAt
        ? new Date(values.publishedAt).toISOString()
        : undefined),
    tags: parseCommaList(values.tags),
    readingTimeMinutes: values.readingTimeMinutes
      ? Number(values.readingTimeMinutes)
      : undefined,
    seoTitle: values.seoTitle || undefined,
    seoDescription: values.seoDescription || undefined,
    seoKeywords: joinCommaList(parseCommaList(values.seoKeywords)) || undefined,
    canonicalUrl: values.canonicalUrl || undefined,
    ctaTitle: values.ctaTitle?.trim() ?? "",
    ctaDescription: values.ctaDescription?.trim() ?? "",
    ctaButtonText: values.ctaButtonText?.trim() ?? "",
    ctaHref: values.ctaHref?.trim() ?? "",
    ctaOpenInNewTab: values.ctaOpenInNewTab === true,
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

function shouldAutoSyncSlug(post?: BlogPost) {
  if (!post?.slug) return true;
  return post.slug === slugifyEditableSlug(post.title);
}

function slugifyEditableSlug(value?: string) {
  return value?.trim() ? slugifyBlogSlug(value) : "";
}

function hasRequiredPostImage(
  values: FormValues,
  existingImages: BlogPost["images"],
) {
  const hasNewImage =
    typeof File !== "undefined" &&
    values.images.some((image) => image.file instanceof File);

  return hasNewImage || (existingImages.length > 0 && !values.clearImages);
}
