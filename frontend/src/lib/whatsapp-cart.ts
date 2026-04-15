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
  /** Used if POST /api/orders is missing on the server (older Railway deploy). */
  storeSlug: string;
  whatsapp: string;
  lines: CartWhatsAppLine[];
  token?: string | null;
};

export async function readOrderApiError(res: Response): Promise<string> {
  let msg = (res.statusText || "").trim();
  try {
    const j = (await res.json()) as { error?: unknown };
    if (typeof j.error === "string" && j.error.trim()) msg = j.error.trim();
  } catch {
    /* ignore */
  }
  if (!msg) msg = `Request failed (${res.status})`;
  if (res.status === 404) {
    msg = `${msg} Deploy the latest backend (includes POST /api/orders) or the app will use a fallback.`;
  }
  return msg;
}

export function parseOrderCodeFromJson(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  if (typeof j.order_id === "string" && j.order_id.trim()) return j.order_id.trim();
  const o = j.order;
  if (o && typeof o === "object") {
    const row = o as Record<string, unknown>;
    if (typeof row.order_code === "string" && row.order_code.trim()) {
      return row.order_code.trim();
    }
    if (typeof row.id === "string") {
      return `REF-${row.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    }
  }
  return null;
}

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
  const base = getApiBaseUrl();
  const bodyPrimary = JSON.stringify({
    store_id: params.storeId,
    items,
    total,
  });

  let res: Response;
  try {
    res = await fetch(`${base}/api/orders`, {
      method: "POST",
      headers,
      body: bodyPrimary,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }

  if (res.status === 404 && params.storeSlug) {
    const items_summary = params.lines
      .map((l) => `${l.name} × ${l.quantity}`)
      .join("; ");
    const products = params.lines.map((l) => ({
      product_id: l.id,
      name: l.name,
      quantity: l.quantity,
      price: l.price,
    }));
    try {
      res = await fetch(
        `${base}/api/stores/public/${encodeURIComponent(params.storeSlug)}/orders`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ items_summary, total, products }),
        }
      );
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Network error",
      };
    }
  }

  if (!res.ok) {
    const msg = await readOrderApiError(res);
    return { ok: false, error: msg };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Invalid response from server" };
  }
  const orderCode = parseOrderCodeFromJson(data);
  if (!orderCode) {
    return { ok: false, error: "Order saved but response had no order id." };
  }
  const text = buildCartWhatsAppMessage(params.lines, orderCode);
  const waUrl = buildWhatsAppMessageUrl(params.whatsapp, text);
  window.open(waUrl, "_blank", "noopener,noreferrer");
  return { ok: true, orderCode };
}
