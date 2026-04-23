"use client";

import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  MapPin,
  MessageCircle,
  Search,
  BadgeCheck,
  Store as StoreIcon,
  Info,
  Star,
  Heart,
} from "lucide-react";
import type { Product } from "@/lib/catalog";
import {
  apiProductToCard,
  type ApiProductPublic,
  type ApiStorePublic,
  type StoreReviewPublic,
} from "@/lib/map-api-product";
import { CategoryFilterChips } from "@/components/category-filter-chips";
import { MarketingShell } from "@/components/marketing-shell";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/ui/section";
import { buildWhatsAppMessageUrl } from "@/lib/whatsapp";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { CATEGORY_FILTER_ALL, type CategorySlugFilter } from "@/lib/catalog";
import type { CatalogCategory } from "@/lib/catalog-types";
import { slugifyCategory } from "@/lib/slugify";
import { cn } from "@/lib/utils";

const BANNER_FALLBACK = "/placeholder-banner.svg";

type Tab = "products" | "about" | "reviews";

type Props = {
  api: {
    store: ApiStorePublic;
    products: ApiProductPublic[];
    reviews?: StoreReviewPublic[];
    categories?: CatalogCategory[];
  };
};

export function StoreProfileClient({ api }: Props) {
  const [tab, setTab] = React.useState<Tab>("products");
  const [q, setQ] = React.useState("");
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategorySlugFilter>(CATEGORY_FILTER_ALL);
  const locale = useLocale();
  const tf = useTranslations("filters");
  const tc = useTranslations("categories");
  const { user, token } = useAuth();
  const [following, setFollowing] = React.useState(!!api.store.is_following);
  const [followBusy, setFollowBusy] = React.useState(false);

  const store = api.store;
  const reviews = api.reviews ?? [];

  React.useEffect(() => {
    setFollowing(!!store.is_following);
  }, [store.is_following]);

  React.useEffect(() => {
    if (!token || user?.role !== "customer") return;
    let cancelled = false;
    apiFetch<{ following: boolean }>(
      `/api/auth/follow/${encodeURIComponent(store.slug)}`,
      { token }
    )
      .then((d) => {
        if (!cancelled) setFollowing(d.following);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, user?.role, store.slug]);

  async function toggleFollow() {
    if (user?.role !== "customer" || !token) {
      window.location.href = `/login?next=/store/${encodeURIComponent(store.slug)}`;
      return;
    }
    setFollowBusy(true);
    try {
      if (following) {
        await apiFetch(`/api/auth/follow/${encodeURIComponent(store.slug)}`, {
          method: "DELETE",
          token,
        });
        setFollowing(false);
      } else {
        await apiFetch(`/api/auth/follow/${encodeURIComponent(store.slug)}`, {
          method: "POST",
          token,
        });
        setFollowing(true);
      }
    } finally {
      setFollowBusy(false);
    }
  }

  const cardProducts: Product[] = api.products.map((p) =>
    apiProductToCard(p, api.store)
  );

  const storeCategoryChips = React.useMemo((): CatalogCategory[] => {
    const fromApi = api.categories ?? [];
    if (fromApi.length > 0) return fromApi;
    const slugSet = new Set(
      cardProducts.map((p) => p.categorySlug ?? slugifyCategory(p.category))
    );
    return [...slugSet].map((slug) => ({
      slug,
      name_en: slug,
      name_so: slug,
    }));
  }, [api.categories, cardProducts]);

  const filtered = React.useMemo(() => {
    let list = cardProducts;
    if (categoryFilter !== CATEGORY_FILTER_ALL) {
      list = list.filter(
        (p) =>
          (p.categorySlug ?? slugifyCategory(p.category)) === categoryFilter
      );
    }
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.description && p.description.toLowerCase().includes(s)) ||
        p.category.toLowerCase().includes(s)
    );
  }, [cardProducts, q, categoryFilter]);

  // Use only NEXT_PUBLIC_SITE_URL (never window) so SSR and first client paint match.
  // Set e.g. NEXT_PUBLIC_SITE_URL=http://localhost:3000 in .env.local for correct absolute links.
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const storeUrl = base
    ? `${base}/store/${store.slug}`
    : `/store/${store.slug}`;
  const wa = buildWhatsAppMessageUrl(
    store.whatsapp_phone || "",
    `Hello! I found your store on LAAS24: ${store.store_name}\nStore link: ${storeUrl}`
  );

  const banner = store.banner_url || BANNER_FALLBACK;
  const logo = store.logo || BANNER_FALLBACK;
  const loc = store.location;
  const locLabel =
    loc?.city && loc?.region
      ? `${loc.city} · ${loc.region}`
      : loc?.city || loc?.region || "Somalia";

  return (
    <MarketingShell>
      <div className="relative w-full">
        <div className="relative h-[220px] w-full overflow-hidden md:h-[260px]">
          <Image
            src={banner}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        </div>

        <PageContainer className="relative z-10 -mt-16 pb-10 md:-mt-20 md:pb-12 lg:pb-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-xl ring-1 ring-border/60 md:size-36">
              <Image
                src={logo}
                alt=""
                fill
                className="object-cover"
                sizes="144px"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight md:text-4xl">
                  {store.store_name}
                </h1>
                {store.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <BadgeCheck className="size-3.5" />
                    Verified
                  </span>
                ) : api.store.status === "approved" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    Live
                  </span>
                ) : null}
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {locLabel}
              </p>
              {(store.rating_count ?? 0) > 0 &&
              store.rating_average != null ? (
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                    <Star className="size-4 fill-amber-400 text-amber-500" />
                    {store.rating_average.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({store.rating_count}{" "}
                    {store.rating_count === 1 ? "review" : "reviews"})
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet</p>
              )}
              {store.description ? (
                <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                  {store.description}
                </p>
              ) : (
                <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                  {filtered.length} products · Shop with confidence on LAAS24.
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button className="rounded-2xl shadow-md" size="lg" asChild>
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </Button>
                <Button
                  type="button"
                  variant={following ? "secondary" : "outline"}
                  className="rounded-2xl"
                  size="lg"
                  disabled={followBusy}
                  onClick={() => void toggleFollow()}
                >
                  <Heart
                    className={cn(
                      "size-4",
                      following && "fill-primary text-primary"
                    )}
                  />
                  {following ? "Following" : "Follow store"}
                </Button>
                <Button variant="outline" className="rounded-2xl" size="lg" asChild>
                  <Link href="/marketplace">Marketplace</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="-mx-1 mt-8 flex gap-2 overflow-x-auto overflow-y-hidden border-b border-border/80 pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                { id: "products" as const, label: "Products", icon: StoreIcon },
                { id: "about" as const, label: "About", icon: Info },
                { id: "reviews" as const, label: "Reviews", icon: Star },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors",
                  tab === item.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </div>

          {tab === "products" ? (
            <>
              <div className="-mx-1 mt-8 space-y-2">
                <span className="block px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {tf("category")}
                </span>
                <CategoryFilterChips
                  categories={storeCategoryChips}
                  locale={locale}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  allLabel={tc("All")}
                />
              </div>
              <div className="mt-8">
                <label className="relative block max-w-xl">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search products in this store..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-12 rounded-2xl border-border/80 bg-muted/30 pl-11 pr-4 shadow-inner"
                  />
                </label>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {filtered.length === 0 ? (
                <p className="mt-10 rounded-2xl border border-dashed py-14 text-center text-muted-foreground">
                  No products match your category or search.
                </p>
              ) : null}
            </>
          ) : null}

          {tab === "about" ? (
            <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:p-8">
              <h2 className="font-heading text-lg font-semibold">About this store</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {store.description ||
                  "This vendor hasn’t added a description yet. Contact them on WhatsApp for questions."}
              </p>
            </div>
          ) : null}

          {tab === "reviews" ? (
            <div className="mt-8 space-y-4">
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
                  No reviews yet. When your order is marked complete, you can
                  leave a rating from{" "}
                  <Link href="/account/orders" className="font-medium text-primary underline">
                    My orders
                  </Link>
                  .
                </div>
              ) : (
                <ul className="space-y-4">
                  {reviews.map((r, i) => (
                    <li
                      key={`${r.created_at}-${i}`}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{r.author_label}</span>
                        <time
                          className="text-xs text-muted-foreground"
                          dateTime={r.created_at}
                        >
                          {new Date(r.created_at).toLocaleDateString()}
                        </time>
                      </div>
                      <div
                        className="mt-2 flex gap-0.5"
                        aria-label={`${r.rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={cn(
                              "size-4",
                              j < r.rating
                                ? "fill-amber-400 text-amber-500"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      {r.feedback ? (
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {r.feedback}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </PageContainer>
      </div>
    </MarketingShell>
  );
}
