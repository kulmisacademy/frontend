"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingShell } from "@/components/marketing-shell";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingShell>
      <PageContainer className={MARKETING_PAGE_PY}>
        <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-lg sm:p-8">
          <h1 className="font-heading text-2xl font-bold">Forgot password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we will send a reset link if an account exists.
          </p>

          {error ? (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {done ? (
            <p className="mt-6 rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-primary">
              If an account exists for that email, open the message we sent and
              click <strong>Create new password</strong>. The link works for 1
              hour.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium">Email</span>
                <Input
                  type="email"
                  autoComplete="email"
                  className="h-12 rounded-2xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </PageContainer>
    </MarketingShell>
  );
}
