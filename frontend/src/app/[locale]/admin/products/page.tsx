"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { adminFetch } from "@/lib/admin-api-client";
import { formatPrice } from "@/lib/format";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  images: string[];
  in_stock: boolean;
  store_id: string;
  store_name: string | null;
  store_slug: string | null;
};

export default function AdminProductsPage() {
  const { user, loading } = useAdminSession();
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await adminFetch<{ products: ProductRow[] }>("/products");
      setProducts(data.products);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-8">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight break-words sm:text-3xl">
          All products
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty break-words">
          Catalog across every store — open the vendor storefront to see live
          listings.
        </p>
      </div>

      {err ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      {busy && products.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-10" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No products in the database.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const img = p.images?.[0] ?? "/placeholder-product.svg";
            const storeHref = p.store_slug
              ? `/store/${p.store_slug}`
              : null;
            return (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
              >
                <div className="relative h-[200px] w-full bg-muted">
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 280px"
                  />
                  <span
                    className={
                      p.in_stock
                        ? "absolute right-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-xs font-semibold text-primary-foreground"
                        : "absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {p.in_stock ? "In stock" : "Out of stock"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="line-clamp-2 font-heading font-semibold leading-snug">
                    {p.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.category}
                    {p.store_name ? ` · ${p.store_name}` : ""}
                  </p>
                  <p className="mt-3 font-heading text-xl font-bold">
                    {formatPrice(Number(p.price))}
                  </p>
                  {storeHref ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 rounded-xl"
                      asChild
                    >
                      <Link
                        href={storeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1 size-3.5" />
                        View store
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
