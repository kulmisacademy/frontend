import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

/** Checkout is WhatsApp-only; use /cart */
export default async function CheckoutPage() {
  redirect(`/${await getLocale()}/cart`);
}
