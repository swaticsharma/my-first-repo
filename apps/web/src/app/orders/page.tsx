import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase-server';
import { isDemoMode, listAllDemoOrders } from '@medwise/db';
import { ORDER_STATUS_LABEL } from '@medwise/types';
import { formatUSD } from '@medwise/ui';

export default async function OrdersPage() {
  const db = await getSupabaseServer();

  let orders: any[] = [];
  if (isDemoMode()) {
    orders = await listAllDemoOrders();
  } else {
    const { data: user } = await db.auth.getUser();
    if (!user?.user) {
      return (
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-2xl font-bold">Sign in to see your orders</h1>
          <Link
            href="/login?next=/orders"
            className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-white"
          >
            Sign in
          </Link>
        </div>
      );
    }
    const { data } = await db
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    orders = data ?? [];
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-6 text-slate-600">No orders yet.</p>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">ETA</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{o.order_no}</td>
                <td className="px-4 py-3">
                  <StatusPill status={o.status} />
                </td>
                <td className="px-4 py-3">{o.quantity}</td>
                <td className="px-4 py-3">{formatUSD(o.total_usd)}</td>
                <td className="px-4 py-3">{o.promised_delivery_on ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/orders/${o.id}`} className="text-brand-600 hover:underline">
                    Track →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: keyof typeof ORDER_STATUS_LABEL }) {
  const color =
    status === 'delivered'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'cancelled'
        ? 'bg-rose-50 text-rose-700'
        : status === 'in_transit' || status === 'shipped' || status === 'out_for_delivery'
          ? 'bg-blue-50 text-blue-700'
          : status === 'pending_payment'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
