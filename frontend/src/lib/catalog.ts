import { slugifyCategory } from "@/lib/slugify";
import type { CategorySlugFilter } from "@/lib/catalog-types";

export type { CatalogCategory, CategorySlugFilter } from "@/lib/catalog-types";
export { CATEGORY_FILTER_ALL } from "@/lib/catalog-types";

export type Store = {
  id: string;
  slug: string;
  name: string;
  logo: string;
  /** Store cover / banner for cards (optional) */
  bannerUrl?: string | null;
  city: string;
  region: string;
  whatsapp: string;
  productCount: number;
  /** Shown next to store name on product cards when true */
  verified?: boolean;
};

export type Product = {
  id: string;
  storeId: string;
  storeSlug: string;
  name: string;
  price: number;
  oldPrice?: number;
  category: string;
  /** Stable filter key; matches backend `category_slug`. */
  categorySlug?: string;
  location: string;
  image: string;
  /** All image URLs for detail gallery (same order as vendor upload) */
  images?: string[];
  /** Short line for cards; fallback is generated when omitted */
  description?: string;
  /** Bullet features from vendor (e.g. durable, fast delivery) */
  features?: string[];
  /** Product video URL (uploaded file URL or external link) */
  videoUrl?: string | null;
  popular?: boolean;
  /** Higher = more popular for sort (from API: derived from listing) */
  popularityScore: number;
  /** ISO date for "Latest" sort */
  createdAt: string;
  inStock: boolean;
  vendor: string;
  whatsapp: string;
  /** When true, show verified badge on cards (approved store) */
  vendorVerified?: boolean;
};

export const PRICE_MAX = 120;

/** City → administrative region (Somalia) for filtering */
export const CITY_TO_REGION: Record<string, string> = {
  Mogadishu: "Banaadir",
  Hargeisa: "Woqooyi Galbeed",
  Bosaso: "Bari",
  Kismayo: "Jubbaland",
  Garowe: "Nugaal",
  Beledweyne: "Hiraan",
  Baidoa: "Bay",
  Hudur: "Bakool",
  Jowhar: "Hirshabelle",
  Dhusamareeb: "Galmudug",
};

/**
 * Dropdown: optgroups by region. Values are `city` or `region:RegionName` for whole region.
 */
export const LOCATION_FILTER_GROUPS: {
  region: string;
  options: { value: string; label: string }[];
}[] = [
  {
    region: "Banaadir",
    options: [{ value: "Mogadishu", label: "Mogadishu" }],
  },
  {
    region: "Woqooyi Galbeed",
    options: [{ value: "Hargeisa", label: "Hargeisa" }],
  },
  {
    region: "Bari",
    options: [{ value: "Bosaso", label: "Bosaso" }],
  },
  {
    region: "Jubbaland",
    options: [{ value: "Kismayo", label: "Kismayo" }],
  },
  {
    region: "Nugaal",
    options: [{ value: "Garowe", label: "Garowe" }],
  },
  {
    region: "Hiraan",
    options: [{ value: "Beledweyne", label: "Beledweyne" }],
  },
  {
    region: "Bay",
    options: [{ value: "Baidoa", label: "Baidoa" }],
  },
  {
    region: "Bakool",
    options: [{ value: "Hudur", label: "Hudur" }],
  },
  {
    region: "Hirshabelle",
    options: [{ value: "Jowhar", label: "Jowhar" }],
  },
  {
    region: "Galmudug",
    options: [{ value: "Dhusamareeb", label: "Dhusamareeb" }],
  },
];

/** Flat list for backwards compatibility (filters using city value) */
export const LOCATION_OPTIONS: { value: string; label: string; region: string }[] =
  [
    { value: "all", label: "All locations", region: "Somalia" },
    ...LOCATION_FILTER_GROUPS.flatMap((g) =>
      g.options.map((o) => ({
        value: o.value,
        label: o.label,
        region: g.region,
      }))
    ),
  ];

export function matchesProductLocation(
  productLocation: string,
  filterKey: string
): boolean {
  if (filterKey === "all") return true;
  if (filterKey.startsWith("region:")) {
    const region = filterKey.slice(7);
    return CITY_TO_REGION[productLocation] === region;
  }
  return productLocation === filterKey;
}

export function matchesStoreLocation(
  store: { city: string; region: string },
  filterKey: string
): boolean {
  if (filterKey === "all") return true;
  if (filterKey.startsWith("region:")) {
    return store.region === filterKey.slice(7);
  }
  return store.city === filterKey;
}

export type SortOption = "latest" | "popular" | "price-asc" | "price-desc";

/** One–two lines for product cards when `description` is not set on the product */
export function getProductCardDescription(product: Product): string {
  const d = product.description?.trim();
  if (d) return d;
  return `Trusted ${product.category.toLowerCase()} from ${product.vendor}. Fast local pickup or delivery.`;
}

/** Split full description into paragraphs for the product detail page */
export function splitProductDescription(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const byBlank = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  const lines = t.split("\n").map((p) => p.trim()).filter(Boolean);
  return lines.length ? lines : [t];
}

export function filterAndSortProducts(
  products: Product[],
  opts: {
    category: CategorySlugFilter;
    location: string;
    priceMin: number;
    priceMax: number;
    sort: SortOption;
    query?: string;
  }
): Product[] {
  let list = [...products];

  if (opts.category !== "All") {
    list = list.filter(
      (p) => (p.categorySlug ?? slugifyCategory(p.category)) === opts.category
    );
  }

  if (opts.location !== "all") {
    list = list.filter((p) =>
      matchesProductLocation(p.location, opts.location)
    );
  }

  list = list.filter(
    (p) => p.price >= opts.priceMin && p.price <= opts.priceMax
  );

  if (opts.query?.trim()) {
    const q = opts.query.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
    );
  }

  switch (opts.sort) {
    case "latest":
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case "popular":
      list.sort((a, b) => b.popularityScore - a.popularityScore);
      break;
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    default:
      break;
  }

  return list;
}
