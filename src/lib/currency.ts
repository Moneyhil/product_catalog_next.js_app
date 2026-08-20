// NOTE: PKR figures shown across the UI are an approximate display conversion only.
// Stripe checkout always charges the user in USD (see /api/checkout/route.ts) at the
// live rate Stripe applies at payment time. This constant is NOT used for any billing,
// order total, or Stripe session math — it exists solely to give Pakistani shoppers a
// rough rupee reference next to the authoritative USD price.  Update periodically to
// stay near the current USD/PKR mid-market rate.
const PKR_EXCHANGE_RATE = 288;

export function formatPKR(usd: number): string {
  const amount = Math.round(Number(usd) * PKR_EXCHANGE_RATE);
  if (!Number.isFinite(amount)) return "PKR 0";
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

export function formatUSD(usd: number): string {
  const value = Number(usd);
  if (!Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}
