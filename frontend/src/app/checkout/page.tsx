import { MarketingShell } from "@/components/marketing-shell";
import { CheckoutClient } from "./checkout-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <MarketingShell>
      <CheckoutClient />
    </MarketingShell>
  );
}
