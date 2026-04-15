import { MarketingShell } from "@/components/marketing-shell";
import { CartPageClient } from "./cart-page-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cart",
};

export default function CartPage() {
  return (
    <MarketingShell>
      <CartPageClient />
    </MarketingShell>
  );
}
