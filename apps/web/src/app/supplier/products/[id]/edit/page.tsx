import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSupplier } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase-server';
import { listCategories } from '@medwise/db';
import { ProductForm } from '@/components/product-form';
import { DeleteProductButton } from '@/components/delete-product-button';
import { updateProductAction, deleteProductAction } from '../../actions';

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await requireSupplier(`/supplier/products/${id}/edit`);
  const db = await getSupabaseServer();

  const { data: product } = await db
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('supplier_org_id', session.orgId)
    .single();

  if (!product) notFound();

  const categories = await listCategories(db).catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/supplier/products"
        className="text-sm text-brand-600 hover:underline"
      >
        ← Back to products
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit product</h1>
          <p className="mt-1 text-slate-600">{product.name}</p>
        </div>
        <DeleteProductButton action={deleteProductAction} productId={product.id} />
      </div>

      {sp.created === '1' && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Product created. {product.active ? 'It is live in the catalogue.' : 'Publish it when ready.'}
        </div>
      )}
      {sp.saved === '1' && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Changes saved.
        </div>
      )}

      <div className="mt-8">
        <ProductForm
          action={updateProductAction}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initial={{
            id: product.id,
            name: product.name,
            sku: product.sku,
            category_id: product.category_id,
            short_description: product.short_description,
            long_description: product.long_description,
            device_class: product.device_class,
            hs_code: product.hs_code,
            gmdn_code: product.gmdn_code,
            moq: product.moq,
            unit_price_usd: product.unit_price_usd,
            lead_time_days: product.lead_time_days,
            lead_time_days_express: product.lead_time_days_express,
            warranty_months: product.warranty_months,
            active: product.active,
            specs: product.specs,
            images: product.images,
          }}
          submitLabel="Save changes"
          mode="edit"
        />
      </div>
    </div>
  );
}
