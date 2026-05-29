import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product, Category, Rfq, Order, Shipment, ShipmentEvent } from '@medwise/types';
import {
  isDemoMode,
  demoProductsWithRelations,
  demoCategories,
  demoOrders,
  demoShipments,
  demoShipmentEvents,
  demoSuppliers,
  demoBuyers,
} from './demo-fixtures';

export interface ProductSearchFilters {
  q?: string;
  categorySlug?: string;
  deviceClass?: string;
  maxLeadTimeDays?: number;
  minMoq?: number;
  hasCert?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
function applyProductFilters<T extends { name: string; device_class?: any; lead_time_days?: any; moq?: any; category?: any; supplier?: any }>(
  products: T[],
  filters: ProductSearchFilters,
): T[] {
  let out = products.filter((p) => p);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p as any).short_description?.toLowerCase().includes(q) ||
        (p as any).gmdn_code?.toLowerCase().includes(q),
    );
  }
  if (filters.categorySlug) {
    out = out.filter((p) => p.category?.slug === filters.categorySlug);
  }
  if (filters.deviceClass) {
    out = out.filter((p) => p.device_class === filters.deviceClass);
  }
  if (filters.maxLeadTimeDays != null) {
    out = out.filter((p) => p.lead_time_days != null && p.lead_time_days <= filters.maxLeadTimeDays!);
  }
  if (filters.minMoq != null) {
    out = out.filter((p) => p.moq != null && p.moq >= filters.minMoq!);
  }
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 24;
  return out.slice(offset, offset + limit);
}

export async function searchProducts(
  db: SupabaseClient,
  filters: ProductSearchFilters = {},
): Promise<Product[]> {
  if (isDemoMode()) {
    return applyProductFilters(demoProductsWithRelations as any, filters) as unknown as Product[];
  }

  let q = db
    .from('products')
    .select(
      `*, supplier:organizations!products_supplier_org_id_fkey(id, display_name, country, verified),
       category:categories(slug, name)`,
    )
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (filters.q) {
    q = q.textSearch('search_tsv', filters.q, { type: 'websearch' });
  }
  if (filters.deviceClass) q = q.eq('device_class', filters.deviceClass);
  if (filters.maxLeadTimeDays != null) q = q.lte('lead_time_days', filters.maxLeadTimeDays);
  if (filters.minMoq != null) q = q.gte('moq', filters.minMoq);

  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) {
    // Fall back to fixtures on error in demo-ish setups (e.g., empty DB).
    return applyProductFilters(demoProductsWithRelations as any, filters) as unknown as Product[];
  }
  if (!data || data.length === 0) {
    return applyProductFilters(demoProductsWithRelations as any, filters) as unknown as Product[];
  }
  return data as unknown as Product[];
}

export async function getProduct(db: SupabaseClient, id: string) {
  if (isDemoMode()) {
    return demoProductsWithRelations.find((p) => p.id === id) ?? null;
  }

  const { data, error } = await db
    .from('products')
    .select(
      `*, supplier:organizations!products_supplier_org_id_fkey(*),
       category:categories(*),
       certifications:product_certifications(*)`,
    )
    .eq('id', id)
    .single();
  if (error || !data) {
    return demoProductsWithRelations.find((p) => p.id === id) ?? null;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function listCategories(db: SupabaseClient): Promise<Category[]> {
  if (isDemoMode()) return demoCategories as unknown as Category[];

  const { data, error } = await db.from('categories').select('*').order('name');
  if (error || !data || data.length === 0) return demoCategories as unknown as Category[];
  return data as Category[];
}

// ---------------------------------------------------------------------------
// RFQs
// ---------------------------------------------------------------------------
export async function createRfq(
  db: SupabaseClient,
  rfq: Omit<Rfq, 'id' | 'created_at' | 'status'> & { status?: Rfq['status'] },
) {
  const { data, error } = await db
    .from('rfqs')
    .insert({ ...rfq, status: rfq.status ?? 'open' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Rfq;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export async function listBuyerOrders(db: SupabaseClient, buyerOrgId: string): Promise<Order[]> {
  if (isDemoMode()) {
    return demoOrders.filter((o) => o.buyer_org_id === buyerOrgId) as unknown as Order[];
  }

  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('buyer_org_id', buyerOrgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function listAllDemoOrders(): Promise<Order[]> {
  return demoOrders as unknown as Order[];
}

export async function getOrderWithTracking(db: SupabaseClient, orderId: string) {
  if (isDemoMode()) {
    const order = demoOrders.find((o) => o.id === orderId);
    if (!order) return null;
    const shipment = demoShipments[orderId] ?? null;
    const events = shipment ? (demoShipmentEvents[shipment.id] ?? []) : [];
    return {
      order: order as unknown as Order,
      shipment: shipment as Shipment | null,
      events: events as ShipmentEvent[],
    };
  }

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (orderErr) {
    // fall back to demo
    const o = demoOrders.find((d) => d.id === orderId);
    if (!o) throw orderErr;
    const shipment = demoShipments[orderId] ?? null;
    const events = shipment ? (demoShipmentEvents[shipment.id] ?? []) : [];
    return {
      order: o as unknown as Order,
      shipment: shipment as Shipment | null,
      events: events as ShipmentEvent[],
    };
  }

  const { data: shipment } = await db
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  let events: ShipmentEvent[] = [];
  if (shipment) {
    const { data: evs, error: evsErr } = await db
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('occurred_at', { ascending: false });
    if (evsErr) throw evsErr;
    events = (evs ?? []) as ShipmentEvent[];
  }

  return { order: order as Order, shipment: shipment as Shipment | null, events };
}

// ---------------------------------------------------------------------------
// Realtime (no-op in demo mode — events are static)
// ---------------------------------------------------------------------------
export function subscribeToShipmentEvents(
  db: SupabaseClient,
  shipmentId: string,
  handler: (event: ShipmentEvent) => void,
) {
  if (isDemoMode()) {
    return () => {
      /* no-op */
    };
  }
  const channel = db
    .channel(`shipment:${shipmentId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'shipment_events', filter: `shipment_id=eq.${shipmentId}` },
      (payload) => handler(payload.new as ShipmentEvent),
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Orgs (for supplier directory etc.)
// ---------------------------------------------------------------------------
export async function listVerifiedSuppliers(db: SupabaseClient) {
  if (isDemoMode()) return demoSuppliers.filter((s) => s.verified);
  const { data } = await db
    .from('organizations')
    .select('*')
    .eq('kind', 'supplier')
    .eq('verified', true)
    .order('display_name');
  return data ?? demoSuppliers.filter((s) => s.verified);
}

export async function listVerifiedBuyers(db: SupabaseClient) {
  if (isDemoMode()) return demoBuyers.filter((b) => b.verified);
  const { data } = await db
    .from('organizations')
    .select('*')
    .eq('kind', 'buyer')
    .eq('verified', true)
    .order('display_name');
  return data ?? demoBuyers.filter((b) => b.verified);
}
