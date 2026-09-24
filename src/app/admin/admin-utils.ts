import type { Order } from "@/lib/types";

export function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function dateFromValue(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      const date = toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
  }
  return null;
}

export function formatDate(value: unknown): string {
  return dateFromValue(value)?.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) ?? "-";
}

export function formatDateTime(value: unknown): string {
  return dateFromValue(value)?.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) ?? "-";
}

export function formatTimeAgo(value: unknown): string {
  const date = dateFromValue(value);
  if (!date) return "-";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function shortId(value: string): string {
  if (value.length <= 12) return value.toUpperCase();
  return `${value.slice(0, 6).toUpperCase()}...${value.slice(-4).toUpperCase()}`;
}

export function orderTotal(order: Partial<Order>): number {
  return asNumber(order.amountPaidUsd ?? order.totalUsd);
}
