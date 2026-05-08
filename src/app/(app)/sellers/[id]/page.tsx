"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  FileClock,
  FileUp,
  Loader2,
  MapPinned,
  Save,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { sellersService, type UpdateSellerPayload } from "@/lib/api/sellers";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import { usersService } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { formatCep, formatDateTime, formatPhone } from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { StripeConnectStatusCard } from "@/components/payments/stripe-connect-status-card";
import { MembershipRoleBadge } from "@/components/badges";
import { useTranslation } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";
import type {
  MembershipRole,
  SellerDeliveryProvider,
  SellerProductImportJob,
  UserWithRelations,
} from "@/lib/api/types";

type SellerDetailSection =
  | "operations"
  | "receiving"
  | "delivery"
  | "imports"
  | "team";

interface TeamMember {
  userId: number;
  name: string;
  email: string;
  jobTitle: string | null;
  membershipRole: MembershipRole;
  canEditSeller: boolean;
  canManageSellerProducts: boolean;
  canManageSellerStaff: boolean;
}

export default function SellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslation();
  const router = useRouter();
  const sellerId = Number(id);
  const qc = useQueryClient();
  const {
    isAdmin,
    isAuthenticated,
    isLoading: authLoading,
    canEditSeller,
    canManageSellerStaff,
  } = useAuth();
  const authReady = !authLoading && isAuthenticated;

  const query = useQuery({
    queryKey: queryKeys.sellers.byId(sellerId),
    queryFn: () => sellersService.getById(sellerId),
    enabled: Number.isFinite(sellerId) && authReady,
  });
  const stripeConnectQuery = useQuery({
    queryKey: queryKeys.sellers.stripeConnect(sellerId),
    queryFn: () => sellersService.getStripeConnectStatus(sellerId),
    enabled: Number.isFinite(sellerId) && authReady && Boolean(query.data),
  });
  const deliverySettingsQuery = useQuery({
    queryKey: queryKeys.sellers.deliverySettings(sellerId),
    queryFn: () => sellersService.getDeliverySettings(sellerId),
    enabled: Number.isFinite(sellerId) && authReady && Boolean(query.data),
  });

  const seller = query.data;
  const canEdit = canEditSeller(sellerId);
  const canEditTeam = canManageSellerStaff(sellerId);
  const canEditMasterData = canEdit && isAdmin;
  const [activeSection, setActiveSection] =
    useState<SellerDetailSection>("operations");
  const [importsPage, setImportsPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const importsParams = {
    page: importsPage,
    limit: 10,
    sellerId,
  };
  const teamParams = {
    page: teamPage,
    limit: 10,
    sellerId,
  };
  const importsQuery = useQuery({
    queryKey: queryKeys.sellerProductImports.list(importsParams),
    queryFn: () => sellerProductImportsService.list(importsParams),
    enabled:
      Number.isFinite(sellerId) &&
      authReady &&
      Boolean(query.data) &&
      activeSection === "imports",
  });
  const teamQuery = useQuery({
    queryKey: queryKeys.users.list(teamParams),
    queryFn: () => usersService.list(teamParams),
    enabled:
      Number.isFinite(sellerId) &&
      authReady &&
      Boolean(query.data) &&
      activeSection === "team",
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [cep, setCep] = useState("");
  const [phone, setPhone] = useState("");
  const [placesSessionToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [clearLogo, setClearLogo] = useState(false);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState("");
  const [deliveryProvider, setDeliveryProvider] =
    useState<SellerDeliveryProvider>("INTERNAL");

  useEffect(() => {
    if (seller) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Populate editable fields from the fetched seller.
      setName(seller.name);
      setEmail(seller.email);
      setAddress(seller.address);
      setPlaceId("");
      setCep(seller.cep);
      setPhone(seller.phone);
    }
  }, [seller?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const radiusMeters = deliverySettingsQuery.data?.maxDeliveryRadiusMeters;
    if (radiusMeters !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep form state in sync with API settings.
      setDeliveryRadiusKm(formatRadiusInput(radiusMeters));
    }

    const provider = deliverySettingsQuery.data?.deliveryProvider;
    if (provider) {
      setDeliveryProvider(provider);
    }
  }, [
    deliverySettingsQuery.data?.sellerId,
    deliverySettingsQuery.data?.maxDeliveryRadiusMeters,
    deliverySettingsQuery.data?.deliveryProvider,
  ]);

  const mutation = useMutation({
    mutationFn: () => {
      if (
        canEditMasterData &&
        seller &&
        address !== seller.address &&
        !placeId
      ) {
        throw new Error("Selecione o novo endereco nas sugestões.");
      }

      const payload: UpdateSellerPayload = {
        name,
        phone,
        logo: logoFile,
        clearLogo: clearLogo || undefined,
      };

      if (canEditMasterData) {
        payload.email = email;
        payload.placeId = placeId || undefined;
        payload.address = address;
        payload.cep = cep;
      }

      return sellersService.update(sellerId, payload);
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.sellers.byId(sellerId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.sellers.all() });
      toast.success(t("seller.updated"));
      setLogoFile(undefined);
      setClearLogo(false);
      setLogoInputKey((key) => key + 1);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.displayMessage : t("product.saveFailed");
      toast.error(msg);
    },
  });
  const stripeConnectMutation = useMutation({
    mutationFn: () =>
      sellersService.createStripeConnectOnboardingLink(sellerId, {
        returnUrl: window.location.href,
        refreshUrl: window.location.href,
      }),
    onSuccess: (response) => {
      qc.setQueryData(queryKeys.sellers.stripeConnect(sellerId), response);
      window.open(response.onboardingUrl, "_blank", "noopener,noreferrer");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel abrir o cadastro Stripe.";
      toast.error(msg);
    },
  });
  const deliverySettingsMutation = useMutation({
    mutationFn: () => {
      const parsedRadiusKm = Number(deliveryRadiusKm.replace(",", "."));
      if (!Number.isFinite(parsedRadiusKm) || parsedRadiusKm <= 0) {
        throw new Error("Informe um raio de entrega valido.");
      }

      return sellersService.updateDeliverySettings(sellerId, {
        maxDeliveryRadiusMeters: Math.round(parsedRadiusKm * 1000),
        deliveryProvider,
      });
    },
    onSuccess: (settings) => {
      qc.setQueryData(queryKeys.sellers.deliverySettings(sellerId), settings);
      qc.invalidateQueries({ queryKey: queryKeys.sellers.all() });
      toast.success("Configurações de entrega atualizadas.");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : "Nao foi possivel salvar a configuracao de entrega.";
      toast.error(msg);
    },
  });
  const sellerSections: Array<{
    value: SellerDetailSection;
    label: string;
  }> = [
    { value: "operations", label: t("seller.operationalData") },
    { value: "receiving", label: t("seller.receiving") },
    { value: "delivery", label: "Dados Entrega" },
    { value: "imports", label: "Dados Importação" },
    { value: "team", label: "Dados Equipe" },
  ];
  const teamMembers = useMemo<TeamMember[]>(() => {
    const all = (teamQuery.data?.data as unknown as UserWithRelations[]) ?? [];

    return all.flatMap((user) => {
      const sellerLink = user.sellers?.find(
        (link) => link.sellerId === sellerId,
      );

      if (!sellerLink) {
        return [];
      }

      return [
        {
          userId: user.id,
          name: user.name,
          email: user.email,
          jobTitle: sellerLink.jobTitle,
          membershipRole: sellerLink.membershipRole,
          canEditSeller: sellerLink.canEditSeller,
          canManageSellerProducts: sellerLink.canManageSellerProducts,
          canManageSellerStaff: sellerLink.canManageSellerStaff,
        },
      ];
    });
  }, [teamQuery.data, sellerId]);
  const importColumns: ColumnDef<SellerProductImportJob>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.original.id}
        </span>
      ),
      size: 60,
    },
    {
      id: "file",
      header: "Importação",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.sourceOriginalFilename ?? "Importação manual"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.seller?.name ?? `Loja #${row.original.sellerId}`}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Criada em",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
  ];
  const teamColumns = useMemo<ColumnDef<TeamMember>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("team.name"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.email}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "jobTitle",
        header: t("team.jobTitle"),
        cell: ({ row }) =>
          row.original.membershipRole === "OWNER" ? null : (
            <span className="text-sm text-muted-foreground">
              {row.original.jobTitle ?? "—"}
            </span>
          ),
      },
      {
        accessorKey: "membershipRole",
        header: t("team.role"),
        cell: ({ row }) => (
          <MembershipRoleBadge role={row.original.membershipRole} />
        ),
      },
      {
        id: "permissions",
        header: t("team.permissions"),
        cell: ({ row }) => {
          const labels: string[] = [];
          if (row.original.canEditSeller) labels.push(t("team.editStore"));
          if (row.original.canManageSellerProducts) {
            labels.push(t("team.offers"));
          }
          if (row.original.canManageSellerStaff) labels.push(t("team.staff"));

          return (
            <span className="text-xs text-muted-foreground">
              {labels.length ? labels.join(", ") : "—"}
            </span>
          );
        },
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/sellers">
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={seller?.name ?? t("app.loading")}
        description={seller?.email}
      />

      {query.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !seller ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("seller.notFound")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="w-full max-w-6xl overflow-x-auto">
            <div
              className="inline-flex min-w-full rounded-md border border-border bg-muted/40 p-1 sm:min-w-0"
              role="tablist"
              aria-label={t("seller.sectionsLabel")}
            >
              {sellerSections.map((section) => (
                <button
                  key={section.value}
                  type="button"
                  id={`seller-section-tab-${section.value}`}
                  role="tab"
                  aria-selected={activeSection === section.value}
                  aria-controls={`seller-section-panel-${section.value}`}
                  className={cn(
                    "inline-flex h-9 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors sm:flex-none",
                    "hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    activeSection === section.value &&
                      "bg-background text-foreground shadow-sm",
                  )}
                  onClick={() => setActiveSection(section.value)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {activeSection === "operations" && (
            <>
              <Card
                id="seller-section-panel-operations"
                role="tabpanel"
                aria-labelledby="seller-section-tab-operations"
                className="w-full max-w-6xl"
              >
                <CardHeader className="gap-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <CardTitle>{t("seller.operationalData")}</CardTitle>
                    <CardDescription>
                      {canEdit
                        ? t("seller.updateInfo")
                        : t("seller.noEditPermission")}
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild variant="outline">
                        <Link
                          href={`/seller-product-imports/new?sellerId=${sellerId}`}
                        >
                          <FileUp className="size-4" />
                          {t("sellerProductImports.importCsv")}
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="name">{t("common.name")}</Label>
                      <Input
                        id="name"
                        disabled={!canEdit}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("common.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        disabled={!canEditMasterData}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("common.phone")}</Label>
                      <Input
                        id="phone"
                        disabled={!canEdit}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formatPhone(seller.phone)}
                      </p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address">{t("common.address")}</Label>
                      <AddressAutocomplete
                        id="address"
                        disabled={!canEditMasterData}
                        value={address}
                        sessionToken={placesSessionToken}
                        selectedPlaceId={placeId}
                        onChange={(value) => {
                          setAddress(value);
                          setPlaceId("");
                        }}
                        onSelect={(place) => {
                          setAddress(place.description);
                          setPlaceId(place.placeId);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        disabled={!canEditMasterData}
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formatCep(seller.cep)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="logo">{t("seller.logo")}</Label>
                      <ImageFilePreview
                        file={logoFile}
                        src={clearLogo ? null : seller.logo}
                        alt={
                          logoFile
                            ? t("seller.newLogoAlt", { seller: seller.name })
                            : t("seller.logoAlt", { seller: seller.name })
                        }
                        className="size-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        key={logoInputKey}
                        id="logo"
                        type="file"
                        accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                        disabled={!canEdit || clearLogo}
                        onChange={(event) =>
                          setLogoFile(event.target.files?.[0] ?? undefined)
                        }
                      />
                      {logoFile && (
                        <p className="text-xs text-muted-foreground">
                          {logoFile.name}
                        </p>
                      )}
                    </div>
                    {seller.logo && (
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={clearLogo}
                          disabled={!canEdit}
                          onCheckedChange={(checked) => {
                            setClearLogo(checked === true);
                            if (checked === true) {
                              setLogoFile(undefined);
                              setLogoInputKey((key) => key + 1);
                            }
                          }}
                        />
                        {t("seller.removeCurrentLogo")}
                      </label>
                    )}
                  </div>
                </CardContent>
                {canEdit && (
                  <CardFooter className="justify-end">
                    <Button
                      onClick={() => mutation.mutate()}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      {t("common.saveChanges")}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </>
          )}

          {activeSection === "delivery" && (
            <div
              id="seller-section-panel-delivery"
              role="tabpanel"
              aria-labelledby="seller-section-tab-delivery"
              className="w-full max-w-6xl"
            >
              <Card>
                <CardHeader className="gap-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <CardTitle>Configuração de entrega</CardTitle>
                    <CardDescription>
                      {canEdit
                        ? "Escolha quem entrega os pedidos e ate quantos km esta loja atende."
                        : "Voce nao tem permissao para alterar a configuracao de entrega."}
                    </CardDescription>
                  </div>
                  <MapPinned className="size-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="grid gap-5 p-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        value: "INTERNAL" as const,
                        title: "Entrega pela plataforma",
                        description:
                          "Gera despacho para motorista e repasse separado do frete.",
                        icon: Truck,
                      },
                      {
                        value: "SELLER" as const,
                        title: "Entrega própria da loja",
                        description:
                          "A loja assume a rota e recebe produto + frete no repasse.",
                        icon: Store,
                      },
                    ].map((option) => {
                      const Icon = option.icon;
                      const selected = deliveryProvider === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={!canEdit || deliverySettingsQuery.isLoading}
                          onClick={() => setDeliveryProvider(option.value)}
                          className={cn(
                            "cursor-pointer rounded-md border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-md border",
                                selected
                                  ? "border-primary/30 bg-primary text-primary-foreground"
                                  : "border-border bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="space-y-1">
                              <span className="block text-sm font-semibold">
                                {option.title}
                              </span>
                              <span className="block text-xs leading-5 text-muted-foreground">
                                {option.description}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <Label htmlFor="delivery-radius-km">
                        Raio máximo de entrega (km)
                      </Label>
                      <Input
                        id="delivery-radius-km"
                        type="text"
                        inputMode="decimal"
                        disabled={!canEdit || deliverySettingsQuery.isLoading}
                        value={deliveryRadiusKm}
                        onChange={(e) => setDeliveryRadiusKm(e.target.value)}
                      />
                    </div>
                    <div className="self-end text-sm text-muted-foreground">
                      Produtos desta loja aparecem para clientes em entrega
                      somente quando o endereço selecionado fica dentro desse
                      raio.
                    </div>
                  </div>
                </CardContent>
                {canEdit && (
                  <CardFooter className="justify-end">
                    <Button
                      onClick={() => deliverySettingsMutation.mutate()}
                      disabled={
                        deliverySettingsMutation.isPending ||
                        deliverySettingsQuery.isLoading
                      }
                    >
                      {deliverySettingsMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Salvar entrega
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          )}

          {activeSection === "receiving" && (
            <div
              id="seller-section-panel-receiving"
              role="tabpanel"
              aria-labelledby="seller-section-tab-receiving"
              className="w-full max-w-6xl"
            >
              <StripeConnectStatusCard
                title={t("seller.receiving")}
                description="Status de recebimento e repasses da loja."
                status={stripeConnectQuery.data}
                blockedNotice="Esta loja nao aparece no catalogo dos clientes e nao aceita novos pedidos ate o recebimento ficar pronto."
                actionLabel={canEdit ? "Configurar recebimento" : undefined}
                actionLoading={stripeConnectMutation.isPending}
                onAction={
                  canEdit ? () => stripeConnectMutation.mutate() : undefined
                }
              />
            </div>
          )}

          {activeSection === "imports" && (
            <div
              id="seller-section-panel-imports"
              role="tabpanel"
              aria-labelledby="seller-section-tab-imports"
              className="w-full max-w-6xl space-y-4"
            >
              <Card>
                <CardHeader className="gap-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      <FileClock className="size-5 text-muted-foreground" />
                      Dados Importação
                    </CardTitle>
                    <CardDescription>
                      Histórico de importações de ofertas desta loja.
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button asChild variant="outline">
                      <Link
                        href={`/seller-product-imports/new?sellerId=${sellerId}`}
                      >
                        <FileUp className="size-4" />
                        {t("sellerProductImports.importCsv")}
                      </Link>
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  <DataTable
                    data={importsQuery.data?.data ?? []}
                    columns={importColumns}
                    meta={importsQuery.data?.meta}
                    page={importsPage}
                    onPageChange={setImportsPage}
                    isLoading={importsQuery.isLoading}
                    isFetching={importsQuery.isFetching}
                    emptyMessage="Nenhuma importação encontrada."
                    onRowClick={(job) =>
                      router.push(`/seller-product-imports/${job.id}`)
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "team" && (
            <div
              id="seller-section-panel-team"
              role="tabpanel"
              aria-labelledby="seller-section-tab-team"
              className="w-full max-w-6xl space-y-4"
            >
              <Card>
                <CardHeader className="gap-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="size-5 text-muted-foreground" />
                      Dados Equipe
                    </CardTitle>
                    <CardDescription>{t("team.description")}</CardDescription>
                  </div>
                </CardHeader>
                {!canEditTeam && (
                  <CardContent className="border-b border-border py-4 text-sm text-muted-foreground">
                    {t("team.readonly")}
                  </CardContent>
                )}
                <CardContent className="p-6">
                  <DataTable
                    data={teamMembers}
                    columns={teamColumns}
                    meta={teamQuery.data?.meta}
                    page={teamPage}
                    onPageChange={setTeamPage}
                    isLoading={teamQuery.isLoading}
                    isFetching={teamQuery.isFetching}
                    emptyMessage={t("team.empty")}
                    onRowClick={(member) =>
                      router.push(`/sellers/${sellerId}/team/${member.userId}`)
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatRadiusInput(radiusMeters: number) {
  const radiusKm = radiusMeters / 1000;
  return Number.isInteger(radiusKm)
    ? String(radiusKm)
    : String(Number(radiusKm.toFixed(2)));
}
