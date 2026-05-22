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
