"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { sellersService, type CreateSellerPayload } from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader } from "@/components/layout/page-header";
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
import { useAuth } from "@/hooks/use-auth";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
import { translate, useTranslation } from "@/lib/i18n/language-store";

function createSchema(t: typeof translate) {
  return z.object({
    name: z.string().min(2, t("product.nameRequired")),
    email: z.string().email(t("login.invalidEmail")),
    address: z.string().min(3, t("seller.addressRequired")),
    cep: z.string().min(8, t("seller.cepRequired")),
    phone: z.string().min(8, t("seller.phoneRequired")),
    primaryColor: z.string().optional().or(z.literal("")),
    secondaryColor: z.string().optional().or(z.literal("")),
  });
}

type FormValues = z.infer<ReturnType<typeof createSchema>>;

export default function NewSellerPage() {
  const router = useRouter();
  const t = useTranslation();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [logoFile, setLogoFile] = useState<File | undefined>();

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: {
      name: "",
      email: "",
      address: "",
      cep: "",
      phone: "",
      primaryColor: "",
      secondaryColor: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreateSellerPayload = {
        name: values.name,
        email: values.email,
        address: values.address,
        cep: values.cep.replace(/\D/g, ""),
        phone: values.phone.replace(/\D/g, ""),
        logo: logoFile,
        primaryColor: values.primaryColor || undefined,
        secondaryColor: values.secondaryColor || undefined,
      };
      return sellersService.create(payload);
    },
    onSuccess: (seller) => {
      qc.invalidateQueries({ queryKey: queryKeys.sellers.all() });
      toast.success(t("seller.created", { seller: seller.name }));
      router.push(`/sellers/${seller.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : t("seller.createFailed");
      toast.error(msg);
    },
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("seller.adminOnlyCreate")}
        </CardContent>
      </Card>
    );
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
        title={t("sellers.new")}
        description={t("seller.newDescription")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("seller.data")}</CardTitle>
          <CardDescription>
            {t("seller.dataDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">{t("common.name")}</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("seller.contactEmail")}</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("common.phone")}</Label>
              <Input
                id="phone"
                placeholder="(11) 98765-4321"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">{t("common.address")}</Label>
              <Input
                id="address"
                placeholder={t("seller.addressPlaceholder")}
                {...form.register("address")}
              />
              {form.formState.errors.address && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                placeholder="00000-000"
                {...form.register("cep")}
              />
              {form.formState.errors.cep && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.cep.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="logo">{t("seller.logoOptional")}</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ImageFilePreview
                  file={logoFile}
                  alt={
                    logoFile
                      ? t("seller.logoPreviewFile", { file: logoFile.name })
                      : t("seller.logoPreview")
                  }
                  className="size-16 shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t("seller.primaryColor")}</Label>
              <Input
                id="primaryColor"
                placeholder="#F59E0B"
                {...form.register("primaryColor")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">
                {t("seller.secondaryColor")}
              </Label>
              <Input
                id="secondaryColor"
                placeholder="#27272A"
                {...form.register("secondaryColor")}
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" asChild>
                <Link href="/sellers">{t("common.cancel")}</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("seller.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
