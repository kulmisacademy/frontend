"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { MarketingShell } from "@/components/marketing-shell";
import { PageContainer } from "@/components/ui/section";
import { apiFetch } from "@/lib/api";
import {
  setAffiliateSession,
  type AffiliateUser,
} from "@/lib/affiliate-auth-storage";

export function AffiliateLoginClient() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<{
        token: string;
        affiliate: AffiliateUser;
      }>("/api/affiliate-auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAffiliateSession(data.token, data.affiliate);
      router.push("/affiliate/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingShell>
      <PageContainer className="py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:py-14 sm:pt-10">
        <div className="mx-auto w-full min-w-0 max-w-md space-y-5 rounded-2xl border border-border/80 bg-card p-4 shadow-lg sm:p-8 sm:shadow-xl">
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              Affiliate login
            </h1>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
              Access your referral dashboard and payouts.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="login-email">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 min-h-11 rounded-xl text-base sm:h-10 sm:min-h-10 sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="login-password">
                Password
              </label>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="rounded-xl text-base sm:text-sm"
              />
            </div>
            {error ? (
              <p className="text-pretty text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full min-h-11 rounded-2xl text-base sm:h-10 sm:min-h-10 sm:text-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <p className="text-center text-pretty text-sm leading-relaxed text-muted-foreground">
            New here?{" "}
            <Link
              href="/affiliate/register"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </PageContainer>
    </MarketingShell>
  );
}
