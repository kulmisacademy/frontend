"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

type FollowedRow = {
  store_id: string;
  slug: string;
  store_name: string;
  logo: string | null;
  followed_at: string;
};

export function FollowedStoresClient() {
  const { user, token, loading: authLoading } = useAuth();
  const [stores, setStores] = React.useState<FollowedRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !token || user.role !== "customer") {
      setLoading(false);
      setStores([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<{ stores: FollowedRow[] }>("/api/auth/followed-stores", { token })
      .then((data) => {
        if (!cancelled) setStores(data.stores ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token]);

  if (authLoading || loading) {
    return (
      <PageContainer
        className={cn(MARKETING_PAGE_PY, "flex justify-center")}
      >
        <Spinner className="size-10" />
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer className={cn(MARKETING_PAGE_PY, "text-center")}>
        <p className="text-muted-foreground">Sign in to see stores you follow.</p>
        <Button className="mt-6 rounded-2xl" asChild>
          <Link href="/login?next=/account/followed-stores">Sign in</Link>
        </Button>
      </PageContainer>
    );
  }

  if (user.role !== "customer") {
    return (
      <PageContainer className={MARKETING_PAGE_PY}>
        <h1 className="font-heading text-3xl font-bold">Followed stores</h1>
        <p className="mt-2 text-muted-foreground">
          This list is for customer accounts.
        </p>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className={MARKETING_PAGE_PY}>
        <h1 className="font-heading text-3xl font-bold">Followed stores</h1>
        <p className="mt-4 text-destructive">{error}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={MARKETING_PAGE_PY}>
      <h1 className="font-heading text-3xl font-bold">Followed stores</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Shops you follow on LAAS24. Visit their storefront for new products.
      </p>

      {stores.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">You are not following any stores yet.</p>
          <Button className="mt-6 rounded-2xl" asChild>
            <Link href="/marketplace">Browse marketplace</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {stores.map((s) => (
            <li
              key={s.store_id}
              className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image
                  src={s.logo || "/placeholder-banner.svg"}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/store/${s.slug}`}
                  className="font-heading font-semibold text-foreground hover:text-primary"
                >
                  {s.store_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Followed {new Date(s.followed_at).toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 rounded-xl" asChild>
                <Link href={`/store/${s.slug}`}>View</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
