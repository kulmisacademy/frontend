import { FeaturedProducts } from "@/components/featured-products";
import { Hero } from "@/components/hero";
import { MarketingShell } from "@/components/marketing-shell";
import { TopStores } from "@/components/top-stores";

/** Live catalog data; avoid static generation hanging when the API URL is unset or slow during CI. */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <MarketingShell>
      <Hero />
      <TopStores />
      <FeaturedProducts />
    </MarketingShell>
  );
}
