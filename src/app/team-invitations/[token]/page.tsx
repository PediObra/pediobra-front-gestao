"use client";

import { use, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HardHat, Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { sellersService } from "@/lib/api/sellers";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth/store";
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
import { Skeleton } from "@/components/ui/skeleton";
import { MembershipRoleBadge } from "@/components/badges";

export default function SellerTeamInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const setSession = useAuthStore((state) => state.setSession);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const invitationQuery = useQuery({
    queryKey: ["seller-team-invitations", token],
    queryFn: () => sellersService.getTeamInvitation(token),
  });

  const invitation = invitationQuery.data;
  const acceptMutation = useMutation({
    mutationFn: () => sellersService.acceptTeamInvitation(token),
    onSuccess: (session) => {
      setSession(session);
      toast.success("Convite aceito.");
      router.replace(
        `/sellers/${invitation?.sellerId ?? session.user.sellers[0]?.sellerId ?? ""}`,
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : "Nao foi possivel aceitar o convite.";
      toast.error(msg);
    },
  });
  const registerMutation = useMutation({
    mutationFn: () => {
      if (password !== confirmPassword) {
        throw new Error("As senhas precisam ser iguais.");
      }

      return sellersService.registerTeamInvitation(token, {
        name,
        password,
      });
    },
    onSuccess: (session) => {
      setSession(session);
      toast.success("Conta criada e convite aceito.");
      router.replace(`/sellers/${invitation?.sellerId ?? ""}`);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? err.displayMessage
          : err instanceof Error
            ? err.message
            : "Nao foi possivel criar a conta.";
      toast.error(msg);
    },
  });

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary">
            <HardHat className="size-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">ObraFlow</span>
        </div>

        {invitationQuery.isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : !invitation ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Convite inválido ou expirado.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Convite para equipe</CardTitle>
              <CardDescription>
                {invitation.seller?.name ?? "Uma loja"} convidou você para
                acessar a gestão da equipe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 rounded-md border border-border p-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium">{invitation.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Papel</span>
                  <div className="mt-1">
                    <MembershipRoleBadge role={invitation.membershipRole} />
                  </div>
                </div>
                {invitation.jobTitle ? (
                  <div>
                    <span className="text-muted-foreground">Cargo</span>
                    <p className="font-medium">{invitation.jobTitle}</p>
                  </div>
                ) : null}
              </div>

              {invitation.existingUser ? (
                <ExistingUserInvitation
                  invitedEmail={invitation.email}
                  currentEmail={user?.email}
                  authenticated={isAuthenticated}
                  loginHref={`/login?next=${encodeURIComponent(pathname)}`}
                  loading={isLoading || acceptMutation.isPending}
                  onAccept={() => acceptMutation.mutate()}
                />
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    registerMutation.mutate();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      registerMutation.isPending ||
                      !name.trim() ||
                      password.length < 6
                    }
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    Criar conta e aceitar
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ExistingUserInvitation({
  invitedEmail,
  currentEmail,
  authenticated,
  loginHref,
  loading,
  onAccept,
}: {
  invitedEmail: string;
  currentEmail?: string;
  authenticated: boolean;
  loginHref: string;
  loading: boolean;
  onAccept: () => void;
}) {
  if (!authenticated) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Este email já tem conta. Entre com {invitedEmail} e volte a este link
          para aceitar o convite.
        </p>
        <Button asChild className="w-full">
          <Link href={loginHref}>
            <LogIn className="size-4" />
            Entrar
          </Link>
        </Button>
      </div>
    );
  }

  if (
    currentEmail &&
    currentEmail.toLowerCase() !== invitedEmail.toLowerCase()
  ) {
    return (
      <p className="text-sm text-destructive">
        Você está logado como {currentEmail}. Entre com {invitedEmail} para
        aceitar este convite.
      </p>
    );
  }

  return (
    <Button className="w-full" disabled={loading} onClick={onAccept}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <UserPlus className="size-4" />
      )}
      Aceitar convite
    </Button>
  );
}
