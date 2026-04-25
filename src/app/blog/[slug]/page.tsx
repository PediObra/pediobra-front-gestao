import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  getBlogPostBySlug,
  getBlogPostCover,
  getBlogPostDescription,
  getBlogPostKeywords,
  getBlogPosts,
  type BlogPost,
} from "@/lib/api/blog-posts";
import { formatDate } from "@/lib/formatters";
import {
  absoluteUrl,
  blogPostUrl,
  getSiteUrl,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TWITTER_CARD,
} from "@/lib/seo/site";
import {
  getPublicBlogCopy,
  getPublicBlogLocale,
  publicBlogText,
} from "@/lib/public-blog-copy";
import {
  ArticleBody,
  BlogPostCard,
  BlogShell,
  PostMeta,
} from "../blog-components";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Artigo não encontrado",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const cover = getBlogPostCover(post);
  const description = getBlogPostDescription(post);
  const canonicalUrl = post.canonicalUrl || blogPostUrl(post.slug);
  const title = post.seoTitle || post.title;
  const imageUrl =
    cover?.url ?? absoluteUrl(`/blog/${post.slug}/opengraph-image`);

  return {
    title,
    description,
    keywords: getBlogPostKeywords(post),
    authors: post.author ? [{ name: post.author.name }] : [{ name: SITE_NAME }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "article",
      publishedTime: post.publishedAt ?? post.createdAt,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author.name] : [SITE_NAME],
      tags: post.tags.map((tag) => tag.name),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: cover?.altText ?? post.title,
        },
      ],
    },
    twitter: {
      card: SITE_TWITTER_CARD,
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const locale = await getPublicBlogLocale();
  const copy = getPublicBlogCopy(locale);
  const postPromise = getBlogPostBySlug(slug);
  const recentPostsPromise = getBlogPosts(1, 4);
  const [post, recentPosts] = await Promise.all([
    postPromise,
    recentPostsPromise,
  ]);

  if (!post) {
    notFound();
  }

  const cover = getBlogPostCover(post);
  const relatedPosts = recentPosts.data
    .filter((recentPost) => recentPost.id !== post.id)
    .slice(0, 3);

  return (
    <BlogShell copy={copy}>
      <article>
        <header className="border-b border-[#241f18]/10 bg-[#fffaf0] dark:border-border dark:bg-background">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,0.8fr)] lg:px-8 lg:py-14">
            <div className="flex flex-col justify-center">
              <Link
                href="/blog"
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#6a4c1f] underline-offset-4 hover:underline dark:text-primary"
              >
                <ArrowLeft className="size-4" />
                {copy.backToBlog}
              </Link>
              <nav
                aria-label="Breadcrumb"
                className="mt-8 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#7b6f60] dark:text-muted-foreground"
              >
                <ol className="flex flex-wrap gap-2">
                  <li>
                    <Link
                      href="/blog"
                      className="hover:text-[#241f18] dark:hover:text-foreground"
                    >
                      {copy.blog}
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li
                    aria-current="page"
                    className="line-clamp-1 min-w-0 break-words text-[#241f18] dark:text-foreground"
                  >
                    {post.title}
                  </li>
                </ol>
              </nav>
              <h1 className="blog-display mt-5 break-words text-balance text-3xl font-semibold leading-[1.05] text-[#241f18] dark:text-foreground sm:text-5xl sm:leading-[1.02] lg:text-6xl">
                {post.title}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-7 text-[#5b5145] dark:text-muted-foreground sm:text-lg sm:leading-8">
                {getBlogPostDescription(post)}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/blog?tag=${encodeURIComponent(tag.name)}`}
                    className="max-w-full break-words rounded-full border border-[#241f18]/10 bg-[#f4ead8] px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#695847] dark:border-border dark:bg-accent dark:text-accent-foreground"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
              <PostMeta post={post} copy={copy} className="mt-6" />
            </div>

            <figure className="overflow-hidden rounded-[8px] border border-[#241f18]/10 bg-[#fffaf4] shadow-2xl shadow-[#241f18]/10 dark:border-border dark:bg-card dark:shadow-black/20">
              <div className="relative aspect-[4/3] bg-[#e6dcc9] lg:aspect-[5/4]">
                {cover ? (
                  <Image
                    src={cover.url}
                    alt={cover.altText ?? post.title}
                    fill
                    priority
                    sizes="(min-width: 1024px) 42vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#d8c7a6,#fff6e2_48%,#a8b4a7)]" />
                )}
              </div>
              {cover?.caption && (
                <figcaption className="border-t border-[#241f18]/10 px-4 py-3 text-xs leading-5 text-[#65594b] dark:border-border dark:text-muted-foreground">
                  {cover.caption}
                </figcaption>
              )}
            </figure>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,740px)_300px] lg:px-8">
          <div className="min-w-0">
            <ArticleBody post={post} />
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-[8px] border border-[#241f18]/10 bg-[#fffaf4] p-5 dark:border-border dark:bg-card">
              <h2 className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#7b5b25] dark:text-primary">
                {copy.detailsTitle}
              </h2>
              <p className="mt-5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#7b5b25] dark:text-primary">
                {copy.publishedBy}
              </p>
              <p className="mt-3 text-lg font-semibold">
                {post.author?.name ?? SITE_NAME}
              </p>
              <dl className="mt-5 space-y-3 text-sm text-[#65594b] dark:text-muted-foreground">
                <div>
                  <dt className="font-semibold text-[#241f18] dark:text-foreground">
                    {copy.updated}
                  </dt>
                  <dd>{formatDate(post.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#241f18] dark:text-foreground">
                    {copy.reading}
                  </dt>
                  <dd>
                    {publicBlogText(copy.minutes, {
                      minutes: post.readingTimeMinutes,
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="border-t border-[#241f18]/10 bg-[#efe5d3] px-4 py-12 dark:border-border dark:bg-secondary/30 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#7b5b25] dark:text-primary">
                  {copy.continueEyebrow}
                </p>
                <h2 className="blog-display mt-3 break-words text-3xl font-semibold">
                  {copy.continueTitle}
                </h2>
              </div>
              <Link
                href="/blog"
                className="hidden items-center gap-2 text-sm font-semibold text-[#4f3e2a] underline-offset-4 hover:underline dark:text-primary sm:inline-flex"
              >
                {copy.allArticles}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <BlogPostCard
                  key={relatedPost.id}
                  post={relatedPost}
                  copy={copy}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <ArticleJsonLd post={post} locale={locale} />
    </BlogShell>
  );
}

function ArticleJsonLd({ post, locale }: { post: BlogPost; locale: string }) {
  const cover = getBlogPostCover(post);
  const siteUrl = getSiteUrl();
  const articleUrl = post.canonicalUrl || blogPostUrl(post.slug);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
      headline: post.title,
      description: getBlogPostDescription(post),
      image: cover
        ? [cover.url]
        : [absoluteUrl(`/blog/${post.slug}/opengraph-image`)],
      datePublished: post.publishedAt ?? post.createdAt,
      dateModified: post.updatedAt,
      author: {
        "@type": post.author ? "Person" : "Organization",
        name: post.author?.name ?? SITE_NAME,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: siteUrl,
      },
      inLanguage: locale,
      keywords: getBlogPostKeywords(post).join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Blog",
          item: absoluteUrl("/blog"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: post.title,
          item: articleUrl,
        },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
