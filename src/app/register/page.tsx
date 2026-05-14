"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HardHat, KeyRound, Loader2, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais",
  });

type RegisterForm = z.infer<typeof registerSchema>;
type RegisterStep = "email" | "code" | "details";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<RegisterStep>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailVerificationToken, setEmailVerificationToken] = useState<
    string | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function requestCode() {
    const parsed = z.string().email("Informe um email valido").safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Informe um email valido");
      return;
    }

    setSubmitting(true);
    setEmailError(null);
    try {
      const response = await authService.createEmailVerification({
        email,
        purpose: "SELLER_REGISTER",
      });
      setEmail(response.email);
      setDevCode(response.devCode ?? null);
      setStep("code");
      toast.success("Codigo enviado");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel enviar o codigo";
      setEmailError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmCode() {
    if (!code.trim()) {
      setCodeError("Informe o codigo");
      return;
    }

    setSubmitting(true);
    setCodeError(null);
    try {
      const response = await authService.confirmEmailVerification({
        email,
        purpose: "SELLER_REGISTER",
        code,
      });
      setEmailVerificationToken(response.emailVerificationToken);
      setStep("details");
      toast.success("Email confirmado");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel confirmar o codigo";
      setCodeError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(values: RegisterForm) {
    if (!emailVerificationToken) {
      setStep("email");
      toast.error("Confirme o email antes de criar a conta");
      return;
    }

    setSubmitting(true);
    try {
      const session = await authService.registerSeller({
        name: values.name,
        email,
        password: values.password,
        emailVerificationToken,
      });
      setSession(session);
      toast.success("Conta criada");
      router.replace("/onboarding/seller");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel criar a conta";

      if (err instanceof ApiError && err.status === 409) {
        setEmailError(msg);
        setStep("email");
      }

      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary">
              <HardHat className="size-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              ObraFlow
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Criar conta de lojista
            </h1>
            <p className="text-sm text-muted-foreground">
              Depois do cadastro, você vai cadastrar sua primeira loja para
              começar a usar a gestão.
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            if (step === "email") {
              event.preventDefault();
              void requestCode();
              return;
            }

            if (step === "code") {
              event.preventDefault();
              void confirmCode();
              return;
            }

            void form.handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
          noValidate
        >
          {step === "email" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                Enviar codigo
              </Button>
            </>
          ) : null}

          {step === "code" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">Codigo</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                {codeError && (
                  <p className="text-xs text-destructive">{codeError}</p>
                )}
                {devCode && (
                  <p className="text-xs text-muted-foreground">
                    Codigo local: {devCode}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Confirmar email
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("email")}
              >
                Trocar email
              </Button>
            </>
          ) : null}

          {step === "details" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirmed-email">Email</Label>
                <Input id="confirmed-email" value={email} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("confirmPassword")}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Criar conta
              </Button>
            </>
          ) : null}
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link href="/login" className="font-medium text-primary">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
