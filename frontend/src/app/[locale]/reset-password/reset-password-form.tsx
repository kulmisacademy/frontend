"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing-shell";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset link.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      router.push("/login?reset=ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <MarketingShell>
        <PageContainer className={MARKETING_PAGE_PY}>
          <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-card p-6 text-center shadow-lg sm:p-8">
            <p className="text-muted-foreground">
              This reset link is invalid. Request a new one from the forgot
              password page.
            </p>
            <Button className="mt-6 rounded-2xl" asChild>
              <Link href="/forgot-password">Forgot password</Link>
            </Button>
          </div>
        </PageContainer>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <PageContainer className={MARKETING_PAGE_PY}>
        <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-lg sm:p-8">
          <h1 className="font-heading text-2xl font-bold">Set new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password for your account.
          </p>

          {error ? (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">New password</span>
              <PasswordInput
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-2xl"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Confirm password</span>
              <PasswordInput
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12 w-full rounded-2xl"
                required
              />
            </label>
            <Button
              type="submit"
              className="w-full rounded-2xl"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner className="size-4 text-primary-foreground" />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </div>
      </PageContainer>
    </MarketingShell>
  );
}
