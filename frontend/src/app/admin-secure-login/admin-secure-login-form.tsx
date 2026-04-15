"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { MarketingShell } from "@/components/marketing-shell";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";

export function AdminSecureLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const nextPath = searchParams.get("next");
  const configError = searchParams.get("error") === "config";
  const dest =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Sign in failed"
        );
      }
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingShell>
      <PageContainer className={MARKETING_PAGE_PY}>
        <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Restricted
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight">
            Admin sign-in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This URL is not linked from the public site. Only LAAS24 operators
            with an admin account can continue.
          </p>

          {configError ? (
            <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
              <strong className="font-semibold">Configuration:</strong> set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">JWT_SECRET</code>{" "}
              in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                frontend/.env.local
              </code>{" "}
              (same value as the API in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                backend/.env.local
              </code>
              ), then restart the Next.js dev server.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Password</span>
              <PasswordInput
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-2xl"
                required
              />
            </label>
            <Button
              type="submit"
              className="mt-2 w-full rounded-2xl"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner className="size-4 text-primary-foreground" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/" className="font-medium text-primary hover:underline">
              Back to site
            </Link>
          </p>
        </div>
      </PageContainer>
    </MarketingShell>
  );
}
