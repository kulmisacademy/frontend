"use client";

import * as React from "react";
import type {
  CatalogCategory,
  CategorySlugFilter,
} from "@/lib/catalog-types";
import { CATEGORY_FILTER_ALL } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

const chipBase =
  "inline-flex shrink-0 items-center justify-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-all";

type Props = {
  categories: CatalogCategory[];
  locale: string;
  value: CategorySlugFilter;
  onChange: (slug: CategorySlugFilter) => void;
  allLabel: string;
  className?: string;
};

function labelFor(c: CatalogCategory, locale: string) {
  return locale === "so" ? c.name_so : c.name_en;
}

export function CategoryFilterChips({
  categories,
  locale,
  value,
  onChange,
  allLabel,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-2 overflow-x-auto overflow-y-hidden pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden",
        className
      )}
      role="list"
      aria-label="Categories"
    >
      <button
        type="button"
        role="listitem"
        onClick={() => onChange(CATEGORY_FILTER_ALL)}
        className={cn(
          chipBase,
          value === CATEGORY_FILTER_ALL
            ? "border-primary bg-primary text-primary-foreground shadow-md"
            : "border-border/80 bg-background/90 text-muted-foreground hover:border-primary/40 hover:text-foreground"
        )}
      >
        {allLabel}
      </button>
      {categories.map((c) => (
        <button
          key={c.slug}
          type="button"
          role="listitem"
          onClick={() => onChange(c.slug)}
          className={cn(
            chipBase,
            value === c.slug
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-border/80 bg-background/90 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {labelFor(c, locale)}
        </button>
      ))}
    </div>
  );
}
