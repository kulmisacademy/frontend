"use client";

import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  BadgeCheck,
  Heart,
  MapPin,
  MessageCircle,
  ShoppingCart,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getProductCardDescription, type Product } from "@/lib/catalog";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { formatPrice } from "@/lib/format";
import { productAbsoluteUrl, productPath } from "@/lib/urls";
import { openWhatsAppProductOrder } from "@/lib/whatsapp-order";
import { ProductImageLightbox } from "@/components/product-image-lightbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: Product;
  /** LCP: prioritize hero grid images above the fold */
  imagePriority?: boolean;
};

export function ProductCard({ product, imagePriority }: ProductCardProps) {
  const t = useTranslations("product");
  const tCart = useTranslations("cart");
  const locale = useLocale();
  const { addItem } = useCart();
  const { user, token } = useAuth();
  const [favorite, setFavorite] = React.useState(false);
  const [waBusy, setWaBusy] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const absUrl = productAbsoluteUrl(product.id, locale);
  const verified = product.vendorVerified === true;

  const galleryImages = React.useMemo(() => {
    const raw =
      product.images && product.images.length > 0
        ? product.images
        : [product.image];
    return [...new Set(raw.filter(Boolean))];
  }, [product.images, product.image]);

  async function handleWhatsApp(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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
  const blurb = getProductCardDescription(product);

  return (
    <article
      className={cn(
        "group/card relative flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-white p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:border-border/80 dark:bg-card",
        "transition-shadow duration-300 ease-out hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.22)]"
      )}
    >
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLightboxOpen(true);
          }}
          className={cn(
            "relative h-[180px] w-full cursor-zoom-in overflow-hidden rounded-xl bg-muted outline-none",
            "ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary/50"
          )}
          aria-label={t("viewFullscreen", { name: product.name })}
        >
          <Image
            src={product.image}
            alt=""
            fill
            priority={imagePriority}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 280px"
            className="object-cover object-center"
          />
        </button>

        <ProductImageLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={galleryImages}
          initialIndex={0}
          productName={product.name}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-1 p-1 sm:p-1.5">
          <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow-sm ring-1 ring-black/5 sm:gap-1 sm:px-2 sm:text-[10px]",
                product.inStock
                  ? "bg-white/95 text-emerald-800 backdrop-blur-sm"
                  : "bg-white/95 text-muted-foreground backdrop-blur-sm"
              )}
            >
              <span
                className={cn(
                  "size-1 shrink-0 rounded-full sm:size-1.5",
                  product.inStock ? "bg-primary" : "bg-muted-foreground"
                )}
                aria-hidden
              />
              <span className="truncate">
                {product.inStock ? t("inStock") : t("outShort")}
              </span>
            </span>
            {product.popular ? (
              <span className="rounded-full bg-amber-400/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 shadow-sm ring-1 ring-black/5 sm:px-2 sm:text-[10px]">
                {t("popular")}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            aria-label={favorite ? t("favRemove") : t("favAdd")}
            aria-pressed={favorite}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFavorite((v) => !v);
            }}
            className={cn(
              "pointer-events-auto flex size-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/95 shadow-md backdrop-blur-sm transition-colors sm:size-7",
              "hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
          >
            <Heart
              className={cn(
                "size-3.5 transition-colors sm:size-4",
                favorite
                  ? "fill-red-500 text-red-500"
                  : "text-foreground/70"
              )}
            />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 px-0 pb-0 pt-2 sm:gap-1.5 sm:pt-2.5">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <Link
            href={productPath(product.id)}
            className="font-heading min-w-0 flex-1 text-[12px] font-medium leading-snug tracking-tight text-foreground transition-colors hover:text-primary sm:text-[13px]"
          >
            <span className="line-clamp-2 leading-snug">{product.name}</span>
          </Link>
          <div className="shrink-0 text-right">
            <p className="font-heading text-xs font-bold tabular-nums text-foreground sm:text-sm">
              {formatPrice(product.price)}
            </p>
            {product.oldPrice != null ? (
              <p className="text-[9px] text-muted-foreground line-through tabular-nums sm:text-[10px]">
                {formatPrice(product.oldPrice)}
              </p>
            ) : null}
          </div>
        </div>

        <p className="line-clamp-1 text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
          {blurb}
        </p>

        <div className="space-y-0 border-t border-border/50 pt-1 sm:pt-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0 text-[10px] sm:gap-x-1 sm:text-[11px]">
            <Link
              href={`/store/${product.storeSlug}`}
              className="truncate font-medium text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
            >
              {product.vendor}
            </Link>
            {verified ? (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 text-primary"
                title={t("verifiedStore")}
              >
                <BadgeCheck
                  className="size-3 shrink-0 sm:size-3.5"
                  aria-hidden
                  strokeWidth={2.5}
                />
                <span className="hidden font-semibold uppercase tracking-wide sm:inline sm:text-[10px]">
                  {t("verified")}
                </span>
              </span>
            ) : null}
          </div>
          <p className="flex items-center gap-0.5 text-[9px] text-muted-foreground sm:text-[10px]">
            <MapPin
              className="size-2.5 shrink-0 text-primary/70 sm:size-3"
              aria-hidden
            />
            <span className="truncate">{product.location}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 pt-0.5 sm:gap-1.5">
          <Button
            type="button"
            disabled={!product.inStock}
            onClick={() => {
              const r = addItem(product, 1);
              if (!r.ok && r.error === "STORE_MISMATCH") {
                window.alert(tCart("singleStoreError"));
              }
            }}
            className={cn(
              "h-7 min-w-0 rounded-lg border-0 px-1 text-[9px] font-semibold leading-none shadow-sm sm:h-8 sm:rounded-xl sm:px-1.5 sm:text-[11px]",
              "gap-0.5 [&_svg]:size-3 sm:[&_svg]:size-3.5",
              "bg-[#facc15] text-[#422006] hover:bg-[#eab308] hover:text-[#422006]",
              "focus-visible:ring-[#facc15]/50"
            )}
          >
            <ShoppingCart aria-hidden className="shrink-0" />
            <span className="min-w-0 truncate sm:hidden">{t("cartShort")}</span>
            <span className="hidden min-w-0 truncate sm:inline">{t("addToCart")}</span>
          </Button>
          <Button
            type="button"
            title={t("whatsappTitle")}
            disabled={!product.inStock || waBusy}
            onClick={(e) => void handleWhatsApp(e)}
            className={cn(
              "h-7 min-w-0 rounded-lg border-0 px-1 text-[9px] font-bold leading-tight shadow-sm sm:h-8 sm:rounded-xl sm:px-1.5 sm:text-[11px] sm:leading-none",
              "gap-0.5 [&_svg]:size-3 sm:[&_svg]:size-3.5",
              "bg-[#16a34a] text-white hover:bg-[#15803d] hover:text-white",
              "focus-visible:ring-[#16a34a]/50"
            )}
          >
            <MessageCircle
              aria-hidden
              className="shrink-0 text-white"
              strokeWidth={2}
            />
            <span className="min-w-0 truncate text-center leading-tight">
              {waBusy ? "…" : t("whatsapp")}
            </span>
          </Button>
        </div>
      </div>
    </article>
  );
}
