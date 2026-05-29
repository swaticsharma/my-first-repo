'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase-server';

const BuyerSignupInput = z.object({
  legal_name: z.string().min(2),
  display_name: z.string().min(2),
  website: z.string().url().optional().or(z.literal('')),
  about: z.string().optional(),
  buyer_segment: z.string().min(1),

  billing_address: z.string().min(5),
  billing_state: z.string().min(2),
  annual_procurement_inr: z.coerce.number().optional(),
  gstin: z.string().length(15),
  pan: z.string().length(10),

  cdsco_importer_license_no: z.string().optional(),
  cdsco_license_expiry: z.string().optional(),
  drug_license_no: z.string().optional(),

  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(8),
});

export async function signupBuyerAction(formData: FormData) {
  const input = BuyerSignupInput.parse({
    legal_name: formData.get('legal_name'),
    display_name: formData.get('display_name'),
    website: formData.get('website') || undefined,
    about: formData.get('about') || undefined,
    buyer_segment: formData.get('buyer_segment'),
    billing_address: formData.get('billing_address'),
    billing_state: formData.get('billing_state'),
    annual_procurement_inr: formData.get('annual_procurement_inr') || undefined,
    gstin: String(formData.get('gstin') ?? '').toUpperCase(),
    pan: String(formData.get('pan') ?? '').toUpperCase(),
    cdsco_importer_license_no: formData.get('cdsco_importer_license_no') || undefined,
    cdsco_license_expiry: formData.get('cdsco_license_expiry') || undefined,
    drug_license_no: formData.get('drug_license_no') || undefined,
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
  });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: orgRow, error: orgErr } = await admin
    .from('organizations')
    .insert({
      kind: 'buyer',
      legal_name: input.legal_name,
      display_name: input.display_name,
      country: 'IN',
      website: input.website || null,
      about: input.about || null,
    })
    .select('id')
    .single();
  if (orgErr || !orgRow) throw new Error(orgErr?.message ?? 'org insert failed');

  await admin.from('buyer_profiles').insert({
    org_id: orgRow.id,
    billing_address: input.billing_address,
    billing_state: input.billing_state,
    gstin: input.gstin,
    pan: input.pan,
    cdsco_importer_license_no: input.cdsco_importer_license_no ?? null,
    cdsco_license_expiry: input.cdsco_license_expiry || null,
    drug_license_no: input.drug_license_no ?? null,
    buyer_segment: input.buyer_segment,
    annual_procurement_inr: input.annual_procurement_inr ?? null,
  });

  const db = await getSupabaseServer();
  const { data: signup, error: signErr } = await db.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.full_name } },
  });
  if (signErr || !signup.user) throw new Error(signErr?.message ?? 'signup failed');

  await admin.from('profiles').insert({
    id: signup.user.id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone,
    org_id: orgRow.id,
    role: 'owner',
  });

  redirect('/buyer/dashboard?welcome=1');
}
