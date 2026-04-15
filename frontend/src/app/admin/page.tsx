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

  const cards = [
    {
      label: "Users",
      value: s?.users ?? "—",
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "Stores",
      value: s?.stores ?? "—",
      icon: Store,
      href: "/admin/stores",
    },
    {
      label: "Products",
      value: s?.products ?? "—",
      icon: Package,
      href: "/admin/products",
    },
    {
      label: "Orders",
      value: s?.orders ?? "—",
      icon: ShoppingBag,
      href: "/admin/orders",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Admin dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Platform overview — users, stores, catalog, and order requests.
          </p>
          {loadErr ? (
            <p className="mt-2 text-sm text-destructive">{loadErr}</p>
          ) : null}
        </div>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <c.icon className="size-5 text-primary" />
            <p className="mt-3 font-heading text-3xl font-bold tabular-nums">
              {c.value}
            </p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View details →
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-6">
          <h2 className="font-heading text-lg font-semibold">Shortcuts</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link
                href="/admin/users"
                className="text-primary hover:underline"
              >
                Browse users
              </Link>
            </li>
            <li>
              <Link
                href="/admin/stores"
                className="text-primary hover:underline"
              >
                Browse stores
              </Link>
            </li>
            <li>
              <Link
                href="/admin/subscription-requests"
                className="text-primary hover:underline"
              >
                Upgrade requests
              </Link>
            </li>
            <li>
              <Link
                href="/admin/products"
                className="text-primary hover:underline"
              >
                All products
              </Link>
            </li>
            <li>
              <Link
                href="/admin/orders"
                className="text-primary hover:underline"
              >
                All orders
              </Link>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          <LayoutDashboard className="mb-2 size-5 text-muted-foreground/80" />
          Charts and revenue analytics can plug in here when you add reporting
          APIs. Stats above refresh on each visit.
        </div>
      </div>
    </div>
  );
}
