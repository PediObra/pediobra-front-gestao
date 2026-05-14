import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPublicStorefrontOrder } from "@/lib/api/storefront";
import type { OrderStatus } from "@/lib/api/types";

type StorefrontOrderPageProps = {
  params: Promise<{
    slug: string;
    publicToken: string;
  }>;
};

export const metadata: Metadata = {
  title: "Pedido da loja",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StorefrontOrderPage({
  params,
}: StorefrontOrderPageProps) {
  const { slug, publicToken } = await params;
  const order = await getPublicStorefrontOrder(publicToken);

  if (!order) {
    notFound();
  }

  const totalCents = order.totalAmountCents + (order.deliveryFeeCents ?? 0);

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#1f1f1f]">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/lojas/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#8a5a00] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Voltar para a loja
        </Link>

        <section className="mt-8 rounded-lg border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-bold uppercase tracking-[0.14em]">
                  Pedido enviado
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">
                Pedido #{order.id}
              </h1>
              <p className="mt-2 text-sm text-[#6e675e]">
                Criado em {formatDateTimeBR(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {storefrontOrderStatusLabel(
                  order.status,
                  order.fulfillmentMethod,
                )}
              </Badge>
              <Badge variant="outline">Pagamento direto</Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-md border border-[#f6a000]/40 bg-[#fff8e8] p-4 text-sm text-[#5f5b53]">
            <p className="font-medium text-[#1f1f1f]">
              A loja irá confirmar o pagamento direto no sistema.
            </p>
            {order.fulfillmentMethod === "DELIVERY" ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-[#c77800]" />
                {order.deliveryAddress}
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <PackageCheck className="mt-0.5 size-4 text-[#c77800]" />
                Retirada em {order.pickupAddress}
              </p>
            )}
          </div>

          {order.confirmationCode && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                {order.fulfillmentMethod === "STORE_PICKUP"
                  ? "Código de retirada"
                  : "Código de entrega"}
              </p>
              <p className="mt-3 font-mono text-4xl font-black tracking-[0.28em] text-emerald-950">
                {order.confirmationCode}
              </p>
              <p className="mt-3 text-sm font-medium text-emerald-800">
                {order.fulfillmentMethod === "STORE_PICKUP"
                  ? "Mostre este código para a loja finalizar a retirada."
                  : "Informe este código para a loja finalizar a entrega."}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-black/10 pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold">
                    {item.sellerProduct?.product?.name ?? `Item #${item.id}`}
                  </p>
                  <p className="text-sm text-[#6e675e]">
                    {item.quantity} x {formatBRL(item.unitPriceCents)}
                  </p>
                </div>
                <p className="font-bold">{formatBRL(item.totalPriceCents)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-black/10 pt-4">
            <PriceLine label="Produtos" value={order.totalAmountCents} />
            <PriceLine label="Frete" value={order.deliveryFeeCents ?? 0} />
            <PriceLine label="Total" value={totalCents} strong />
          </div>
        </section>
      </div>
    </main>
  );
}

function PriceLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        strong ? "text-lg font-bold" : "text-sm"
      }`}
    >
      <span>{label}</span>
      <span>{formatBRL(value)}</span>
    </div>
  );
}

function storefrontOrderStatusLabel(
  status: OrderStatus,
  fulfillmentMethod?: string | null,
) {
  if (fulfillmentMethod === "STORE_PICKUP") {
    const pickupLabels: Partial<Record<OrderStatus, string>> = {
      READY_FOR_CUSTOMER_PICKUP: "Pronto para retirada",
      OUT_FOR_DELIVERY: "Pronto para retirada",
      CUSTOMER_PICKED_UP: "Retirado na loja",
    };
    const label = pickupLabels[status];
    if (label) return label;
  }

  return ORDER_STATUS_LABEL[status] ?? status;
}

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY_FOR_PICKUP: "Pronto para coleta",
  READY_FOR_CUSTOMER_PICKUP: "Pronto para retirada",
  PICKED_UP: "Coletado",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CUSTOMER_PICKED_UP: "Retirado na loja",
  DELIVERY_FAILED: "Falha na entrega",
  CANCELLED: "Cancelado",
};

function formatBRL(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateTimeBR(date: string | Date | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  } catch {
    return "—";
  }
}
