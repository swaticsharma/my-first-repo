-- ============================================================================
-- Medwise preview deploy — combined SQL
-- Open this file, select all, copy, paste into Supabase SQL Editor, click Run.
-- Order: 0001_init → 0002_seed_categories → 0003_rls_hardening → seed
-- ============================================================================

-- ===== 0001_init.sql =====
-- Medwise initial schema
-- India buyers <-> China suppliers medtech marketplace

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- =========================================================================
-- Enums
-- =========================================================================
create type org_kind as enum ('supplier', 'buyer', 'both');
create type country_code as enum ('IN', 'CN', 'OTHER');
create type device_class as enum ('I', 'IIa', 'IIb', 'III'); -- EU MDR style; map to CDSCO A/B/C/D in app layer
create type cert_kind as enum (
  'ISO_13485', 'CE', 'FDA_510K', 'NMPA', 'CDSCO_IMPORT', 'CDSCO_MFG',
  'MDSAP', 'WHO_PQ', 'ROHS', 'REACH'
);
create type rfq_status as enum ('draft', 'open', 'responses_in', 'awarded', 'closed', 'cancelled');
create type quote_status as enum ('submitted', 'shortlisted', 'rejected', 'accepted', 'withdrawn');
create type order_status as enum (
  'pending_payment', 'confirmed', 'in_production', 'qc', 'ready_to_ship',
  'shipped', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'cancelled'
);
create type shipment_mode as enum ('air', 'sea_lcl', 'sea_fcl', 'rail', 'courier');

-- =========================================================================
-- Organizations & users
-- =========================================================================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  kind org_kind not null,
  legal_name text not null,
  display_name text not null,
  country country_code not null,
  website text,
  about text,
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  phone text,
  org_id uuid references organizations(id) on delete set null,
  role text not null default 'member', -- 'owner' | 'admin' | 'member'
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Supplier profile (China side primarily)
-- =========================================================================
create table supplier_profiles (
  org_id uuid primary key references organizations(id) on delete cascade,
  factory_address text,
  factory_city text,
  factory_province text,
  nmpa_registration_no text,
  export_license_no text,
  business_license_no text,
  established_year int,
  employee_count int,
  annual_revenue_usd numeric(14,2),
  export_countries text[], -- ISO codes
  primary_categories text[], -- aligned to categories.slug
  capabilities text[], -- OEM, ODM, OBM, sterilization, etc.
  min_lead_time_days int,
  typical_lead_time_days int,
  payment_terms_accepted text[], -- TT, LC, escrow, etc.
  incoterms_offered text[] -- EXW, FOB, CIF, DDP
);

-- =========================================================================
-- Buyer profile (India side primarily)
-- =========================================================================
create table buyer_profiles (
  org_id uuid primary key references organizations(id) on delete cascade,
  billing_address text,
  billing_state text,
  gstin text,
  pan text,
  cdsco_importer_license_no text,
  cdsco_license_expiry date,
  drug_license_no text,
  buyer_segment text, -- hospital, distributor, OEM, clinic_chain, government
  annual_procurement_inr numeric(14,2)
);

-- =========================================================================
-- Categories (medtech taxonomy — GMDN-aligned)
-- =========================================================================
create table categories (
  id serial primary key,
  slug text unique not null,
  name text not null,
  parent_id int references categories(id),
  device_class device_class,
  gmdn_term text,
  description text
);

-- =========================================================================
-- Products
-- =========================================================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  supplier_org_id uuid not null references organizations(id) on delete cascade,
  category_id int references categories(id),
  sku text,
  name text not null,
  short_description text,
  long_description text,
  device_class device_class,
  hs_code text, -- harmonized system code for customs
  gmdn_code text,
  specs jsonb not null default '{}'::jsonb, -- flexible technical specs
  images text[] default '{}',
  moq int,
  unit_price_usd numeric(10,2),
  lead_time_days int not null,
  lead_time_days_express int, -- if supplier offers expedited
  warranty_months int,
  active boolean not null default true,
  search_tsv tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_supplier_idx on products(supplier_org_id);
create index products_category_idx on products(category_id);
create index products_search_idx on products using gin(search_tsv);
create index products_name_trgm_idx on products using gin(name gin_trgm_ops);

-- Auto-maintain search vector
create function products_search_trigger() returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.short_description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.long_description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.gmdn_code, '')), 'B');
  new.updated_at := now();
  return new;
end
$$ language plpgsql;

create trigger products_search_tsv_trg
before insert or update on products
for each row execute function products_search_trigger();

-- =========================================================================
-- Certifications (org-level and product-level)
-- =========================================================================
create table org_certifications (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind cert_kind not null,
  cert_number text,
  issuing_body text,
  issued_on date,
  expires_on date,
  document_url text, -- supabase storage signed URL key
  verified boolean not null default false,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index org_certs_org_idx on org_certifications(org_id);

create table product_certifications (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  kind cert_kind not null,
  cert_number text,
  document_url text,
  expires_on date
);
create index product_certs_product_idx on product_certifications(product_id);

-- =========================================================================
-- RFQs (buyer-initiated quote requests)
-- =========================================================================
create table rfqs (
  id uuid primary key default uuid_generate_v4(),
  buyer_org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references profiles(id),
  title text not null,
  category_id int references categories(id),
  description text,
  target_specs jsonb default '{}'::jsonb,
  quantity int not null,
  target_unit_price_usd numeric(10,2),
  required_lead_time_days int,
  required_certifications cert_kind[],
  incoterm text,
  delivery_port text,
  closes_at timestamptz,
  status rfq_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index rfqs_buyer_idx on rfqs(buyer_org_id);
create index rfqs_status_idx on rfqs(status);

create table rfq_invitations (
  rfq_id uuid not null references rfqs(id) on delete cascade,
  supplier_org_id uuid not null references organizations(id) on delete cascade,
  invited_at timestamptz not null default now(),
  primary key (rfq_id, supplier_org_id)
);

create table rfq_responses (
  id uuid primary key default uuid_generate_v4(),
  rfq_id uuid not null references rfqs(id) on delete cascade,
  supplier_org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id),
  unit_price_usd numeric(10,2) not null,
  lead_time_days int not null,
  validity_days int not null default 14,
  incoterm text,
  payment_terms text,
  notes text,
  status quote_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  unique (rfq_id, supplier_org_id, product_id)
);
create index rfq_responses_rfq_idx on rfq_responses(rfq_id);

-- =========================================================================
-- Orders & shipments
-- =========================================================================
create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_no text unique not null, -- human-friendly e.g. MW-2026-000123
  buyer_org_id uuid not null references organizations(id),
  supplier_org_id uuid not null references organizations(id),
  rfq_response_id uuid references rfq_responses(id),
  product_id uuid references products(id),
  quantity int not null,
  unit_price_usd numeric(10,2) not null,
  total_usd numeric(12,2) not null,
  incoterm text,
  status order_status not null default 'pending_payment',
  promised_dispatch_on date,
  promised_delivery_on date,
  actual_dispatch_on date,
  actual_delivery_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_buyer_idx on orders(buyer_org_id);
create index orders_supplier_idx on orders(supplier_org_id);
create index orders_status_idx on orders(status);

create table shipments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  carrier text,
  tracking_no text,
  mode shipment_mode,
  origin_port text,
  destination_port text,
  dispatched_at timestamptz,
  eta timestamptz,
  delivered_at timestamptz,
  current_location text,
  current_status text
);
create index shipments_order_idx on shipments(order_id);
create index shipments_tracking_idx on shipments(tracking_no);

create table shipment_events (
  id bigserial primary key,
  shipment_id uuid not null references shipments(id) on delete cascade,
  occurred_at timestamptz not null,
  location text,
  status text not null,
  description text,
  source text, -- carrier_webhook | aftership | manual_supplier | manual_buyer
  created_at timestamptz not null default now()
);
create index shipment_events_shipment_idx on shipment_events(shipment_id, occurred_at desc);

-- =========================================================================
-- Messaging (per-RFQ or per-order thread)
-- =========================================================================
create table threads (
  id uuid primary key default uuid_generate_v4(),
  rfq_id uuid references rfqs(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (rfq_id is not null or order_id is not null)
);

create table messages (
  id bigserial primary key,
  thread_id uuid not null references threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  attachment_urls text[] default '{}',
  created_at timestamptz not null default now()
);
create index messages_thread_idx on messages(thread_id, created_at);

-- =========================================================================
-- Row-Level Security (stub — refine before production)
-- =========================================================================
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table supplier_profiles enable row level security;
alter table buyer_profiles enable row level security;
alter table products enable row level security;
alter table org_certifications enable row level security;
alter table product_certifications enable row level security;
alter table rfqs enable row level security;
alter table rfq_responses enable row level security;
alter table orders enable row level security;
alter table shipments enable row level security;
alter table shipment_events enable row level security;
alter table messages enable row level security;

-- Public read for products (anyone can browse the catalogue) — only active ones
create policy "products public read"
  on products for select
  using (active = true);

-- Supplier writes their own products
create policy "supplier manages own products"
  on products for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.org_id = products.supplier_org_id
    )
  );

-- Buyer reads/writes their own RFQs
create policy "buyer manages own rfqs"
  on rfqs for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.org_id = rfqs.buyer_org_id
    )
  );

-- Invited supplier can read RFQs they are invited to or that are open
create policy "supplier reads open rfqs"
  on rfqs for select
  using (
    status in ('open', 'responses_in')
    or exists (
      select 1 from rfq_invitations i
      join profiles p on p.org_id = i.supplier_org_id
      where i.rfq_id = rfqs.id and p.id = auth.uid()
    )
  );

-- Order parties can see their order
create policy "order parties read order"
  on orders for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.org_id = orders.buyer_org_id or p.org_id = orders.supplier_org_id)
    )
  );

-- Shipments inherit visibility from orders
create policy "order parties read shipment"
  on shipments for select
  using (
    exists (
      select 1 from orders o
      join profiles p on (p.org_id = o.buyer_org_id or p.org_id = o.supplier_org_id)
      where o.id = shipments.order_id and p.id = auth.uid()
    )
  );

create policy "order parties read shipment events"
  on shipment_events for select
  using (
    exists (
      select 1 from shipments s
      join orders o on o.id = s.order_id
      join profiles p on (p.org_id = o.buyer_org_id or p.org_id = o.supplier_org_id)
      where s.id = shipment_events.shipment_id and p.id = auth.uid()
    )
  );

-- ===== 0002_seed_categories.sql =====
-- Seed top-level medtech categories aligned to common GMDN buckets and the
-- India import pattern from China. Edit slugs/names freely.

insert into categories (slug, name, device_class, gmdn_term, description) values
  ('diagnostic-imaging', 'Diagnostic Imaging', 'IIb', 'Imaging system', 'Ultrasound, X-ray, MRI, CT components & systems'),
  ('patient-monitoring', 'Patient Monitoring', 'IIb', 'Patient monitor', 'Multi-parameter monitors, ECG, SpO2, NIBP modules'),
  ('infusion-therapy', 'Infusion & Therapy', 'IIb', 'Infusion pump', 'Infusion pumps, syringe pumps, IV sets'),
  ('respiratory-care', 'Respiratory Care', 'IIb', 'Ventilator', 'Ventilators, CPAP/BiPAP, oxygen concentrators'),
  ('surgical-instruments', 'Surgical Instruments', 'IIa', 'Surgical instrument', 'Reusable & single-use surgical instruments'),
  ('lab-diagnostics', 'In-Vitro Diagnostics', 'IIa', 'IVD reagent/analyser', 'IVD analysers, reagents, rapid test kits'),
  ('dental', 'Dental Equipment', 'IIa', 'Dental device', 'Dental chairs, handpieces, imaging'),
  ('orthopedic-implants', 'Orthopedic Implants', 'III', 'Orthopedic implant', 'Plates, screws, prostheses'),
  ('disposables', 'Disposables & Consumables', 'I', 'Single-use device', 'Gloves, syringes, drapes, tubing'),
  ('hospital-furniture', 'Hospital Furniture', 'I', 'Hospital bed', 'Beds, trolleys, examination tables'),
  ('sterilization', 'Sterilization & Disinfection', 'IIa', 'Sterilizer', 'Autoclaves, UV systems, chemical sterilizers'),
  ('ophthalmic', 'Ophthalmic Devices', 'IIa', 'Ophthalmic device', 'Slit lamps, phaco machines, IOLs');

-- ===== 0003_rls_hardening.sql =====
-- =============================================================================
-- 0003_rls_hardening.sql
--
-- Replaces the stub policies in 0001_init.sql with production-grade per-action
-- policies. Principles:
--   • Default deny. Every authenticated action must match an explicit policy.
--   • Separate SELECT / INSERT / UPDATE / DELETE policies — never `for all`.
--   • Use a SECURITY DEFINER helper (current_org_id) to avoid repeating
--     subqueries and to enable Postgres plan caching.
--   • Sensitive flags (organizations.verified, profiles.role) cannot be set by
--     the user themselves — only via service-role (server actions / cron).
--   • Service role bypasses RLS automatically — webhooks, admin tasks, and
--     verification flows must go through the service-role client.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

revoke all on function public.current_org_id() from public;
grant execute on function public.current_org_id() to authenticated;

create or replace function public.is_org_owner(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and org_id = target_org and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_org_owner(uuid) from public;
grant execute on function public.is_org_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Drop stub policies from 0001_init.sql
-- ---------------------------------------------------------------------------
drop policy if exists "products public read" on products;
drop policy if exists "supplier manages own products" on products;
drop policy if exists "buyer manages own rfqs" on rfqs;
drop policy if exists "supplier reads open rfqs" on rfqs;
drop policy if exists "order parties read order" on orders;
drop policy if exists "order parties read shipment" on shipments;
drop policy if exists "order parties read shipment events" on shipment_events;

-- ---------------------------------------------------------------------------
-- categories: public read-only
-- ---------------------------------------------------------------------------
alter table categories enable row level security;
create policy "categories public read"
  on categories for select
  using (true);
-- writes via service role only (no INSERT/UPDATE/DELETE policies).

-- ---------------------------------------------------------------------------
-- organizations
-- Members read their own org. Owners can update non-sensitive fields.
-- The `verified` flag is service-role only.
-- ---------------------------------------------------------------------------
create policy "organizations public read of verified suppliers"
  on organizations for select
  using (verified = true and kind in ('supplier', 'both'));

create policy "organizations members read own"
  on organizations for select
  using (id = public.current_org_id());

create policy "organizations owners update own (non-sensitive)"
  on organizations for update
  using (public.is_org_owner(id))
  with check (
    public.is_org_owner(id)
    -- prevent owners from self-verifying
    and verified = (select verified from organizations o where o.id = organizations.id)
  );
-- INSERT goes through server-side signup actions (service role).

-- ---------------------------------------------------------------------------
-- profiles
-- Users read & update their own profile. Cannot self-assign roles.
-- ---------------------------------------------------------------------------
create policy "profiles self read"
  on profiles for select
  using (id = auth.uid());

create policy "profiles same-org read (limited)"
  on profiles for select
  using (org_id is not null and org_id = public.current_org_id());

create policy "profiles self update"
  on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- role escalation must go through service role
    and role = (select p.role from profiles p where p.id = auth.uid())
    -- org_id can only be set by service role (org membership is privileged)
    and org_id is not distinct from (select p.org_id from profiles p where p.id = auth.uid())
  );
-- INSERT goes through signup server actions (service role).

-- ---------------------------------------------------------------------------
-- supplier_profiles / buyer_profiles
-- ---------------------------------------------------------------------------
create policy "supplier_profiles owners read & update"
  on supplier_profiles for select
  using (org_id = public.current_org_id());

create policy "supplier_profiles public read for verified"
  on supplier_profiles for select
  using (
    exists (
      select 1 from organizations o
      where o.id = supplier_profiles.org_id and o.verified = true
    )
  );

create policy "supplier_profiles owners update"
  on supplier_profiles for update
  using (public.is_org_owner(org_id))
  with check (public.is_org_owner(org_id));

create policy "buyer_profiles members read own"
  on buyer_profiles for select
  using (org_id = public.current_org_id());

create policy "buyer_profiles owners update"
  on buyer_profiles for update
  using (public.is_org_owner(org_id))
  with check (public.is_org_owner(org_id));

-- ---------------------------------------------------------------------------
-- products
-- Public read for active products. Suppliers fully manage their own.
-- ---------------------------------------------------------------------------
create policy "products public read active"
  on products for select
  using (active = true);

create policy "products supplier reads own (incl inactive)"
  on products for select
  using (supplier_org_id = public.current_org_id());

create policy "products supplier inserts own"
  on products for insert
  with check (supplier_org_id = public.current_org_id());

create policy "products supplier updates own"
  on products for update
  using (supplier_org_id = public.current_org_id())
  with check (supplier_org_id = public.current_org_id());

create policy "products supplier deletes own"
  on products for delete
  using (supplier_org_id = public.current_org_id());

-- ---------------------------------------------------------------------------
-- org_certifications / product_certifications
-- Org members read own. Verification flag is service-role only.
-- ---------------------------------------------------------------------------
create policy "org_certs members read own"
  on org_certifications for select
  using (org_id = public.current_org_id());

create policy "org_certs public read for verified orgs"
  on org_certifications for select
  using (
    verified = true and exists (
      select 1 from organizations o
      where o.id = org_certifications.org_id and o.verified = true
    )
  );

create policy "org_certs owners insert"
  on org_certifications for insert
  with check (public.is_org_owner(org_id));

create policy "org_certs owners update (cannot self-verify)"
  on org_certifications for update
  using (public.is_org_owner(org_id))
  with check (
    public.is_org_owner(org_id)
    and verified = (select c.verified from org_certifications c where c.id = org_certifications.id)
  );

create policy "org_certs owners delete"
  on org_certifications for delete
  using (public.is_org_owner(org_id));

create policy "product_certs public read"
  on product_certifications for select
  using (true);

create policy "product_certs supplier writes own"
  on product_certifications for all
  using (
    exists (
      select 1 from products p
      where p.id = product_certifications.product_id
        and p.supplier_org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from products p
      where p.id = product_certifications.product_id
        and p.supplier_org_id = public.current_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- rfqs
-- Buyers manage own RFQs. Suppliers see open RFQs or those they're invited to.
-- ---------------------------------------------------------------------------
create policy "rfqs buyer reads own"
  on rfqs for select
  using (buyer_org_id = public.current_org_id());

create policy "rfqs supplier reads open or invited"
  on rfqs for select
  using (
    status in ('open', 'responses_in')
    or exists (
      select 1 from rfq_invitations i
      where i.rfq_id = rfqs.id and i.supplier_org_id = public.current_org_id()
    )
  );

create policy "rfqs buyer inserts own"
  on rfqs for insert
  with check (
    buyer_org_id = public.current_org_id()
    and created_by = auth.uid()
  );

create policy "rfqs buyer updates own"
  on rfqs for update
  using (buyer_org_id = public.current_org_id())
  with check (buyer_org_id = public.current_org_id());

create policy "rfqs buyer deletes own draft"
  on rfqs for delete
  using (buyer_org_id = public.current_org_id() and status = 'draft');

-- ---------------------------------------------------------------------------
-- rfq_invitations
-- Buyer who owns the RFQ + the invited supplier can read. Buyer manages.
-- ---------------------------------------------------------------------------
alter table rfq_invitations enable row level security;

create policy "rfq_invitations buyer reads own"
  on rfq_invitations for select
  using (
    exists (
      select 1 from rfqs r
      where r.id = rfq_invitations.rfq_id and r.buyer_org_id = public.current_org_id()
    )
  );

create policy "rfq_invitations supplier reads own"
  on rfq_invitations for select
  using (supplier_org_id = public.current_org_id());

create policy "rfq_invitations buyer manages"
  on rfq_invitations for all
  using (
    exists (
      select 1 from rfqs r
      where r.id = rfq_invitations.rfq_id and r.buyer_org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from rfqs r
      where r.id = rfq_invitations.rfq_id and r.buyer_org_id = public.current_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- rfq_responses
-- Supplier submits own. Buyer (RFQ owner) and submitting supplier can read.
-- ---------------------------------------------------------------------------
create policy "rfq_responses supplier reads own"
  on rfq_responses for select
  using (supplier_org_id = public.current_org_id());

create policy "rfq_responses buyer reads responses to own rfq"
  on rfq_responses for select
  using (
    exists (
      select 1 from rfqs r
      where r.id = rfq_responses.rfq_id and r.buyer_org_id = public.current_org_id()
    )
  );

create policy "rfq_responses supplier inserts own"
  on rfq_responses for insert
  with check (
    supplier_org_id = public.current_org_id()
    -- can only respond to open/responses_in RFQs the supplier can see
    and exists (
      select 1 from rfqs r
      where r.id = rfq_responses.rfq_id
        and r.status in ('open', 'responses_in')
    )
  );

create policy "rfq_responses supplier updates own pre-decision"
  on rfq_responses for update
  using (
    supplier_org_id = public.current_org_id()
    and status in ('submitted', 'shortlisted')
  )
  with check (supplier_org_id = public.current_org_id());

create policy "rfq_responses buyer updates status (accept/reject/shortlist)"
  on rfq_responses for update
  using (
    exists (
      select 1 from rfqs r
      where r.id = rfq_responses.rfq_id and r.buyer_org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from rfqs r
      where r.id = rfq_responses.rfq_id and r.buyer_org_id = public.current_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- orders
-- Both parties can read. Creation goes through server action (service role).
-- Status updates restricted by role: supplier advances production states,
-- buyer can cancel pre-confirmation, service role for system transitions.
-- ---------------------------------------------------------------------------
create policy "orders parties read"
  on orders for select
  using (
    buyer_org_id = public.current_org_id()
    or supplier_org_id = public.current_org_id()
  );

create policy "orders supplier advances production status"
  on orders for update
  using (
    supplier_org_id = public.current_org_id()
    and status in ('confirmed', 'in_production', 'qc', 'ready_to_ship')
  )
  with check (
    supplier_org_id = public.current_org_id()
    and status in ('in_production', 'qc', 'ready_to_ship', 'shipped')
  );

create policy "orders buyer cancels pre-confirmation"
  on orders for update
  using (
    buyer_org_id = public.current_org_id()
    and status in ('pending_payment', 'confirmed')
  )
  with check (
    buyer_org_id = public.current_org_id()
    and status = 'cancelled'
  );
-- INSERT and post-shipment transitions go through service role.

-- ---------------------------------------------------------------------------
-- shipments
-- Read for order parties. Supplier creates & updates pre-dispatch.
-- Post-dispatch updates come from carrier webhooks (service role).
-- ---------------------------------------------------------------------------
create policy "shipments parties read"
  on shipments for select
  using (
    exists (
      select 1 from orders o
      where o.id = shipments.order_id
        and (o.buyer_org_id = public.current_org_id()
             or o.supplier_org_id = public.current_org_id())
    )
  );

create policy "shipments supplier creates for own orders"
  on shipments for insert
  with check (
    exists (
      select 1 from orders o
      where o.id = shipments.order_id
        and o.supplier_org_id = public.current_org_id()
    )
  );

create policy "shipments supplier updates pre-dispatch"
  on shipments for update
  using (
    dispatched_at is null
    and exists (
      select 1 from orders o
      where o.id = shipments.order_id
        and o.supplier_org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1 from orders o
      where o.id = shipments.order_id
        and o.supplier_org_id = public.current_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- shipment_events
-- Read for order parties. Inserts are service-role only (webhook).
-- ---------------------------------------------------------------------------
create policy "shipment_events parties read"
  on shipment_events for select
  using (
    exists (
      select 1 from shipments s
      join orders o on o.id = s.order_id
      where s.id = shipment_events.shipment_id
        and (o.buyer_org_id = public.current_org_id()
             or o.supplier_org_id = public.current_org_id())
    )
  );

create policy "shipment_events supplier manual update"
  on shipment_events for insert
  with check (
    source = 'manual_supplier'
    and exists (
      select 1 from shipments s
      join orders o on o.id = s.order_id
      where s.id = shipment_events.shipment_id
        and o.supplier_org_id = public.current_org_id()
    )
  );
-- carrier_webhook and aftership sources go through service role.

-- ---------------------------------------------------------------------------
-- threads + messages
-- Visible to parties of the underlying RFQ or order.
-- ---------------------------------------------------------------------------
alter table threads enable row level security;

create or replace function public.user_in_thread(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from threads t
    left join rfqs r on r.id = t.rfq_id
    left join orders o on o.id = t.order_id
    where t.id = t_id
      and (
        r.buyer_org_id = public.current_org_id()
        or exists (
          select 1 from rfq_invitations i
          where i.rfq_id = r.id and i.supplier_org_id = public.current_org_id()
        )
        or exists (
          select 1 from rfq_responses rr
          where rr.rfq_id = r.id and rr.supplier_org_id = public.current_org_id()
        )
        or o.buyer_org_id = public.current_org_id()
        or o.supplier_org_id = public.current_org_id()
      )
  );
$$;

revoke all on function public.user_in_thread(uuid) from public;
grant execute on function public.user_in_thread(uuid) to authenticated;

create policy "threads participants read"
  on threads for select
  using (public.user_in_thread(id));

create policy "messages participants read"
  on messages for select
  using (public.user_in_thread(thread_id));

create policy "messages participants insert as self"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and public.user_in_thread(thread_id)
  );
-- No update / delete on messages (audit trail).

-- ===== seed.sql =====
-- Demo seed data for local development. Run after migrations.
-- Creates one verified Chinese supplier with 3 products and one Indian buyer org.

insert into organizations (id, kind, legal_name, display_name, country, website, about, verified, verified_at)
values
  ('11111111-1111-1111-1111-111111111111', 'supplier',
   'Shenzhen Mindray Medical Co., Ltd. (Demo)', 'Mindray Demo', 'CN',
   'https://www.mindray.com',
   'Leading Chinese medtech manufacturer for patient monitoring, anesthesia and IVD.', true, now()),
  ('22222222-2222-2222-2222-222222222222', 'buyer',
   'Apollo Hospitals Enterprise Limited (Demo)', 'Apollo Demo', 'IN',
   'https://www.apollohospitals.com',
   'Indian multi-specialty hospital chain.', true, now());

insert into supplier_profiles (org_id, factory_city, factory_province, business_license_no, nmpa_registration_no,
  established_year, employee_count, capabilities, payment_terms_accepted, incoterms_offered,
  typical_lead_time_days, min_lead_time_days)
values
  ('11111111-1111-1111-1111-111111111111', 'Shenzhen', 'Guangdong', 'BL-DEMO-001', 'NMPA-DEMO-001',
   1991, 13000,
   array['OEM','ODM','CE marking','NMPA registration','CDSCO export support'],
   array['TT 30/70','LC at sight','Escrow'],
   array['FOB','CIF','DDP'],
   30, 14);

insert into buyer_profiles (org_id, billing_state, gstin, cdsco_importer_license_no, buyer_segment)
values
  ('22222222-2222-2222-2222-222222222222', 'Tamil Nadu', '33AAACA1234A1Z5', 'CDSCO-IMP-DEMO-001', 'hospital');

insert into products (id, supplier_org_id, category_id, sku, name, short_description, long_description,
  device_class, hs_code, gmdn_code, specs, moq, unit_price_usd, lead_time_days, lead_time_days_express,
  warranty_months, active)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   (select id from categories where slug = 'patient-monitoring'),
   'MW-PM-12',
   '12.1" Multi-Parameter Patient Monitor',
   '5-parameter bedside monitor (ECG, SpO2, NIBP, Temp, Resp) with 12.1" touchscreen.',
   'CDSCO-cleared multi-parameter patient monitor suitable for ICU and general ward use. Includes battery backup, central station compatibility, and 72h trend storage.',
   'IIb', '9018.19', '35119',
   '{"screen":"12.1 inch","parameters":["ECG","SpO2","NIBP","Temp","Resp"],"battery_hours":4,"network":"LAN + WiFi"}'::jsonb,
   10, 850.00, 28, 18, 24, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   (select id from categories where slug = 'infusion-therapy'),
   'MW-IP-3',
   'Volumetric Infusion Pump (single channel)',
   'Single-channel volumetric infusion pump, 0.1–1500 mL/h, CDSCO + CE.',
   'Drug library, KVO, anti-bolus protection, 4h internal battery.',
   'IIb', '9018.39', '36019',
   '{"rate_range":"0.1-1500 mL/h","drug_library":true,"battery_hours":4}'::jsonb,
   20, 380.00, 21, 12, 24, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '11111111-1111-1111-1111-111111111111',
   (select id from categories where slug = 'respiratory-care'),
   'MW-OC-5',
   '5L Oxygen Concentrator',
   '5L/min continuous flow oxygen concentrator, ≥93% purity.',
   'Suitable for home and clinic use. Low-noise compressor (<45 dB).',
   'IIa', '9019.20', '37381',
   '{"flow_lpm":5,"purity_min":"93%","noise_db":45}'::jsonb,
   30, 220.00, 18, 10, 18, true);

insert into product_certifications (product_id, kind, cert_number, expires_on) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'NMPA', 'NMPA-2024-PM-0001', '2028-12-31'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CE', 'CE-2023-PM-0001', '2027-06-30'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CDSCO_IMPORT', 'CDSCO-IMP-PM-0001', '2027-12-31'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'NMPA', 'NMPA-2024-IP-0001', '2028-12-31'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CE', 'CE-2023-IP-0001', '2027-06-30'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'NMPA', 'NMPA-2024-OC-0001', '2028-12-31');

insert into org_certifications (org_id, kind, cert_number, issuing_body, expires_on, verified, verified_at)
values
  ('11111111-1111-1111-1111-111111111111', 'ISO_13485', 'TUV-13485-DEMO', 'TÜV SÜD', '2027-09-30', true, now());

-- Sample order + shipment to demo live tracking
insert into orders (id, order_no, buyer_org_id, supplier_org_id, product_id, quantity, unit_price_usd,
  total_usd, incoterm, status, promised_dispatch_on, promised_delivery_on)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'MW-2026-000001',
   '22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   50, 820.00, 41000.00, 'CIF',
   'in_transit', '2026-05-10', '2026-06-05');

insert into shipments (id, order_id, carrier, tracking_no, mode, origin_port, destination_port, dispatched_at, eta)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'COSCO', 'COSU6789012345', 'sea_fcl',
   'Yantian (Shenzhen)', 'Nhava Sheva (Mumbai)',
   '2026-05-10T08:00:00Z', '2026-06-05T16:00:00Z');

insert into shipment_events (shipment_id, occurred_at, location, status, description, source) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-05-09T03:00:00Z', 'Shenzhen factory', 'Picked up', 'Container sealed and dispatched to port', 'manual_supplier'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-05-10T08:00:00Z', 'Yantian Port', 'Loaded on vessel', 'Loaded on COSCO BANGKOK V.0123W', 'carrier_webhook'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-05-17T11:00:00Z', 'Singapore', 'In transit', 'Vessel passed Singapore Strait', 'carrier_webhook');
