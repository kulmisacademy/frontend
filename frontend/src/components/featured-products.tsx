import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { fetchFeaturedProducts } from "@/lib/catalog-api";
import { ProductCard } from "@/components/product-card";
import {
  MARKETING_PAGE_PY,
  PageContainer,
  Section,
} from "@/components/ui/section";
import { cn } from "@/lib/utils";

export async function FeaturedProducts() {
  const t = await getTranslations("catalog");
  const products = await fetchFeaturedProducts(8);

  return (
    <Section bleed className="border-b border-border/60 bg-muted/10">
      <PageContainer
        className={cn("space-y-8 md:space-y-10", MARKETING_PAGE_PY)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
              {t("featuredTitle")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("featuredSubtitle")}
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {t("featuredCta")}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            {t("featuredEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                imagePriority={i < 4}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </Section>
  );
}
