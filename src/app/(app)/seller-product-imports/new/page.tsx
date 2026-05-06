"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ImportSellerProductsForm } from "@/components/seller-products/import-seller-products-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sellersService } from "@/lib/api/sellers";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n/language-store";

export default function NewSellerProductImportPage({
  searchParams,
}: {
  searchParams: Promise<{ sellerId?: string }>;
}) {
  const params = use(searchParams);
  const t = useTranslation();
  const { isAdmin, user } = useAuth();
  const requestedSellerId = Number(params.sellerId);
  const initialSellerId = Number.isFinite(requestedSellerId)
    ? requestedSellerId
    : undefined;

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });

  const sellerOptions = useMemo(
    () =>
      isAdmin
        ? (sellersQ.data?.data ?? [])
        : (user?.sellers.map((membership) => membership.seller) ?? []),
    [isAdmin, sellersQ.data?.data, user?.sellers],
  );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/seller-products">
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Importar ofertas por CSV"
        description="Crie uma carga de ofertas para uma loja e acompanhe o processamento do ETL."
      />

      {!isAdmin && sellerOptions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhuma loja disponivel para importacao.
          </CardContent>
        </Card>
      ) : (
        <ImportSellerProductsForm
          sellers={sellerOptions}
          initialSellerId={initialSellerId}
        />
      )}
    </div>
  );
}
