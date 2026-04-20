"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useDashboardI18n } from "@/context/dashboard-i18n-context";
import { useDashboardOrdersQuery } from "@/hooks/use-dashboard-orders-query";
import { OrderFiltersBar } from "@/components/dashboard/order-filters-bar";
import {
  DEFAULT_ORDER_FILTERS,
  type OrderListFilters,
} from "@/lib/order-filters";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function DashboardOrdersPage() {
  const router = useRouter();
  const { user, loading, token } = useAuth();
  const { t } = useDashboardI18n();
  const [filters, setFilters] = React.useState<OrderListFilters>(
    DEFAULT_ORDER_FILTERS
  );
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const { orders, busy: loadingList, err: loadErr, reload } =
    useDashboardOrdersQuery({
      variant: "vendor",
      token,
      filters,
      limit: 500,
      enabled: !!token && !!user,
    });

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/orders");
  }, [loading, user, router]);

  React.useEffect(() => {
    if (loadErr) setErr(loadErr);
    else setErr(null);
  }, [loadErr]);

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
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  function orderStatusLabel(status: string) {
    if (
      status === "pending" ||
      status === "approved" ||
      status === "rejected"
    ) {
      return t(`status.${status}`);
    }
    return status;
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

  const listBusy = loadingList || busy;

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
            {t("orders.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("orders.vendorSubtitle")}
          </p>
        </div>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href="/dashboard">{t("orders.backOverview")}</Link>
        </Button>
      </div>

      <OrderFiltersBar
        value={filters}
        onChange={setFilters}
        disabled={listBusy}
      />

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
                    {orderStatusLabel(o.status)}
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
                    {t("orders.product")}: {o.product_name}
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
                      disabled={listBusy}
                      onClick={() => void setStatus(o.id, "approved")}
                    >
                      {t("orders.approve")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="rounded-xl"
                      disabled={listBusy}
                      onClick={() => void setStatus(o.id, "rejected")}
                    >
                      {t("orders.reject")}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={listBusy}
                    onClick={() => void setStatus(o.id, "pending")}
                  >
                    {t("orders.setPending")}
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {orders.length === 0 && !loadingList ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {t("orders.noOrders")} {t("orders.noOrdersHint")}
        </p>
      ) : null}
    </div>
  );
}
