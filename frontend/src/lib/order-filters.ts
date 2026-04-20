export type OrderDatePreset = "all" | "today" | "week" | "month";
export type OrderStatusFilter = "all" | "pending" | "approved" | "rejected";

export type OrderListFilters = {
  date: OrderDatePreset;
  status: OrderStatusFilter;
};

export const DEFAULT_ORDER_FILTERS: OrderListFilters = {
  date: "all",
  status: "all",
};

const DATE_PRESETS = new Set<string>(["all", "today", "week", "month"]);
const STATUS_FILTERS = new Set<string>([
  "all",
  "pending",
  "approved",
  "rejected",
]);

function isDatePreset(v: string): v is OrderDatePreset {
  return DATE_PRESETS.has(v);
}

function isStatusFilter(v: string): v is OrderStatusFilter {
  return STATUS_FILTERS.has(v);
}

export function orderFiltersToSearchParams(
  f: OrderListFilters,
  extra?: { limit?: number }
): string {
  const p = new URLSearchParams();
  p.set("date", f.date);
  p.set("status", f.status);
  if (extra?.limit != null) p.set("limit", String(extra.limit));
  return p.toString();
}

export function parseOrderFiltersFromSearchParams(
  search: string
): OrderListFilters {
  const p = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const date = p.get("date") ?? "";
  const status = p.get("status") ?? "";
  return {
    date: isDatePreset(date) ? date : DEFAULT_ORDER_FILTERS.date,
    status: isStatusFilter(status) ? status : DEFAULT_ORDER_FILTERS.status,
  };
}
