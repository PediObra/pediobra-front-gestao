"use client";

import { ArrowLeft, CalendarDays, Clock3, EyeOff } from "lucide-react";
import { BlogPostCta } from "@/components/blog/blog-post-cta";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { Button } from "@/components/ui/button";
import type { BlogPostCtaFields } from "@/lib/blog-cta";
import {
  getBlogPostDescriptionFromContent,
  normalizeArticleHtml,
  stripHtml,
} from "@/lib/blog-html";
import { parseCommaList, slugifyBlogSlug } from "@/lib/blog-post-editor";
import { formatDate } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n";

export interface BlogPreviewCoverImage {
  file?: File | null;
  url?: string | null;
  altText?: string | null;
  caption?: string | null;
}

export function BlogPostPreview({
  title,
  slug,
  excerpt,
  content,
  publishedAt,
  readingTimeMinutes,
  seoDescription,
  tags,
  cta,
  coverImage,
  authorName,
  onExitPreview,
}: {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  publishedAt?: string;
  readingTimeMinutes?: string;
  seoDescription?: string;
  tags?: string;
  cta?: BlogPostCtaFields;
  coverImage?: BlogPreviewCoverImage | null;
  authorName?: string | null;
  onExitPreview: () => void;
}) {
  const { t } = useI18n();
  const displayTitle = title?.trim() || t("blogCms.preview.untitled");
  const displaySlug = slug?.trim() || slugifyBlogSlug(displayTitle);
  const displayContent =
    content?.trim() || `<p>${t("blogCms.preview.emptyContent")}</p>`;
  const description =
    getBlogPostDescriptionFromContent({
      content: displayContent,
      excerpt,
      seoDescription,
    }) || t("blogCms.preview.emptyDescription");
  const tagLabels = parseCommaList(tags);
  const readMinutes = readingTimeMinutes ? Number(readingTimeMinutes) : 0;
  const hasCoverImage = Boolean(coverImage?.file || coverImage?.url);

  return (
    <section
      aria-label={t("blogCms.preview.previewTab")}
      className="overflow-hidden rounded-md border border-border bg-background shadow-sm"
    >
      <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("blogCms.preview.mode")}
          </p>
          <p className="mt-1 truncate text-sm font-medium">
            /blog/{displaySlug}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onExitPreview}>
          <EyeOff className="size-4" aria-hidden="true" />
          {t("blogCms.preview.exit")}
        </Button>
      </div>

      <main className="blog-theme min-h-screen bg-[#f7f3ea] text-[#241f18] dark:bg-background dark:text-foreground">
        <div className="border-b border-[#241f18]/10 bg-[#f7f3ea]/95 dark:border-border dark:bg-background/95">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <span className="truncate font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#5a4b37] dark:text-primary">
              {t("blog.public.brand")}
            </span>
            <span className="text-sm font-semibold text-[#241f18] dark:text-foreground">
              {t("blog.public.backToSite")}
            </span>
          </nav>
        </div>

        <article>
          <header className="border-b border-[#241f18]/10 bg-[#fffaf0] dark:border-border dark:bg-background">
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,0.8fr)] lg:px-8 lg:py-14">
              <div className="flex flex-col justify-center">
                <span className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#6a4c1f] dark:text-primary">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  {t("blogCms.preview.backToBlog")}
                </span>
                <nav
                  aria-label={t("blogCms.preview.breadcrumb")}
                  className="mt-8 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#7b6f60] dark:text-muted-foreground"
                >
                  <ol className="flex flex-wrap gap-2">
                    <li>{t("blogCms.preview.blog")}</li>
                    <li aria-hidden="true">/</li>
                    <li
                      aria-current="page"
                      className="line-clamp-1 min-w-0 break-words text-[#241f18] dark:text-foreground"
                    >
                      {displayTitle}
                    </li>
                  </ol>
                </nav>
                <h1 className="blog-display mt-5 break-words text-balance text-3xl font-semibold leading-[1.05] text-[#241f18] dark:text-foreground sm:text-5xl sm:leading-[1.02] lg:text-6xl">
                  {displayTitle}
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-7 text-[#5b5145] dark:text-muted-foreground sm:text-lg sm:leading-8">
                  {description}
                </p>
                {tagLabels.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {tagLabels.map((tag) => (
                      <span
                        key={tag}
                        className="max-w-full break-words rounded-full border border-[#241f18]/10 bg-[#f4ead8] px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#695847] dark:border-border dark:bg-accent dark:text-accent-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#6d6255] dark:text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    <time dateTime={publishedAt || undefined}>
                      {publishedAt
                        ? formatDate(publishedAt)
                        : t("blogCms.preview.publishNow")}
                    </time>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {t("blogCms.preview.readMinutes", {
                      minutes:
                        readMinutes || estimateReadingTime(displayContent),
                    })}
                  </span>
                </div>
              </div>

              <figure className="overflow-hidden rounded-[8px] border border-[#241f18]/10 bg-[#fffaf4] shadow-2xl shadow-[#241f18]/10 dark:border-border dark:bg-card dark:shadow-black/20">
                <div className="relative aspect-[4/3] bg-[#e6dcc9] lg:aspect-[5/4]">
                  {hasCoverImage ? (
                    <ImageFilePreview
                      file={coverImage?.file}
                      src={coverImage?.url}
                      alt={coverImage?.altText || displayTitle}
                      className="absolute inset-0 size-full rounded-none border-0"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#d8c7a6,#fff6e2_48%,#a8b4a7)]" />
                  )}
                </div>
                {coverImage?.caption && (
                  <figcaption className="border-t border-[#241f18]/10 px-4 py-3 text-xs leading-5 text-[#65594b] dark:border-border dark:text-muted-foreground">
                    {coverImage.caption}
                  </figcaption>
                )}
              </figure>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,740px)_300px] lg:px-8">
            <div className="min-w-0">
              <div
                className="blog-prose"
                dangerouslySetInnerHTML={{
                  __html: normalizeArticleHtml(displayContent, displayTitle),
                }}
              />
              <BlogPostCta
                cta={cta ?? {}}
                eyebrow={t("blogCms.preview.ctaEyebrow")}
                supportText={t("blogCms.preview.ctaSupport")}
              />
            </div>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-[8px] border border-[#241f18]/10 bg-[#fffaf4] p-5 dark:border-border dark:bg-card">
                <h2 className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#7b5b25] dark:text-primary">
                  {t("blogCms.preview.details")}
                </h2>
                <p className="mt-5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#7b5b25] dark:text-primary">
                  {t("blogCms.preview.publishedBy")}
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {authorName || "ObraFlow"}
                </p>
                <dl className="mt-5 space-y-3 text-sm text-[#65594b] dark:text-muted-foreground">
                  <div>
                    <dt className="font-semibold text-[#241f18] dark:text-foreground">
                      {t("blogCms.preview.reading")}
                    </dt>
                    <dd>
                      {t("blogCms.preview.minutes", {
                        minutes:
                          readMinutes || estimateReadingTime(displayContent),
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </article>
      </main>
    </section>
  );
}

function estimateReadingTime(content: string) {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getPreviewCoverImage({
  imageRows,
  existingImages,
  clearImages,
}: {
  imageRows?: Array<{
    file?: unknown;
    altText?: string;
    caption?: string;
    isCover?: boolean;
  }>;
  existingImages?: Array<{
    url: string;
    altText?: string | null;
    caption?: string | null;
    position: number;
    isCover: boolean;
  }>;
  clearImages?: boolean;
}): BlogPreviewCoverImage | null {
  const selectedRows =
    typeof File === "undefined"
      ? []
      : (imageRows?.filter((image) => image.file instanceof File) ?? []);
  const selectedCover =
    selectedRows.find((image) => image.isCover) ?? selectedRows[0];

  if (selectedCover?.file instanceof File) {
    return {
      file: selectedCover.file,
      altText: selectedCover.altText,
      caption: selectedCover.caption,
    };
  }

  if (clearImages) {
    return null;
  }

  const existingCover =
    existingImages?.find((image) => image.isCover) ??
    existingImages?.toSorted((a, b) => a.position - b.position)[0];

  return existingCover
    ? {
        url: existingCover.url,
        altText: existingCover.altText,
        caption: existingCover.caption,
      }
    : null;
}
