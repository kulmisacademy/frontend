import { getApiBaseUrl, SERVER_FETCH_TIMEOUT_MS } from "@/lib/api";
import type { Product, Store } from "@/lib/catalog";

type CatalogProductsRes = { products: Product[] };
type CatalogProductsPageRes = {
  products: Product[];
  page: number;
  limit: number;
  total: number;
};
export type CatalogProductsPage = CatalogProductsPageRes;
type CatalogStoresRes = { stores: Store[] };
type CatalogProductRes = { product: Product };

export type FetchCatalogPageParams = {
  page: number;
  limit: number;
  category?: string;
  location?: string;
  sort?: string;
  priceMin?: number;
  priceMax?: number;
  q?: string;
  inStockOnly?: boolean;
  signal?: AbortSignal;
};

/** Browser calls same-origin Next routes; server/RSC use the configured API URL. */
function clientCatalogBase(): string {
  return typeof window !== "undefined" ? "" : getApiBaseUrl();
}

async function readClientJson<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) throw new Error("Empty response");
  return JSON.parse(text) as T;
}

function serverFetchInit(revalidateSeconds: number): RequestInit {
  return {
    next: { revalidate: revalidateSeconds },
    signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
  };
}

export async function fetchCatalogProducts(opts?: {
  page?: number;
  limit?: number;
}): Promise<Product[]> {
  const page = opts?.page ?? 1;
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 100));
  const sp = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/catalog/products?${sp.toString()}`,
      serverFetchInit(30)
    );
    if (!res.ok) return [];
    const data = await parseJson<CatalogProductsPageRes>(res);
    return data.products ?? [];
  } catch {
    return [];
  }
}

export async function fetchCatalogStores(): Promise<Store[]> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/catalog/stores`,
      serverFetchInit(30)
    );
    if (!res.ok) return [];
    const data = await parseJson<CatalogStoresRes>(res);
    return data.stores ?? [];
  } catch {
    return [];
  }
}

export async function fetchCatalogProductById(
  id: string
): Promise<Product | null> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/catalog/products/${encodeURIComponent(id)}`,
      serverFetchInit(30)
    );
    if (!res.ok) return null;
    const data = await parseJson<CatalogProductRes>(res);
    return data.product ?? null;
  } catch {
    return null;
  }
}

/** Client-side catalog fetch (no Next cache); first page, up to 100 rows. */
export async function fetchCatalogProductsClient(): Promise<Product[]> {
  const r = await fetchCatalogProductsPageClient({ page: 1, limit: 100 });
  return r.products;
}

export async function fetchCatalogProductsPageClient(
  params: FetchCatalogPageParams
): Promise<CatalogProductsPage> {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(Math.min(100, Math.max(1, params.limit))));
  if (params.category && params.category !== "All") {
    sp.set("category", params.category);
  }
  if (params.location) sp.set("location", params.location);
  if (params.sort) sp.set("sort", params.sort);
  if (typeof params.priceMin === "number") {
    sp.set("priceMin", String(params.priceMin));
  }
  if (typeof params.priceMax === "number") {
    sp.set("priceMax", String(params.priceMax));
  }
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.inStockOnly) sp.set("inStockOnly", "true");
  try {
    const res = await fetch(
      `${clientCatalogBase()}/api/catalog/products?${sp.toString()}`,
      { signal: params.signal }
    );
    if (!res.ok) {
      return {
        products: [],
        page: params.page,
        limit: params.limit,
        total: 0,
      };
    }
    const data = await readClientJson<CatalogProductsPageRes>(res);
    return {
      products: data?.products ?? [],
      page: data?.page ?? params.page,
      limit: data?.limit ?? params.limit,
      total: data?.total ?? 0,
    };
  } catch (e) {
    if (
      e instanceof Error &&
      (e.name === "AbortError" || e.name === "TimeoutError")
    ) {
      throw e;
    }
    return {
      products: [],
      page: params.page,
      limit: params.limit,
      total: 0,
    };
  }
}

export async function fetchCatalogStoresClient(): Promise<Store[]> {
  try {
    const res = await fetch(`${clientCatalogBase()}/api/catalog/stores`);
    if (!res.ok) return [];
    const data = await readClientJson<CatalogStoresRes>(res);
    return data?.stores ?? [];
  } catch {
    return [];
  }
}

export async function fetchProductsBatchClient(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  try {
    const res = await fetch(`${clientCatalogBase()}/api/catalog/products/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) return [];
    const data = await readClientJson<CatalogProductsRes>(res);
    return data?.products ?? [];
  } catch {
    return [];
  }
}

export async function fetchCatalogProductByIdClient(
  id: string
): Promise<Product | null> {
  try {
    const res = await fetch(
      `${clientCatalogBase()}/api/catalog/products/${encodeURIComponent(id)}`
    );
    if (!res.ok) return null;
    const data = await readClientJson<CatalogProductRes>(res);
    return data?.product ?? null;
  } catch {
    return null;
  }
}

export async function fetchFeaturedProducts(limit = 8): Promise<Product[]> {
  try {
    const cap = Math.min(50, Math.max(limit, 8));
    const sp = new URLSearchParams({
      page: "1",
      limit: String(cap),
      sort: "latest",
      inStockOnly: "true",
    });
    const res = await fetch(
      `${getApiBaseUrl()}/api/catalog/products?${sp.toString()}`,
      serverFetchInit(60)
    );
    if (!res.ok) return [];
    const data = await parseJson<CatalogProductsPageRes>(res);
    const list = data.products ?? [];
    return list.slice(0, limit);
  } catch {
    return [];
  }
}
