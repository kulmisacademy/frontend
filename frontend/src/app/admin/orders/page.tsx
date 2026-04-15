"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { adminFetch } from "@/lib/admin-api-client";

type OrderRow = {
  id: string;
  status: string;
  store_id: string;
  store_name?: string | null;
  store_slug?: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  message: string | null;
  items_summary: string | null;
  total: number | null;
  created_at: string;
};

export default function AdminOrdersPage() {
  const { user, loading } = useAdminSession();
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await adminFetch<{ orders: OrderRow[] }>("/orders");
      setOrders(data.orders);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Orders
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All order requests across stores (read-only).
        </p>
      </div>

      {err ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      {busy && orders.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-10" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No orders yet.
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={o.status === "completed" ? "success" : "secondary"}
                      className="rounded-full capitalize"
                    >
                      {o.status}
                    </Badge>
                    {o.store_name ? (
                      <span className="text-sm font-medium">{o.store_name}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                  {o.customer_name || o.customer_phone ? (
                    <p className="mt-2 text-sm">
                      {o.customer_name || "—"}
                      {o.customer_phone ? ` · ${o.customer_phone}` : ""}
                    </p>
                  ) : null}
                  {o.message ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {o.message}
                    </p>
                  ) : null}
                  {o.items_summary ? (
                    <p className="mt-1 text-sm">{o.items_summary}</p>
                  ) : null}
                  {o.total != null ? (
                    <p className="mt-2 text-sm font-medium">
                      Total: {o.total}
                    </p>
                  ) : null}
                </div>
                {o.store_slug ? (
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link
                      href={`/store/${o.store_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1 size-3.5" />
                      Store
                    </Link>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
