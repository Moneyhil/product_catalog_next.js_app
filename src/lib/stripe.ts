import Stripe from "stripe";

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  cachedClient = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    typescript: true,
  });

  return cachedClient;
}

export function formatStripeAmount(usdAmount: number): number {
  return Math.round(Number(usdAmount) * 100);
}
