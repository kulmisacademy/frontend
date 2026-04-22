import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing-shell";
import { MarketplaceClient } from "@/components/marketplace-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketplace");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function MarketplacePage() {
  return (
    <MarketingShell>
      <MarketplaceClient />
    </MarketingShell>
  );
}
