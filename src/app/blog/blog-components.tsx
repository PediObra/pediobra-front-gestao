import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Search } from "lucide-react";
import {
  getBlogPostCover,
  getBlogPostDescription,
  stripHtml,
  type BlogPost,
} from "@/lib/api/blog-posts";
import { formatDate } from "@/lib/formatters";
import {
  DEFAULT_PUBLIC_BLOG_COPY,
  publicBlogText,
  type PublicBlogCopy,
} from "@/lib/public-blog-copy";
import { cn } from "@/lib/utils";
import { PreferencesControls } from "@/components/preferences/preferences-controls";

export function BlogShell({
  children,
  copy = DEFAULT_PUBLIC_BLOG_COPY,
}: {
  children: React.ReactNode;
  copy?: PublicBlogCopy;
}) {
  return (
    <main className="blog-theme min-h-screen overflow-x-hidden bg-[#f7f3ea] text-[#241f18] dark:bg-background dark:text-foreground">
      <div className="border-b border-[#241f18]/10 bg-[#f7f3ea]/95 dark:border-border dark:bg-background/95">
        <nav
          aria-label="Navegação principal do blog"
          className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"
        >
          <Link
            href="/blog"
            className="max-w-full truncate font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#5a4b37] dark:text-primary"
          >
            {copy.brand}
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <PreferencesControls
              refreshOnLocaleChange
              buttonClassName="text-[#241f18] hover:bg-[#241f18]/8 dark:text-foreground dark:hover:bg-accent"
            />
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold text-[#241f18] underline-offset-4 hover:underline dark:text-foreground"
            >
              {copy.backToSite}
            </Link>
          </div>
        </nav>
      </div>
      {children}
    </main>
  );
}

export function BlogHero({
  featuredPost,
  total,
  copy,
}: {
  featuredPost: BlogPost | null;
  total: number;
  copy: PublicBlogCopy;
}) {
  const cover = featuredPost ? getBlogPostCover(featuredPost) : null;

  return (
    <header className="relative overflow-hidden border-b border-[#241f18]/10 dark:border-border">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,31,24,.08)_1px,transparent_1px),linear-gradient(rgba(36,31,24,.08)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px)]" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#7b5b25] dark:text-primary">
            {copy.heroEyebrow}
          </p>
          <h1 className="blog-display mt-5 max-w-4xl break-words text-balance text-4xl font-semibold leading-[0.98] text-[#241f18] dark:text-foreground sm:text-6xl sm:leading-[0.95] lg:text-7xl">
            {copy.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl break-words text-base leading-7 text-[#5b5145] dark:text-muted-foreground sm:text-lg sm:leading-8">
            {copy.heroDescription}
          </p>
          <dl className="mt-8 grid max-w-xl grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="border-l-2 border-[#c47b24] pl-3">
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#7d6d5c] dark:text-muted-foreground">
                {copy.articlesStat}
              </dt>
              <dd className="mt-1 text-xl font-semibold sm:text-2xl">
                {total}
              </dd>
            </div>
            <div className="border-l-2 border-[#2f7d67] pl-3">
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#7d6d5c] dark:text-muted-foreground">
                {copy.focusStat}
              </dt>
              <dd className="mt-1 text-xl font-semibold sm:text-2xl">
                {copy.focusValue}
              </dd>
            </div>
            <div className="border-l-2 border-[#5d625a] pl-3">
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#7d6d5c] dark:text-muted-foreground">
                {copy.languageStat}
              </dt>
              <dd className="mt-1 text-xl font-semibold sm:text-2xl">
                {copy.languageValue}
              </dd>
            </div>
          </dl>
        </div>

        {featuredPost ? (
          <Link
            href={`/blog/${featuredPost.slug}`}
            aria-label={`Ler artigo em destaque: ${featuredPost.title}`}
            className="group relative min-h-[280px] overflow-hidden rounded-[8px] border border-[#241f18]/12 bg-[#2b2a24] shadow-2xl shadow-[#241f18]/20 sm:min-h-[390px]"
          >
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.altText ?? featuredPost.title}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,123,36,.35),transparent_28%),linear-gradient(135deg,#343129,#141411)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#15130f] via-[#15130f]/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#f2c77d]">
                {copy.featured}
              </p>
              <h2 className="blog-display mt-3 break-words text-balance text-2xl font-semibold leading-tight sm:text-3xl">
                {featuredPost.title}
              </h2>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/78">
                {getBlogPostDescription(featuredPost)}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                {copy.readNow}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ) : (
          <div className="min-h-[260px] rounded-[8px] border border-dashed border-[#241f18]/20 bg-[#fffaf0] p-6 dark:border-border dark:bg-card sm:min-h-[390px] sm:p-8">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#7b5b25] dark:text-primary">
              {copy.comingSoon}
            </p>
            <p className="blog-display mt-6 break-words text-3xl font-semibold leading-tight sm:text-4xl">
              {copy.comingSoonTitle}
            </p>
          </div>
        )}
      </div>
    </header>
  );
}

export function BlogPostCard({
  post,
  priority = false,
  className,
  copy,
}: {
  post: BlogPost;
  priority?: boolean;
  className?: string;
  copy: PublicBlogCopy;
}) {
  const cover = getBlogPostCover(post);

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-[8px] border border-[#241f18]/10 bg-[#fffaf4] shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#241f18]/10 dark:border-border dark:bg-card dark:hover:shadow-black/20",
        "motion-reduce:transform-none motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-[#e6dcc9]">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.altText ?? post.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#d8c7a6,#f5ead6_48%,#a8b4a7)]" />
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="max-w-full break-words rounded-full border border-[#241f18]/10 px-2.5 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#695847] dark:border-border dark:text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <h2 className="blog-display mt-4 break-words text-balance text-2xl font-semibold leading-tight text-[#241f18] dark:text-foreground">
            {post.title}
          </h2>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#65594b] dark:text-muted-foreground">
            {getBlogPostDescription(post)}
          </p>
          <PostMeta post={post} copy={copy} className="mt-5" />
        </div>
      </Link>
    </article>
  );
}

export function BlogDiscovery({
  copy,
  search,
  tag,
  topics,
}: {
  copy: PublicBlogCopy;
  search?: string;
  tag?: string;
  topics: string[];
}) {
  const hasFilters = Boolean(search || tag);

  return (
    <section
      className="rounded-[8px] border border-[#241f18]/10 bg-[#fffaf4] p-4 shadow-sm dark:border-border dark:bg-card sm:p-5"
      aria-labelledby="blog-discovery-title"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] lg:items-end">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#7b5b25] dark:text-primary">
            {copy.topicsTitle}
          </p>
          <h2
            id="blog-discovery-title"
            className="blog-display mt-2 text-2xl font-semibold tracking-tight text-[#241f18] dark:text-foreground sm:text-3xl"
          >
            {copy.discoveryTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65594b] dark:text-muted-foreground">
            {copy.discoveryDescription}
          </p>
        </div>

        <form action="/blog" className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="blog-search" className="sr-only">
            {copy.searchButton}
          </label>
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756858] dark:text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="blog-search"
              name="search"
              type="search"
              defaultValue={search}
              placeholder={copy.searchPlaceholder}
              className="h-11 w-full rounded-[8px] border border-[#241f18]/12 bg-white px-9 text-sm outline-none ring-offset-2 placeholder:text-[#756858]/70 focus-visible:ring-2 focus-visible:ring-[#c47b24] dark:border-border dark:bg-background dark:placeholder:text-muted-foreground"
            />
          </div>
          {tag && <input type="hidden" name="tag" value={tag} />}
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[#241f18] px-4 text-sm font-semibold text-white transition hover:bg-[#3a3025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47b24] focus-visible:ring-offset-2 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 sm:w-auto"
          >
            {copy.searchButton}
          </button>
        </form>
      </div>

      {(topics.length > 0 || hasFilters) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#241f18]/10 pt-4 dark:border-border">
          <Link
            href="/blog"
            className="rounded-full border border-[#241f18]/10 bg-[#241f18] px-3 py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white dark:border-primary dark:bg-primary dark:text-primary-foreground"
          >
            {copy.allTopics}
          </Link>
          {topics.map((topic) => (
            <Link
              key={topic}
              href={`/blog?tag=${encodeURIComponent(topic)}`}
              aria-current={tag === topic ? "page" : undefined}
              className="rounded-full border border-[#241f18]/10 px-3 py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#695847] transition hover:border-[#c47b24] hover:text-[#241f18] dark:border-border dark:text-muted-foreground dark:hover:text-foreground"
            >
              {topic}
            </Link>
          ))}
          {hasFilters && (
            <Link
              href="/blog"
              className="w-full text-sm font-semibold text-[#6a4c1f] underline-offset-4 hover:underline dark:text-primary sm:ml-auto sm:w-auto"
            >
              {copy.clearFilters}
            </Link>
          )}
        </div>
      )}

      {hasFilters && (
        <p className="mt-4 text-sm text-[#65594b] dark:text-muted-foreground">
          {search &&
            publicBlogText(copy.resultsFor, {
              search,
            })}
          {search && tag ? " · " : ""}
          {tag && publicBlogText(copy.taggedWith, { tag })}
        </p>
      )}
    </section>
  );
}

export function PostMeta({
  post,
  copy,
  className,
}: {
  post: BlogPost;
  copy: PublicBlogCopy;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#6d6255] dark:text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="size-3.5" aria-hidden="true" />
        <time dateTime={post.publishedAt ?? post.createdAt}>
          {formatDate(post.publishedAt ?? post.createdAt)}
        </time>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="size-3.5" aria-hidden="true" />
        {publicBlogText(copy.readMinutes, {
          minutes: post.readingTimeMinutes,
        })}
      </span>
    </div>
  );
}

export function BlogPagination({
  page,
  totalPages,
  copy,
}: {
  page: number;
  totalPages: number;
  copy: PublicBlogCopy;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="mt-10 flex flex-col items-stretch gap-3 border-t border-[#241f18]/10 pt-6 dark:border-border sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginação do blog"
    >
      {page > 1 ? (
        <Link
          href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}
          className="rounded-[8px] border border-[#241f18]/15 px-4 py-2 text-center text-sm font-semibold hover:bg-[#241f18] hover:text-white dark:border-border dark:hover:bg-accent dark:hover:text-accent-foreground sm:text-left"
        >
          {copy.previousPage}
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      <span className="text-center text-sm text-[#6d6255] dark:text-muted-foreground">
        {publicBlogText(copy.pageOf, { page, totalPages })}
      </span>
      {page < totalPages ? (
        <Link
          href={`/blog?page=${page + 1}`}
          className="rounded-[8px] border border-[#241f18]/15 px-4 py-2 text-center text-sm font-semibold hover:bg-[#241f18] hover:text-white dark:border-border dark:hover:bg-accent dark:hover:text-accent-foreground sm:text-left"
        >
          {copy.nextPage}
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
    </nav>
  );
}

export function ArticleBody({ post }: { post: BlogPost }) {
  if (post.contentFormat === "HTML") {
    return (
      <div
        className="blog-prose"
        dangerouslySetInnerHTML={{
          __html: normalizeArticleHtml(post.content, post.title),
        }}
      />
    );
  }

  return (
    <div className="blog-prose">
      {stripHtml(post.content)
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
    </div>
  );
}

function normalizeArticleHtml(html: string, fallbackAlt: string) {
  const safeFallbackAlt = escapeAttribute(fallbackAlt);

  return html
    .replace(/<h1(\s|>)/gi, "<h2$1")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/<img\b(?![^>]*\balt=)/gi, `<img alt="${safeFallbackAlt}"`)
    .replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"')
    .replace(/<img\b(?![^>]*\bdecoding=)/gi, '<img decoding="async"')
    .replace(/<a\b(?![^>]*\brel=)/gi, '<a rel="noopener noreferrer"');
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
