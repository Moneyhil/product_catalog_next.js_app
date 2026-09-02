export interface Rating {
  rate: number;
  count: number;
}

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: Rating;
}

export interface CartItem {
  id: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
}

export interface OrderItem extends CartItem {}

export interface ShippingAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface OrderShipping {
  name?: string | null;
  phone?: string | null;
  address: ShippingAddress;
}

export type OrderStatus = "draft" | "pending" | "paid" | "failed" | "canceled";

export interface Order {
  id: string;
  clerkId: string;
  email: string | null;
  customerEmail?: string | null;
  amountPaidUsd?: number;
  phone?: string | null;
  shipping?: OrderShipping | null;
  items: OrderItem[];
  subtotalUsd: number;
  totalUsd: number;
  currency: "usd";
  status: OrderStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  notificationStatus?: "pending" | "sent" | "failed";
  notificationSentAt?: string;
  notificationFailedAt?: string;
  notificationError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  clerkUserId: string;
  stripeCustomerId: string | null;
  name: string | null;
  email: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  clerkId: string;
  customerEmail: string | null;
  customerName: string | null;
  items: OrderItem[];
  subtotalUsd: number;
  totalUsd: number;
  amountPaidUsd: number;
  currency: "usd";
  status: "paid" | "refunded" | "void";
  shipping: OrderShipping | null;
  stripePaymentIntentId: string | null;
  invoiceNumber: string;
  notificationStatus?: "pending" | "sent" | "failed";
  notificationSentAt?: string;
  notificationFailedAt?: string;
  notificationError?: string;
  issuedAt: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}