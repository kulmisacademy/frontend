const DIGITS = /\D/g;

export function buildWhatsAppOrderUrl(
  e164ish: string,
  productName: string,
  priceLabel: string,
  productUrl: string
) {
  const digits = e164ish.replace(DIGITS, "");
  const message = [
    "Salaan, waxaan rabaa alaabtan:",
    "",
    `Magaca: ${productName}`,
    `Qiimaha: ${priceLabel}`,
    `Link: ${productUrl}`,
  ].join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppMessageUrl(e164ish: string, message: string) {
  const digits = e164ish.replace(DIGITS, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
