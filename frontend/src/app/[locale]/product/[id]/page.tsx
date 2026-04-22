import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, MapPin, Store } from "lucide-react";
import { fetchCatalogProductById } from "@/lib/catalog-api";
import {
  getProductCardDescription,
  splitProductDescription,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { MarketingShell } from "@/components/marketing-shell";
import { ProductDetailActions } from "@/components/product-detail-actions";
import { ProductGallery } from "@/components/product-gallery";
import { ProductVideo } from "@/components/product-video";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchCatalogProductById(id);
  if (!p) return { title: "Product" };
  const desc =
    p.description?.trim().slice(0, 155) ||
    `${p.name} — ${formatPrice(p.price)} at ${p.vendor}`;
  return {
    title: p.name,
    description: desc,
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await fetchCatalogProductById(id);
  if (!product) notFound();

  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];

  const descriptionParagraphs = product.description?.trim()
    ? splitProductDescription(product.description)
    : [getProductCardDescription(product)];

  const features = product.features?.filter(Boolean) ?? [];

  return (
    <MarketingShell>
      <PageContainer className={MARKETING_PAGE_PY}>
        <div className="mb-8 md:mb-10">
          <Button
            variant="ghost"
            className="-ml-3 h-10 gap-2 rounded-xl px-3 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/marketplace">
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              Back
            </Link>
          </Button>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12 xl:gap-16">
          <div className="relative lg:sticky lg:top-28">
            <div className="relative">
              {product.popular ? (
                <div className="absolute left-4 top-4 z-10 sm:left-5 sm:top-5">
                  <Badge variant="gold" className="shadow-md">
                    Popular
                  </Badge>
                </div>
              ) : null}
              <ProductGallery images={galleryImages} alt={product.name} />
              {product.videoUrl ? (
                <div className="mt-8 space-y-2">
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Video
                  </h2>
                  <ProductVideo url={product.videoUrl} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-8 lg:max-w-xl lg:justify-center xl:max-w-2xl">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {product.category}
              </p>
              <h1 className="font-heading text-3xl font-bold leading-[1.15] tracking-tight text-balance sm:text-4xl lg:text-[2.35rem] xl:text-5xl">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-end gap-3 border-b border-border/60 pb-6">
                <span className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                  {formatPrice(product.price)}
                </span>
                {product.oldPrice != null ? (
                  <span className="mb-1.5 text-xl font-medium text-muted-foreground line-through">
                    {formatPrice(product.oldPrice)}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5 text-sm">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${product.inStock ? "bg-primary shadow-[0_0_10px_rgba(34,197,94,0.55)]" : "bg-muted-foreground"}`}
                  aria-hidden
                />
                <span className="font-medium text-foreground">
                  {product.inStock
                    ? "In stock"
                    : "Currently unavailable"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-base sm:gap-3">
                <Link
                  href={`/store/${product.storeSlug}`}
                  className="group flex min-w-0 items-start gap-2 rounded-xl border border-border/70 bg-muted/20 px-2.5 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/40 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3.5"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10 sm:rounded-xl">
                    <Store className="size-4 sm:size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                      Store
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary sm:text-base">
                      {product.vendor}
                    </span>
                  </span>
                </Link>

                <div className="flex min-w-0 items-start gap-2 rounded-xl border border-border/70 bg-muted/15 px-2.5 py-2.5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3.5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:size-10 sm:rounded-xl">
                    <MapPin className="size-4 sm:size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                      Location
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-sm font-medium leading-snug text-foreground sm:text-base">
                      {product.location}
                    </span>
                  </span>
                </div>

                <ProductDetailActions product={product} />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Add to your cart to coordinate pickup, or message the vendor on
                WhatsApp—your product link is included in the chat.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-8 lg:mt-16">
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold tracking-tight md:text-xl">
              Description
            </h2>
            <div className="rounded-xl border border-border/60 bg-[#f9fafb] p-4 dark:border-border/50 dark:bg-muted/25 md:p-4">
              <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
                {descriptionParagraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </section>

          {features.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-heading text-lg font-semibold tracking-tight md:text-xl">
                Features
              </h2>
              <ul className="space-y-2.5 rounded-xl border border-border/60 bg-[#f9fafb] p-4 dark:border-border/50 dark:bg-muted/25 md:p-4">
                {features.map((f) => (
                  <li
                    key={f}
                    className="flex gap-3 text-[15px] leading-snug text-foreground/90"
                  >
                    <Check
                      className="mt-0.5 size-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </PageContainer>
    </MarketingShell>
  );
}
