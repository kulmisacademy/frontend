import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
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
  const locale = await getLocale();
  const { type } = await searchParams;
  if (type === "vendor") {
    redirect(`/${locale}/register-vendor`);
  }

  return (
    <MarketingShell>
      <RegisterClient />
    </MarketingShell>
  );
}
