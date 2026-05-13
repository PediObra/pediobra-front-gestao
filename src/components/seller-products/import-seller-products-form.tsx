"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import type {
  CatalogImportCanonicalField,
  CatalogImportMappingEntry,
  Seller,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

const CANONICAL_FIELDS: Array<{
  field: CatalogImportCanonicalField;
  label: string;
  required?: boolean;
  placeholder: string;
}> = [
  {
    field: "product.name",
    label: "Nome do produto",
    required: true,
    placeholder: "nome_produto",
  },
  {
    field: "sellerProduct.unitPriceCents",
    label: "Preco",
    required: true,
    placeholder: "preco",
  },
  { field: "product.brand", label: "Marca", placeholder: "marca" },
  { field: "product.unit", label: "Unidade", placeholder: "unidade" },
  {
    field: "product.description",
    label: "Descricao",
    placeholder: "descricao",
  },
  { field: "product.size", label: "Tamanho", placeholder: "tamanho" },
  { field: "product.weight", label: "Peso", placeholder: "peso" },
  { field: "product.barcode", label: "Barcode/EAN", placeholder: "ean" },
  { field: "sellerProduct.sku", label: "SKU", placeholder: "sku" },
  {
    field: "sellerProduct.stockAmount",
    label: "Estoque",
    placeholder: "estoque",
  },
  {
    field: "sellerProduct.active",
    label: "Ativa",
    placeholder: "ativo",
  },
];

const CATALOG_IMPORT_ACCEPT = [
  ".csv",
  ".txt",
  ".tsv",
  ".xls",
  ".xlsx",
  "text/csv",
  "text/plain",
  "text/tab-separated-values",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

export function ImportSellerProductsForm({
  sellers,
  initialSellerId,
}: {
  sellers: Seller[];
  initialSellerId?: number;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSellerIdOverride, setSelectedSellerIdOverride] = useState<
    string | null
  >(null);
  const [file, setFile] = useState<File | null>(null);
  const [mappingOverrides, setMappingOverrides] = useState<
    Record<string, string>
  >({});

  const defaultSellerId = initialSellerId
    ? String(initialSellerId)
    : sellers.length === 1
      ? String(sellers[0].id)
      : "";
  const sellerId = selectedSellerIdOverride ?? defaultSellerId;

  const selectedSellerId = Number(sellerId);
  const mappingQ = useQuery({
    queryKey: queryKeys.sellerProductImports.mapping(selectedSellerId),
    queryFn: () => sellerProductImportsService.getMapping(selectedSellerId),
    enabled: Number.isFinite(selectedSellerId) && selectedSellerId > 0,
  });

  const savedMapping = useMemo(() => {
    const next: Record<string, string> = {};
    for (const entry of mappingQ.data?.mappings ?? []) {
      if (entry.sourceColumn) next[entry.canonicalField] = entry.sourceColumn;
    }
    return next;
  }, [mappingQ.data?.mappings]);

  const effectiveMapping = useMemo(
    () => ({ ...savedMapping, ...mappingOverrides }),
    [mappingOverrides, savedMapping],
  );

  const normalizedMapping = useMemo<CatalogImportMappingEntry[]>(
    () =>
      CANONICAL_FIELDS.map(({ field }) => ({
        canonicalField: field,
        sourceColumn: effectiveMapping[field]?.trim() || null,
      })),
    [effectiveMapping],
  );

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedSellerId || !file) {
        throw new Error("Informe loja e arquivo de importacao.");
      }
      return sellerProductImportsService.create({
        sellerId: selectedSellerId,
        file,
        mapping: normalizedMapping,
      });
    },
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: queryKeys.sellerProductImports.all() });
      toast.success("Importacao criada");
      router.push(`/seller-product-imports/${job.id}`);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.displayMessage
          : error instanceof Error
            ? error.message
            : "Nao foi possivel criar a importacao",
      );
    },
  });

  const missingRequired = CANONICAL_FIELDS.some(
    (field) => field.required && !effectiveMapping[field.field]?.trim(),
  );
  const canSubmit =
    Boolean(selectedSellerId) &&
    Boolean(file) &&
    !missingRequired &&
    !createMutation.isPending;

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle>Importar ofertas</CardTitle>
        <CardDescription>
          Envie o arquivo do ERP e informe quais colunas alimentam cada campo do
          PeDiObra. O ETL processa a carga antes da aplicacao.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="catalog-import-seller">Loja</Label>
            <Select
              value={sellerId}
              onValueChange={(value) => {
                setSelectedSellerIdOverride(value);
                setMappingOverrides({});
              }}
            >
              <SelectTrigger id="catalog-import-seller">
                <SelectValue placeholder="Selecione a loja" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={String(seller.id)}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-3">
              <Label htmlFor="catalog-import-file">Arquivo do ERP</Label>
              <Input
                ref={fileInputRef}
                id="catalog-import-file"
                type="file"
                accept={CATALOG_IMPORT_ACCEPT}
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="size-4" />
                  Selecionar arquivo
                </Button>
                <div
                  className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
                  title={file?.name}
                >
                  {file?.name ?? "Nenhum arquivo selecionado"}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Aceitamos CSV, TXT, TSV, XLS e XLSX exportados pelo ERP da loja.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-md border border-border p-3">
          <div>
            <div className="text-sm font-semibold">De-para de colunas</div>
            <p className="text-xs text-muted-foreground">
              Informe o nome exato da coluna no arquivo. O mapeamento fica
              salvo para a proxima importacao desta loja.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {CANONICAL_FIELDS.map((field) => (
              <div key={field.field} className="grid gap-1.5">
                <Label htmlFor={`mapping-${field.field}`}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                <Input
                  id={`mapping-${field.field}`}
                  value={effectiveMapping[field.field] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setMappingOverrides((current) => ({
                      ...current,
                      [field.field]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/seller-products">
            <ArrowLeft className="size-4" />
            Cancelar
          </Link>
        </Button>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileUp className="size-4" />
          )}
          Criar importacao
        </Button>
      </CardFooter>
    </Card>
  );
}
