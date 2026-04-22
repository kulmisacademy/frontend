import { MarketingShell } from "@/components/marketing-shell";
import { OrdersClient } from "./orders-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My orders",
};

export default function OrdersPage() {
  return (
    <MarketingShell>
      <OrdersClient />
    </MarketingShell>
  );
}
