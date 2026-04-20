"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { useDashboardI18n } from "@/context/dashboard-i18n-context";
import { useDashboardOrdersQuery } from "@/hooks/use-dashboard-orders-query";
import { OrderFiltersBar } from "@/components/dashboard/order-filters-bar";
import {
  DEFAULT_ORDER_FILTERS,
  type OrderListFilters,
} from "@/lib/order-filters";
import { cn } from "@/lib/utils";

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
  const { t } = useDashboardI18n();
  const [filters, setFilters] = React.useState<OrderListFilters>(
    DEFAULT_ORDER_FILTERS
  );

  const { orders, busy, err, reload } = useDashboardOrdersQuery({
    variant: "admin",
    token: null,
    filters,
    limit: 300,
    enabled: !!user && !loading,
  });

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

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight break-words sm:text-3xl">
          {t("orders.title")}
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty break-words">
          {t("orders.adminSubtitle")}
        </p>
      </div>

      <OrderFiltersBar value={filters} onChange={setFilters} disabled={busy} />

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
          {t("orders.noOrders")}
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
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge
                      variant={statusBadgeProps(o.status).variant}
                      className={cn(
                        "rounded-full capitalize",
                        statusBadgeProps(o.status).className
                      )}
                    >
                      {orderStatusLabel(o.status)}
                    </Badge>
                    {o.store_name ? (
                      <span className="min-w-0 break-words text-sm font-medium">{o.store_name}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                  {o.customer_name || o.customer_phone ? (
                    <p className="mt-2 break-words text-sm">
                      {o.customer_name || "—"}
                      {o.customer_phone ? ` · ${o.customer_phone}` : ""}
                    </p>
                  ) : null}
                  {o.message ? (
                    <p className="mt-2 break-words text-sm text-muted-foreground">
                      {o.message}
                    </p>
                  ) : null}
                  {o.items_summary ? (
                    <p className="mt-1 break-words text-sm">{o.items_summary}</p>
                  ) : null}
                  {o.total != null ? (
                    <p className="mt-2 text-sm font-medium">
                      {t("orders.total")}: {o.total}
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
                      {t("orders.store")}
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
