export function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}
