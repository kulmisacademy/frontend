"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/context/dashboard-i18n-context";
import { useDashboardOrdersQuery } from "@/hooks/use-dashboard-orders-query";
import {
  DEFAULT_ORDER_FILTERS,
  type OrderListFilters,
} from "@/lib/order-filters";
import { OrderFiltersBar } from "@/components/dashboard/order-filters-bar";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RecentOrdersSnippet({
  variant,
  token,
  enabled,
}: {
  variant: "admin" | "vendor";
  token: string | null;
  enabled: boolean;
}) {
  const { t } = useDashboardI18n();
  const [filters, setFilters] = React.useState<OrderListFilters>(
    DEFAULT_ORDER_FILTERS
  );
  const { orders, busy, err } = useDashboardOrdersQuery({
    variant,
    token,
    filters,
    limit: 5,
    enabled,
  });

  const base = variant === "admin" ? "/admin/orders" : "/dashboard/orders";

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

  function statusClass(s: string) {
    if (s === "rejected") {
      return "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/15";
    }
    return undefined;
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg font-semibold">
          {variant === "admin"
            ? t("adminDashboard.recentOrders")
            : t("vendorDashboard.recentOrders")}
        </h2>
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link href={base}>{t("orders.viewAll")}</Link>
        </Button>
      </div>
      <div className="mt-4">
        <OrderFiltersBar
          value={filters}
          onChange={setFilters}
          disabled={busy}
        />
      </div>
      {err ? (
        <p className="mt-3 text-sm text-destructive">{err}</p>
      ) : null}
      {busy && orders.length === 0 ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-8" />
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("orders.noOrders")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("rounded-full capitalize", statusClass(o.status))}
                >
                  {orderStatusLabel(o.status)}
                </Badge>
                {o.order_code ? (
                  <span className="font-mono text-xs font-semibold">
                    {o.order_code}
                  </span>
                ) : null}
                <span className="text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                </span>
              </div>
              {variant === "admin" && o.store_name ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("orders.store")}: {o.store_name}
                </p>
              ) : null}
              {o.total != null ? (
                <p className="mt-1 font-medium">{formatPrice(Number(o.total))}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
