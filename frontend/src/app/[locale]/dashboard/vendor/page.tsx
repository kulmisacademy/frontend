import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function LegacyVendorDashboardPage() {
  redirect(`/${await getLocale()}/dashboard`);
}
