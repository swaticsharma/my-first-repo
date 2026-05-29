import Link from 'next/link';
import { requireSupplier } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase-server';
import { listCategories } from '@medwise/db';
import { ProductForm } from '@/components/product-form';
import { createProductAction } from '../actions';

export default async function NewProductPage() {
  await requireSupplier('/supplier/products/new');
  const db = await getSupabaseServer();
  const categories = await listCategories(db).catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/supplier/products"
        className="text-sm text-brand-600 hover:underline"
      >
        ← Back to products
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Add product</h1>
      <p className="mt-1 text-slate-600">
        Fill in what you know. You can save as a draft (unchecked Publish) and refine later.
      </p>
      <div className="mt-8">
        <ProductForm
          action={createProductAction}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          submitLabel="Save product"
          mode="create"
        />
      </div>
    </div>
  );
}
