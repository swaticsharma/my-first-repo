'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase-server';

const RfqInput = z.object({
  title: z.string().min(4),
  category_id: z.coerce.number().int().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  target_unit_price_usd: z.coerce.number().positive().optional(),
  required_lead_time_days: z.coerce.number().int().positive().optional(),
  incoterm: z.string().optional(),
  delivery_port: z.string().optional(),
  required_certifications: z.array(z.string()).optional(),
  closes_at: z.string().optional(),
});

export async function createRfqAction(formData: FormData) {
  const parsed = RfqInput.parse({
    title: formData.get('title'),
    category_id: formData.get('category_id') || undefined,
    description: formData.get('description') || undefined,
    quantity: formData.get('quantity'),
    target_unit_price_usd: formData.get('target_unit_price_usd') || undefined,
    required_lead_time_days: formData.get('required_lead_time_days') || undefined,
    incoterm: formData.get('incoterm') || undefined,
    delivery_port: formData.get('delivery_port') || undefined,
    required_certifications: formData.getAll('required_certifications').map(String),
    closes_at: formData.get('closes_at') || undefined,
  });

  const db = await getSupabaseServer();
  const { data: user } = await db.auth.getUser();
  if (!user?.user) redirect('/login?next=/rfq/new');

  const { data: profile } = await db
    .from('profiles')
    .select('org_id')
    .eq('id', user.user.id)
    .single();

  if (!profile?.org_id) {
    redirect('/onboarding/buyer');
  }

  const { data: rfq, error } = await db
    .from('rfqs')
    .insert({
      buyer_org_id: profile.org_id,
      created_by: user.user.id,
      title: parsed.title,
      category_id: parsed.category_id ?? null,
      description: parsed.description ?? null,
      quantity: parsed.quantity,
      target_unit_price_usd: parsed.target_unit_price_usd ?? null,
      required_lead_time_days: parsed.required_lead_time_days ?? null,
      incoterm: parsed.incoterm ?? null,
      delivery_port: parsed.delivery_port ?? null,
      required_certifications: parsed.required_certifications?.length
        ? parsed.required_certifications
        : null,
      closes_at: parsed.closes_at ? new Date(parsed.closes_at).toISOString() : null,
      status: 'open',
    })
    .select('id')
    .single();

  if (error || !rfq) {
    throw new Error(error?.message ?? 'Failed to create RFQ');
  }

  redirect(`/rfq/${rfq.id}`);
}
