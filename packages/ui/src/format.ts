import { ORDER_STATUS_ORDER, type OrderStatus } from '@medwise/types';

export function orderProgressPercent(status: OrderStatus): number {
  if (status === 'cancelled') return 0;
  const idx = ORDER_STATUS_ORDER.indexOf(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / ORDER_STATUS_ORDER.length) * 100);
}

export function formatLeadTime(days: number | null | undefined): string {
  if (!days) return '—';
  if (days < 14) return `${days} days`;
  const weeks = Math.round(days / 7);
  return `${weeks} weeks`;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function formatUSD(n: number | null | undefined): string {
  if (n == null) return '—';
  return USD.format(n);
}

export function formatINR(n: number | null | undefined): string {
  if (n == null) return '—';
  return INR.format(n);
}
