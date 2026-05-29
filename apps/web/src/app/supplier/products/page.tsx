import Link from 'next/link';
import { requireSupplier } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase-server';
import { formatUSD, formatLeadTime } from '@medwise/ui';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { toggleProductActiveAction } from './actions';

export default async function SupplierProductsPage() {
  const session = await requireSupplier('/supplier/products');
  const db = await getSupabaseServer();

  const { data: products = [] } = await db
    .from('products')
    .select('*, category:categories(name)')
    .eq('supplier_org_id', session.orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="mt-1 text-slate-600">
            {products?.length ?? 0} listed · published products are visible to all buyers.
          </p>
        </div>
        <Link
          href="/supplier/products/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add product
        </Link>
      </div>

      {!products || products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Lead time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.sku ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatUSD(p.unit_price_usd)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatLeadTime(p.lead_time_days)}</td>
                  <td className="px-4 py-3">
                    {p.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Eye className="h-3 w-3" /> Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <EyeOff className="h-3 w-3" /> Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <form action={toggleProductActiveAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="active" value={p.active ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className="text-xs text-slate-600 hover:underline"
                        >
                          {p.active ? 'Hide' : 'Publish'}
                        </button>
                      </form>
                      <Link
                        href={`/supplier/products/${p.id}/edit`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
      <h3 className="text-lg font-semibold text-slate-900">No products yet</h3>
      <p className="mt-2 text-sm text-slate-600">
        Add your first product to start receiving RFQs from Indian buyers.
      </p>
      <Link
        href="/supplier/products/new"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" /> Add your first product
      </Link>
    </div>
  );
}
