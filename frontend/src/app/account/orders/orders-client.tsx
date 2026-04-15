"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

type CustomerOrder = {
  id: string;
  store_id: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  message: string | null;
  items_summary: string | null;
  total: number | null;
  created_at: string;
  store_slug: string | null;
  store_name: string | null;
  product_name: string | null;
  product_id: string | null;
  can_rate?: boolean;
  has_rated?: boolean;
};

function RateOrderForm({
  orderId,
  token,
  onRated,
}: {
  orderId: string;
  token: string;
  onRated: () => void;
}) {
  const [stars, setStars] = React.useState(5);
  const [feedback, setFeedback] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/auth/orders/${orderId}/rate`, {
        method: "POST",
        body: JSON.stringify({
          rating: stars,
          feedback: feedback.trim() || null,
        }),
        token,
      });
      onRated();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 w-full max-w-md rounded-xl border border-border/80 bg-muted/20 p-4"
    >
      <p className="text-sm font-medium">Rate this order</p>
      <div className="mt-2 flex gap-1" role="group" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="rounded-md p-0.5 transition-colors hover:bg-muted"
            onClick={() => setStars(n)}
            aria-label={`${n} stars`}
          >
            <Star
              className={cn(
                "size-7 sm:size-8",
                n <= stars
                  ? "fill-amber-400 text-amber-500"
                  : "text-muted-foreground/35"
              )}
            />
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs text-muted-foreground">
        <span className="sr-only">Feedback</span>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Optional feedback for the store…"
          className="mt-1 w-full resize-y rounded-lg border border-border/80 bg-background px-3 py-2 text-sm"
        />
      </label>
      {err ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      <Button type="submit" className="mt-3 rounded-xl" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Submit review"}
      </Button>
    </form>
  );
}

export function OrdersClient() {
  const { user, token, loading: authLoading } = useAuth();
  const [orders, setOrders] = React.useState<CustomerOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      setLoading(false);
      setOrders([]);
      return;
    }
    if (user.role !== "customer") {
      setLoading(false);
      setOrders([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<{ orders: CustomerOrder[] }>("/api/auth/customer-orders", {
      token,
    })
      .then((data) => {
        if (!cancelled) setOrders(data.orders ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load orders");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token]);

  async function refreshOrders() {
    if (!token || user?.role !== "customer") return;
    try {
      const data = await apiFetch<{ orders: CustomerOrder[] }>(
        "/api/auth/customer-orders",
        { token }
      );
      setOrders(data.orders ?? []);
    } catch {
      /* ignore */
    }
  }

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
        <p className="text-muted-foreground">Sign in to see your orders.</p>
        <Button className="mt-6 rounded-2xl" asChild>
          <Link href="/login?next=/account/orders">Sign in</Link>
        </Button>
      </PageContainer>
    );
  }

  if (user.role === "vendor" || user.role === "admin") {
    return (
      <PageContainer className={MARKETING_PAGE_PY}>
        <h1 className="font-heading text-3xl font-bold">My orders</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Purchase history applies to customer accounts. Manage incoming order
          requests from your{" "}
          <Link href="/dashboard/orders" className="font-medium text-primary underline">
            vendor dashboard
          </Link>
          .
        </p>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className={MARKETING_PAGE_PY}>
        <h1 className="font-heading text-3xl font-bold">My orders</h1>
        <p className="mt-4 text-destructive">{error}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={MARKETING_PAGE_PY}>
      <h1 className="font-heading text-3xl font-bold">My orders</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Orders from checkout and WhatsApp (linked to your account when you are
        signed in, or matched by phone).
      </p>

      {orders.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
          <Button className="mt-6 rounded-2xl" asChild>
            <Link href="/marketplace">Browse marketplace</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-heading font-semibold">
                  {o.store_name ?? "Store"}
                  {o.store_slug ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      <Link
                        href={`/store/${o.store_slug}`}
                        className="text-primary hover:underline"
                      >
                        View store
                      </Link>
                    </span>
                  ) : null}
                </p>
                {o.product_name ? (
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {o.product_name}
                  </p>
                ) : null}
                {o.items_summary ? (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {o.items_summary}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()} · {o.status}
                </p>
                {o.status === "completed" && o.has_rated ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    You left a review — thank you.
                  </p>
                ) : null}
                {o.can_rate && token ? (
                  <RateOrderForm
                    orderId={o.id}
                    token={token}
                    onRated={() => void refreshOrders()}
                  />
                ) : null}
              </div>
              <p className="shrink-0 font-heading text-xl font-bold">
                {o.total != null ? formatPrice(Number(o.total)) : "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
