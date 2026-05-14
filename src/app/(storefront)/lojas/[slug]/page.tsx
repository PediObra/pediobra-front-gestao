import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StorefrontPageClient } from "@/components/storefront/storefront-page-client";
import {
  getPublicProductCategories,
  getStorefrontBySlug,
  getStorefrontProducts,
} from "@/lib/api/storefront";
import { absoluteUrl, SITE_LOCALE, SITE_NAME } from "@/lib/seo/site";

type StorefrontPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await getStorefrontBySlug(slug);

  if (!storefront) {
    return {
      title: "Loja não encontrada",
      robots: { index: false, follow: false },
    };
  }

  const title = storefront.seoTitle || storefront.publicName;
  const description =
    storefront.seoDescription ||
    storefront.description ||
    `Compre materiais de construção diretamente com ${storefront.publicName}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/lojas/${storefront.slug}`,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/lojas/${storefront.slug}`),
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const [storefront, productsResponse, categories] = await Promise.all([
    getStorefrontBySlug(slug),
    getStorefrontProducts(slug, { page: 1, limit: 48 }),
    getPublicProductCategories(),
  ]);

  if (!storefront) {
    notFound();
  }

  return (
    <StorefrontPageClient
      storefront={storefront}
      products={productsResponse?.data ?? []}
      categories={categories ?? []}
    />
  );
}
