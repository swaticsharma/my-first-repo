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
