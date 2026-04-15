import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { MarketplaceClient } from "@/components/marketplace-client";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Browse products from verified Somali vendors. Filter by category, region, and price.",
};

export default function MarketplacePage() {
  return (
    <MarketingShell>
      <MarketplaceClient />
    </MarketingShell>
  );
}
