import { getApiBaseUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppMessageUrl } from "@/lib/whatsapp";
import {
  parseOrderCodeFromJson,
  readOrderApiError,
} from "@/lib/whatsapp-cart";

type OpenProductWaOrderParams = {
  storeId: string;
  storeSlug: string;
  productId: string;
  whatsapp: string;
  productName: string;
  priceNumber: number;
  productUrl: string;
  token?: string | null;
};

/** Saves order via POST /api/orders (fallback: public store orders), then opens WhatsApp. */
export async function openWhatsAppProductOrder(
  params: OpenProductWaOrderParams
): Promise<{ ok: boolean; error?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }
  const base = getApiBaseUrl();
  const primaryBody = JSON.stringify({
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
  });

  let res: Response;
  try {
    res = await fetch(`${base}/api/orders`, {
      method: "POST",
      headers,
      body: primaryBody,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }

  if (res.status === 404 && params.storeSlug) {
    try {
      res = await fetch(
        `${base}/api/stores/public/${encodeURIComponent(params.storeSlug)}/orders`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            product_id: params.productId,
            total: params.priceNumber,
          }),
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
    return { ok: false, error: await readOrderApiError(res) };
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
