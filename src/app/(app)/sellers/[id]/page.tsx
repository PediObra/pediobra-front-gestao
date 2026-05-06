"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPinned, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { sellersService, type UpdateSellerPayload } from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { formatCep, formatPhone } from "@/lib/formatters";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { StripeConnectStatusCard } from "@/components/payments/stripe-connect-status-card";
import { useTranslation } from "@/lib/i18n/language-store";

export default function SellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslation();
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
  const canEditMasterData = canEdit && isAdmin;
  const canEditTeam = canManageSellerStaff(sellerId);

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
  }, [
    deliverySettingsQuery.data?.sellerId,
    deliverySettingsQuery.data?.maxDeliveryRadiusMeters,
  ]);

  const mutation = useMutation({
    mutationFn: () => {
      if (canEditMasterData && seller && address !== seller.address && !placeId) {
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
        err instanceof ApiError
          ? err.displayMessage
          : t("product.saveFailed");
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
      });
    },
    onSuccess: (settings) => {
      qc.setQueryData(queryKeys.sellers.deliverySettings(sellerId), settings);
      qc.invalidateQueries({ queryKey: queryKeys.sellers.all() });
      toast.success("Raio de entrega atualizado.");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : "Nao foi possivel salvar o raio de entrega.";
      toast.error(msg);
    },
  });

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
          <Card className="w-full max-w-6xl">
            <CardHeader className="gap-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle>{t("seller.operationalData")}</CardTitle>
                <CardDescription>
                  {canEdit
                    ? t("seller.updateInfo")
                    : t("seller.noEditPermission")}
                </CardDescription>
              </div>
              {canEditTeam && (
                <Button asChild variant="outline">
                  <Link href={`/sellers/${sellerId}/team`}>
                    <Users className="size-4" />
                    {t("seller.manageTeam")}
                  </Link>
                </Button>
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
              <CardFooter className="justify-end border-t border-border">
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

          <Card className="w-full max-w-6xl">
            <CardHeader className="gap-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle>Área de entrega</CardTitle>
                <CardDescription>
                  {canEdit
                    ? "Defina ate quantos km esta loja atende pedidos de entrega."
                    : "Voce nao tem permissao para alterar o raio de entrega."}
                </CardDescription>
              </div>
              <MapPinned className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="delivery-radius-km">
                  Raio máximo de entrega (km)
                </Label>
                <Input
                  id="delivery-radius-km"
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  max="100"
                  step="0.1"
                  disabled={!canEdit || deliverySettingsQuery.isLoading}
                  value={deliveryRadiusKm}
                  onChange={(e) => setDeliveryRadiusKm(e.target.value)}
                />
              </div>
              <div className="self-end text-sm text-muted-foreground">
                Produtos desta loja aparecem para clientes em entrega somente
                quando o endereço selecionado fica dentro desse raio.
              </div>
            </CardContent>
            {canEdit && (
              <CardFooter className="justify-end border-t border-border">
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
                  Salvar raio
                </Button>
              </CardFooter>
            )}
          </Card>

          <div className="w-full max-w-6xl">
            <StripeConnectStatusCard
              title="Recebimento Stripe"
              description="Dados de repasse da loja"
              status={stripeConnectQuery.data}
              blockedNotice="Esta loja nao aparece no catalogo dos clientes e nao aceita novos pedidos ate o recebimento Stripe ficar pronto."
              actionLabel={canEdit ? "Configurar recebimento" : undefined}
              actionLoading={stripeConnectMutation.isPending}
              onAction={
                canEdit
                  ? () => stripeConnectMutation.mutate()
                  : undefined
              }
            />
          </div>
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
