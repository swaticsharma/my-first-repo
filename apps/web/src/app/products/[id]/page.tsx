import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getProduct } from '@medwise/db';
import { formatLeadTime, formatUSD } from '@medwise/ui';
import { ShieldCheck, FileCheck2 } from 'lucide-react';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getSupabaseServer();
  const product = await getProduct(db, id).catch(() => null);
  if (!product) notFound();

  const p = product as any;
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/catalogue" className="text-sm text-brand-600 hover:underline">
        ← Back to catalogue
      </Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="aspect-video rounded-lg bg-slate-100" />
          <h1 className="mt-6 text-3xl font-bold text-slate-900">{p.name}</h1>
          <p className="mt-2 text-slate-600">{p.short_description}</p>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Specifications</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">Device class</dt>
              <dd>{p.device_class ?? '—'}</dd>
              <dt className="text-slate-500">GMDN</dt>
              <dd>{p.gmdn_code ?? '—'}</dd>
              <dt className="text-slate-500">HS code</dt>
              <dd>{p.hs_code ?? '—'}</dd>
              <dt className="text-slate-500">MOQ</dt>
              <dd>{p.moq ?? '—'}</dd>
              <dt className="text-slate-500">Warranty</dt>
              <dd>{p.warranty_months ? `${p.warranty_months} months` : '—'}</dd>
              {Object.entries(p.specs ?? {}).map(([k, v]) => (
                <>
                  <dt key={`k-${k}`} className="text-slate-500">
                    {k}
                  </dt>
                  <dd key={`v-${k}`}>{String(v)}</dd>
                </>
              ))}
            </dl>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Certifications on file</h2>
            <ul className="mt-3 space-y-2">
              {(p.certifications ?? []).length === 0 && (
                <li className="text-sm text-slate-500">No certifications listed yet.</li>
              )}
              {(p.certifications ?? []).map((c: any) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <FileCheck2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{c.kind.replace('_', ' ')}</span>
                  {c.cert_number && <span className="text-slate-500">· {c.cert_number}</span>}
                  {c.expires_on && (
                    <span className="text-slate-500">· expires {c.expires_on}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">About the supplier</h2>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{p.supplier?.display_name}</span>
                {p.supplier?.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
                <span className="text-xs text-slate-500">· {p.supplier?.country}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{p.supplier?.about}</p>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-6 lg:sticky lg:top-6">
          <p className="text-sm text-slate-500">Unit price</p>
          <p className="text-3xl font-bold text-slate-900">{formatUSD(p.unit_price_usd)}</p>
          <p className="mt-3 text-sm">
            Lead time:{' '}
            <span className="font-semibold">{formatLeadTime(p.lead_time_days)}</span>
            {p.lead_time_days_express && (
              <span className="text-slate-500">
                {' '}
                · Express {formatLeadTime(p.lead_time_days_express)}
              </span>
            )}
          </p>
          <Link
            href={`/rfq/new?productId=${p.id}`}
            className="mt-6 block w-full rounded-md bg-brand-600 px-4 py-2.5 text-center font-medium text-white hover:bg-brand-700"
          >
            Request quote
          </Link>
          <Link
            href={`/messages/new?supplierId=${p.supplier_org_id}`}
            className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-center font-medium text-slate-700 hover:bg-slate-50"
          >
            Message supplier
          </Link>
        </aside>
      </div>
    </div>
  );
}
