"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usersService } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { RoleName, UserWithRelations } from "@/lib/api/types";
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
import { roleLabel, roleNamesOf } from "@/lib/formatters";
import { useTranslation } from "@/lib/i18n/language-store";

const ALL_ROLES: RoleName[] = ["ADMIN", "SELLER", "DRIVER", "CUSTOMER"];

export function EditRolesDialog({
  user,
  children,
}: {
  user: UserWithRelations;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslation();
  const [selected, setSelected] = useState<RoleName[]>(roleNamesOf(user.roles));
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (roles: RoleName[]) =>
      usersService.updateRoles(user.id, roles),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.users.byId(user.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.users.all() });
      toast.success(t("roles.updated"));
      setOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("roles.updateFailed");
      toast.error(msg);
    },
  });

  function toggle(role: RoleName, checked: boolean) {
    setSelected((prev) =>
      checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role),
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSelected(roleNamesOf(user.roles));
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("roles.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("roles.editDescription", { user: user.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {ALL_ROLES.map((role) => {
            const id = `role-${role}`;
            return (
              <label
                key={role}
                htmlFor={id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 cursor-pointer hover:bg-accent/50"
              >
                <Checkbox
                  id={id}
                  checked={selected.includes(role)}
                  onCheckedChange={(v) => toggle(role, v === true)}
                />
                <div>
                  <div className="text-sm font-medium">
                    {roleLabel(role)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {role}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate(selected)}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
