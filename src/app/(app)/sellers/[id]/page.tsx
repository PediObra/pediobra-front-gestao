"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  CalendarClock,
  FileClock,
  FileUp,
  Loader2,
  MapPinned,
  Power,
  Save,
  Store,
  Truck,
  Users,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { sellersService, type UpdateSellerPayload } from "@/lib/api/sellers";
import { sellerProductImportsService } from "@/lib/api/seller-product-imports";
import { usersService } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { formatDateTime, formatPhone } from "@/lib/formatters";
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { StripeConnectStatusCard } from "@/components/payments/stripe-connect-status-card";
import { MembershipRoleBadge } from "@/components/badges";
import { useTranslation } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";
import type {
  MembershipRole,
  SellerDayOfWeek,
  SellerDeliveryProvider,
  SellerOperatingHour,
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

const SELLER_DAY_LABELS: Record<SellerDayOfWeek, string> = {
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};
const SELLER_DAYS = Object.keys(SELLER_DAY_LABELS) as SellerDayOfWeek[];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTE_OPTIONS = ["00", "15", "30", "45"] as const;

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
    membershipFor,
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
  const operationalSettingsQuery = useQuery({
    queryKey: queryKeys.sellers.operationalSettings(sellerId),
    queryFn: () => sellersService.getOperationalSettings(sellerId),
    enabled: Number.isFinite(sellerId) && authReady && Boolean(query.data),
  });

  const seller = query.data;
  const canEdit = canEditSeller(sellerId);
  const canEditTeam = canManageSellerStaff(sellerId);
  const canEditMasterData = canEdit && isAdmin;
  const currentMembership = membershipFor(sellerId);
  const isSellerOwner = currentMembership?.membershipRole === "OWNER";
  const canInviteOwner = isAdmin || isSellerOwner;
  const canConfigureReceiving = isSellerOwner;
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
  const [autoOnlineEnabled, setAutoOnlineEnabled] = useState(false);
  const [operatingHours, setOperatingHours] = useState<SellerOperatingHour[]>(
    () => buildDefaultOperatingHours(),
  );
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMembershipRole, setInviteMembershipRole] =
    useState<MembershipRole>("EMPLOYEE");
  const [inviteJobTitle, setInviteJobTitle] = useState("");
  const [inviteCanEditSeller, setInviteCanEditSeller] = useState(false);
  const [inviteCanManageSellerProducts, setInviteCanManageSellerProducts] =
    useState(false);
  const [inviteCanManageSellerStaff, setInviteCanManageSellerStaff] =
    useState(false);
  const [devInviteUrl, setDevInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (seller) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Populate editable fields from the fetched seller.
      setName(seller.name);
      setEmail(seller.email);
      setAddress(seller.address);
      setPlaceId("");
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

  useEffect(() => {
    const settings = operationalSettingsQuery.data;
    if (!settings) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Populate editable availability fields from the fetched settings.
    setAutoOnlineEnabled(settings.autoOnlineEnabled);
    setOperatingHours(mergeOperatingHours(settings.operatingHours));
  }, [operationalSettingsQuery.data?.sellerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOperationalScheduleComplete = useMemo(
    () => isCompleteOperatingSchedule(operatingHours),
    [operatingHours],
  );
  const sellerIsOnline =
    operationalSettingsQuery.data?.isOnline ?? seller?.isOnline ?? true;

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
  const availabilityMutation = useMutation({
    mutationFn: (isOnline: boolean) =>
      sellersService.updateAvailability(sellerId, { isOnline }),
    onSuccess: (settings) => {
      qc.setQueryData(
        queryKeys.sellers.operationalSettings(sellerId),
        settings,
      );
      setAutoOnlineEnabled(settings.autoOnlineEnabled);
      setOperatingHours(mergeOperatingHours(settings.operatingHours));
      qc.setQueryData(queryKeys.sellers.byId(sellerId), {
        ...(seller ?? {}),
        isOnline: settings.isOnline,
        autoOnlineEnabled: settings.autoOnlineEnabled,
      });
      toast.success(
        settings.isOnline ? "Loja marcada como online." : "Loja offline.",
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel atualizar o status da loja.";
      toast.error(msg);
    },
  });
  const operationalSettingsMutation = useMutation({
    mutationFn: () => {
      if (autoOnlineEnabled && !isOperationalScheduleComplete) {
        throw new Error(
          "Configure horarios validos para todos os dias antes de ativar o automatico.",
        );
      }

      return sellersService.updateOperationalSettings(sellerId, {
        autoOnlineEnabled,
        operatingHours,
      });
    },
    onSuccess: (settings) => {
      qc.setQueryData(
        queryKeys.sellers.operationalSettings(sellerId),
        settings,
      );
      setAutoOnlineEnabled(settings.autoOnlineEnabled);
      setOperatingHours(mergeOperatingHours(settings.operatingHours));
      qc.setQueryData(queryKeys.sellers.byId(sellerId), {
        ...(seller ?? {}),
        isOnline: settings.isOnline,
        autoOnlineEnabled: settings.autoOnlineEnabled,
      });
      qc.invalidateQueries({ queryKey: queryKeys.sellers.all() });
      toast.success("Disponibilidade da loja atualizada.");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : "Nao foi possivel salvar a disponibilidade da loja.";
      toast.error(msg);
    },
  });
  const inviteMutation = useMutation({
    mutationFn: () =>
      sellersService.createTeamInvitation(sellerId, {
        email: inviteEmail.trim(),
        membershipRole: inviteMembershipRole,
        jobTitle:
          inviteMembershipRole === "OWNER"
            ? null
            : inviteJobTitle.trim() || null,
        canEditSeller:
          inviteMembershipRole === "OWNER" ? true : inviteCanEditSeller,
        canManageSellerProducts:
          inviteMembershipRole === "OWNER"
            ? true
            : inviteCanManageSellerProducts,
        canManageSellerStaff:
          inviteMembershipRole === "OWNER" ? true : inviteCanManageSellerStaff,
      }),
    onSuccess: (invitation) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all() });
      setDevInviteUrl(invitation.devInviteUrl ?? null);
      toast.success("Convite enviado.");
      if (!invitation.devInviteUrl) {
        setInviteDialogOpen(false);
        resetInvitationForm();
      }
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel enviar o convite.";
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
  function updateOperatingHour(
    dayOfWeek: SellerDayOfWeek,
    patch: Partial<SellerOperatingHour>,
  ) {
    setOperatingHours((current) =>
      current.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour,
      ),
    );
  }

  function toggleClosed(dayOfWeek: SellerDayOfWeek, isClosed: boolean) {
    updateOperatingHour(
      dayOfWeek,
      isClosed
        ? { isClosed, opensAt: null, closesAt: null }
        : { isClosed, opensAt: "07:00", closesAt: "18:00" },
    );
  }

  function updateTimePart(
    dayOfWeek: SellerDayOfWeek,
    field: "opensAt" | "closesAt",
    part: "hour" | "minute",
    value: string,
  ) {
    const current = operatingHours.find((hour) => hour.dayOfWeek === dayOfWeek);
    const time = splitTime(
      current?.[field],
      field === "opensAt" ? "07:00" : "18:00",
    );
    const nextTime =
      part === "hour" ? `${value}:${time.minute}` : `${time.hour}:${value}`;

    updateOperatingHour(dayOfWeek, { [field]: nextTime });
  }

  function resetInvitationForm() {
    setInviteEmail("");
    setInviteMembershipRole("EMPLOYEE");
    setInviteJobTitle("");
    setInviteCanEditSeller(false);
    setInviteCanManageSellerProducts(false);
    setInviteCanManageSellerStaff(false);
    setDevInviteUrl(null);
  }

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
              <Card className="w-full max-w-6xl">
                <CardHeader className="gap-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarClock className="size-5 text-muted-foreground" />
                      Disponibilidade operacional
                    </CardTitle>
                    <CardDescription>
                      Controle se a loja pode receber novos pedidos no app do
                      cliente.
                    </CardDescription>
                  </div>
                  <Badge variant={sellerIsOnline ? "success" : "destructive"}>
                    {sellerIsOnline ? "Online" : "Offline"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Power className="size-4 text-muted-foreground" />
                            Status da loja
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            Offline bloqueia catálogo, carrinho e checkout.
                          </p>
                        </div>
                        <Switch
                          aria-label="Alterar status online da loja"
                          checked={sellerIsOnline}
                          disabled={
                            !canEdit ||
                            availabilityMutation.isPending ||
                            operationalSettingsQuery.isLoading
                          }
                          onCheckedChange={(checked) =>
                            availabilityMutation.mutate(checked)
                          }
                        />
                      </div>
                    </div>
                    <div className="rounded-md border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">
                            Seguir horários cadastrados
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            Mantém a loja online no expediente e offline fora
                            dele.
                          </p>
                        </div>
                        <Switch
                          aria-label="Ativar disponibilidade automática"
                          checked={autoOnlineEnabled}
                          disabled={
                            !canEdit ||
                            operationalSettingsQuery.isLoading ||
                            (!autoOnlineEnabled &&
                              !isOperationalScheduleComplete)
                          }
                          onCheckedChange={setAutoOnlineEnabled}
                        />
                      </div>
                      {!isOperationalScheduleComplete && (
                        <p className="mt-3 text-xs text-destructive">
                          Revise os horários antes de ativar o automático.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">
                        Horários de funcionamento
                      </h3>
                      {operationalSettingsQuery.isLoading && (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="grid gap-3">
                      {operatingHours.map((hour) => {
                        const opens = splitTime(hour.opensAt, "07:00");
                        const closes = splitTime(hour.closesAt, "18:00");

                        return (
                          <div
                            key={hour.dayOfWeek}
                            className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[120px_120px_1fr] md:items-center"
                          >
                            <div className="text-sm font-medium">
                              {SELLER_DAY_LABELS[hour.dayOfWeek]}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={hour.isClosed}
                                disabled={!canEdit}
                                onCheckedChange={(checked) =>
                                  toggleClosed(hour.dayOfWeek, checked === true)
                                }
                              />
                              Fechado
                            </label>
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                              <div className="grid grid-cols-2 gap-2">
                                <TimeSelect
                                  ariaLabel={`Hora de abertura ${SELLER_DAY_LABELS[hour.dayOfWeek]}`}
                                  value={opens.hour}
                                  options={HOUR_OPTIONS}
                                  disabled={!canEdit || hour.isClosed}
                                  onChange={(value) =>
                                    updateTimePart(
                                      hour.dayOfWeek,
                                      "opensAt",
                                      "hour",
                                      value,
                                    )
                                  }
                                />
                                <TimeSelect
                                  ariaLabel={`Minuto de abertura ${SELLER_DAY_LABELS[hour.dayOfWeek]}`}
                                  value={opens.minute}
                                  options={MINUTE_OPTIONS}
                                  disabled={!canEdit || hour.isClosed}
                                  onChange={(value) =>
                                    updateTimePart(
                                      hour.dayOfWeek,
                                      "opensAt",
                                      "minute",
                                      value,
                                    )
                                  }
                                />
                              </div>
                              <span className="hidden text-center text-xs text-muted-foreground sm:block">
                                até
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <TimeSelect
                                  ariaLabel={`Hora de fechamento ${SELLER_DAY_LABELS[hour.dayOfWeek]}`}
                                  value={closes.hour}
                                  options={HOUR_OPTIONS}
                                  disabled={!canEdit || hour.isClosed}
                                  onChange={(value) =>
                                    updateTimePart(
                                      hour.dayOfWeek,
                                      "closesAt",
                                      "hour",
                                      value,
                                    )
                                  }
                                />
                                <TimeSelect
                                  ariaLabel={`Minuto de fechamento ${SELLER_DAY_LABELS[hour.dayOfWeek]}`}
                                  value={closes.minute}
                                  options={MINUTE_OPTIONS}
                                  disabled={!canEdit || hour.isClosed}
                                  onChange={(value) =>
                                    updateTimePart(
                                      hour.dayOfWeek,
                                      "closesAt",
                                      "minute",
                                      value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
                {canEdit && (
                  <CardFooter className="justify-end">
                    <Button
                      onClick={() => operationalSettingsMutation.mutate()}
                      disabled={
                        operationalSettingsMutation.isPending ||
                        operationalSettingsQuery.isLoading ||
                        (autoOnlineEnabled && !isOperationalScheduleComplete)
                      }
                    >
                      {operationalSettingsMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Salvar disponibilidade
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
                actionLabel={
                  canConfigureReceiving ? "Configurar recebimento" : undefined
                }
                actionLoading={stripeConnectMutation.isPending}
                onAction={
                  canConfigureReceiving
                    ? () => stripeConnectMutation.mutate()
                    : undefined
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
                  {canEditTeam && (
                    <Dialog
                      open={inviteDialogOpen}
                      onOpenChange={(open) => {
                        setInviteDialogOpen(open);
                        if (!open) resetInvitationForm();
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <UserPlus className="size-4" />
                          Adicionar membro
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                          <DialogTitle>Convidar membro</DialogTitle>
                          <DialogDescription>
                            Envie um convite por email para vincular uma pessoa
                            à equipe desta loja.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="invite-email">Email</Label>
                            <Input
                              id="invite-email"
                              type="email"
                              autoComplete="email"
                              value={inviteEmail}
                              onChange={(event) =>
                                setInviteEmail(event.target.value)
                              }
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="invite-role">Papel</Label>
                              <Select
                                value={inviteMembershipRole}
                                onValueChange={(value) => {
                                  const role = value as MembershipRole;
                                  setInviteMembershipRole(role);
                                  if (role === "OWNER") {
                                    setInviteCanEditSeller(true);
                                    setInviteCanManageSellerProducts(true);
                                    setInviteCanManageSellerStaff(true);
                                  }
                                }}
                              >
                                <SelectTrigger id="invite-role">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EMPLOYEE">
                                    Funcionário
                                  </SelectItem>
                                  {canInviteOwner && (
                                    <SelectItem value="OWNER">Owner</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="invite-job-title">Cargo</Label>
                              <Input
                                id="invite-job-title"
                                disabled={inviteMembershipRole === "OWNER"}
                                value={inviteJobTitle}
                                onChange={(event) =>
                                  setInviteJobTitle(event.target.value)
                                }
                              />
                            </div>
                          </div>

                          {inviteMembershipRole === "EMPLOYEE" ? (
                            <div className="grid gap-3 rounded-md border border-border p-3">
                              <label className="flex items-start gap-2 text-sm">
                                <Checkbox
                                  checked={inviteCanEditSeller}
                                  onCheckedChange={(checked) =>
                                    setInviteCanEditSeller(checked === true)
                                  }
                                />
                                <span>
                                  <span className="block font-medium">
                                    Editar loja
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    Alterar dados operacionais permitidos.
                                  </span>
                                </span>
                              </label>
                              <label className="flex items-start gap-2 text-sm">
                                <Checkbox
                                  checked={inviteCanManageSellerProducts}
                                  onCheckedChange={(checked) =>
                                    setInviteCanManageSellerProducts(
                                      checked === true,
                                    )
                                  }
                                />
                                <span>
                                  <span className="block font-medium">
                                    Gerenciar ofertas
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    Criar, importar e editar produtos da loja.
                                  </span>
                                </span>
                              </label>
                              <label className="flex items-start gap-2 text-sm">
                                <Checkbox
                                  checked={inviteCanManageSellerStaff}
                                  onCheckedChange={(checked) =>
                                    setInviteCanManageSellerStaff(
                                      checked === true,
                                    )
                                  }
                                />
                                <span>
                                  <span className="block font-medium">
                                    Gerenciar equipe
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    Convidar e editar outros colaboradores.
                                  </span>
                                </span>
                              </label>
                            </div>
                          ) : (
                            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                              Owners têm acesso completo à loja e podem
                              convidar outros owners.
                            </div>
                          )}

                          {devInviteUrl && (
                            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                              <p className="text-sm font-medium">
                                Link local do convite
                              </p>
                              <Input value={devInviteUrl} readOnly />
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setInviteDialogOpen(false)}
                          >
                            Fechar
                          </Button>
                          <Button
                            type="button"
                            disabled={
                              inviteMutation.isPending || !inviteEmail.trim()
                            }
                            onClick={() => inviteMutation.mutate()}
                          >
                            {inviteMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <UserPlus className="size-4" />
                            )}
                            Enviar convite
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
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

function buildDefaultOperatingHours(): SellerOperatingHour[] {
  return SELLER_DAYS.map((dayOfWeek) => {
    if (dayOfWeek === "SUNDAY") {
      return { dayOfWeek, isClosed: true, opensAt: null, closesAt: null };
    }

    if (dayOfWeek === "SATURDAY") {
      return {
        dayOfWeek,
        isClosed: false,
        opensAt: "08:00",
        closesAt: "13:00",
      };
    }

    return {
      dayOfWeek,
      isClosed: false,
      opensAt: "07:00",
      closesAt: "18:00",
    };
  });
}

function mergeOperatingHours(hours: SellerOperatingHour[]) {
  const byDay = new Map(hours.map((hour) => [hour.dayOfWeek, hour]));

  return buildDefaultOperatingHours().map((fallback) => ({
    ...fallback,
    ...byDay.get(fallback.dayOfWeek),
  }));
}

function splitTime(value: string | null | undefined, fallback: string) {
  const [hour, minute] = (value ?? fallback).split(":");

  return {
    hour: hour ?? "00",
    minute: minute ?? "00",
  };
}

function isCompleteOperatingSchedule(hours: SellerOperatingHour[]) {
  if (hours.length !== SELLER_DAYS.length) return false;

  const seenDays = new Set<SellerDayOfWeek>();

  for (const hour of hours) {
    if (seenDays.has(hour.dayOfWeek)) return false;
    seenDays.add(hour.dayOfWeek);

    if (hour.isClosed) continue;
    if (!isValidTime(hour.opensAt) || !isValidTime(hour.closesAt)) {
      return false;
    }

    if (timeToMinutes(hour.closesAt!) <= timeToMinutes(hour.opensAt!)) {
      return false;
    }
  }

  return seenDays.size === SELLER_DAYS.length;
}

function isValidTime(value: string | null | undefined) {
  return /^([01]\d|2[0-3]):(00|15|30|45)$/.test(value ?? "");
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function TimeSelect({
  ariaLabel,
  value,
  options,
  disabled,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: readonly string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
