"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usersService } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import { useTranslation } from "@/lib/i18n/language-store";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleBadge, MembershipRoleBadge } from "@/components/badges";

type ProfileForm = {
  name: string;
};

export default function ProfilePage() {
  const t = useTranslation();
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const profileSchema = z.object({
    name: z.string().min(2, t("profile.nameMin")),
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name });
    }
  }, [user, form]);

  const mutation = useMutation({
    mutationFn: async (values: ProfileForm) => {
      if (!user) throw new Error(t("profile.noUser"));
      return usersService.update(user.id, values);
    },
    onSuccess: (updated) => {
      if (user) {
        setUser({
          ...user,
          name: updated.name,
        });
      }
      toast.success(t("profile.updated"));
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("profile.saveFailed");
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("profile.title")}
        description={t("profile.description")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("profile.personalData")}</CardTitle>
            <CardDescription>
              {t("profile.personalDataDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4 max-w-md"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="name">{t("profile.name")}</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("profile.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  {t("profile.emailLocked")}
                </p>
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("profile.save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("profile.access")}</CardTitle>
            <CardDescription>
              {t("profile.accessDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                {t("profile.roles")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {user?.roles.length ? (
                  user.roles.map((r) => <RoleBadge key={r} role={r} />)
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                {t("profile.stores")}
              </p>
              <div className="space-y-2">
                {user?.sellers.length ? (
                  user.sellers.map((s) => (
                    <div
                      key={s.sellerId}
                      className="flex items-center justify-between rounded-md border border-border p-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {s.seller.name}
                        </div>
                        {s.jobTitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {s.jobTitle}
                          </div>
                        )}
                      </div>
                      <MembershipRoleBadge role={s.membershipRole} />
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("profile.noStore")}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
