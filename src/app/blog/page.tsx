import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Rss } from "lucide-react";
import {
  getBlogPosts,
  getBlogPostDescription,
  type BlogPost,
} from "@/lib/api/blog-posts";
import {
  absoluteUrl,
  getSiteUrl,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TWITTER_CARD,
} from "@/lib/seo/site";
import {
  getPublicBlogCopy,
  getPublicBlogLocale,
} from "@/lib/public-blog-copy";
import {
  BlogDiscovery,
  BlogHero,
  BlogPagination,
  BlogPostCard,
  BlogShell,
} from "./blog-components";

type BlogPageProps = {
  searchParams: Promise<{
    page?: string;
    tag?: string;
    search?: string;
  }>;
};

const PAGE_SIZE = 12;
const BLOG_DESCRIPTION =
  "Guias práticos da PediObra sobre materiais de construção, entrega, planejamento de obra, compra inteligente e redução de desperdício.";

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePage(params.page);
  const hasFilter = Boolean(params.search || params.tag);
  const title = page > 1 ? `Blog PediObra - Página ${page}` : "Blog PediObra";
  const canonicalPath = page > 1 ? `/blog?page=${page}` : "/blog";

  return {
    title,
    description: BLOG_DESCRIPTION,
    keywords: [
      "blog de construção",
      "materiais de construção",
      "PediObra",
      "planejamento de obra",
      "entrega de materiais",
      "orçamento de obra",
    ],
    alternates: {
      canonical: canonicalPath,
      types: {
        "application/rss+xml": absoluteUrl("/blog/rss.xml"),
      },
    },
    openGraph: {
      title,
      description: BLOG_DESCRIPTION,
      url: absoluteUrl(canonicalPath),
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "website",
      images: [
        {
          url: absoluteUrl("/blog/opengraph-image"),
          width: 1200,
          height: 630,
          alt: "Blog PediObra com guias sobre construção e materiais de obra",
        },
      ],
    },
    twitter: {
      card: SITE_TWITTER_CARD,
      title,
      description: BLOG_DESCRIPTION,
      images: [absoluteUrl("/blog/opengraph-image")],
    },
    robots: {
      index: !hasFilter,
      follow: true,
      googleBot: {
        index: !hasFilter,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const locale = await getPublicBlogLocale();
  const copy = getPublicBlogCopy(locale);
  const page = parsePage(params.page);
  const [postsResponse, topicPostsResponse] = await Promise.all([
    getBlogPosts(page, PAGE_SIZE, params.search, params.tag),
    getBlogPosts(1, 100),
  ]);
  const posts = postsResponse.data;
  const topics = getTopics(topicPostsResponse.data);
  const featuredPost = page === 1 ? (posts[0] ?? null) : null;
  const listedPosts = featuredPost ? posts.slice(1) : posts;

  if (
    (page > postsResponse.meta.totalPages && postsResponse.meta.total > 0) ||
    (page > 1 && posts.length === 0)
  ) {
    notFound();
  }

  return (
    <BlogShell copy={copy}>
      <BlogHero
        featuredPost={featuredPost}
        total={postsResponse.meta.total}
        copy={copy}
      />

      <section className="bg-[#f7f3ea] px-4 py-12 dark:bg-background sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <BlogDiscovery
            copy={copy}
            search={params.search}
            tag={params.tag}
            topics={topics}
          />

          <div className="mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#7b5b25] dark:text-primary">
                {copy.recentEyebrow}
              </p>
              <h2 className="blog-display mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                {copy.recentTitle}
              </h2>
            </div>
            <Link
              href="/blog/rss.xml"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#4f3e2a] underline-offset-4 hover:underline dark:text-primary"
            >
              RSS
              <Rss className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <Suspense fallback={<BlogGridSkeleton />}>
            <div
              id="artigos"
              className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {listedPosts.map((post) => (
                <BlogPostCard key={post.id} post={post} copy={copy} />
              ))}
            </div>
          </Suspense>

          {listedPosts.length === 0 && (
            <div className="mt-8 rounded-[8px] border border-dashed border-[#241f18]/20 bg-[#fffaf4] p-8 text-[#5b5145] dark:border-border dark:bg-card dark:text-muted-foreground">
              {copy.emptyList}
            </div>
          )}

          <BlogPagination
            page={postsResponse.meta.page}
            totalPages={postsResponse.meta.totalPages}
            copy={copy}
          />
        </div>
      </section>

      <BlogIndexJsonLd posts={posts} locale={locale} />
    </BlogShell>
  );
}

function BlogGridSkeleton() {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-80 animate-pulse rounded-[8px] bg-[#e6dcc9] dark:bg-muted"
        />
      ))}
    </div>
  );
}

function BlogIndexJsonLd({
  posts,
  locale,
}: {
  posts: BlogPost[];
  locale: string;
}) {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog PediObra",
    description: BLOG_DESCRIPTION,
    url: absoluteUrl("/blog"),
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: getBlogPostDescription(post),
      url: absoluteUrl(`/blog/${post.slug}`),
      datePublished: post.publishedAt ?? post.createdAt,
      dateModified: post.updatedAt,
    })),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/blog/${post.slug}`),
        name: post.title,
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function parsePage(page: string | undefined) {
  const parsedPage = Number(page);
  return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function getTopics(posts: BlogPost[]) {
  return [
    ...new Set(
      posts.flatMap((post) => post.tags.map((blogTag) => blogTag.name)),
    ),
  ].slice(0, 12);
}
