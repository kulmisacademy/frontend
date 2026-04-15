import { getApiBaseUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppMessageUrl } from "@/lib/whatsapp";

type OpenProductWaOrderParams = {
  storeId: string;
  productId: string;
  whatsapp: string;
  productName: string;
  priceNumber: number;
  productUrl: string;
  token?: string | null;
};

/** Saves order via POST /api/orders, then opens WhatsApp with order id. */
export async function openWhatsAppProductOrder(
  params: OpenProductWaOrderParams
): Promise<{ ok: boolean; error?: string }> {
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
        items: [
          {
            product_id: params.productId,
            quantity: 1,
            price: params.priceNumber,
            name: params.productName,
          },
        ],
        total: params.priceNumber,
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
  const message = [
    "Salaan 👋,",
    "",
    `Waxaan rabaa alaabtan: ${params.productName}`,
    `Qiimaha: ${formatPrice(params.priceNumber)}`,
    `Link: ${params.productUrl}`,
    "",
    `Order ID: ${orderCode}`,
    "",
    "Fadlan ii soo xaqiiji dalabkan.",
  ].join("\n");
  const waUrl = buildWhatsAppMessageUrl(params.whatsapp, message);
  window.open(waUrl, "_blank", "noopener,noreferrer");
  return { ok: true };
}
