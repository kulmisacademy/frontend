import { getApiBaseUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { productUrl } from "@/lib/urls";
import { buildWhatsAppMessageUrl } from "@/lib/whatsapp";

export type CartWhatsAppLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

/** Plain-text Somali message for multi-item cart (matches PRD template). */
export function buildCartWhatsAppMessage(lines: CartWhatsAppLine[]): string {
  let message = "Salaan 👋,\n\nWaxaan rabaa alaabtan:\n\n";
  let total = 0;
  lines.forEach((item, index) => {
    message += `${index + 1}. Product: ${item.name}\n`;
    message += `   Price: ${formatPrice(item.price)}\n`;
    message += `   Quantity: ${item.quantity}\n`;
    message += `   Link: ${productUrl(item.id)}\n\n`;
    total += item.price * item.quantity;
  });
  message += `Total: ${formatPrice(total)}\n\n`;
  message += "Fadlan ii soo sheeg sida aan ku heli karo.";
  return message;
}

type OpenCartWaParams = {
  storeSlug: string;
  whatsapp: string;
  lines: CartWhatsAppLine[];
  token?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
};

/** Saves the cart order when possible, then opens WhatsApp with the Somali template. */
export async function openWhatsAppCartOrder(
  params: OpenCartWaParams
): Promise<void> {
  const total = params.lines.reduce(
    (acc, l) => acc + l.price * l.quantity,
    0
  );
  const text = buildCartWhatsAppMessage(params.lines);
  const waUrl = buildWhatsAppMessageUrl(params.whatsapp, text);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (params.token) {
      headers.Authorization = `Bearer ${params.token}`;
    }
    const products = params.lines.map((l) => ({
      product_id: l.id,
      name: l.name,
      quantity: l.quantity,
      price: l.price,
    }));
    const items_summary = params.lines
      .map((l) => `${l.name} × ${l.quantity}`)
      .join("; ");
    await fetch(
      `${getApiBaseUrl()}/api/stores/public/${encodeURIComponent(params.storeSlug)}/orders`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          items_summary,
          total,
          products,
          customer_name: params.customerName?.trim() || undefined,
          customer_phone: params.customerPhone?.trim() || undefined,
        }),
      }
    );
  } catch {
    /* still open WhatsApp */
  }
  window.open(waUrl, "_blank", "noopener,noreferrer");
}
