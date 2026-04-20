"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/context/dashboard-i18n-context";
import {
  DEFAULT_ORDER_FILTERS,
  type OrderDatePreset,
  type OrderListFilters,
  type OrderStatusFilter,
} from "@/lib/order-filters";

type Props = {
  value: OrderListFilters;
  onChange: (next: OrderListFilters) => void;
  disabled?: boolean;
  className?: string;
};

const DATE_OPTIONS: { value: OrderDatePreset; labelKey: string }[] = [
  { value: "all", labelKey: "orders.periodAll" },
  { value: "today", labelKey: "orders.periodToday" },
  { value: "week", labelKey: "orders.periodWeek" },
  { value: "month", labelKey: "orders.periodMonth" },
];

const STATUS_OPTIONS: { value: OrderStatusFilter; labelKey: string }[] = [
  { value: "all", labelKey: "orders.statusAll" },
  { value: "pending", labelKey: "orders.statusPending" },
  { value: "approved", labelKey: "orders.statusApproved" },
  { value: "rejected", labelKey: "orders.statusRejected" },
];

export function OrderFiltersBar({
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const { t } = useDashboardI18n();

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end",
        className
      )}
    >
      <div className="min-w-[10rem] flex-1 space-y-1">
        <label
          htmlFor="order-filter-period"
          className="text-xs font-medium text-muted-foreground"
        >
          {t("orders.filterPeriod")}
        </label>
        <select
          id="order-filter-period"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm"
          value={value.date}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              date: e.target.value as OrderDatePreset,
            })
          }
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[10rem] flex-1 space-y-1">
        <label
          htmlFor="order-filter-status"
          className="text-xs font-medium text-muted-foreground"
        >
          {t("orders.filterStatus")}
        </label>
        <select
          id="order-filter-status"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm"
          value={value.status}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as OrderStatusFilter,
            })
          }
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        disabled={
          disabled ||
          (value.date === DEFAULT_ORDER_FILTERS.date &&
            value.status === DEFAULT_ORDER_FILTERS.status)
        }
        onClick={() => onChange({ ...DEFAULT_ORDER_FILTERS })}
      >
        {t("orders.reset")}
      </Button>
    </div>
  );
}
