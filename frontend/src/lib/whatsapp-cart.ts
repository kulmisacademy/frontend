import { getApiBaseUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppMessageUrl } from "@/lib/whatsapp";

export type CartWhatsAppLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

/** Somali WhatsApp text for cart checkout with order id (after DB save). */
export function buildCartWhatsAppMessage(
  lines: CartWhatsAppLine[],
  orderCode: string
): string {
  let message = "Salaan 👋,\n\nWaxaan rabaa alaabtan:\n\n";
  let total = 0;
  lines.forEach((item, index) => {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;
    message += `${index + 1}. ${item.name} - ${formatPrice(lineTotal)}\n`;
  });
  message += `\nTotal: ${formatPrice(total)}\n\n`;
  message += `Order ID: ${orderCode}\n\n`;
  message += "Fadlan ii soo xaqiiji dalabkan.";
  return message;
}

type OpenCartWaParams = {
  storeId: string;
  whatsapp: string;
  lines: CartWhatsAppLine[];
  token?: string | null;
};

export type WhatsAppCartResult =
  | { ok: true; orderCode: string }
  | { ok: false; error: string };

/**
 * Saves order via POST /api/orders, then opens WhatsApp with order id.
 * Does not open WhatsApp if the API save fails.
 */
export async function openWhatsAppCartOrder(
  params: OpenCartWaParams
): Promise<WhatsAppCartResult> {
  const total = params.lines.reduce(
    (acc, l) => acc + l.price * l.quantity,
    0
  );
  const items = params.lines.map((l) => ({
    product_id: l.id,
    name: l.name,
    quantity: l.quantity,
    price: l.price,
  }));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/api/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        store_id: params.storeId,
        items,
        total,
      }),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: unknown };
      if (typeof j.error === "string") msg = j.error;
    } catch {
      /* ignore */
    }
    return { ok: false, error: msg };
  }
  const data = (await res.json()) as { order_id: string };
  const orderCode = data.order_id;
  const text = buildCartWhatsAppMessage(params.lines, orderCode);
  const waUrl = buildWhatsAppMessageUrl(params.whatsapp, text);
  window.open(waUrl, "_blank", "noopener,noreferrer");
  return { ok: true, orderCode };
}
