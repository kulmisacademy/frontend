import { MarketingShell } from "@/components/marketing-shell";
import { RegisterVendorClient } from "./register-vendor-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register as vendor",
};

export default function RegisterVendorPage() {
  return (
    <MarketingShell>
      <RegisterVendorClient />
    </MarketingShell>
  );
}
