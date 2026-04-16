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
import { apiPostForm } from "@/lib/api";
import { SOMALIA_REGIONS, capitalForRegion } from "@/lib/somalia-regions";
import { useAuth } from "@/context/auth-context";
import type { AuthUser } from "@/lib/auth-storage";
import type { VendorStore } from "@/lib/vendor-store";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  password: z.string().min(8).max(128),
  store_name: z.string().min(1).max(200),
  country: z.string().min(1),
  region: z.string().min(1),
  city: z.string().min(1),
});

export function RegisterVendorClient() {
  const router = useRouter();
  const { setSession, user, store, loading: authLoading } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [storeName, setStoreName] = React.useState("");
  const [country] = React.useState("Somalia");
  const [region, setRegion] = React.useState(SOMALIA_REGIONS[0] ?? "Banaadir");
  const city = React.useMemo(() => capitalForRegion(region), [region]);
  const [logo, setLogo] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!logo) {
      setError("Please upload a store logo.");
      return;
    }
    const parsed = schema.safeParse({
      name,
      email,
      phone,
      password,
      store_name: storeName,
      country,
      region,
      city,
    });
    if (!parsed.success) {
      setError("Please check all fields.");
      return;
    }
    const fd = new FormData();
    fd.append("name", parsed.data.name);
    fd.append("email", parsed.data.email);
    fd.append("phone", parsed.data.phone);
    fd.append("password", parsed.data.password);
    fd.append("store_name", parsed.data.store_name);
    fd.append("country", parsed.data.country);
    fd.append("region", parsed.data.region);
    fd.append("city", parsed.data.city);
    fd.append("logo", logo);

    setLoading(true);
    try {
      const data = await apiPostForm<{
        token: string;
        user: AuthUser;
        store: NonNullable<VendorStore>;
      }>("/api/auth/register-vendor", fd);
      await setSession(data.token, data.user, data.store ?? null);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <PageContainer
        className={cn(MARKETING_PAGE_PY, "flex justify-center")}
      >
        <Spinner className="size-10" />
      </PageContainer>
    );
  }

  if (user?.role === "vendor" && store) {
    return (
      <PageContainer className={MARKETING_PAGE_PY}>
        <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-lg sm:p-8">
          <h1 className="font-heading text-2xl font-bold">You already have a store</h1>
          <p className="text-sm text-muted-foreground">
            Each account has one storefront. Manage your store, products, and
            settings from the vendor dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-2xl" asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            {store.slug ? (
              <Button variant="outline" className="rounded-2xl" asChild>
                <Link href={`/store/${store.slug}`}>View public store</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={MARKETING_PAGE_PY}>
      <div className="mx-auto max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-lg sm:p-8">
        <h1 className="font-heading text-2xl font-bold">Open your store</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a vendor account. Your store goes live immediately — start selling
          right away.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground">
            Your account
          </h2>
          <label className="space-y-2">
            <span className="text-sm font-medium">Full name</span>
            <Input
              className="h-12 rounded-2xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Phone (WhatsApp)</span>
            <Input
              className="h-12 rounded-2xl"
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

          <h2 className="pt-2 font-heading text-sm font-semibold text-muted-foreground">
            Store
          </h2>
          <label className="space-y-2">
            <span className="text-sm font-medium">Store name</span>
            <Input
              className="h-12 rounded-2xl"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Store logo</span>
            <Input
              type="file"
              accept="image/*"
              className={cn(
                "h-12 cursor-pointer rounded-2xl border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
              )}
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Country</span>
              <Input
                className="h-12 rounded-2xl bg-muted/50"
                value={country}
                readOnly
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">Region</span>
              <select
                className="h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm font-medium shadow-sm"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {SOMALIA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">Capital (auto)</span>
              <Input
                className="h-12 rounded-2xl bg-muted/50"
                value={city}
                readOnly
              />
            </label>
          </div>

          <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
            Your public store URL will use a unique slug from your store name.
          </p>

          <Button
            type="submit"
            className="w-full rounded-2xl"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner className="size-4 text-primary-foreground" />
                Submitting…
              </>
            ) : (
              "Create store & go live"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Buying only?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Customer registration
          </Link>
          {" · "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
