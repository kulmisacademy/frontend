"use client";

import * as React from "react";
import { adminFetch } from "@/lib/admin-api-client";
import { apiFetch } from "@/lib/api";
import type { OrderListFilters } from "@/lib/order-filters";
import { orderFiltersToSearchParams } from "@/lib/order-filters";

export type DashboardOrderRow = {
  id: string;
  order_code?: string | null;
  status: string;
  store_id?: string;
  store_name?: string | null;
  store_slug?: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  message: string | null;
  items_summary: string | null;
  total: number | null;
  created_at: string;
  product_id?: string | null;
  product_name?: string | null;
};

export function useDashboardOrdersQuery(args: {
  variant: "admin" | "vendor";
  token: string | null;
  filters: OrderListFilters;
  limit?: number;
  enabled?: boolean;
}) {
  const { variant, token, filters, limit = 200, enabled = true } = args;
  const [orders, setOrders] = React.useState<DashboardOrderRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!enabled) return;
    if (variant === "vendor" && !token) return;

    const qs = orderFiltersToSearchParams(filters, { limit });
    setBusy(true);
    setErr(null);
    try {
      if (variant === "admin") {
        const data = await adminFetch<{ orders: DashboardOrderRow[] }>(
          `/orders?${qs}`
        );
        setOrders(data.orders);
      } else {
        const data = await apiFetch<{ orders: DashboardOrderRow[] }>(
          `/api/vendor/orders?${qs}`,
          { token }
        );
        setOrders(data.orders);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setOrders([]);
    } finally {
      setBusy(false);
    }
  }, [variant, token, filters, limit, enabled]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { orders, busy, err, reload: load };
}
