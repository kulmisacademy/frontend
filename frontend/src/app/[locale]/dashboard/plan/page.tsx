"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import type { PlanPayload } from "@/lib/plan-types";
import { PlanUsageBar } from "@/components/dashboard/plan-usage-bar";

export default function VendorMyPlanPage() {
  const router = useRouter();
  const { user, loading, token } = useAuth();
  const [data, setData] = React.useState<PlanPayload | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  /** False until the first /api/vendor/plan request finishes (avoids flashing "No data"). */
  const [planReady, setPlanReady] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/plan");
  }, [loading, user, router]);

  const load = React.useCallback(async () => {
    if (!token) {
      setPlanReady(true);
      return;
    }
    setPlanReady(false);
    setLoadErr(null);
    try {
      const o = await apiFetch<PlanPayload>("/api/vendor/plan", { token });
      setData(o);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Could not load plan");
    } finally {
      setPlanReady(true);
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

  if (!planReady) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-20">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">Loading your plan…</p>
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

  const showPaid =
    data.store.plan !== "free" && !data.store.planAssignmentExpired;
  const label = data.store.planName || data.store.plan;
  const listPrice =
    typeof data.store.planPrice === "number"
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(data.store.planPrice)
      : null;

  function fmt(iso: string | null | undefined) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          My plan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your subscription tier and how much of each limit you are using.
        </p>
      </div>

      <section
        className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-black/[0.03] transition-shadow duration-300 hover:shadow-md dark:ring-white/[0.06]"
        aria-labelledby="my-plan-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2
              id="my-plan-heading"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Current subscription
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-2xl font-bold capitalize tracking-tight">
                {label}
              </span>
              <Badge
                variant={showPaid ? "default" : "secondary"}
                className="rounded-lg capitalize"
              >
                {showPaid ? "Active" : "Free tier"}
              </Badge>
              {data.store.verified ? (
                <Badge
                  variant="outline"
                  className="rounded-lg border-primary/40 text-primary"
                >
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-lg text-muted-foreground">
                  Not verified
                </Badge>
              )}
            </div>
            {showPaid && listPrice ? (
              <p className="text-xs text-muted-foreground">
                List price:{" "}
                <span className="font-medium text-foreground">{listPrice}</span>
                <span className="text-muted-foreground"> (set by admin)</span>
              </p>
            ) : null}
            {fmt(data.store.planExpiresAt) ? (
              <p className="text-xs text-muted-foreground">
                Plan renews / ends:{" "}
                <span className="font-medium text-foreground">
                  {fmt(data.store.planExpiresAt)}
                </span>
              </p>
            ) : null}
            {data.store.verified && fmt(data.store.verifiedExpiresAt) ? (
              <p className="text-xs text-muted-foreground">
                Verified until:{" "}
                <span className="font-medium text-foreground">
                  {fmt(data.store.verifiedExpiresAt)}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CreditCard className="size-6" aria-hidden />
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <PlanUsageBar
            label="Products"
            used={data.usage.products}
            max={data.limits.maxProducts}
          />
          <PlanUsageBar
            label="Videos (products with video)"
            used={data.usage.videos}
            max={data.limits.maxVideos}
          />
          {data.limits.maxAiDaily != null ? (
            <PlanUsageBar
              label="AI generations (today, UTC)"
              used={data.usage.aiGenerationsToday ?? 0}
              max={data.limits.maxAiDaily}
            />
          ) : (
            <PlanUsageBar
              label="AI generations (all time)"
              used={data.usage.aiGenerations}
              max={data.limits.maxAiGenerations}
            />
          )}
        </div>

        <div className="mt-8 border-t border-border/60 pt-6">
          <Button
            variant="outline"
            className="w-full rounded-2xl border-primary/25 bg-primary/5 font-semibold text-primary hover:bg-primary/10"
            asChild
          >
            <Link href="/dashboard/plans" className="gap-2">
              Compare plans &amp; upgrade
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
