import { redirect } from "next/navigation";

/** Checkout is WhatsApp-only; use /cart */
export default function CheckoutPage() {
  redirect("/cart");
}
