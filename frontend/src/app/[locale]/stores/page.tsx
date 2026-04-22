import { MarketingShell } from "@/components/marketing-shell";
import { StoresClient } from "./stores-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stores",
  description: "Browse all LAAS24 vendor storefronts.",
};

export default function StoresPage() {
  return (
    <MarketingShell>
      <StoresClient />
    </MarketingShell>
  );
}
