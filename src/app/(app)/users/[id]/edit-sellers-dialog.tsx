"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usersService } from "@/lib/api/users";
import { sellersService } from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type {
  MembershipRole,
  SellerMembershipAccess,
  UserWithRelations,
} from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { membershipRoleLabel } from "@/lib/formatters";
import { useTranslation } from "@/lib/i18n/language-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MembershipDraft = SellerMembershipAccess & {
  jobTitle: string | null;
};

export function EditSellersDialog({
  user,
  children,
}: {
  user: UserWithRelations;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslation();
  const [drafts, setDrafts] = useState<MembershipDraft[]>(() =>
    user.sellers.map((s) => ({
      sellerId: s.sellerId,
      membershipRole: s.membershipRole,
      jobTitle: s.jobTitle ?? null,
      canEditSeller: s.canEditSeller,
      canManageSellerProducts: s.canManageSellerProducts,
      canManageSellerStaff: s.canManageSellerStaff,
    })),
  );

  const qc = useQueryClient();

  const sellersQuery = useQuery({
    queryKey: queryKeys.sellers.list({ page: 1, limit: 100 }),
    queryFn: () => sellersService.list({ page: 1, limit: 100 }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (sellers: MembershipDraft[]) =>
      usersService.updateSellers(user.id, sellers),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.users.byId(user.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.users.all() });
      toast.success(t("sellerLinks.updated"));
      setOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("sellerLinks.saveFailed");
      toast.error(msg);
    },
  });

  function updateDraft(index: number, patch: Partial<MembershipDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  function addDraft() {
    setDrafts((prev) => [
      ...prev,
      {
        sellerId: 0,
        membershipRole: "EMPLOYEE",
        jobTitle: null,
        canEditSeller: false,
        canManageSellerProducts: false,
        canManageSellerStaff: false,
      },
    ]);
  }

  const availableSellers = sellersQuery.data?.data ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDrafts(
            user.sellers.map((s) => ({
              sellerId: s.sellerId,
              membershipRole: s.membershipRole,
              jobTitle: s.jobTitle ?? null,
              canEditSeller: s.canEditSeller,
              canManageSellerProducts: s.canManageSellerProducts,
              canManageSellerStaff: s.canManageSellerStaff,
            })),
          );
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("sellerLinks.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("sellerLinks.editDescription", { user: user.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {drafts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("sellerLinks.emptyDraft")}
            </p>
          )}

          {drafts.map((draft, index) => (
            <div
              key={index}
              className="rounded-md border border-border p-3 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">{t("sellerProducts.store")}</Label>
                  <Select
                    value={String(draft.sellerId || "")}
                    onValueChange={(v) =>
                      updateDraft(index, { sellerId: Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("sellerLinks.selectStore")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSellers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40 space-y-2">
                  <Label className="text-xs">{t("team.role")}</Label>
                  <Select
                    value={draft.membershipRole}
                    onValueChange={(v) =>
                      updateDraft(index, {
                        membershipRole: v as MembershipRole,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">
                        {membershipRoleLabel("OWNER")}
                      </SelectItem>
                      <SelectItem value="EMPLOYEE">
                        {membershipRoleLabel("EMPLOYEE")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDraft(index)}
                  className="mt-6 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t("sellerLinks.jobTitle")}</Label>
                <Input
                  value={draft.jobTitle ?? ""}
                  onChange={(e) =>
                    updateDraft(index, { jobTitle: e.target.value || null })
                  }
                  placeholder={t("sellerLinks.jobTitlePlaceholder")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={draft.canEditSeller}
                    onCheckedChange={(v) =>
                      updateDraft(index, { canEditSeller: v === true })
                    }
                  />
                  {t("team.editStore")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={draft.canManageSellerProducts}
                    onCheckedChange={(v) =>
                      updateDraft(index, {
                        canManageSellerProducts: v === true,
                      })
                    }
                  />
                  {t("sellerLinks.manageOffers")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={draft.canManageSellerStaff}
                    onCheckedChange={(v) =>
                      updateDraft(index, {
                        canManageSellerStaff: v === true,
                      })
                    }
                  />
                  {t("sellerLinks.manageStaff")}
                </label>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addDraft} className="w-full">
            <Plus className="size-4" />
            {t("sellerLinks.addStore")}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              if (drafts.some((d) => !d.sellerId)) {
                toast.error(t("sellerLinks.selectAllStores"));
                return;
              }
              mutation.mutate(drafts);
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("sellerLinks.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
