"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingShell } from "@/components/marketing-shell";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

function roleHome(role: string): string {
  switch (role) {
    case "vendor":
      return "/dashboard";
    case "admin":
      return "/admin";
    default:
      return "/profile";
  }
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const configError = searchParams.get("error") === "config";
  const nextPath = searchParams.get("next");

  React.useEffect(() => {
    if (searchParams.get("reset") === "ok") {
      setSuccess(t("passwordResetOk"));
    }
  }, [searchParams, t]);

  React.useEffect(() => {
    if (authLoading || !user) return;
    const dest =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : roleHome(user.role);
    router.replace(dest);
  }, [authLoading, user, nextPath, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      const dest =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : roleHome(loggedIn.role);
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("signInFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <MarketingShell>
        <PageContainer className="flex min-h-[40vh] items-center justify-center py-16 md:py-24">
          <Spinner className="size-8" />
        </PageContainer>
      </MarketingShell>
    );
  }

  if (user) {
    return (
      <MarketingShell>
        <PageContainer className="flex min-h-[40vh] items-center justify-center py-16 md:py-24">
          <Spinner className="size-8" />
        </PageContainer>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <PageContainer className={MARKETING_PAGE_PY}>
        <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-lg sm:p-8">
          <h1 className="font-heading text-2xl font-bold">{t("signInTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("welcomeBack")}</p>

          {configError ? (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t("configError")}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {success}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">{t("email")}</span>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl"
                placeholder={t("emailPlaceholder")}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">{t("password")}</span>
              <PasswordInput
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-2xl"
                required
              />
            </label>
            <div className="text-right text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-primary hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <Button
              type="submit"
              className="mt-2 w-full rounded-2xl"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner className="size-4 text-primary-foreground" />
                  {t("signingIn")}
                </>
              ) : (
                t("signInSubmit")
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline"
            >
              {t("register")}
            </Link>
            {" · "}
            <Link
              href="/register-vendor"
              className="font-semibold text-primary hover:underline"
            >
              {t("openStore")}
            </Link>
          </p>
        </div>
      </PageContainer>
    </MarketingShell>
  );
}
