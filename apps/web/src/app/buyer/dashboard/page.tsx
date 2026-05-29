import Link from 'next/link';
import { requireBuyer } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase-server';

export default async function BuyerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireBuyer('/buyer/dashboard');
  const db = await getSupabaseServer();

  const { data: org } = await db
    .from('organizations')
    .select('display_name, verified')
    .eq('id', session.orgId)
    .single();

  const [openRfqs, draftRfqs, orders] = await Promise.all([
    db.from('rfqs').select('id', { count: 'exact', head: true })
      .eq('buyer_org_id', session.orgId).eq('status', 'open'),
    db.from('rfqs').select('id', { count: 'exact', head: true })
      .eq('buyer_org_id', session.orgId).eq('status', 'draft'),
    db.from('orders').select('id', { count: 'exact', head: true })
      .eq('buyer_org_id', session.orgId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {sp.welcome && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Welcome to Medwise. Verify your email and you're ready to source. Browse the catalogue
          or post an RFQ to get started.
        </div>
      )}
      <h1 className="text-3xl font-bold">{org?.display_name ?? 'Buyer'} dashboard</h1>
      <p className="mt-1 text-slate-600">
        Verification:{' '}
        <span className={org?.verified ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
          {org?.verified ? 'Verified' : 'Pending'}
        </span>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Open RFQs" value={openRfqs.count ?? 0} href="/buyer/rfqs" />
        <Stat label="Drafts" value={draftRfqs.count ?? 0} href="/buyer/rfqs?status=draft" />
        <Stat label="Orders" value={orders.count ?? 0} href="/orders" />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/rfq/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Post an RFQ
        </Link>
        <Link
          href="/catalogue"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Browse catalogue
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white p-5 transition hover:shadow-sm"
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </Link>
  );
}
