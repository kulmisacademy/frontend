import * as React from "react";
import { ChevronDown } from "lucide-react";
import { LOCATION_FILTER_GROUPS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type LocationSelectProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
};

export function LocationSelect({
  value,
  onChange,
  id,
  className,
}: LocationSelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 w-full cursor-pointer appearance-none rounded-2xl border border-input bg-background py-2 pl-4 pr-11 text-sm font-medium shadow-sm transition-colors",
          "hover:border-primary/30 hover:bg-muted/30",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-card"
        )}
      >
        <option value="all">All locations · Somalia</option>
        {LOCATION_FILTER_GROUPS.map((group) => (
          <optgroup key={group.region} label={group.region}>
            <option value={`region:${group.region}`}>
              All {group.region}
            </option>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
