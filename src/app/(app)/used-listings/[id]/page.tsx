"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { MessageThreadCard } from "@/components/messages/message-thread-card";
import { MoneyInput } from "@/components/forms/money-input";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { usedListingsService } from "@/lib/api/used-listings";
import type {
  UsedListingCondition,
  UsedListingInquiry,
  UsedListingStatus,
} from "@/lib/api/types";
import { centsToBRL, formatDateTime } from "@/lib/formatters";
import { useTranslation } from "@/lib/i18n/language-store";
import { resolveMediaUrl } from "@/lib/media-url";
import { queryKeys } from "@/lib/query-keys";
import {
  USED_LISTING_CONDITION_LABEL,
  USED_LISTING_STATUS_LABEL,
  usedListingQuantity,
  usedListingRegion,
} from "@/lib/used-listings";

const CONDITIONS: UsedListingCondition[] = [
  "USED",
  "SURPLUS",
  "OPEN_BOX",
  "PARTIAL",
  "EXCESS_LOT",
  "USED_TOOL",
  "OTHER",
];

const STATUSES: UsedListingStatus[] = [
  "DRAFT",
  "ACTIVE",
  "RESERVED",
  "SOLD",
  "CANCELLED",
  "EXPIRED",
  "REJECTED",
];

export default function UsedListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const listingId = Number(id);
  const t = useTranslation();
  const qc = useQueryClient();
  const { isAdmin, user, canManageSellerProducts } = useAuth();
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: queryKeys.usedListings.byId(listingId),
    queryFn: () => usedListingsService.getById(listingId),
    enabled: Number.isFinite(listingId),
  });

  const inquiriesParams = useMemo(
    () => ({ page: 1, limit: 20, listingId }),
    [listingId],
  );
  const inquiriesQ = useQuery({
    queryKey: queryKeys.usedListings.inquiries(inquiriesParams),
    queryFn: () => usedListingsService.listInquiries(inquiriesParams),
    enabled: Number.isFinite(listingId) && Boolean(query.data),
  });

  const listing = query.data;
  const canManage = listing
    ? isAdmin ||
      listing.ownerUserId === user?.id ||
      (listing.ownerSellerId
        ? canManageSellerProducts(listing.ownerSellerId)
        : false)
    : false;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<UsedListingCondition>("USED");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [remainingAmountDescription, setRemainingAmountDescription] =
    useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [negotiable, setNegotiable] = useState(true);
  const [publicNeighborhood, setPublicNeighborhood] = useState("");
  const [publicCity, setPublicCity] = useState("");
  const [publicState, setPublicState] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCep, setPickupCep] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [pickupLatitude, setPickupLatitude] = useState("");
  const [pickupLongitude, setPickupLongitude] = useState("");
  const [status, setStatus] = useState<UsedListingStatus>("ACTIVE");
  const [moderationReason, setModerationReason] = useState("");

  useEffect(() => {
    if (!listing) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Populate editable fields from the fetched listing.
    setTitle(listing.title);
    setDescription(listing.description);
    setCondition(listing.condition);
    setQuantity(listing.quantity ? String(listing.quantity) : "");
    setUnit(listing.unit ?? "");
    setRemainingAmountDescription(listing.remainingAmountDescription ?? "");
    setPriceCents(listing.priceCents ?? 0);
    setNegotiable(listing.negotiable ?? true);
    setPublicNeighborhood(listing.publicNeighborhood ?? "");
    setPublicCity(listing.publicCity ?? "");
    setPublicState(listing.publicState ?? "");
    setPickupAddress(listing.pickupAddress ?? "");
    setPickupCep(listing.pickupCep ?? "");
    setPickupContactName(listing.pickupContactName ?? "");
    setPickupContactPhone(listing.pickupContactPhone ?? "");
    setPickupLatitude(listing.pickupLatitude ?? "");
    setPickupLongitude(listing.pickupLongitude ?? "");
    setStatus(listing.status);
    setModerationReason(listing.moderationReason ?? "");
  }, [listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = useMutation({
    mutationFn: () =>
      usedListingsService.update(listingId, {
        title: title.trim(),
        description: description.trim(),
        condition,
        quantity: parseOptionalInt(quantity),
        unit: normalizedText(unit),
        remainingAmountDescription: normalizedText(remainingAmountDescription),
        priceCents,
        negotiable,
        publicNeighborhood: normalizedText(publicNeighborhood),
        publicCity: normalizedText(publicCity),
        publicState: normalizedText(publicState),
        pickupAddress: pickupAddress.trim(),
        pickupCep: normalizedText(pickupCep),
        pickupContactName: normalizedText(pickupContactName),
        pickupContactPhone: normalizedText(pickupContactPhone),
        pickupLatitude: normalizedText(pickupLatitude),
        pickupLongitude: normalizedText(pickupLongitude),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.usedListings.byId(listingId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.usedListings.all() });
      toast.success(t("usedListings.updated"));
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.displayMessage
          : t("usedListings.saveFailed"),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      usedListingsService.updateStatus(listingId, {
        status,
        moderationReason: normalizedText(moderationReason),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.usedListings.byId(listingId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.usedListings.all() });
      toast.success(t("usedListings.statusUpdated"));
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.displayMessage
          : t("usedListings.saveFailed"),
      );
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => usedListingsService.uploadImages(listingId, files),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.usedListings.byId(listingId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.usedListings.all() });
      toast.success(t("usedListings.imageUploaded"));
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.displayMessage
          : "Não foi possível enviar as imagens.",
      );
    },
  });

  const removeImageMutation = useMutation({
    mutationFn: (imageId: number) =>
      usedListingsService.removeImage(listingId, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.usedListings.byId(listingId) });
      qc.invalidateQueries({ queryKey: queryKeys.usedListings.all() });
      toast.success(t("usedListings.imageRemoved"));
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.displayMessage
          : "Não foi possível remover a imagem.",
      );
    },
  });

  const inquiries = inquiriesQ.data?.data ?? [];
  const selectedInquiry =
    inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ??
    inquiries[0] ??
    null;
  const sellerPickup = getSellerPickupData(listing?.ownerSeller);

  function applyOwnerSellerPickup() {
    if (!sellerPickup) return;

    setPickupAddress(sellerPickup.address);
    setPickupCep(sellerPickup.cep);
    setPickupContactName(sellerPickup.name);
    setPickupContactPhone(sellerPickup.phone);
    setPickupLatitude(sellerPickup.latitude);
    setPickupLongitude(sellerPickup.longitude);

    const region = inferPublicRegionFromAddress(sellerPickup.address);
    setPublicNeighborhood((current) => region.neighborhood || current);
    setPublicCity((current) => region.city || current);
    setPublicState((current) => region.state || current);
  }

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
        title={listing?.title ?? t("usedListings.title")}
        description={
          listing
            ? `${USED_LISTING_CONDITION_LABEL[listing.condition]} · ${
                usedListingRegion(listing) || "sem região pública"
              } · ${centsToBRL(listing.priceCents)}`
            : undefined
        }
      />

      {query.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !listing ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("usedListings.notFound")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t("usedListings.publicInfo")}</CardTitle>
                    <CardDescription>
                      {t("usedListings.editDescription")}
                    </CardDescription>
                  </div>
                  <Badge variant={statusBadgeVariant(listing.status)}>
                    {USED_LISTING_STATUS_LABEL[listing.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    disabled={!canManage}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">{t("common.description")}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    disabled={!canManage}
                    rows={5}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("usedListings.condition")}</Label>
                  <Select
                    value={condition}
                    disabled={!canManage}
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
                  <Label>{t("usedListings.price")}</Label>
                  <MoneyInput
                    valueCents={priceCents}
                    onChangeCents={setPriceCents}
                    disabled={!canManage}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">{t("usedListings.quantity")}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    disabled={!canManage}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={unit}
                    disabled={!canManage}
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
                    disabled={!canManage}
                    placeholder={usedListingQuantity(listing)}
                    onChange={(event) =>
                      setRemainingAmountDescription(event.target.value)
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
                  <div>
                    <Label htmlFor="negotiable">Negociável</Label>
                    <p className="text-xs text-muted-foreground">
                      Valor pode ser combinado por conversa.
                    </p>
                  </div>
                  <Switch
                    id="negotiable"
                    checked={negotiable}
                    disabled={!canManage}
                    onCheckedChange={setNegotiable}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publicNeighborhood">Bairro público</Label>
                  <Input
                    id="publicNeighborhood"
                    value={publicNeighborhood}
                    disabled={!canManage}
                    onChange={(event) =>
                      setPublicNeighborhood(event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publicCity">Cidade pública</Label>
                  <Input
                    id="publicCity"
                    value={publicCity}
                    disabled={!canManage}
                    onChange={(event) => setPublicCity(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publicState">UF pública</Label>
                  <Input
                    id="publicState"
                    value={publicState}
                    disabled={!canManage}
                    onChange={(event) => setPublicState(event.target.value)}
                  />
                </div>

                <div className="flex justify-end sm:col-span-2">
                  <Button
                    type="button"
                    disabled={!canManage || updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {t("common.saveChanges")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("usedListings.inquiries")}</CardTitle>
                <CardDescription>
                  Conversas abertas por compradores neste anúncio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {inquiriesQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Carregando conversas...
                  </p>
                ) : !inquiries.length ? (
                  <p className="text-sm text-muted-foreground">
                    {t("usedListings.noInquiries")}
                  </p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
                    <div className="space-y-2">
                      {inquiries.map((inquiry) => (
                        <InquiryButton
                          key={inquiry.id}
                          inquiry={inquiry}
                          selected={inquiry.id === selectedInquiry?.id}
                          onSelect={() => setSelectedInquiryId(inquiry.id)}
                        />
                      ))}
                    </div>
                    <div className="min-w-0 space-y-3">
                      {selectedInquiry ? (
                        <>
                          <InquirySummary inquiry={selectedInquiry} />
                          <MessageThreadCard
                            targetType="USED_LISTING_INQUIRY"
                            targetId={selectedInquiry.id}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("usedListings.privatePickup")}</CardTitle>
                <CardDescription>
                  Visível apenas para gestão autorizada e participantes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Anunciante">
                  {listing.ownerSeller?.name ??
                    listing.ownerUser?.name ??
                    `#${listing.ownerUserId}`}
                </Field>

                {sellerPickup ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canManage}
                    onClick={applyOwnerSellerPickup}
                  >
                    Usar endereco cadastrado da loja
                  </Button>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="pickupAddress">Endereço</Label>
                  <Textarea
                    id="pickupAddress"
                    value={pickupAddress}
                    disabled={!canManage}
                    rows={3}
                    onChange={(event) => setPickupAddress(event.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="pickupCep">CEP</Label>
                    <Input
                      id="pickupCep"
                      value={pickupCep}
                      disabled={!canManage}
                      onChange={(event) => setPickupCep(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickupContactPhone">Telefone</Label>
                    <Input
                      id="pickupContactPhone"
                      value={pickupContactPhone}
                      disabled={!canManage}
                      onChange={(event) =>
                        setPickupContactPhone(event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupContactName">Contato</Label>
                  <Input
                    id="pickupContactName"
                    value={pickupContactName}
                    disabled={!canManage}
                    onChange={(event) => setPickupContactName(event.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="pickupLatitude">Latitude</Label>
                    <Input
                      id="pickupLatitude"
                      value={pickupLatitude}
                      disabled={!canManage}
                      onChange={(event) => setPickupLatitude(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickupLongitude">Longitude</Label>
                    <Input
                      id="pickupLongitude"
                      value={pickupLongitude}
                      disabled={!canManage}
                      onChange={(event) =>
                        setPickupLongitude(event.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("usedListings.moderation")}</CardTitle>
                <CardDescription>
                  Admin pode rejeitar; loja pode pausar, reservar ou vender.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("usedListings.status")}</Label>
                  <Select
                    value={status}
                    disabled={!canManage}
                    onValueChange={(value) => setStatus(value as UsedListingStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {USED_LISTING_STATUS_LABEL[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moderationReason">
                    {t("usedListings.moderationReason")}
                  </Label>
                  <Textarea
                    id="moderationReason"
                    value={moderationReason}
                    disabled={!isAdmin}
                    rows={3}
                    onChange={(event) => setModerationReason(event.target.value)}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!canManage || statusMutation.isPending}
                  onClick={() => statusMutation.mutate()}
                >
                  {statusMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Atualizar status
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("usedListings.images")}</CardTitle>
                <CardDescription>
                  Fotos ajudam o comprador a avaliar a sobra.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-6 text-sm font-medium text-muted-foreground hover:bg-muted/50">
                  {uploadMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {t("usedListings.uploadImages")}
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    multiple
                    disabled={!canManage || uploadMutation.isPending}
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      if (files.length) uploadMutation.mutate(files);
                    }}
                  />
                </label>

                {listing.images?.length ? (
                  <div className="grid grid-cols-2 gap-3">
                    {listing.images.map((image) => (
                      <div
                        key={image.id}
                        className="group relative overflow-hidden rounded-md border border-border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveMediaUrl(image.url)}
                          alt={listing.title}
                          className="aspect-square w-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute right-2 top-2 h-8 px-2 opacity-0 transition-opacity group-hover:opacity-100"
                          disabled={!canManage || removeImageMutation.isPending}
                          onClick={() => removeImageMutation.mutate(image.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                    <ImageIcon className="size-8" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function InquiryButton({
  inquiry,
  selected,
  onSelect,
}: {
  inquiry: UsedListingInquiry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {inquiry.buyerUser?.name ?? `Comprador #${inquiry.buyerUserId}`}
        </span>
        <MessageSquare className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        #{inquiry.id} · {formatDateTime(inquiry.updatedAt ?? inquiry.createdAt)}
      </div>
    </button>
  );
}

function InquirySummary({ inquiry }: { inquiry: UsedListingInquiry }) {
  const deliveryRequests = inquiry.deliveryRequests ?? [];

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {inquiry.buyerUser?.name ?? `Comprador #${inquiry.buyerUserId}`}
          </p>
          {inquiry.buyerUser?.email ? (
            <p className="text-xs text-muted-foreground">
              {inquiry.buyerUser.email}
            </p>
          ) : null}
        </div>
        <Badge variant="muted">{inquiry.status}</Badge>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>Entrega vinculada nasce apenas quando alguém pedir o frete.</p>
        {deliveryRequests.length ? (
          <div className="space-y-1">
            {deliveryRequests.map((deliveryRequest) => (
              <Link
                key={deliveryRequest.id}
                href={`/delivery-requests/${deliveryRequest.id}`}
                className="block font-medium text-foreground hover:underline"
              >
                Entrega #{deliveryRequest.id} · {deliveryRequest.status} ·{" "}
                {centsToBRL(deliveryRequest.deliveryFeeCents)}
              </Link>
            ))}
          </div>
        ) : (
          <p>Nenhuma entrega vinculada ainda.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium">{children}</p>
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

function statusBadgeVariant(
  status: UsedListingStatus,
): "success" | "destructive" | "warning" | "default" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "REJECTED" || status === "CANCELLED") return "destructive";
  if (status === "RESERVED") return "warning";
  if (status === "SOLD") return "default";
  return "muted";
}

function getSellerPickupData(seller: unknown) {
  if (!seller || typeof seller !== "object") return null;
  const record = seller as Record<string, unknown>;
  const address = typeof record.address === "string" ? record.address : "";
  if (!address) return null;

  return {
    address,
    cep: typeof record.cep === "string" ? record.cep : "",
    name: typeof record.name === "string" ? record.name : "",
    phone: typeof record.phone === "string" ? record.phone : "",
    latitude: typeof record.latitude === "string" ? record.latitude : "",
    longitude: typeof record.longitude === "string" ? record.longitude : "",
  };
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
