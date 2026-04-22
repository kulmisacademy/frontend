"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { MarketingShell } from "@/components/marketing-shell";
import { PageContainer } from "@/components/ui/section";
import { affiliateAuthApiFetch } from "@/lib/affiliate-api";
import {
  setAffiliateSession,
  type AffiliateUser,
} from "@/lib/affiliate-auth-storage";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  password: z.string().min(8).max(128),
});

export function AffiliateRegisterClient() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ name, email, phone, password });
    if (!parsed.success) {
      setError("Please check all fields.");
      return;
    }
    setLoading(true);
    try {
      const data = await affiliateAuthApiFetch<{
        token: string;
        affiliate: AffiliateUser;
      }>("/api/affiliate-auth/register", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setAffiliateSession(data.token, data.affiliate);
      router.push("/affiliate/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Registration failed"
      );
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
              Affiliate signup
            </h1>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
              Earn commission when stores join LAAS24 through your link and meet
              quality milestones.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="aff-name">
                Full name
              </label>
              <Input
                id="aff-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-11 min-h-11 rounded-xl text-base sm:h-10 sm:min-h-10 sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="aff-email">
                Email
              </label>
              <Input
                id="aff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 min-h-11 rounded-xl text-base sm:h-10 sm:min-h-10 sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="aff-phone">
                Phone
              </label>
              <Input
                id="aff-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                inputMode="tel"
                className="h-11 min-h-11 rounded-xl text-base sm:h-10 sm:min-h-10 sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="aff-password">
                Password
              </label>
              <PasswordInput
                id="aff-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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
                  Creating account…
                </>
              ) : (
                "Create affiliate account"
              )}
            </Button>
          </form>
          <p className="text-center text-pretty text-sm leading-relaxed text-muted-foreground">
            Already registered?{" "}
            <Link
              href="/affiliate/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </PageContainer>
    </MarketingShell>
  );
}
