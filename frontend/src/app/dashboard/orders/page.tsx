"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type OrderRow = {
  id: string;
  order_code?: string | null;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  message: string | null;
  items_summary: string | null;
  total: number | null;
  products?: unknown;
  created_at: string;
  product_id: string | null;
  product_name: string | null;
};

export default function DashboardOrdersPage() {
  const router = useRouter();
  const { user, loading, token } = useAuth();
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/orders");
  }, [loading, user, router]);

  const load = React.useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await apiFetch<{ orders: OrderRow[] }>("/api/vendor/orders", {
        token,
      });
      setOrders(data.orders);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(
    id: string,
    status: "pending" | "approved" | "rejected"
  ) {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(`/api/vendor/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        token,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  function statusBadgeProps(s: string) {
    if (s === "approved")
      return { variant: "success" as const, className: undefined };
    if (s === "rejected")
      return {
        variant: "secondary" as const,
        className:
          "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/15",
      };
    return { variant: "secondary" as const, className: undefined };
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">
            Orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve or reject requests. Buyers can rate after approval.
          </p>
        </div>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      </div>

      {err ? (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      <ul className="mt-8 space-y-4">
        {orders.map((o) => (
          <li
            key={o.id}
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={statusBadgeProps(o.status).variant}
                    className={cn(
                      "rounded-full capitalize",
                      statusBadgeProps(o.status).className
                    )}
                  >
                    {o.status}
                  </Badge>
                  {o.order_code ? (
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {o.order_code}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                </p>
                {o.total != null ? (
                  <p className="mt-2 font-heading text-lg font-bold">
                    {formatPrice(Number(o.total))}
                  </p>
                ) : null}
                {o.customer_name || o.customer_phone ? (
                  <p className="mt-2 font-medium">
                    {o.customer_name || "—"}{" "}
                    {o.customer_phone ? `· ${o.customer_phone}` : ""}
                  </p>
                ) : null}
                {o.product_name ? (
                  <p className="mt-2 font-medium text-foreground">
                    Product: {o.product_name}
                  </p>
                ) : null}
                {o.message ? (
                  <p className="mt-2 text-sm text-muted-foreground">{o.message}</p>
                ) : null}
                {o.items_summary ? (
                  <p className="mt-1 text-sm">{o.items_summary}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {o.status === "pending" ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl"
                      disabled={busy}
                      onClick={() => void setStatus(o.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="rounded-xl"
                      disabled={busy}
                      onClick={() => void setStatus(o.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={busy}
                    onClick={() => void setStatus(o.id, "pending")}
                  >
                    Set pending
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {orders.length === 0 && !busy ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No orders yet. When buyers check out via WhatsApp, they appear here.
        </p>
      ) : null}
    </div>
  );
}
