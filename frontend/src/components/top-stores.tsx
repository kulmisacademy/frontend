import { getTranslations } from "next-intl/server";
import { PageContainer, Section } from "@/components/ui/section";
import { StoreCard } from "@/components/store-card";
import { fetchCatalogStores } from "@/lib/catalog-api";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

export async function TopStores() {
  const t = await getTranslations("catalog");
  const stores = await fetchCatalogStores();
  const top = [...stores]
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 6);

  return (
    <Section className="border-b border-border/60 bg-muted/15">
      <PageContainer>
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
              {t("topStoresTitle")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("topStoresSubtitle")}
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {t("topStoresCta")}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {top.length === 0 ? (
          <p className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            {t("topStoresEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {top.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </PageContainer>
    </Section>
  );
}
