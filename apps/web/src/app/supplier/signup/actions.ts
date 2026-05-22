'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase-server';

const SupplierSignupInput = z.object({
  legal_name: z.string().min(2),
  display_name: z.string().min(2),
  website: z.string().url().optional().or(z.literal('')),
  about: z.string().optional(),
  established_year: z.coerce.number().int().optional(),

  factory_city: z.string().min(1),
  factory_province: z.string().min(1),
  factory_address: z.string().optional(),
  employee_count: z.coerce.number().int().optional(),
  annual_revenue_usd: z.coerce.number().optional(),
  min_lead_time_days: z.coerce.number().int().optional(),

  business_license_no: z.string().min(1),
  nmpa_registration_no: z.string().optional(),
  export_license_no: z.string().optional(),

  capabilities: z.array(z.string()).optional(),
  payment_terms_accepted: z.array(z.string()).optional(),
  incoterms_offered: z.array(z.string()).optional(),

  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  password: z.string().min(8),
});

export async function signupSupplierAction(formData: FormData) {
  const input = SupplierSignupInput.parse({
    legal_name: formData.get('legal_name'),
    display_name: formData.get('display_name'),
    website: formData.get('website') || undefined,
    about: formData.get('about') || undefined,
    established_year: formData.get('established_year') || undefined,
    factory_city: formData.get('factory_city'),
    factory_province: formData.get('factory_province'),
    factory_address: formData.get('factory_address') || undefined,
    employee_count: formData.get('employee_count') || undefined,
    annual_revenue_usd: formData.get('annual_revenue_usd') || undefined,
    min_lead_time_days: formData.get('min_lead_time_days') || undefined,
    business_license_no: formData.get('business_license_no'),
    nmpa_registration_no: formData.get('nmpa_registration_no') || undefined,
    export_license_no: formData.get('export_license_no') || undefined,
    capabilities: formData.getAll('capabilities').map(String),
    payment_terms_accepted: formData.getAll('payment_terms_accepted').map(String),
    incoterms_offered: formData.getAll('incoterms_offered').map(String),
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
  });

  // Service-role client for org creation + user creation in one atomic-ish flow.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: orgRow, error: orgErr } = await admin
    .from('organizations')
    .insert({
      kind: 'supplier',
      legal_name: input.legal_name,
      display_name: input.display_name,
      country: 'CN',
      website: input.website || null,
      about: input.about || null,
    })
    .select('id')
    .single();
  if (orgErr || !orgRow) throw new Error(orgErr?.message ?? 'org insert failed');

  await admin.from('supplier_profiles').insert({
    org_id: orgRow.id,
    factory_address: input.factory_address ?? null,
    factory_city: input.factory_city,
    factory_province: input.factory_province,
    nmpa_registration_no: input.nmpa_registration_no ?? null,
    export_license_no: input.export_license_no ?? null,
    business_license_no: input.business_license_no,
    established_year: input.established_year ?? null,
    employee_count: input.employee_count ?? null,
    annual_revenue_usd: input.annual_revenue_usd ?? null,
    min_lead_time_days: input.min_lead_time_days ?? null,
    capabilities: input.capabilities ?? [],
    payment_terms_accepted: input.payment_terms_accepted ?? [],
    incoterms_offered: input.incoterms_offered ?? [],
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

  redirect('/supplier/dashboard?welcome=1');
}
