import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Generic carrier-agnostic webhook endpoint. Adapt the payload mapping per carrier
// (AfterShip, FedEx, DHL, Maersk, etc). For now we accept a normalized shape from
// our integration layer.

const Payload = z.object({
  tracking_no: z.string(),
  occurred_at: z.string(),
  status: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  const secret = req.headers.get('x-medwise-webhook-secret');
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = Payload.parse(await req.json());

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: shipment, error: shipErr } = await admin
    .from('shipments')
    .select('id, order_id')
    .eq('tracking_no', body.tracking_no)
    .single();

  if (shipErr || !shipment) {
    return NextResponse.json({ ok: false, error: 'shipment not found' }, { status: 404 });
  }

  const { error: evErr } = await admin.from('shipment_events').insert({
    shipment_id: shipment.id,
    occurred_at: body.occurred_at,
    status: body.status,
    location: body.location ?? null,
    description: body.description ?? null,
    source: body.source ?? 'carrier_webhook',
  });
  if (evErr) {
    return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });
  }

  // Update shipment + order status heuristically
  const statusMap: Record<string, string> = {
    picked_up: 'shipped',
    in_transit: 'in_transit',
    customs: 'customs',
    out_for_delivery: 'out_for_delivery',
    delivered: 'delivered',
  };
  const orderStatus = statusMap[body.status.toLowerCase().replace(/\s+/g, '_')];
  if (orderStatus) {
    await admin.from('orders').update({ status: orderStatus }).eq('id', shipment.order_id);
  }
  await admin
    .from('shipments')
    .update({ current_status: body.status, current_location: body.location ?? null })
    .eq('id', shipment.id);

  return NextResponse.json({ ok: true });
}
