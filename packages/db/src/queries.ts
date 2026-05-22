import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product, Category, Rfq, Order, Shipment, ShipmentEvent } from '@medwise/types';

export interface ProductSearchFilters {
  q?: string;
  categorySlug?: string;
  deviceClass?: string;
  maxLeadTimeDays?: number;
  minMoq?: number;
  hasCert?: string; // e.g. 'CDSCO_IMPORT'
  limit?: number;
  offset?: number;
}

export async function searchProducts(
  db: SupabaseClient,
  filters: ProductSearchFilters = {},
): Promise<Product[]> {
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
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function getProduct(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from('products')
    .select(
      `*, supplier:organizations!products_supplier_org_id_fkey(*),
       category:categories(*),
       certifications:product_certifications(*)`,
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function listCategories(db: SupabaseClient): Promise<Category[]> {
  const { data, error } = await db.from('categories').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as Category[];
}

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

export async function listBuyerOrders(db: SupabaseClient, buyerOrgId: string): Promise<Order[]> {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('buyer_org_id', buyerOrgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function getOrderWithTracking(db: SupabaseClient, orderId: string) {
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (orderErr) throw orderErr;

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

export function subscribeToShipmentEvents(
  db: SupabaseClient,
  shipmentId: string,
  handler: (event: ShipmentEvent) => void,
) {
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
