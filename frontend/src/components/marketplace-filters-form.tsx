"use client";

import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { CategoryFilterChips } from "@/components/category-filter-chips";
import type { CatalogCategory, CategorySlugFilter } from "@/lib/catalog-types";
import { PRICE_MAX, type SortOption } from "@/lib/catalog";
import { LocationSelect } from "@/components/ui/location-select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const SORT_OPTION_VALUES: readonly SortOption[] = [
  "latest",
  "popular",
  "price-asc",
  "price-desc",
] as const;

export function sortOptionLabelKey(
  s: SortOption
): "sortLatest" | "sortPopular" | "sortPriceAsc" | "sortPriceDesc" {
  switch (s) {
    case "latest":
      return "sortLatest";
    case "popular":
      return "sortPopular";
    case "price-asc":
      return "sortPriceAsc";
    case "price-desc":
      return "sortPriceDesc";
    default:
      return "sortLatest";
  }
}

const sortChipBase =
  "inline-flex shrink-0 items-center justify-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-all";

export type MarketplaceFiltersState = {
  category: CategorySlugFilter;
  location: string;
  priceMax: number;
  query: string;
  sort: SortOption;
};

export type MarketplaceFiltersFormProps = MarketplaceFiltersState & {
  catalogCategories: CatalogCategory[];
  locale: string;
  onCategoryChange: (c: CategorySlugFilter) => void;
  onLocationChange: (v: string) => void;
  onPriceMaxChange: (n: number) => void;
  onQueryChange: (q: string) => void;
  onSortChange: (s: SortOption) => void;
  /** Tighter spacing for bottom sheet */
  compact?: boolean;
  /** When false, search field is omitted (use header search on desktop) */
  showSearch?: boolean;
};

export function MarketplaceFiltersForm({
  category,
  location,
  priceMax,
  query,
  sort,
  catalogCategories,
  locale,
  onCategoryChange,
  onLocationChange,
  onPriceMaxChange,
  onQueryChange,
  onSortChange,
  compact = false,
  showSearch = true,
}: MarketplaceFiltersFormProps) {
  const tf = useTranslations("filters");
  const tc = useTranslations("categories");
  const gapSection = compact ? "gap-4" : "gap-6";
  const padCard = compact ? "p-4" : "p-5 md:p-6";

  return (
    <div className={cn("flex flex-col", gapSection)}>
      {showSearch ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tf("search")}
          </span>
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={tf("searchPlaceholder")}
            className="h-11 rounded-2xl border-border/80 bg-muted/25 shadow-sm md:h-12"
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/15 shadow-sm",
          padCard,
          !compact && "md:gap-6 xl:flex-row xl:items-start xl:justify-between xl:gap-8"
        )}
      >
        <div className="min-w-0 flex-1 space-y-3">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="size-4 text-primary" />
            {tf("category")}
          </span>
          <CategoryFilterChips
            categories={catalogCategories}
            locale={locale}
            value={category}
            onChange={onCategoryChange}
            allLabel={tc("All")}
            className={compact ? "" : "md:-mr-1"}
          />
        </div>
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-3 border-t border-border/50 pt-4",
            !compact && "xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
          )}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {tf("sortBy")}
          </span>
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
            {SORT_OPTION_VALUES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSortChange(s)}
                className={cn(
                  sortChipBase,
                  sort === s
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border/80 bg-background/90 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {tf(sortOptionLabelKey(s))}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4 md:items-end",
          compact ? "grid-cols-1" : "md:grid-cols-3"
        )}
      >
        <label
          className={cn("flex flex-col gap-2 rounded-2xl", !compact && "md:col-span-1")}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {tf("location")}
          </span>
          <LocationSelect value={location} onChange={onLocationChange} />
        </label>
        <label
          className={cn(
            "flex flex-col gap-2 rounded-2xl",
            !compact && "md:col-span-2"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {tf("maxPrice")}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              $0 – ${priceMax}
            </span>
          </div>
          <div className="flex h-12 items-center gap-4 rounded-2xl border border-input bg-background px-4 shadow-sm">
            <input
              type="range"
              min={0}
              max={PRICE_MAX}
              step={1}
              value={priceMax}
              onChange={(e) => onPriceMaxChange(Number(e.target.value))}
              className="h-2 w-full flex-1 cursor-pointer accent-primary"
            />
          </div>
        </label>
      </div>
    </div>
  );
}
