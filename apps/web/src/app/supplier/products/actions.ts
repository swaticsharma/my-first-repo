'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSupplier } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Shared validation for create + update
// ---------------------------------------------------------------------------
const ProductInput = z.object({
  name: z.string().min(3),
  sku: z.string().optional(),
  category_id: z.coerce.number().int().optional(),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  device_class: z.enum(['I', 'IIa', 'IIb', 'III']).optional(),
  hs_code: z.string().optional(),
  gmdn_code: z.string().optional(),
  moq: z.coerce.number().int().positive().optional(),
  unit_price_usd: z.coerce.number().positive().optional(),
  lead_time_days: z.coerce.number().int().positive(),
  lead_time_days_express: z.coerce.number().int().positive().optional(),
  warranty_months: z.coerce.number().int().nonnegative().optional(),
  active: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === true || v === 'true' || v === 'on')
    .optional(),
  specs: z.record(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
});

function extractInput(formData: FormData) {
  // Specs come in as repeated spec_key/spec_value pairs
  const specKeys = formData.getAll('spec_key').map(String);
  const specVals = formData.getAll('spec_value').map(String);
  const specs: Record<string, string> = {};
  specKeys.forEach((k, i) => {
    const key = k.trim();
    const val = (specVals[i] ?? '').trim();
    if (key && val) specs[key] = val;
  });

  const images = formData
    .getAll('image_url')
    .map((v) => String(v).trim())
    .filter(Boolean);

  return ProductInput.parse({
    name: formData.get('name'),
    sku: formData.get('sku') || undefined,
    category_id: formData.get('category_id') || undefined,
    short_description: formData.get('short_description') || undefined,
    long_description: formData.get('long_description') || undefined,
    device_class: (formData.get('device_class') as any) || undefined,
    hs_code: formData.get('hs_code') || undefined,
    gmdn_code: formData.get('gmdn_code') || undefined,
    moq: formData.get('moq') || undefined,
    unit_price_usd: formData.get('unit_price_usd') || undefined,
    lead_time_days: formData.get('lead_time_days'),
    lead_time_days_express: formData.get('lead_time_days_express') || undefined,
    warranty_months: formData.get('warranty_months') || undefined,
    active: formData.get('active') ?? undefined,
    specs,
    images,
  });
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createProductAction(formData: FormData) {
  const session = await requireSupplier('/supplier/products/new');
  const input = extractInput(formData);
  const db = await getSupabaseServer();

  const { data, error } = await db
    .from('products')
    .insert({
      supplier_org_id: session.orgId,
      name: input.name,
      sku: input.sku ?? null,
      category_id: input.category_id ?? null,
      short_description: input.short_description ?? null,
      long_description: input.long_description ?? null,
      device_class: input.device_class ?? null,
      hs_code: input.hs_code ?? null,
      gmdn_code: input.gmdn_code ?? null,
      moq: input.moq ?? null,
      unit_price_usd: input.unit_price_usd ?? null,
      lead_time_days: input.lead_time_days,
      lead_time_days_express: input.lead_time_days_express ?? null,
      warranty_months: input.warranty_months ?? null,
      active: input.active ?? false,
      specs: input.specs ?? {},
      images: input.images ?? [],
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'failed to create product');

  revalidatePath('/supplier/products');
  revalidatePath('/catalogue');
  redirect(`/supplier/products/${data.id}/edit?created=1`);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export async function updateProductAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('missing id');
  const session = await requireSupplier(`/supplier/products/${id}/edit`);
  const input = extractInput(formData);
  const db = await getSupabaseServer();

  const { error } = await db
    .from('products')
    .update({
      name: input.name,
      sku: input.sku ?? null,
      category_id: input.category_id ?? null,
      short_description: input.short_description ?? null,
      long_description: input.long_description ?? null,
      device_class: input.device_class ?? null,
      hs_code: input.hs_code ?? null,
      gmdn_code: input.gmdn_code ?? null,
      moq: input.moq ?? null,
      unit_price_usd: input.unit_price_usd ?? null,
      lead_time_days: input.lead_time_days,
      lead_time_days_express: input.lead_time_days_express ?? null,
      warranty_months: input.warranty_months ?? null,
      active: input.active ?? false,
      specs: input.specs ?? {},
      images: input.images ?? [],
    })
    .eq('id', id)
    .eq('supplier_org_id', session.orgId);

  if (error) throw new Error(error.message);

  revalidatePath('/supplier/products');
  revalidatePath(`/products/${id}`);
  revalidatePath('/catalogue');
  redirect(`/supplier/products/${id}/edit?saved=1`);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
export async function deleteProductAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('missing id');
  const session = await requireSupplier('/supplier/products');
  const db = await getSupabaseServer();

  const { error } = await db
    .from('products')
    .delete()
    .eq('id', id)
    .eq('supplier_org_id', session.orgId);

  if (error) throw new Error(error.message);

  revalidatePath('/supplier/products');
  revalidatePath('/catalogue');
  redirect('/supplier/products?deleted=1');
}

// ---------------------------------------------------------------------------
// Toggle active
// ---------------------------------------------------------------------------
export async function toggleProductActiveAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const next = String(formData.get('active') ?? 'false') === 'true';
  if (!id) throw new Error('missing id');
  const session = await requireSupplier('/supplier/products');
  const db = await getSupabaseServer();

  const { error } = await db
    .from('products')
    .update({ active: next })
    .eq('id', id)
    .eq('supplier_org_id', session.orgId);

  if (error) throw new Error(error.message);

  revalidatePath('/supplier/products');
  revalidatePath('/catalogue');
  redirect('/supplier/products');
}
