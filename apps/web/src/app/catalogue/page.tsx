import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase-server';
import { searchProducts, listCategories } from '@medwise/db';
import { formatLeadTime, formatUSD } from '@medwise/ui';
import { ShieldCheck } from 'lucide-react';

type SearchParams = {
  q?: string;
  category?: string;
  maxLead?: string;
  class?: string;
};

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const db = await getSupabaseServer();
  const [products, categories] = await Promise.all([
    searchProducts(db, {
      q: sp.q,
      categorySlug: sp.category,
      maxLeadTimeDays: sp.maxLead ? Number(sp.maxLead) : undefined,
      deviceClass: sp.class,
    }).catch(() => []),
    listCategories(db).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catalogue</h1>
          <p className="mt-1 text-slate-600">
            Verified Chinese medtech suppliers, with real lead times.
          </p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Search products, GMDN, brands…"
            className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Search
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[16rem_1fr]">
        <aside className="space-y-6">
          <FilterGroup title="Category">
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href="/catalogue"
                  className={!sp.category ? 'font-semibold text-brand-600' : 'text-slate-700'}
                >
                  All categories
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/catalogue?category=${c.slug}`}
                    className={
                      sp.category === c.slug ? 'font-semibold text-brand-600' : 'text-slate-700'
                    }
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </FilterGroup>

          <FilterGroup title="Max lead time">
            <div className="flex flex-wrap gap-2 text-xs">
              {[15, 30, 45, 60, 90].map((d) => (
                <Link
                  key={d}
                  href={`/catalogue?maxLead=${d}`}
                  className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-50"
                >
                  ≤ {d}d
                </Link>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Device class">
            <div className="flex gap-2 text-xs">
              {(['I', 'IIa', 'IIb', 'III'] as const).map((c) => (
                <Link
                  key={c}
                  href={`/catalogue?class=${c}`}
                  className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-50"
                >
                  {c}
                </Link>
              ))}
            </div>
          </FilterGroup>
        </aside>

        <section>
          {products.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-md"
    >
      <div className="aspect-video rounded bg-slate-100" />
      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{product.name}</h3>
        {product.supplier?.verified && (
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified" />
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {product.supplier?.display_name} · {product.supplier?.country}
      </p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-900">{formatUSD(product.unit_price_usd)}</span>
        <span className="text-slate-600">{formatLeadTime(product.lead_time_days)}</span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
      <h3 className="font-semibold text-slate-900">No products yet</h3>
      <p className="mt-2 text-sm text-slate-600">
        Once suppliers onboard, their products will appear here. To get a head start, post an RFQ
        and we'll invite matching suppliers.
      </p>
      <Link
        href="/rfq/new"
        className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Post an RFQ
      </Link>
    </div>
  );
}
