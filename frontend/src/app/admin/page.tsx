"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { adminFetch } from "@/lib/admin-api-client";
import { useDashboardI18n } from "@/context/dashboard-i18n-context";
import { RecentOrdersSnippet } from "@/components/dashboard/recent-orders-snippet";
import type { LucideIcon } from "lucide-react";

type StatsPayload = {
  stats: {
    users: number;
    stores: number;
    products: number;
    orders: number;
  };
};

export default function AdminDashboardPage() {
  const { user, loading } = useAdminSession();
  const { t } = useDashboardI18n();
  const [data, setData] = React.useState<StatsPayload | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const o = await adminFetch<StatsPayload>("/stats");
        if (!cancelled) setData(o);
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Could not load stats");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  const s = data?.stats;

  const cards: {
    labelKey: string;
    value: number | string;
    icon: LucideIcon;
    href: string;
  }[] = [
    {
      labelKey: "adminDashboard.cardUsers",
      value: s?.users ?? "—",
      icon: Users,
      href: "/admin/users",
    },
    {
      labelKey: "adminDashboard.cardStores",
      value: s?.stores ?? "—",
      icon: Store,
      href: "/admin/stores",
    },
    {
      labelKey: "adminDashboard.cardProducts",
      value: s?.products ?? "—",
      icon: Package,
      href: "/admin/products",
    },
    {
      labelKey: "adminDashboard.cardOrders",
      value: s?.orders ?? "—",
      icon: ShoppingBag,
      href: "/admin/orders",
    },
  ];

  return (
    <div className="min-w-0 space-y-10">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight break-words sm:text-3xl">
            {t("adminDashboard.title")}
          </h1>
          <p className="mt-2 max-w-prose text-pretty break-words text-muted-foreground">
            {t("adminDashboard.subtitle")}
          </p>
          {loadErr ? (
            <p className="mt-2 text-sm text-destructive">{loadErr}</p>
          ) : null}
        </div>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href="/">{t("adminDashboard.home")}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.labelKey}
            href={c.href}
            className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <c.icon className="size-5 text-primary" />
            <p className="mt-3 font-heading text-3xl font-bold tabular-nums">
              {c.value}
            </p>
            <p className="text-sm text-muted-foreground">{t(c.labelKey)}</p>
            <p className="mt-2 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              {t("adminDashboard.viewDetails")}
            </p>
          </Link>
        ))}
      </div>

      <RecentOrdersSnippet variant="admin" token={null} enabled />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-6">
          <h2 className="font-heading text-lg font-semibold">
            {t("adminDashboard.shortcuts")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link
                href="/admin/users"
                className="text-primary hover:underline"
              >
                {t("adminDashboard.linkUsers")}
              </Link>
            </li>
            <li>
              <Link
                href="/admin/stores"
                className="text-primary hover:underline"
              >
                {t("adminDashboard.linkStores")}
              </Link>
            </li>
            <li>
              <Link
                href="/admin/subscription-requests"
                className="text-primary hover:underline"
              >
                {t("adminDashboard.linkUpgrades")}
              </Link>
            </li>
            <li>
              <Link
                href="/admin/products"
                className="text-primary hover:underline"
              >
                {t("adminDashboard.linkProducts")}
              </Link>
            </li>
            <li>
              <Link
                href="/admin/orders"
                className="text-primary hover:underline"
              >
                {t("adminDashboard.linkOrders")}
              </Link>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          <LayoutDashboard className="mb-2 size-5 text-muted-foreground/80" />
          <p className="font-medium text-foreground">
            {t("adminDashboard.placeholderTitle")}
          </p>
          <p className="mt-2">{t("adminDashboard.placeholderBody")}</p>
        </div>
      </div>
    </div>
  );
}
