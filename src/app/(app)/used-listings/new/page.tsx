"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { MoneyInput } from "@/components/forms/money-input";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { geoService, type PlaceSuggestion } from "@/lib/api/geo";
import { sellersService } from "@/lib/api/sellers";
import {
  usedListingsService,
  type CreateUsedListingPayload,
} from "@/lib/api/used-listings";
import type { UsedListingCondition, UsedListingStatus } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n/language-store";
import { queryKeys } from "@/lib/query-keys";
import { USED_LISTING_CONDITION_LABEL } from "@/lib/used-listings";

const CONDITIONS: UsedListingCondition[] = [
  "USED",
  "SURPLUS",
  "OPEN_BOX",
  "PARTIAL",
  "EXCESS_LOT",
  "USED_TOOL",
  "OTHER",
];

export default function NewUsedListingPage() {
  const router = useRouter();
  const t = useTranslation();
  const qc = useQueryClient();
  const { isAdmin, user, canManageSellerProducts } = useAuth();
  const [placesSessionToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });

  const availableSellers = useMemo(() => {
    if (isAdmin) return sellersQ.data?.data ?? [];
    return user?.sellers.map((membership) => membership.seller) ?? [];
  }, [isAdmin, sellersQ.data?.data, user?.sellers]);

  const [sellerId, setSellerId] = useState<string>(
    availableSellers[0]?.id ? String(availableSellers[0].id) : "",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<UsedListingCondition>("SURPLUS");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("un");
  const [remainingAmountDescription, setRemainingAmountDescription] =
    useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [negotiable, setNegotiable] = useState(true);
  const [status, setStatus] = useState<UsedListingStatus>("ACTIVE");
  const [publicNeighborhood, setPublicNeighborhood] = useState("");
  const [publicCity, setPublicCity] = useState("");
  const [publicState, setPublicState] = useState("SP");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCep, setPickupCep] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [pickupPlaceId, setPickupPlaceId] = useState("");
  const [pickupLatitude, setPickupLatitude] = useState("");
  const [pickupLongitude, setPickupLongitude] = useState("");

  useEffect(() => {
    if (sellerId || !availableSellers[0]) return;
    handleSellerChange(String(availableSellers[0].id));
  }, [availableSellers, sellerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSeller = availableSellers.find(
    (seller) => String(seller.id) === sellerId,
  );
  const canCreateForSelected = sellerId
    ? isAdmin || canManageSellerProducts(Number(sellerId))
    : false;
  const disabled = !sellerId;

  function handleSellerChange(nextSellerId: string) {
    setSellerId(nextSellerId);
    const seller = availableSellers.find(
      (item) => String(item.id) === nextSellerId,
    );
    if (!seller) return;

    applySellerPickup(seller);
  }

  function applySellerPickup(seller: NonNullable<typeof selectedSeller>) {
    setPickupAddress(seller.address ?? "");
    setPickupCep(seller.cep ?? "");
    setPickupContactName(seller.name ?? "");
    setPickupContactPhone(seller.phone ?? "");
    setPickupLatitude(seller.latitude ?? "");
    setPickupLongitude(seller.longitude ?? "");
    setPickupPlaceId("");

    const region = inferPublicRegionFromAddress(seller.address);
    setPublicNeighborhood((current) => region.neighborhood || current);
    setPublicCity((current) => region.city || current);
    setPublicState((current) => region.state || current);
  }

  async function handlePickupSelect(place: PlaceSuggestion) {
    const resolved = await geoService.resolve(place.placeId, placesSessionToken);
    setPickupPlaceId(place.placeId);
    setPickupAddress(resolved.formattedAddress);
    setPickupLatitude(resolved.latitude);
    setPickupLongitude(resolved.longitude);
    setPickupCep(resolved.cep ?? resolved.postalCode ?? "");
    setPublicNeighborhood((current) => current || resolved.neighborhood || "");
    setPublicCity((current) => current || resolved.city || "");
    setPublicState((current) => current || resolved.state || "");
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!sellerId || !title.trim() || !description.trim() || !pickupAddress.trim()) {
        throw new Error("Preencha loja, título, descrição e retirada.");
      }

      const payload: CreateUsedListingPayload = {
        ownerSellerId: Number(sellerId),
        title: title.trim(),
        description: description.trim(),
        condition,
        quantity: parseOptionalInt(quantity),
        unit: normalizedText(unit),
        remainingAmountDescription: normalizedText(remainingAmountDescription),
        priceCents,
        negotiable,
        status,
        publicNeighborhood: normalizedText(publicNeighborhood),
        publicCity: normalizedText(publicCity),
        publicState: normalizedText(publicState),
        pickupAddress: pickupAddress.trim(),
        pickupCep: normalizedText(pickupCep),
        pickupContactName: normalizedText(pickupContactName),
        pickupContactPhone: normalizedText(pickupContactPhone),
        pickupLatitude: normalizedText(pickupLatitude),
        pickupLongitude: normalizedText(pickupLongitude),
      };

      return usedListingsService.create(payload);
    },
    onSuccess: (listing) => {
      qc.invalidateQueries({ queryKey: queryKeys.usedListings.all() });
      toast.success(t("usedListings.created"));
      router.push(`/used-listings/${listing.id}`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError
          ? error.displayMessage
          : error instanceof Error
            ? error.message
            : t("usedListings.saveFailed");
      toast.error(message);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/used-listings">
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={t("usedListings.new")}
        description={t("usedListings.newDescription")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("usedListings.publicInfo")}</CardTitle>
            <CardDescription>{t("usedListings.notice")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("usedListings.store")}</Label>
              <Select value={sellerId} onValueChange={handleSellerChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("usedListings.selectStore")} />
                </SelectTrigger>
                <SelectContent>
                  {availableSellers.map((seller) => (
                    <SelectItem key={seller.id} value={String(seller.id)}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canCreateForSelected && sellerId ? (
                <p className="text-xs text-destructive">
                  {t("usedListings.managePermissionError")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                disabled={disabled}
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">{t("common.description")}</Label>
              <Textarea
                id="description"
                value={description}
                disabled={disabled}
                rows={5}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("usedListings.condition")}</Label>
              <Select
                value={condition}
                disabled={disabled}
                onValueChange={(value) =>
                  setCondition(value as UsedListingCondition)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {USED_LISTING_CONDITION_LABEL[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("usedListings.status")}</Label>
              <Select
                value={status}
                disabled={disabled}
                onValueChange={(value) => setStatus(value as UsedListingStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">{t("usedListings.quantity")}</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                disabled={disabled}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                value={unit}
                disabled={disabled}
                onChange={(event) => setUnit(event.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="remainingAmountDescription">
                Descrição da sobra
              </Label>
              <Input
                id="remainingAmountDescription"
                value={remainingAmountDescription}
                disabled={disabled}
                placeholder="Ex.: meia lata, 12 m², lote com peças variadas"
                onChange={(event) =>
                  setRemainingAmountDescription(event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{t("usedListings.price")}</Label>
              <MoneyInput
                valueCents={priceCents}
                onChangeCents={setPriceCents}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="negotiable">Negociável</Label>
                <p className="text-xs text-muted-foreground">
                  Permite combinar o valor na conversa.
                </p>
              </div>
              <Switch
                id="negotiable"
                checked={negotiable}
                disabled={disabled}
                onCheckedChange={setNegotiable}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicNeighborhood">Bairro público</Label>
              <Input
                id="publicNeighborhood"
                value={publicNeighborhood}
                disabled={disabled}
                onChange={(event) => setPublicNeighborhood(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicCity">Cidade pública</Label>
              <Input
                id="publicCity"
                value={publicCity}
                disabled={disabled}
                onChange={(event) => setPublicCity(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicState">UF pública</Label>
              <Input
                id="publicState"
                value={publicState}
                disabled={disabled}
                maxLength={60}
                onChange={(event) => setPublicState(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("usedListings.privatePickup")}</CardTitle>
            <CardDescription>
              Endereço exato não aparece no feed público.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSeller ? (
              <div className="space-y-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <p>Loja selecionada: {selectedSeller.name}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => applySellerPickup(selectedSeller)}
                >
                  Usar endereco cadastrado da loja
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="pickupAddress">Endereço de retirada</Label>
              <AddressAutocomplete
                id="pickupAddress"
                value={pickupAddress}
                disabled={disabled}
                selectedPlaceId={pickupPlaceId}
                sessionToken={placesSessionToken}
                onChange={(value) => {
                  setPickupAddress(value);
                  setPickupPlaceId("");
                }}
                onSelect={handlePickupSelect}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupCep">CEP</Label>
              <Input
                id="pickupCep"
                value={pickupCep}
                disabled={disabled}
                onChange={(event) => setPickupCep(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupContactName">Contato de retirada</Label>
              <Input
                id="pickupContactName"
                value={pickupContactName}
                disabled={disabled}
                onChange={(event) => setPickupContactName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupContactPhone">Telefone de retirada</Label>
              <Input
                id="pickupContactPhone"
                value={pickupContactPhone}
                disabled={disabled}
                onChange={(event) => setPickupContactPhone(event.target.value)}
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={!canCreateForSelected || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function normalizedText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalInt(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.floor(parsed);
}

function inferPublicRegionFromAddress(address: string | null | undefined) {
  const parts = (address ?? "")
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
  const state = parts.at(-1) ?? "";
  const city = parts.at(-2) ?? "";
  const neighborhood = parts.at(-3) ?? "";

  return { neighborhood, city, state };
}
