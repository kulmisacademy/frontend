import { MarketingShell } from "@/components/marketing-shell";
import { FollowedStoresClient } from "./followed-stores-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Followed stores",
};

export default function FollowedStoresPage() {
  return (
    <MarketingShell>
      <FollowedStoresClient />
    </MarketingShell>
  );
}
