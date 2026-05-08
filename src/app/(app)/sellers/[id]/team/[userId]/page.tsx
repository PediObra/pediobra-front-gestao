"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  PackageCheck,
  Save,
  Shield,
  Store,
  Trash2,
  UserCog,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  sellersService,
  type UpdateSellerUserAccessPayload,
} from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { MembershipRoleBadge } from "@/components/badges";
import { membershipRoleLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { MembershipRole } from "@/lib/api/types";

export default function SellerTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId: userIdParam } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const sellerId = Number(id);
  const userId = Number(userIdParam);
  const {
    user: authUser,
    isAdmin,
    canManageSellerStaff,
    membershipFor,
  } = useAuth();
  const canEditTeam = canManageSellerStaff(sellerId);
  const actorMembership = membershipFor(sellerId);
  const canManageOwnerRole =
    isAdmin || actorMembership?.membershipRole === "OWNER";
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const sellerQuery = useQuery({
    queryKey: queryKeys.sellers.byId(sellerId),
    queryFn: () => sellersService.getById(sellerId),
    enabled: Number.isFinite(sellerId),
  });
  const memberQuery = useQuery({
    queryKey: queryKeys.sellers.userAccess(sellerId, userId),
    queryFn: () => sellersService.getUserAccess(sellerId, userId),
    enabled: Number.isFinite(sellerId) && Number.isFinite(userId),
  });

  const member = memberQuery.data;
  const membership = useMemo(
    () => member?.sellers.find((seller) => seller.sellerId === sellerId),
    [member, sellerId],
  );
  const isSelf = authUser?.id === userId;
  const isSelfOwner = isSelf && membership?.membershipRole === "OWNER";
  const targetIsOwner = membership?.membershipRole === "OWNER";
  const canEditMember =
    canEditTeam && Boolean(membership) && (!targetIsOwner || canManageOwnerRole);

  const [jobTitle, setJobTitle] = useState("");
  const [membershipRole, setMembershipRole] =
    useState<MembershipRole>("EMPLOYEE");
  const [canEditSeller, setCanEditSeller] = useState(false);
  const [canManageSellerProducts, setCanManageSellerProducts] = useState(false);
  const [canManageSellerStaffValue, setCanManageSellerStaffValue] =
    useState(false);

  useEffect(() => {
    if (!membership) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Populate editable fields from the fetched membership.
    setJobTitle(membership.jobTitle ?? "");
    setMembershipRole(membership.membershipRole);
    setCanEditSeller(
      membership.membershipRole === "OWNER" ? true : membership.canEditSeller,
    );
    setCanManageSellerProducts(
      membership.membershipRole === "OWNER"
        ? true
        : membership.canManageSellerProducts,
    );
    setCanManageSellerStaffValue(
      membership.membershipRole === "OWNER"
        ? true
        : membership.canManageSellerStaff,
    );
  }, [membership]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (isSelfOwner && membershipRole !== "OWNER") {
        throw new Error("Você não pode remover seu próprio papel de owner.");
      }

      const payload: UpdateSellerUserAccessPayload = {
        jobTitle: membershipRole === "OWNER" ? null : jobTitle.trim() || null,
        membershipRole,
        canEditSeller: membershipRole === "OWNER" ? true : canEditSeller,
        canManageSellerProducts:
          membershipRole === "OWNER" ? true : canManageSellerProducts,
        canManageSellerStaff:
          membershipRole === "OWNER" ? true : canManageSellerStaffValue,
      };

      return sellersService.updateUserAccess(sellerId, userId, payload);
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.sellers.userAccess(sellerId, userId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.users.all() });
      toast.success("Acesso da equipe atualizado.");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : "Não foi possível salvar o acesso.";
      toast.error(msg);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => sellersService.removeUserAccess(sellerId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all() });
      toast.success("Usuário removido da equipe da loja.");
      router.push(`/sellers/${sellerId}`);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Não foi possível remover o usuário da loja.";
      toast.error(msg);
    },
  });

  const isLoading = sellerQuery.isLoading || memberQuery.isLoading;
  const canSave = canEditMember;
  const canRemove = canEditMember && !isSelf;
  const permissionOptions = [
    {
      id: "edit-store",
      title: "Editar Loja",
      description: "Alterar dados operacionais permitidos da loja.",
      checked: membershipRole === "OWNER" || canEditSeller,
      onToggle: () => setCanEditSeller((value) => !value),
      icon: Store,
    },
    {
      id: "manage-offers",
      title: "Gerenciar Ofertas",
      description: "Criar, importar e editar produtos e ofertas.",
      checked: membershipRole === "OWNER" || canManageSellerProducts,
      onToggle: () => setCanManageSellerProducts((value) => !value),
      icon: PackageCheck,
    },
    {
      id: "manage-team",
      title: "Gerenciar Equipe",
      description: "Administrar acessos de outros colaboradores.",
      checked: membershipRole === "OWNER" || canManageSellerStaffValue,
      onToggle: () => setCanManageSellerStaffValue((value) => !value),
      icon: UsersRound,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={`/sellers/${sellerId}`}>
            <ArrowLeft className="size-4" />
            Voltar para a loja
          </Link>
        </Button>
      </div>

      <PageHeader
        title={member?.name ?? "Membro da equipe"}
        description={sellerQuery.data?.name}
      />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !member || !membership ? (
        <Card className="w-full max-w-4xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            Vínculo de equipe não encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <UserCog className="size-5 text-muted-foreground" />
                Acesso na loja
              </CardTitle>
              <CardDescription>
                Papel e permissões deste usuário em {sellerQuery.data?.name}.
              </CardDescription>
            </CardHeader>
            {!canEditTeam && (
              <CardContent className="border-b border-border py-4 text-sm text-muted-foreground">
                Apenas quem tem Gerenciar Equipe nesta loja pode alterar
                permissões de equipe.
              </CardContent>
            )}
            {canEditTeam && targetIsOwner && !canManageOwnerRole && (
              <CardContent className="border-b border-border py-4 text-sm text-muted-foreground">
                Apenas proprietários podem alterar o acesso de outro
                proprietário.
              </CardContent>
            )}
            <CardContent className="grid gap-5 p-6">
              <div
                className={cn(
                  "grid gap-4",
                  membershipRole !== "OWNER" && "sm:grid-cols-2",
                )}
              >
                <div className="space-y-2">
                  <Label htmlFor="membership-role">Papel na loja</Label>
                  <Select
                    value={membershipRole}
                    disabled={!canEditMember || isSelfOwner}
                    onValueChange={(value) => {
                      const nextRole = value as MembershipRole;
                      setMembershipRole(nextRole);
                      if (nextRole === "OWNER") {
                        setCanEditSeller(true);
                        setCanManageSellerProducts(true);
                        setCanManageSellerStaffValue(true);
                      }
                    }}
                  >
                    <SelectTrigger id="membership-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(canManageOwnerRole || membershipRole === "OWNER") && (
                        <SelectItem value="OWNER">
                          {membershipRoleLabel("OWNER")}
                        </SelectItem>
                      )}
                      <SelectItem value="EMPLOYEE">
                        {membershipRoleLabel("EMPLOYEE")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {isSelfOwner && (
                    <p className="text-xs text-muted-foreground">
                      Você não pode remover seu próprio papel de owner.
                    </p>
                  )}
                </div>
                {membershipRole !== "OWNER" && (
                  <div className="space-y-2">
                    <Label htmlFor="job-title">Cargo</Label>
                    <Input
                      id="job-title"
                      disabled={!canEditTeam}
                      value={jobTitle}
                      onChange={(event) => setJobTitle(event.target.value)}
                      placeholder="Ex: Gerente, Estoquista"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {permissionOptions.map((option) => {
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="switch"
                      aria-checked={option.checked}
                      disabled={!canEditMember || membershipRole === "OWNER"}
                      onClick={option.onToggle}
                      className={cn(
                        "group flex min-h-32 cursor-pointer flex-col justify-between rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                        option.checked
                          ? "border-amber-300 bg-amber-50 text-amber-950 shadow-sm ring-1 ring-amber-200 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100"
                          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/60",
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full border transition-colors",
                            option.checked
                              ? "border-amber-400 bg-amber-500 text-white"
                              : "border-border bg-muted text-muted-foreground group-hover:bg-background",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            option.checked
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {option.checked ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <Circle className="size-3.5" />
                          )}
                          {option.checked ? "Ativo" : "Inativo"}
                        </span>
                      </span>
                      <span className="mt-4 space-y-1">
                        <span className="block text-sm font-semibold">
                          {option.title}
                        </span>
                        <span className="block text-xs leading-5 text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
            {canSave && (
              <CardFooter className="justify-end">
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Salvar acesso
                </Button>
              </CardFooter>
            )}
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5 text-muted-foreground" />
                  Dados do usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{member.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="break-all font-medium">{member.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Papel atual</p>
                  <div className="mt-1">
                    <MembershipRoleBadge role={membership.membershipRole} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border">
                <CardTitle>Remover da loja</CardTitle>
                <CardDescription>
                  Remove apenas o vínculo deste usuário com esta loja.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {isSelf ? (
                  <p className="text-sm text-muted-foreground">
                    Você não pode remover seu próprio acesso da loja.
                  </p>
                ) : (
                  <Dialog
                    open={confirmRemoveOpen}
                    onOpenChange={setConfirmRemoveOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={!canRemove || removeMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                        Remover usuário da loja
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Remover usuário da loja?</DialogTitle>
                        <DialogDescription>
                          {member.name} perderá o acesso a {sellerQuery.data?.name}.
                          O cadastro global do usuário será mantido.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmRemoveOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => removeMutation.mutate()}
                          disabled={removeMutation.isPending}
                        >
                          {removeMutation.isPending && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          Remover da loja
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
