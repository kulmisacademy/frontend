"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { productAbsoluteUrl } from "@/lib/urls";
import { openWhatsAppProductOrder } from "@/lib/whatsapp-order";
import { Button } from "@/components/ui/button";

export function ProductDetailActions({ product }: { product: Product }) {
  const t = useTranslations("product");
  const tCart = useTranslations("cart");
  const locale = useLocale();
  const { addItem } = useCart();
  const { user, token } = useAuth();
  const [waBusy, setWaBusy] = React.useState(false);
  const absUrl = productAbsoluteUrl(product.id, locale);

  async function handleWhatsApp() {
    if (!product.inStock || waBusy) return;
    setWaBusy(true);
    try {
      const r = await openWhatsAppProductOrder({
        storeId: product.storeId,
        storeSlug: product.storeSlug,
        productId: product.id,
        whatsapp: product.whatsapp,
        productName: product.name,
        productUrl: absUrl,
        priceNumber: product.price,
        token: user?.role === "customer" ? token : null,
      });
      if (!r.ok && r.error) {
        window.alert(r.error);
      }
    } finally {
      setWaBusy(false);
    }
  }

  return (
    <div className="contents">
      <Button
        size="lg"
        className="h-auto min-h-12 w-full min-w-0 rounded-xl px-2 py-2.5 text-sm font-semibold shadow-sm sm:min-h-14 sm:rounded-2xl sm:px-4 sm:text-base"
        disabled={!product.inStock}
        onClick={() => {
          const r = addItem(product, 1);
          if (!r.ok && r.error === "STORE_MISMATCH") {
            window.alert(tCart("singleStoreError"));
          }
        }}
      >
        <ShoppingCart className="size-4 shrink-0 sm:size-5" />
        <span className="line-clamp-2 text-balance leading-snug">{t("addToCart")}</span>
      </Button>
      <Button
        size="lg"
        variant="secondary"
        className="h-auto min-h-12 w-full min-w-0 rounded-xl px-2 py-2.5 text-sm font-semibold shadow-sm sm:min-h-14 sm:rounded-2xl sm:px-4 sm:text-base"
        disabled={!product.inStock || waBusy}
        type="button"
        onClick={() => void handleWhatsApp()}
      >
        <MessageCircle className="size-4 shrink-0 sm:size-5" />
        <span className="line-clamp-2 text-balance leading-snug">
          {waBusy ? t("opening") : t("whatsappOrder")}
        </span>
      </Button>
    </div>
  );
}
