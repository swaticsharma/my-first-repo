import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase-server';

export default async function SupplierDashboard({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const sp = await searchParams;
  const db = await getSupabaseServer();
  const { data: user } = await db.auth.getUser();
  if (!user?.user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Sign in to your supplier account</h1>
        <Link href="/login" className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-white">
          Sign in
        </Link>
      </div>
    );
  }

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, org_id')
    .eq('id', user.user.id)
    .single();

  const { data: org } = profile?.org_id
    ? await db.from('organizations').select('*').eq('id', profile.org_id).single()
    : { data: null };

  const { count: productCount } = profile?.org_id
    ? await db
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_org_id', profile.org_id)
    : { count: 0 };

  const { count: openRfqs } = await db
    .from('rfqs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {sp.welcome && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Welcome to Medwise. Your application is in review — usually 3–5 business days. You can
          start adding products now; they'll go live once verification completes.
        </div>
      )}
      <h1 className="text-3xl font-bold">{org?.display_name ?? 'Supplier'} dashboard</h1>
      <p className="mt-1 text-slate-600">
        Verification status:{' '}
        <span className={org?.verified ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
          {org?.verified ? 'Verified' : 'Pending'}
        </span>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Products listed" value={productCount ?? 0} href="/supplier/products" />
        <Stat label="Open RFQs in your categories" value={openRfqs ?? 0} href="/supplier/rfqs" />
        <Stat label="Active orders" value={0} href="/supplier/orders" />
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/supplier/products/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add product
        </Link>
        <Link
          href="/supplier/certifications"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Upload certifications
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
