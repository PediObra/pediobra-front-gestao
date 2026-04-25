"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calculator, Loader2, Save } from "lucide-react";
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
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import {
  centsToBRL,
  decimalStringToCents,
  centsToDecimalString,
} from "@/lib/formatters";
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
  const [packageDescription, setPackageDescription] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [packageWeightGrams, setPackageWeightGrams] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [quotedFeeCents, setQuotedFeeCents] = useState<number | null>(null);
  const [quotedDistanceMeters, setQuotedDistanceMeters] = useState<number | null>(
    null,
  );
  const [placesSessionToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const sellersQ = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
  });

  const availableSellers = useMemo(() => {
    const sellers = sellersQ.data?.data ?? [];
    if (isAdmin) return sellers;
    return sellers.filter((seller) => sellerIds.includes(seller.id));
  }, [isAdmin, sellerIds, sellersQ.data?.data]);

  const canQuote = Boolean(
    (pickupPlaceId || (pickupLatitude && pickupLongitude)) && dropoffPlaceId,
  );

  const quoteMutation = useMutation({
    mutationFn: () =>
      deliveryRequestsService.quote({
        pickupPlaceId: pickupPlaceId || undefined,
        pickupLatitude: pickupPlaceId ? undefined : pickupLatitude,
        pickupLongitude: pickupPlaceId ? undefined : pickupLongitude,
        dropoffPlaceId,
        placesSessionToken,
        pickupCep: pickupCep || undefined,
        dropoffCep: dropoffCep || undefined,
      }),
    onSuccess: (quote) => {
      setQuotedFeeCents(quote.estimatedFeeCents);
      setQuotedDistanceMeters(quote.distanceMeters);
      setDeliveryFee(centsToDecimalString(quote.estimatedFeeCents));
      toast.success(t("deliveries.quoteReady"));
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof ApiError ? err.displayMessage : t("deliveries.quoteFailed"),
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (
        !pickupAddress ||
        !dropoffAddress ||
        !packageDescription ||
        !dropoffPlaceId ||
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
        dropoffPlaceId,
        placesSessionToken,
        packageDescription,
        packageSize: packageSize || undefined,
        packageWeightGrams: packageWeightGrams
          ? Number(packageWeightGrams)
          : undefined,
        notes: notes || undefined,
        deliveryFeeCents: deliveryFee
          ? decimalStringToCents(deliveryFee)
          : undefined,
      };

      return deliveryRequestsService.create(payload);
    },
    onSuccess: (deliveryRequest) => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveryRequests.all() });
      toast.success(t("deliveries.created"));
      router.push(`/delivery-requests/${deliveryRequest.id}`);
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
            onAddressChanged={() => {
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

          <div className="space-y-2">
            <Label htmlFor="deliveryFee">{t("deliveries.manualFee")}</Label>
            <Input
              id="deliveryFee"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              inputMode="decimal"
              placeholder="15,00"
            />
          </div>

          <div className="flex flex-col justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => quoteMutation.mutate()}
              disabled={!canQuote || quoteMutation.isPending}
            >
              {quoteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Calculator className="size-4" />
              )}
              {t("deliveries.calculateQuote")}
            </Button>
            {quotedFeeCents !== null && (
              <p className="text-xs text-muted-foreground">
                {t("deliveries.quoteSummary", {
                  price: centsToBRL(quotedFeeCents),
                  distance: ((quotedDistanceMeters ?? 0) / 1000).toFixed(1),
                })}
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
  onAddressChanged?: () => void;
}) {
  const t = useTranslation();

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
            onChange={(value) => {
              setAddress(value);
              setPlaceId("");
              onAddressChanged?.();
            }}
            onSelect={(place) => {
              setAddress(place.description);
              setPlaceId(place.placeId);
              onAddressChanged?.();
            }}
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
