import { getApiBaseUrl } from "@/lib/api";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp";

type OpenProductWaOrderParams = {
  storeSlug: string;
  productId: string;
  whatsapp: string;
  productName: string;
  priceLabel: string;
  productUrl: string;
  priceNumber: number;
  token?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
};

/** Saves the order on the server (when possible), then opens WhatsApp with the Somali template. */
export async function openWhatsAppProductOrder(
  params: OpenProductWaOrderParams
): Promise<void> {
  const wa = buildWhatsAppOrderUrl(
    params.whatsapp,
    params.productName,
    params.priceLabel,
    params.productUrl
  );
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (params.token) {
      headers.Authorization = `Bearer ${params.token}`;
    }
    await fetch(
      `${getApiBaseUrl()}/api/stores/public/${encodeURIComponent(params.storeSlug)}/orders`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          product_id: params.productId,
          total: params.priceNumber,
          customer_name: params.customerName?.trim() || undefined,
          customer_phone: params.customerPhone?.trim() || undefined,
        }),
      }
    );
  } catch {
    /* still open WhatsApp so the customer can complete the sale */
  }
  window.open(wa, "_blank", "noopener,noreferrer");
}
