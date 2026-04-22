import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function SellPage() {
  redirect(`/${await getLocale()}/register-vendor`);
}
