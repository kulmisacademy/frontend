"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { useDashboardI18n } from "@/context/dashboard-i18n-context";
import { RecentOrdersSnippet } from "@/components/dashboard/recent-orders-snippet";
import { StoreLinkShareCard } from "@/components/dashboard/store-link-share-card";

type Overview = {
  store: {
    id: string;
    slug?: string | null;
    store_name: string;
    plan?: string;
    verified?: boolean;
  };
  stats: {
    productCount: number;
    orderCount: number;
    pendingOrders: number;
    revenue: null;
  };
  plan?: {
    limits: {
      maxProducts: number;
      maxVideos: number;
      maxAiGenerations: number | null;
    };
    usage: {
      products: number;
      videos: number;
      aiGenerations: number;
    };
  };
};

export default function VendorDashboardPage() {
  const router = useRouter();
  const { user, store, loading, token } = useAuth();
  const { t } = useDashboardI18n();
  const [data, setData] = React.useState<Overview | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, user, router]);

  React.useEffect(() => {
    if (!token || user?.role !== "vendor") return;
    let cancelled = false;
    (async () => {
      try {
        const o = await apiFetch<Overview>("/api/vendor/overview", { token });
        if (!cancelled) setData(o);
      } catch (e) {
        if (!cancelled) {
          setLoadErr(
            e instanceof Error ? e.message : "Could not load dashboard"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  const slug = data?.store?.slug || store?.slug;
  const stats = data?.stats;
  const storeName = data?.store?.store_name || store?.store_name;

  const cards = [
    {
      labelKey: "vendorDashboard.cardProducts",
      value: stats?.productCount ?? "—",
      icon: Package,
    },
    {
      labelKey: "vendorDashboard.cardOrders",
      value: stats?.orderCount ?? "—",
      icon: ShoppingBag,
    },
    {
      labelKey: "vendorDashboard.cardMessages",
      value: t("vendorDashboard.soon"),
      icon: MessageCircle,
    },
    {
      labelKey: "vendorDashboard.cardRevenue",
      value: t("vendorDashboard.soon"),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {t("vendorDashboard.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {storeName
              ? `${storeName} — ${t("vendorDashboard.overviewFor")}`
              : t("vendorDashboard.subtitleManage")}
          </p>
          {loadErr ? (
            <p className="mt-2 text-sm text-destructive">{loadErr}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {slug ? (
            <Button variant="outline" className="rounded-2xl" asChild>
              <Link href={`/store/${slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                {t("vendorDashboard.viewStore")}
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" className="rounded-2xl" asChild>
            <Link href="/marketplace">{t("vendorDashboard.marketplace")}</Link>
          </Button>
        </div>
      </div>

      {slug ? (
        <StoreLinkShareCard slug={slug} storeName={storeName ?? null} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s) => (
          <div
            key={s.labelKey}
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <s.icon className="size-5 text-primary" />
            <p className="mt-3 font-heading text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{t(s.labelKey)}</p>
          </div>
        ))}
      </div>

      {data?.plan ? (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("vendorDashboard.plan")}
              </p>
              <p className="mt-1 font-heading text-xl font-bold capitalize">
                {data.store.plan ?? "free"}
                {data.store.verified ? (
                  <span className="ml-2 text-sm font-normal text-primary">
                    · {t("vendorDashboard.verified")}
                  </span>
                ) : null}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("vendorDashboard.usageProducts")}{" "}
                {data.plan.usage.products}/{data.plan.limits.maxProducts}
                {" · "}
                {t("vendorDashboard.usageVideos")}{" "}
                {data.plan.usage.videos}/{data.plan.limits.maxVideos}
                {" · "}
                {t("vendorDashboard.usageAi")}{" "}
                {data.plan.limits.maxAiGenerations == null
                  ? `${data.plan.usage.aiGenerations} ${t("vendorDashboard.unlimitedAi")}`
                  : `${data.plan.usage.aiGenerations}/${data.plan.limits.maxAiGenerations}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-2xl" asChild>
                <Link href="/dashboard/plan">{t("vendorDashboard.myPlan")}</Link>
              </Button>
              <Button className="rounded-2xl" asChild>
                <Link href="/dashboard/plans">
                  {t("vendorDashboard.comparePlans")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <RecentOrdersSnippet
        variant="vendor"
        token={token}
        enabled={user?.role === "vendor" && !!token}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-6">
          <h2 className="font-heading text-lg font-semibold">
            {t("vendorDashboard.quickActions")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/dashboard/products" className="text-primary hover:underline">
                {t("vendorDashboard.manageProducts")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/orders" className="text-primary hover:underline">
                {t("vendorDashboard.orderRequests")}
                {stats?.pendingOrders != null && stats.pendingOrders > 0 ? (
                  <span className="ml-1 text-muted-foreground">
                    ({stats.pendingOrders} {t("vendorDashboard.pendingCount")})
                  </span>
                ) : null}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/messages"
                className="text-primary hover:underline"
              >
                {t("vendorDashboard.messages")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/settings" className="text-primary hover:underline">
                {t("vendorDashboard.storeSettings")}
              </Link>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          {t("vendorDashboard.revenueNote")}
        </div>
      </div>
    </div>
  );
}
