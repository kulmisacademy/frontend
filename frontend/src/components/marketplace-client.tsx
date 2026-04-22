"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowDownWideNarrow, Check, SlidersHorizontal } from "lucide-react";
import {
  type CategoryFilter,
  PRICE_MAX,
  type Product,
  type SortOption,
} from "@/lib/catalog";
import { fetchCatalogProductsPageClient } from "@/lib/catalog-api";
import { Spinner } from "@/components/ui/spinner";
import { ProductCard } from "@/components/product-card";
import { MarketplaceBottomSheet } from "@/components/marketplace-bottom-sheet";
import {
  MarketplaceFiltersForm,
  type MarketplaceFiltersState,
  SORT_OPTION_VALUES,
  sortOptionLabelKey,
} from "@/components/marketplace-filters-form";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MARKETING_PAGE_PY,
  PageContainer,
  Section,
} from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { CATALOG_PAGE_SIZE } from "@/shared/catalog-limits";

const defaultFilters = (): MarketplaceFiltersState => ({
  category: "All",
  location: "all",
  priceMax: PRICE_MAX,
  query: "",
  sort: "latest",
});

function MarketplaceGridSkeleton() {
  return (
    <div
      className="grid animate-pulse grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border/60 bg-muted/30 sm:rounded-2xl"
        >
          <div className="h-[180px] w-full bg-muted" />
          <div className="space-y-2 p-2.5 sm:p-3">
            <div className="h-3 w-[75%] rounded bg-muted-foreground/15" />
            <div className="h-3 w-[45%] rounded bg-muted-foreground/10" />
            <div className="h-8 w-full rounded-lg bg-muted-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketplaceClient() {
  const tm = useTranslations("marketplace");
  const tf = useTranslations("filters");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [category, setCategory] = React.useState<CategoryFilter>("All");
  const [location, setLocation] = React.useState("all");
  const [sort, setSort] = React.useState<SortOption>("latest");
  const [priceMax, setPriceMax] = React.useState(PRICE_MAX);
  const [page, setPage] = React.useState(1);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 320);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [category, location, sort, priceMax, debouncedQuery]);

  React.useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchCatalogProductsPageClient({
          page,
          limit: CATALOG_PAGE_SIZE,
          category: category === "All" ? undefined : category,
          location,
          sort,
          priceMin: 0,
          priceMax,
          q: debouncedQuery.trim() || undefined,
          signal: ac.signal,
        });
        if (!cancelled) {
          setProducts(data.products);
          setTotal(data.total);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) {
          setLoadError(tm("loadError"));
          setProducts([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [page, category, location, sort, priceMax, debouncedQuery, tm]);

  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * CATALOG_PAGE_SIZE + 1;
  const to = Math.min(safePage * CATALOG_PAGE_SIZE, total);

  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const [sortSheetOpen, setSortSheetOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<MarketplaceFiltersState>(defaultFilters);

  const openFilterSheet = () => {
    setSortSheetOpen(false);
    setDraft({
      category,
      location,
      priceMax,
      query,
      sort,
    });
    setFilterSheetOpen(true);
  };

  const applyFilters = () => {
    setCategory(draft.category);
    setLocation(draft.location);
    setPriceMax(draft.priceMax);
    setQuery(draft.query);
    setSort(draft.sort);
    setFilterSheetOpen(false);
  };

  const resetDraft = () => {
    setDraft(defaultFilters());
  };

  const sortLabel = tf(sortOptionLabelKey(sort));

  const isDefaultFilters =
    category === "All" &&
    location === "all" &&
    priceMax >= PRICE_MAX &&
    !debouncedQuery.trim();

  const setDraftField = <K extends keyof MarketplaceFiltersState>(
    key: K,
    value: MarketplaceFiltersState[K]
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <Section id="marketplace" bleed className="scroll-mt-24">
      <PageContainer
        className={cn(
          "space-y-6 md:space-y-8 lg:space-y-10",
          MARKETING_PAGE_PY
        )}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
              {tm("title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {tm("intro")}
            </p>
            {loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : null}
          </div>
          <div className="hidden w-full flex-col gap-2 md:flex md:max-w-md lg:w-auto lg:shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tm("search")}
            </span>
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tm("searchPlaceholder")}
              className="h-12 rounded-2xl border-border/80 bg-muted/25 shadow-sm"
            />
          </div>
        </div>

        <div className="hidden md:block">
          <MarketplaceFiltersForm
            category={category}
            location={location}
            priceMax={priceMax}
            query={query}
            sort={sort}
            onCategoryChange={setCategory}
            onLocationChange={setLocation}
            onPriceMaxChange={setPriceMax}
            onQueryChange={setQuery}
            onSortChange={setSort}
            showSearch={false}
            compact={false}
          />
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex gap-2 md:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 gap-2 rounded-xl border-border/80 bg-background font-semibold shadow-sm"
              onClick={openFilterSheet}
            >
              <SlidersHorizontal className="size-4 text-primary" />
              {tm("filters")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-0 flex-1 gap-2 rounded-xl border-border/80 bg-background font-semibold shadow-sm"
              onClick={() => {
                setFilterSheetOpen(false);
                setSortSheetOpen(true);
              }}
            >
              <ArrowDownWideNarrow className="size-4 shrink-0 text-primary" />
              <span className="truncate">{sortLabel}</span>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {tm("showing")}{" "}
            <span className="font-semibold text-foreground">
              {from}–{to}
            </span>{" "}
            {tm("of")}{" "}
            <span className="font-semibold text-foreground">{total}</span>{" "}
            {tm("products")}
          </p>
        </div>

        {loading && products.length === 0 ? (
          <MarketplaceGridSkeleton />
        ) : (
          <>
            <div
              className={cn(
                "relative grid grid-cols-2 gap-3 transition-opacity duration-200 md:grid-cols-3 lg:grid-cols-4",
                loading && products.length > 0 && "pointer-events-none opacity-55"
              )}
            >
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {loading && products.length > 0 ? (
              <div className="flex justify-center py-6" aria-live="polite">
                <Spinner className="size-8" />
              </div>
            ) : null}

            {total === 0 && !loading ? (
              <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                {isDefaultFilters ? tm("emptyDefault") : tm("emptyFiltered")}
              </p>
            ) : null}
          </>
        )}

        {totalPages > 1 ? (
          <div className="border-t border-border/50 pt-8">
            <PaginationBar
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </PageContainer>

      <MarketplaceBottomSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        title={tm("filtersSheetTitle")}
        footer={
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl font-semibold"
              onClick={resetDraft}
            >
              {tm("reset")}
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-xl font-semibold shadow-sm"
              onClick={applyFilters}
            >
              {tm("applyFilters")}
            </Button>
          </div>
        }
      >
        <MarketplaceFiltersForm
          category={draft.category}
          location={draft.location}
          priceMax={draft.priceMax}
          query={draft.query}
          sort={draft.sort}
          onCategoryChange={(c) => setDraftField("category", c)}
          onLocationChange={(v) => setDraftField("location", v)}
          onPriceMaxChange={(n) => setDraftField("priceMax", n)}
          onQueryChange={(q) => setDraftField("query", q)}
          onSortChange={(s) => setDraftField("sort", s)}
          compact
          showSearch
        />
      </MarketplaceBottomSheet>

      <MarketplaceBottomSheet
        open={sortSheetOpen}
        onOpenChange={setSortSheetOpen}
        title={tm("sortBy")}
        maxHeightClassName="max-h-[min(55dvh,420px)]"
      >
        <div className="flex flex-col gap-1 pb-1">
          {SORT_OPTION_VALUES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSort(s);
                setSortSheetOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3.5 text-left text-sm font-semibold transition-colors",
                sort === s
                  ? "bg-primary/12 text-primary"
                  : "text-foreground hover:bg-muted/80"
              )}
            >
              {tf(sortOptionLabelKey(s))}
              {sort === s ? (
                <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
              ) : null}
            </button>
          ))}
        </div>
      </MarketplaceBottomSheet>
    </Section>
  );
}
