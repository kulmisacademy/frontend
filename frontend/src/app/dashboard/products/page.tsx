"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  images: string[];
  in_stock: boolean;
};

export default function DashboardProductsPage() {
  const router = useRouter();
  const { user, loading, token } = useAuth();
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await apiFetch<{ products: ProductRow[] }>(
        "/api/vendor/products",
        { token }
      );
      setProducts(data.products);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/products");
  }, [loading, user, router]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!token || !confirm("Delete this product?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/vendor/products/${id}`, { method: "DELETE", token });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your catalog — grid view with quick actions.
          </p>
        </div>
        <Button className="rounded-2xl shadow-md" size="lg" asChild>
          <Link href="/dashboard/products/new">
            <Plus className="mr-2 size-4" />
            Add product
          </Link>
        </Button>
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
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No products yet.</p>
          <Button className="mt-6 rounded-2xl" asChild>
            <Link href="/dashboard/products/new">Add your first product</Link>
          </Button>
        </div>
      ) : (
        <div
          className="grid gap-4 sm:gap-5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          }}
        >
          {products.map((p) => {
            const img = p.images?.[0] ?? "/placeholder-product.svg";
            return (
              <div
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md"
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
                  </p>
                  <p className="mt-3 font-heading text-xl font-bold">
                    {formatPrice(Number(p.price))}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl"
                      asChild
                    >
                      <Link href={`/dashboard/products/${p.id}/edit`}>
                        <Pencil className="mr-1 size-3.5" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-destructive hover:text-destructive"
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(p.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
