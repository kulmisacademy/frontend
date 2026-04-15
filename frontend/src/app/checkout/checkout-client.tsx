"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CART_SINGLE_STORE_ERROR, useCart } from "@/context/cart-context";
import type { Product } from "@/lib/catalog";
import { getApiBaseUrl } from "@/lib/api";
import { fetchProductsBatchClient } from "@/lib/catalog-api";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

export function CheckoutClient() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { lines, clear } = useCart();
  const [byId, setById] = React.useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setName((prev) => prev || user.name || "");
    setPhone((prev) => prev || user.phone || "");
  }, [user]);

  React.useEffect(() => {
    const ids = [...new Set(lines.map((l) => l.productId))];
    if (ids.length === 0) {
      setById(new Map());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchProductsBatchClient(ids).then((products) => {
      if (cancelled) return;
      setById(new Map(products.map((p) => [p.id, p])));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lines]);

  const items = lines
    .map((line) => {
      const product = byId.get(line.productId);
      if (!product) return null;
      return { line, product };
    })
    .filter(Boolean) as {
      line: { productId: string; quantity: number };
      product: Product;
    }[];

  const subtotal = items.reduce(
    (acc, { line, product }) => acc + product.price * line.quantity,
    0
  );
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!name.trim() || !phone.trim()) return;
    const storeIds = new Set(items.map(({ product }) => product.storeId));
    if (storeIds.size > 1) {
      setSubmitError(CART_SINGLE_STORE_ERROR);
      return;
    }
    setSubmitting(true);
    try {
      const bySlug = new Map<
        string,
        { rows: typeof items; subtotal: number }
      >();
      for (const row of items) {
        const slug = row.product.storeSlug;
        if (!bySlug.has(slug)) {
          bySlug.set(slug, { rows: [], subtotal: 0 });
        }
        const g = bySlug.get(slug)!;
        g.rows.push(row);
        g.subtotal += row.product.price * row.line.quantity;
      }

      const failures: string[] = [];
      for (const [slug, g] of bySlug) {
        const items_summary = g.rows
          .map(
            ({ line, product }) => `${product.name} × ${line.quantity}`
          )
          .join("; ");
        const note = address.trim();
        const message =
          note.length > 0 ? `Delivery / notes: ${note}` : undefined;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(
          `${getApiBaseUrl()}/api/stores/public/${encodeURIComponent(slug)}/orders`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              customer_name: name.trim(),
              customer_phone: phone.trim(),
              message,
              items_summary,
              total: g.subtotal,
            }),
          }
        );
        if (!res.ok) {
          let errText = res.statusText;
          try {
            const j = (await res.json()) as { error?: unknown };
            if (typeof j.error === "string") errText = j.error;
          } catch {
            /* ignore */
          }
          failures.push(`${slug}: ${errText}`);
        }
      }

      if (failures.length > 0) {
        setSubmitError(failures.join(" · "));
        return;
      }

      clear();
      setDone(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0 && !done) {
    return (
      <PageContainer className={cn(MARKETING_PAGE_PY, "text-center")}>
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button className="mt-6 rounded-2xl" asChild>
          <Link href="/cart">Back to cart</Link>
        </Button>
      </PageContainer>
    );
  }

  if (done) {
    return (
      <PageContainer className={cn(MARKETING_PAGE_PY, "text-center")}>
        <h1 className="font-heading text-3xl font-bold text-primary">
          Order placed
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Thanks, {name}. Your order request was sent to the vendor(s). They may
          contact you on WhatsApp. If you used the same phone as on your LAAS24
          account, you can track requests under{" "}
          <Link
            href="/account/orders"
            className="font-medium text-foreground underline"
          >
            My orders
          </Link>
          .
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button className="rounded-2xl" asChild>
            <Link href="/account/orders">My orders</Link>
          </Button>
          <Button variant="outline" className="rounded-2xl" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer
        className={cn(MARKETING_PAGE_PY, "flex justify-center")}
      >
        <Spinner className="size-10" />
      </PageContainer>
    );
  }

  if (items.length === 0) {
    return (
      <PageContainer className={cn(MARKETING_PAGE_PY, "text-center")}>
        <p className="text-muted-foreground">
          Cart items are no longer available. Add products from the marketplace
          again.
        </p>
        <Button className="mt-6 rounded-2xl" asChild>
          <Link href="/marketplace">Browse marketplace</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={MARKETING_PAGE_PY}>
      <h1 className="font-heading text-3xl font-bold">Checkout</h1>
      <p className="mt-2 text-muted-foreground">
        Enter your details to place your order request.
      </p>

      {submitError ? (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-start"
      >
        <div className="min-w-0 space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">Full name</span>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl"
              placeholder="Amina Hassan"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Phone (WhatsApp)</span>
            <Input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 rounded-2xl"
              placeholder="+252 61 234 5678"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Delivery area / notes</span>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-12 rounded-2xl"
              placeholder="District, landmarks…"
            />
          </label>
        </div>

        <div className="h-fit rounded-2xl border border-border/80 bg-muted/20 p-6 lg:sticky lg:top-24">
          <h2 className="font-heading text-lg font-semibold">Summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map(({ line, product }) => (
              <li key={line.productId} className="flex justify-between gap-4">
                <span className="line-clamp-1">
                  {product.name} × {line.quantity}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatPrice(product.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-heading text-xl font-bold">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <Button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl"
            size="lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner className="size-4" />
                Sending…
              </>
            ) : (
              "Place order request"
            )}
          </Button>
          <Button variant="ghost" className="mt-2 w-full" asChild>
            <Link href="/cart">Back to cart</Link>
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
