import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageCheck } from "lucide-react";
import {
  getStorefrontBySlug,
  getStorefrontProduct,
  getStorefrontProducts,
  type StorefrontProduct,
} from "@/lib/api/storefront";
import { resolveMediaUrl } from "@/lib/media-url";
import { absoluteUrl, SITE_LOCALE, SITE_NAME } from "@/lib/seo/site";

type StorefrontProductPageProps = {
  params: Promise<{
    slug: string;
    sellerProductId: string;
  }>;
};

export async function generateMetadata({
  params,
}: StorefrontProductPageProps): Promise<Metadata> {
  const { slug, sellerProductId } = await params;
  const [storefront, product] = await Promise.all([
    getStorefrontBySlug(slug),
    getStorefrontProduct(slug, Number(sellerProductId)),
  ]);

  if (!storefront || !product) {
    return {
      title: "Produto não encontrado",
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.product?.name ?? "Produto"} | ${storefront.publicName}`;
  const description =
    product.product?.description ||
    `Oferta de ${storefront.publicName} por ${formatBRL(product.unitPriceCents)}.`;
  const imageUrl = getProductImageUrl(product);

  return {
    title,
    description,
    alternates: {
      canonical: `/lojas/${storefront.slug}/produto/${product.id}`,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/lojas/${storefront.slug}/produto/${product.id}`),
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type: "website",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 900,
              alt: product.product?.name ?? "Produto",
            },
          ]
        : undefined,
    },
  };
}

export default async function StorefrontProductPage({
  params,
}: StorefrontProductPageProps) {
  const { slug, sellerProductId } = await params;
  const [storefront, product, productsResponse] = await Promise.all([
    getStorefrontBySlug(slug),
    getStorefrontProduct(slug, Number(sellerProductId)),
    getStorefrontProducts(slug, { page: 1, limit: 6 }),
  ]);

  if (!storefront || !product) {
    notFound();
  }

  const imageUrl = getProductImageUrl(product);
  const relatedProducts =
    productsResponse?.data.filter((item) => item.id !== product.id).slice(0, 3) ??
    [];

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1f1f1f]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/lojas/${storefront.slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#8a5a00] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Voltar para {storefront.publicName}
        </Link>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.58fr)]">
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="aspect-[4/3] bg-[#eee7db]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={product.product?.name ?? "Produto"}
                  width={960}
                  height={720}
                  unoptimized={imageUrl.includes("localhost")}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[#8a8275]">
                  <PackageCheck className="size-14" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5a00]">
                {storefront.publicName}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">
                {product.product?.name ?? `Produto #${product.id}`}
              </h1>
              <p className="mt-4 text-3xl font-bold text-[#a85f00]">
                {formatBRL(product.unitPriceCents)}
              </p>
              <p className="mt-2 text-sm text-[#6e675e]">
                Estoque disponível: {product.stockAmount}
              </p>
              <ButtonLikeLink href={`/lojas/${storefront.slug}`}>
                Comprar na loja
              </ButtonLikeLink>
            </div>

            {product.product?.description && (
              <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#6e675e]">
                  Descrição
                </h2>
                <p className="mt-3 whitespace-pre-line text-base leading-7">
                  {product.product.description}
                </p>
              </div>
            )}
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold">Outras ofertas da loja</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {relatedProducts.map((item) => (
                <Link
                  key={item.id}
                  href={`/lojas/${storefront.slug}/produto/${item.id}`}
                  className="rounded-lg border border-black/10 bg-white p-4 shadow-sm hover:border-[#f6a000]"
                >
                  <p className="font-semibold">
                    {item.product?.name ?? `Produto #${item.id}`}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#a85f00]">
                    {formatBRL(item.unitPriceCents)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ButtonLikeLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#f6a000] px-5 text-sm font-bold text-[#1f1f1f] shadow-sm hover:bg-[#e79400]"
    >
      {children}
    </Link>
  );
}

function getProductImageUrl(product: StorefrontProduct) {
  const image =
    product.product?.images
      ?.toSorted((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .at(0)?.url ?? null;

  return image ? resolveMediaUrl(image) : null;
}

function formatBRL(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
