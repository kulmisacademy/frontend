"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import type { AuthUser } from "@/lib/auth-storage";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(5, "Enter a valid phone number").max(40),
  password: z.string().min(8, "Use at least 8 characters"),
});

export function RegisterClient() {
  const router = useRouter();
  const { setSession } = useAuth();
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
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        first.name?.[0] ||
        first.email?.[0] ||
        first.phone?.[0] ||
        first.password?.[0] ||
        "Invalid input";
      setError(msg);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: AuthUser }>(
        "/api/auth/register-customer",
        { method: "POST", body: JSON.stringify(parsed.data) }
      );
      await setSession(data.token, data.user, null);
      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className={MARKETING_PAGE_PY}>
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-lg sm:p-8">
        <h1 className="font-heading text-2xl font-bold">Create account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Register as a customer to shop and track orders.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">Full name</span>
            <Input
              className="h-12 rounded-2xl"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Phone</span>
            <Input
              className="h-12 rounded-2xl"
              placeholder="+252 …"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Email</span>
            <Input
              type="email"
              className="h-12 rounded-2xl"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Password</span>
            <PasswordInput
              className="h-12 w-full rounded-2xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-4 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Want to sell?{" "}
          <Link href="/register-vendor" className="font-semibold text-primary hover:underline">
            Register as a vendor
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
