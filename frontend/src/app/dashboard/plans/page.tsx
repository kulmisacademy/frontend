"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import type { CatalogPlan, PlanPayload } from "@/lib/plan-types";
import { FREE_PLAN_FEATURES } from "@/lib/plan-marketing";
import { SUBSCRIPTION_CONTACT_WHATSAPP } from "@/lib/subscription";
import { UpgradePlanModal } from "@/components/dashboard/upgrade-plan-modal";
import { cn } from "@/lib/utils";

function formatPlanPrice(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

export default function VendorPlansPage() {
  const router = useRouter();
  const { user, loading, token } = useAuth();
  const [data, setData] = React.useState<PlanPayload | null>(null);
  const [catalog, setCatalog] = React.useState<CatalogPlan[]>([]);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [plansReady, setPlansReady] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradePlanId, setUpgradePlanId] = React.useState<string | null>(null);
  const [upgradeRequestType, setUpgradeRequestType] = React.useState<"plan" | "verified">("plan");

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/plans");
  }, [loading, user, router]);

  const load = React.useCallback(async () => {
    if (!token) {
      setPlansReady(true);
      return;
    }
    setPlansReady(false);
    setLoadErr(null);
    try {
      const [o, c] = await Promise.all([
        apiFetch<PlanPayload>("/api/vendor/plan", { token }),
        apiFetch<{ plans: CatalogPlan[] }>("/api/vendor/plan-catalog", { token }),
      ]);
      setData(o);
      setCatalog(c.plans || []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Could not load plan");
    } finally {
      setPlansReady(true);
    }
  }, [token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading || !user || !token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!plansReady) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-20">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      </div>
    );
  }

  if (loadErr || !data) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{loadErr || "No data"}</p>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href="/dashboard">Back</Link>
        </Button>
      </div>
    );
  }

  const onFreeTier =
    data.store.plan === "free" || data.store.planAssignmentExpired === true;
  const onPaidPlan = !onFreeTier;
  const defaultPhone = user?.phone?.trim() || "";

  function openPlanRequest(planId?: string) {
    setUpgradeRequestType("plan");
    setUpgradePlanId(planId ?? null);
    setUpgradeOpen(true);
  }

  function openVerifiedRequest() {
    setUpgradeRequestType("verified");
    setUpgradePlanId(null);
    setUpgradeOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" className="-ml-3 mb-1 rounded-xl" asChild>
            <Link href="/dashboard/plan">
              <ArrowLeft className="mr-1 size-4" />
              My plan
            </Link>
          </Button>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Plans</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Subscription plans control your product, video, and AI limits. The verified
            badge is separate — trust and visibility only.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article
          className={cn(
            "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300",
            onFreeTier
              ? "border-primary/40 ring-2 ring-primary/15"
              : "border-border/80 hover:border-border"
          )}
        >
          {onFreeTier ? (
            <Badge className="absolute right-4 top-4 rounded-lg">Current limits</Badge>
          ) : null}
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-foreground">
            <Zap className="size-5" aria-hidden />
          </div>
          <h2 className="font-heading text-xl font-bold">Free</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start selling with the default free tier limits.
          </p>
          <ul className="mt-6 flex-1 space-y-3 text-sm">
            {FREE_PLAN_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            {onFreeTier ? (
              <Button disabled className="w-full rounded-2xl" variant="secondary">
                Current plan
              </Button>
            ) : (
              <Button variant="outline" className="w-full rounded-2xl" asChild>
                <a
                  href={SUBSCRIPTION_CONTACT_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact to change plan
                </a>
              </Button>
            )}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BadgeCheck className="size-5 text-primary" aria-hidden />
              <h2 className="font-heading text-lg font-bold">Verified badge</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Optional add-on: badge on your store. Does not change product or AI limits.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full rounded-2xl"
              disabled={data.store.verified}
              onClick={() => openVerifiedRequest()}
            >
              {data.store.verified ? "Already verified" : "Request verified badge"}
            </Button>
          </article>

          <div className="space-y-3">
            <h2 className="font-heading text-lg font-bold">Paid plans</h2>
            {catalog.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No paid plans are published yet. Contact LAAS24 support to enable upgrades.
              </p>
            ) : (
              catalog.map((p) => {
                const isCurrent = onPaidPlan && data.store.planId === p.id;
                return (
                  <article
                    key={p.id}
                    className={cn(
                      "relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300",
                      isCurrent
                        ? "border-primary/40 ring-2 ring-primary/15"
                        : "border-border/80 hover:border-primary/25 hover:shadow-md"
                    )}
                  >
                    {isCurrent ? (
                      <Badge className="absolute right-4 top-4 rounded-lg">Current</Badge>
                    ) : null}
                    <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Sparkles className="size-4" aria-hidden />
                    </div>
                    <h3 className="font-heading text-lg font-bold">{p.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {formatPlanPrice(p.price ?? 0)}
                      <span className="font-normal text-muted-foreground"> / period</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.productLimit} products · {p.videoLimit} videos ·{" "}
                      {p.aiDailyLimit != null
                        ? `${p.aiDailyLimit} AI/day (UTC)`
                        : p.aiUnlimited
                          ? "AI unlimited"
                          : `${p.aiLimit ?? 0} AI total`}
                    </p>
                    <div className="mt-4">
                      {isCurrent ? (
                        <Button disabled className="w-full rounded-2xl" variant="secondary">
                          Active
                        </Button>
                      ) : (
                        <Button
                          className="w-full rounded-2xl"
                          disabled={isCurrent}
                          onClick={() => openPlanRequest(p.id)}
                        >
                          Request this plan
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

      <UpgradePlanModal
        open={upgradeOpen}
        onOpenChange={(v) => {
          setUpgradeOpen(v);
          if (!v) setUpgradePlanId(null);
        }}
        token={token}
        defaultStoreName={data.store.store_name}
        defaultPhone={defaultPhone}
        onSubmitted={load}
        catalogPlans={catalog}
        initialPlanId={upgradePlanId}
        defaultRequestType={upgradeRequestType}
      />
    </div>
  );
}
