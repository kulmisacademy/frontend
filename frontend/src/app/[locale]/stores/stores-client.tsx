"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { Store } from "@/lib/catalog";
import { matchesStoreLocation } from "@/lib/catalog";
import { fetchCatalogStoresClient } from "@/lib/catalog-api";
import { StoreCard } from "@/components/store-card";
import { LocationSelect } from "@/components/ui/location-select";
import { Input } from "@/components/ui/input";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { Spinner } from "@/components/ui/spinner";

export function StoresClient() {
  const t = useTranslations("storesPage");
  const [stores, setStores] = React.useState<Store[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [location, setLocation] = React.useState("all");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCatalogStoresClient();
        if (!cancelled) setStores(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = React.useMemo(() => {
    let list = [...stores];
    if (location !== "all") {
      list = list.filter((s) => matchesStoreLocation(s, location));
    }
    if (q.trim()) {
      const x = q.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(x) ||
          s.city.toLowerCase().includes(x) ||
          s.region.toLowerCase().includes(x)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [stores, q, location]);

  return (
    <PageContainer className={MARKETING_PAGE_PY}>
      <div className="mb-10 space-y-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mb-10 grid gap-6 md:grid-cols-2 md:items-end lg:gap-8">
        <label className="relative flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("search")}
          </span>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-12 rounded-2xl border-border/80 bg-muted/20 pl-11 shadow-sm"
            />
          </div>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("location")}
          </span>
          <LocationSelect value={location} onChange={setLocation} />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-10" />
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            {filtered.length === 1
              ? t("foundOne", { count: filtered.length })
              : t("foundMany", { count: filtered.length })}
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
              {stores.length === 0 ? t("emptyAll") : t("emptyFiltered")}
            </p>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
