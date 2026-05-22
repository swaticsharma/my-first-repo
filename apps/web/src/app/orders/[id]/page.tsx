import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getOrderWithTracking } from '@medwise/db';
import { ORDER_STATUS_LABEL, ORDER_STATUS_ORDER } from '@medwise/types';
import { formatUSD, orderProgressPercent } from '@medwise/ui';
import { LiveTrackingPanel } from './live-tracking';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getSupabaseServer();
  const data = await getOrderWithTracking(db, id).catch(() => null);
  if (!data) notFound();

  const { order, shipment, events } = data;
  const pct = orderProgressPercent(order.status);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order {order.order_no}</h1>
          <p className="mt-1 text-slate-600">{ORDER_STATUS_LABEL[order.status]}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-xl font-semibold">{formatUSD(order.total_usd)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-slate-500">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 sm:grid-cols-5">
          {ORDER_STATUS_ORDER.map((s, i) => {
            const reached =
              ORDER_STATUS_ORDER.indexOf(order.status) >= i && order.status !== 'cancelled';
            return (
              <li key={s} className={reached ? 'font-medium text-brand-700' : ''}>
                {ORDER_STATUS_LABEL[s]}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Live tracking */}
      {shipment && (
        <LiveTrackingPanel
          shipment={shipment}
          initialEvents={events}
        />
      )}

      {/* Order facts */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card title="Shipment">
          <Row k="Carrier" v={shipment?.carrier ?? '—'} />
          <Row k="Tracking #" v={shipment?.tracking_no ?? '—'} />
          <Row k="Mode" v={shipment?.mode ?? '—'} />
          <Row k="From" v={shipment?.origin_port ?? '—'} />
          <Row k="To" v={shipment?.destination_port ?? '—'} />
          <Row k="ETA" v={shipment?.eta ? new Date(shipment.eta).toLocaleString() : '—'} />
        </Card>
        <Card title="Order">
          <Row k="Quantity" v={String(order.quantity)} />
          <Row k="Unit price" v={formatUSD(order.unit_price_usd)} />
          <Row k="Incoterm" v={order.incoterm ?? '—'} />
          <Row k="Promised dispatch" v={order.promised_dispatch_on ?? '—'} />
          <Row k="Promised delivery" v={order.promised_delivery_on ?? '—'} />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">{title}</h2>
      <dl className="mt-3 space-y-1.5 text-sm">{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-slate-900">{v}</dd>
    </div>
  );
}
