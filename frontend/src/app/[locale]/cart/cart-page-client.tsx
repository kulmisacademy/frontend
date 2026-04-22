"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/cart-context";
import type { Product } from "@/lib/catalog";
import { fetchProductsBatchClient } from "@/lib/catalog-api";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { openWhatsAppCartOrder } from "@/lib/whatsapp-cart";
import { productPath } from "@/lib/urls";

export function CartPageClient() {
  const t = useTranslations("cart");
  const { user, token } = useAuth();
  const { lines, setQuantity, removeItem, clear } = useCart();
  const [byId, setById] = React.useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [waBusy, setWaBusy] = React.useState(false);

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

  const unresolved =
    !loading && lines.length > 0 && items.length < lines.length;

  const storeIds = React.useMemo(
    () => [...new Set(items.map(({ product }) => product.storeId))],
    [items]
  );
  const multiStore = storeIds.length > 1;

  async function handleWhatsAppCheckout() {
    if (unresolved || multiStore || items.length === 0 || waBusy) return;
    const first = items[0]!.product;
    setWaBusy(true);
    try {
      const r = await openWhatsAppCartOrder({
        storeId: first.storeId,
        storeSlug: first.storeSlug,
        whatsapp: first.whatsapp,
        lines: items.map(({ line, product }) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: line.quantity,
        })),
        token: user?.role === "customer" ? token : null,
      });
      if (r.ok) {
        clear();
      } else {
        window.alert(r.error);
      }
    } finally {
      setWaBusy(false);
    }
  }

  return (
    <PageContainer className={MARKETING_PAGE_PY}>
      <h1 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

      {lines.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          <Button className="mt-6 rounded-2xl" asChild>
            <Link href="/marketplace">{t("continueShopping")}</Link>
          </Button>
        </div>
      ) : loading ? (
        <div className="mt-16 flex justify-center py-12">
          <Spinner className="size-10" />
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:items-start">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            {unresolved ? (
              <p className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                {t("unavailable")}
              </p>
            ) : null}
            {multiStore ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {t("singleStoreError")} {t("multiStoreHint")}
              </p>
            ) : null}
            {lines
              .filter((line) => !byId.has(line.productId))
              .map((line) => (
                <div
                  key={line.productId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {t("productUnavailable", {
                      id: line.productId.slice(0, 8),
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => removeItem(line.productId)}
                  >
                    {t("remove")}
                  </Button>
                </div>
              ))}
            {items.map(({ line, product }) => (
              <div
                key={line.productId}
                className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-start"
              >
                <Link
                  href={productPath(product.id)}
                  className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-[#f9fafb] dark:bg-muted/35 sm:size-28"
                >
                  <Image
                    src={product.image}
                    alt=""
                    fill
                    className="object-cover object-center"
                    sizes="112px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={productPath(product.id)}
                    className="font-heading font-semibold hover:text-primary hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{product.vendor}</p>
                  <p className="mt-2 font-heading text-lg font-bold">
                    {formatPrice(product.price)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-xl border border-border bg-muted/40">
                      <button
                        type="button"
                        className="px-3 py-2 hover:bg-muted"
                        onClick={() =>
                          setQuantity(line.productId, line.quantity - 1)
                        }
                        aria-label={t("decreaseQty")}
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="min-w-8 text-center text-sm tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-2 hover:bg-muted"
                        onClick={() =>
                          setQuantity(line.productId, line.quantity + 1)
                        }
                        aria-label={t("increaseQty")}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeItem(line.productId)}
                    >
                      <Trash2 className="size-4" />
                      {t("remove")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => clear()}>
              {t("clearCart")}
            </Button>
          </div>

          <div className="h-fit rounded-2xl border border-border/80 bg-muted/20 p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="font-heading text-lg font-semibold">
              {t("orderSummary")}
            </h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{t("shipping")}</span>
              <span className="text-muted-foreground">{t("shippingNote")}</span>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex justify-between font-heading text-xl font-bold">
                <span>{t("total")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>
            <Button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16a34a] text-white hover:bg-[#15803d] hover:text-white"
              size="lg"
              disabled={
                waBusy || unresolved || multiStore || items.length === 0
              }
              onClick={() => void handleWhatsAppCheckout()}
            >
              {waBusy ? (
                <Spinner className="size-4 text-white" />
              ) : (
                <MessageCircle className="size-5 shrink-0" aria-hidden />
              )}
              {waBusy ? t("opening") : t("checkoutWhatsApp")}
            </Button>
            <Button variant="outline" className="mt-3 w-full rounded-2xl" asChild>
              <Link href="/marketplace">{t("keepShopping")}</Link>
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
