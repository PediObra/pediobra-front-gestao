"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import {
  deliveryRequestsService,
  type CreateDeliveryRequestPayload,
} from "@/lib/api/delivery-requests";
import { sellersService } from "@/lib/api/sellers";
import { geoService, type PlaceSuggestion } from "@/lib/api/geo";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { centsToBRL } from "@/lib/formatters";
import type { GeoPoint } from "@/lib/geo-distance";
import { useTranslation } from "@/lib/i18n/language-store";

export default function NewDeliveryRequestPage() {
  const router = useRouter();
  const t = useTranslation();
  const qc = useQueryClient();
  const { isAdmin, sellerIds } = useAuth();

  const [requesterSellerId, setRequesterSellerId] = useState<string>("NONE");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCep, setPickupCep] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [pickupPlaceId, setPickupPlaceId] = useState("");
  const [pickupLatitude, setPickupLatitude] = useState("");
  const [pickupLongitude, setPickupLongitude] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffCep, setDropoffCep] = useState("");
  const [dropoffContactName, setDropoffContactName] = useState("");
  const [dropoffContactPhone, setDropoffContactPhone] = useState("");
  const [dropoffPlaceId, setDropoffPlaceId] = useState("");
  const [dropoffLatitude, setDropoffLatitude] = useState("");
  const [dropoffLongitude, setDropoffLongitude] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [packageWeightGrams, setPackageWeightGrams] = useState("");
  const [notes, setNotes] = useState("");
  const [quotedFeeCents, setQuotedFeeCents] = useState<number | null>(null);
  const [quotedDistanceMeters, setQuotedDistanceMeters] = useState<number | null>(
    null,
  );
  const [placesSessionToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const lastAutoQuoteKeyRef = useRef("");

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
  });

  const availableSellers = useMemo(() => {
    const sellers = sellersQ.data?.data ?? [];
    if (isAdmin) return sellers;
    return sellers.filter((seller) => sellerIds.includes(seller.id));
  }, [isAdmin, sellerIds, sellersQ.data?.data]);

  const pickupPoint = useMemo(
    () => ({ latitude: pickupLatitude, longitude: pickupLongitude }),
    [pickupLatitude, pickupLongitude],
  );
  const dropoffPoint = useMemo(
    () => ({ latitude: dropoffLatitude, longitude: dropoffLongitude }),
    [dropoffLatitude, dropoffLongitude],
  );
  const hasPickupCoordinates = Boolean(pickupLatitude && pickupLongitude);
  const hasDropoffCoordinates = Boolean(dropoffLatitude && dropoffLongitude);
  const canQuote = Boolean(
    (pickupPlaceId || hasPickupCoordinates) &&
      (dropoffPlaceId || hasDropoffCoordinates),
  );
  const autoQuoteKey = useMemo(() => {
    if (!canQuote) return "";

    return JSON.stringify({
      pickupPlaceId,
      pickupLatitude,
      pickupLongitude,
      dropoffPlaceId,
      dropoffLatitude,
      dropoffLongitude,
    });
  }, [
    canQuote,
    dropoffLatitude,
    dropoffLongitude,
    dropoffPlaceId,
    pickupLatitude,
    pickupLongitude,
    pickupPlaceId,
  ]);

  const quoteMutation = useMutation({
    mutationFn: (variables: { key: string }) => {
      void variables;
      return deliveryRequestsService.quote({
        pickupPlaceId: pickupPlaceId || undefined,
        pickupLatitude: pickupPlaceId ? undefined : pickupLatitude,
        pickupLongitude: pickupPlaceId ? undefined : pickupLongitude,
        dropoffPlaceId: dropoffPlaceId || undefined,
        dropoffLatitude: dropoffPlaceId ? undefined : dropoffLatitude,
        dropoffLongitude: dropoffPlaceId ? undefined : dropoffLongitude,
        placesSessionToken,
        pickupCep: pickupCep || undefined,
        dropoffCep: dropoffCep || undefined,
      });
    },
    onSuccess: (quote, variables) => {
      if (variables.key !== lastAutoQuoteKeyRef.current) return;

      setQuotedFeeCents(quote.estimatedFeeCents);
      setQuotedDistanceMeters(quote.distanceMeters);
      toast.success(t("deliveries.quoteReady"));
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError ? err.displayMessage : t("deliveries.quoteFailed"),
      );
    },
  });

  useEffect(() => {
    if (!autoQuoteKey) {
      lastAutoQuoteKeyRef.current = "";
      return;
    }

    if (lastAutoQuoteKeyRef.current === autoQuoteKey) return;

    lastAutoQuoteKeyRef.current = autoQuoteKey;
    quoteMutation.mutate({ key: autoQuoteKey });
  }, [autoQuoteKey, quoteMutation]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (
        !pickupAddress ||
        !dropoffAddress ||
        !packageDescription ||
        (!dropoffPlaceId && (!dropoffLatitude || !dropoffLongitude)) ||
        (!pickupPlaceId && (!pickupLatitude || !pickupLongitude))
      ) {
        throw new Error(t("deliveries.requiredFields"));
      }

      const payload: CreateDeliveryRequestPayload = {
        requesterSellerId:
          requesterSellerId === "NONE" ? undefined : Number(requesterSellerId),
        pickupAddress,
        pickupCep: pickupCep || undefined,
        pickupContactName: pickupContactName || undefined,
        pickupContactPhone: pickupContactPhone || undefined,
        pickupPlaceId: pickupPlaceId || undefined,
        pickupLatitude: pickupPlaceId ? undefined : pickupLatitude || undefined,
        pickupLongitude: pickupPlaceId ? undefined : pickupLongitude || undefined,
        dropoffAddress,
        dropoffCep: dropoffCep || undefined,
        dropoffContactName: dropoffContactName || undefined,
        dropoffContactPhone: dropoffContactPhone || undefined,
        dropoffPlaceId: dropoffPlaceId || undefined,
        dropoffLatitude: dropoffPlaceId ? undefined : dropoffLatitude || undefined,
        dropoffLongitude: dropoffPlaceId
          ? undefined
          : dropoffLongitude || undefined,
        placesSessionToken,
        packageDescription,
        packageSize: packageSize || undefined,
        packageWeightGrams: packageWeightGrams
          ? Number(packageWeightGrams)
          : undefined,
        notes: notes || undefined,
      };

      return deliveryRequestsService.create(payload);
    },
    onSuccess: (deliveryRequest) => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
      toast.success(t("deliveries.created"));
      router.push(`/delivery-requests/${deliveryRequest.id}?pay=1`);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : t("deliveries.createFailed");
      toast.error(msg);
    },
  });

  function clearQuote() {
    lastAutoQuoteKeyRef.current = "";
    setQuotedFeeCents(null);
    setQuotedDistanceMeters(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/delivery-requests">
            <ArrowLeft className="size-4" />
            {t("deliveries.backToDeliveries")}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={t("deliveries.new")}
        description={t("deliveries.newDescription")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("deliveries.requestData")}</CardTitle>
          <CardDescription>{t("deliveries.requestDataHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label>{t("deliveries.requesterStore")}</Label>
            <Select
              value={requesterSellerId}
              onValueChange={(value) => {
                clearQuote();
                setRequesterSellerId(value);
                const seller = availableSellers.find(
                  (item) => String(item.id) === value,
                );
                if (seller) {
                  setPickupAddress(seller.address);
                  setPickupCep(seller.cep);
                  setPickupContactPhone(seller.phone);
                  setPickupPlaceId("");
                  setPickupLatitude(seller.latitude ?? "");
                  setPickupLongitude(seller.longitude ?? "");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("deliveries.noRequesterStore")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">
                  {t("deliveries.noRequesterStore")}
                </SelectItem>
                {availableSellers.map((seller) => (
                  <SelectItem key={seller.id} value={String(seller.id)}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AddressFields
            title={t("deliveries.pickup")}
            address={pickupAddress}
            setAddress={setPickupAddress}
            cep={pickupCep}
            setCep={setPickupCep}
            placeId={pickupPlaceId}
            setPlaceId={setPickupPlaceId}
            sessionToken={placesSessionToken}
            contactName={pickupContactName}
            setContactName={setPickupContactName}
            contactPhone={pickupContactPhone}
            setContactPhone={setPickupContactPhone}
            setLatitude={setPickupLatitude}
            setLongitude={setPickupLongitude}
            referencePoint={dropoffPoint}
            onAddressChanged={() => {
              clearQuote();
              setPickupLatitude("");
              setPickupLongitude("");
            }}
          />

          <AddressFields
            title={t("deliveries.dropoff")}
            address={dropoffAddress}
            setAddress={setDropoffAddress}
            cep={dropoffCep}
            setCep={setDropoffCep}
            placeId={dropoffPlaceId}
            setPlaceId={setDropoffPlaceId}
            sessionToken={placesSessionToken}
            contactName={dropoffContactName}
            setContactName={setDropoffContactName}
            contactPhone={dropoffContactPhone}
            setContactPhone={setDropoffContactPhone}
            setLatitude={setDropoffLatitude}
            setLongitude={setDropoffLongitude}
            referencePoint={pickupPoint}
            onAddressChanged={() => {
              clearQuote();
              setDropoffLatitude("");
              setDropoffLongitude("");
            }}
          />

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="packageDescription">
              {t("deliveries.packageDescription")}
            </Label>
            <Textarea
              id="packageDescription"
              value={packageDescription}
              onChange={(e) => setPackageDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="packageSize">{t("deliveries.packageSize")}</Label>
            <Input
              id="packageSize"
              value={packageSize}
              onChange={(e) => setPackageSize(e.target.value)}
              placeholder="Pequeno, médio, grande..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="packageWeight">
              {t("deliveries.packageWeight")}
            </Label>
            <Input
              id="packageWeight"
              value={packageWeightGrams}
              onChange={(e) => setPackageWeightGrams(e.target.value)}
              inputMode="numeric"
              placeholder="5000"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="notes">{t("order.noteOptional")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 lg:col-span-2">
            {quoteMutation.isPending && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {t("app.loading")}
              </p>
            )}
            {quotedFeeCents !== null && (
              <p className="text-sm font-medium">
                {t("deliveries.quoteSummary", {
                  price: centsToBRL(quotedFeeCents),
                  distance: ((quotedDistanceMeters ?? 0) / 1000).toFixed(1),
                })}
              </p>
            )}
            {!quoteMutation.isPending && quotedFeeCents === null && (
              <p className="text-xs text-muted-foreground">
                {t("deliveries.quoteWaiting")}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 lg:col-span-2">
            <Button type="button" variant="ghost" asChild>
              <Link href="/delivery-requests">{t("common.cancel")}</Link>
            </Button>
            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("deliveries.create")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddressFields({
  title,
  address,
  setAddress,
  cep,
  setCep,
  placeId,
  setPlaceId,
  sessionToken,
  contactName,
  setContactName,
  contactPhone,
  setContactPhone,
  setLatitude,
  setLongitude,
  referencePoint,
  onAddressChanged,
}: {
  title: string;
  address: string;
  setAddress: (value: string) => void;
  cep: string;
  setCep: (value: string) => void;
  placeId: string;
  setPlaceId: (value: string) => void;
  sessionToken: string;
  contactName: string;
  setContactName: (value: string) => void;
  contactPhone: string;
  setContactPhone: (value: string) => void;
  setLatitude?: (value: string) => void;
  setLongitude?: (value: string) => void;
  referencePoint?: GeoPoint | null;
  onAddressChanged?: () => void;
}) {
  const t = useTranslation();
  const selectedPlaceRef = useRef("");

  async function handlePlaceSelect(place: PlaceSuggestion) {
    selectedPlaceRef.current = place.placeId;
    setAddress(place.description);
    setPlaceId(place.placeId);
    setLatitude?.("");
    setLongitude?.("");
    onAddressChanged?.();

    try {
      const resolved = await geoService.resolve(place.placeId, sessionToken);
      if (selectedPlaceRef.current !== place.placeId) return;

      setAddress(resolved.formattedAddress || place.description);
      setCep(cepFromResolvedPlace(resolved) ?? cep);
      setPlaceId(resolved.placeId || place.placeId);
      setLatitude?.(resolved.latitude);
      setLongitude?.(resolved.longitude);
    } catch {
      // O backend tambem resolve o placeId na cotacao/criacao.
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>{t("common.address")}</Label>
          <AddressAutocomplete
            value={address}
            sessionToken={sessionToken}
            selectedPlaceId={placeId}
            referencePoint={referencePoint}
            onChange={(value) => {
              selectedPlaceRef.current = "";
              setAddress(value);
              setPlaceId("");
              setLatitude?.("");
              setLongitude?.("");
              onAddressChanged?.();
            }}
            onSelect={(place) => void handlePlaceSelect(place)}
          />
        </div>
        <div className="space-y-2">
          <Label>CEP</Label>
          <Input value={cep} onChange={(e) => setCep(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("common.phone")}</Label>
          <Input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{t("deliveries.contactName")}</Label>
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function cepFromResolvedPlace(place: {
  cep?: string | null;
  postalCode?: string | null;
  formattedAddress?: string | null;
}) {
  return (
    normalizeCep(place.cep) ??
    normalizeCep(place.postalCode) ??
    extractCep(place.formattedAddress)
  );
}

function normalizeCep(value: string | null | undefined) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function extractCep(value: string | null | undefined) {
  if (!value) return undefined;
  const match = value.match(/\b\d{5}-?\d{3}\b/);
  return normalizeCep(match?.[0]);
}
