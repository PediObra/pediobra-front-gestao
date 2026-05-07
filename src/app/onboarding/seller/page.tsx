"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Loader2, LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/forms/address-autocomplete";
import { ImageFilePreview } from "@/components/forms/image-file-preview";
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
import { authService } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { sellerOnboardingService } from "@/lib/api/seller-onboarding";
import type { CreateSellerPayload } from "@/lib/api/sellers";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/query-keys";

const sellerSchema = z.object({
  name: z.string().min(2, "Informe o nome da loja"),
  email: z.string().email("Informe um email valido"),
  placeId: z.string().min(3, "Selecione um endereco nas sugestoes."),
  address: z.string().min(3, "Informe o endereco"),
  cep: z.string().optional().or(z.literal("")),
  phone: z.string().min(8, "Informe o telefone"),
  primaryColor: z.string().optional().or(z.literal("")),
  secondaryColor: z.string().optional().or(z.literal("")),
});

type SellerForm = z.infer<typeof sellerSchema>;

export default function SellerOnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [placesSessionToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const form = useForm<SellerForm>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      name: "",
      email: "",
      placeId: "",
      address: "",
      cep: "",
      phone: "",
      primaryColor: "",
      secondaryColor: "",
    },
  });
  const addressValue = useWatch({ control: form.control, name: "address" });
  const selectedPlaceId = useWatch({ control: form.control, name: "placeId" });

  const mutation = useMutation({
    mutationFn: (values: SellerForm) => {
      const payload: CreateSellerPayload = {
        name: values.name,
        email: values.email,
        placeId: values.placeId,
        address: values.address,
        cep: values.cep?.replace(/\D/g, "") || undefined,
        phone: values.phone.replace(/\D/g, ""),
        logo: logoFile,
        primaryColor: values.primaryColor || undefined,
        secondaryColor: values.secondaryColor || undefined,
      };
      return sellerOnboardingService.createSeller(payload);
    },
    onSuccess: async (seller) => {
      if (refreshToken) {
        const session = await authService.refresh(refreshToken);
        setSession(session);
      } else {
        const user = await authService.me();
        useAuthStore.getState().setUser(user);
      }

      qc.invalidateQueries({ queryKey: queryKeys.sellers.all() });
      toast.success("Loja cadastrada");
      router.replace(`/sellers/${seller.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel cadastrar a loja";

      if (err instanceof ApiError && err.status === 409) {
        form.setError("email", { type: "server", message: msg });
        form.setFocus("email");
      }

      toast.error(msg);
    },
  });

  async function logout() {
    clear();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="size-4" />
              Onboarding da loja
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Cadastre sua empresa para começar
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Para usar a gestão, precisamos vincular sua conta a uma loja. Ao
              concluir, você será o dono desta empresa e poderá cadastrar
              produtos, importar CSV e gerenciar equipe.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={logout}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da empresa</CardTitle>
            <CardDescription>
              Use os dados operacionais da loja que vai vender no PediObra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              className="grid gap-4 sm:grid-cols-2"
              noValidate
            >
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="seller-name">Nome da loja</Label>
                <Input id="seller-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seller-email">Email de contato</Label>
                <Input
                  id="seller-email"
                  type="email"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seller-phone">Telefone</Label>
                <Input
                  id="seller-phone"
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
                <Label htmlFor="seller-address">Endereco</Label>
                <AddressAutocomplete
                  id="seller-address"
                  value={addressValue}
                  placeholder="Busque pelo endereco da loja"
                  sessionToken={placesSessionToken}
                  selectedPlaceId={selectedPlaceId}
                  onChange={(value) => {
                    form.setValue("address", value, { shouldValidate: true });
                    form.setValue("placeId", "", { shouldValidate: true });
                  }}
                  onSelect={(place) => {
                    form.setValue("address", place.description, {
                      shouldValidate: true,
                    });
                    form.setValue("placeId", place.placeId, {
                      shouldValidate: true,
                    });
                  }}
                />
                {form.formState.errors.address && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.address.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seller-cep">CEP</Label>
                <Input
                  id="seller-cep"
                  placeholder="00000-000"
                  {...form.register("cep")}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="seller-logo">Logo opcional</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <ImageFilePreview
                    file={logoFile}
                    alt="Preview da logo"
                    className="size-16 shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      id="seller-logo"
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
                <Label htmlFor="seller-primary-color">Cor primaria</Label>
                <Input
                  id="seller-primary-color"
                  placeholder="#F59E0B"
                  {...form.register("primaryColor")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seller-secondary-color">Cor secundaria</Label>
                <Input
                  id="seller-secondary-color"
                  placeholder="#27272A"
                  {...form.register("secondaryColor")}
                />
              </div>

              <div className="flex justify-end pt-2 sm:col-span-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Cadastrar empresa
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
