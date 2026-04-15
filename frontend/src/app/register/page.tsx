import { redirect } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { RegisterClient } from "./register-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (type === "vendor") {
    redirect("/register-vendor");
  }

  return (
    <MarketingShell>
      <RegisterClient />
    </MarketingShell>
  );
}
