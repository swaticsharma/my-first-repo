# Medwise

Cross-border medtech marketplace — **India buyers ↔ China suppliers** — with real lead times and live shipment tracking.

## What this is

A monorepo containing:

- **`apps/web`** — Next.js 15 web app (catalogue, RFQ, orders, supplier onboarding)
- **`apps/mobile`** — Expo / React Native app (browse, RFQs, order tracking on iOS/Android)
- **`packages/types`** — shared TypeScript domain types
- **`packages/db`** — Supabase client + typed query helpers
- **`packages/ui`** — shared formatters and small UI utils
- **`supabase/migrations`** — Postgres schema (Supabase-flavored, including RLS)
- **`supabase/seed.sql`** — demo data (1 supplier, 3 products, 1 buyer, 1 shipment with live events)

## Phases

This v1 is structured to ship in phases:

| Phase | Scope | Status |
|---|---|---|
| 0 | Monorepo, schema, catalogue, supplier onboarding, RFQ create | Scaffolded |
| 1 | Quote responses, in-app messaging, supplier product CRUD | Stubbed |
| 2 | Real-time shipment tracking, carrier webhooks (AfterShip / direct) | Endpoint scaffolded; needs carrier integration |
| 3 | Payments (Razorpay INR + Stripe Connect USD), escrow partner, GST invoicing | Not started |

## Prerequisites

- Node 20+
- pnpm 9+ (`npm i -g pnpm`)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Xcode / Android Studio for mobile native builds (Expo Go works for dev)

## Setup

```bash
cd /Users/swati.c.sharma/Documents/medwise

# 1. Install dependencies
pnpm install

# 2. Create a Supabase project at https://supabase.com
#    Copy URL + anon key + service-role key into .env (start from .env.example)
cp .env.example .env

# 3. Apply database schema + seed
supabase link --project-ref YOUR-REF
supabase db push                       # applies migrations
psql "$DATABASE_URL" -f supabase/seed.sql   # or paste into the SQL editor

# 4. Run web (http://localhost:3000)
pnpm dev:web

# 5. Run mobile (separate terminal)
pnpm dev:mobile
# scan the QR with Expo Go, or press 'i'/'a'
```

## Demo flow

1. **Browse the catalogue** — visit `/catalogue`, you'll see the 3 seeded products from the demo supplier.
2. **Product detail** — open the patient monitor and see specs + certifications (NMPA, CE, CDSCO Import).
3. **Live tracking** — visit `/orders/dddddddd-dddd-dddd-dddd-dddddddddddd` (the seeded order) to see the progress bar and shipment events.
4. **Real-time push** — open another terminal and POST to the webhook to see events appear live without refresh:

```bash
curl -X POST http://localhost:3000/api/webhooks/shipment \
  -H 'content-type: application/json' \
  -H "x-medwise-webhook-secret: $(echo $SUPABASE_SERVICE_ROLE_KEY | cut -c1-16)" \
  -d '{
    "tracking_no": "COSU6789012345",
    "occurred_at": "2026-05-22T09:30:00Z",
    "status": "Customs cleared",
    "location": "Nhava Sheva, India",
    "description": "Customs released, awaiting last-mile dispatch",
    "source": "carrier_webhook"
  }'
```

Refresh `/orders/.../` — the event appears at the top of the tracking timeline, and order status auto-advances.

## Architecture notes

- **Auth:** Supabase Auth (email + password to start). Add OAuth or phone OTP later.
- **RLS:** stubbed in `0001_init.sql`. Review and tighten before production — especially `orders` and `messages`.
- **Search:** Postgres FTS via `products.search_tsv`. Swap to Meilisearch in Phase 2 when catalogue >10k SKUs.
- **Realtime tracking:** Supabase Realtime channel on `shipment_events`. Carrier webhooks normalize to this table.
- **Payments (Phase 3):** plan is Razorpay for INR collection from Indian buyers, Stripe Connect for USD payouts to Chinese suppliers, and a licensed escrow partner — **do not build escrow yourself**, the regulatory burden is enormous.

## Regulatory checklist (do not ship without)

- [ ] CDSCO importer license verification flow (block buyers from ordering Class IIb+ without one on file)
- [ ] NMPA registration verification flow for suppliers
- [ ] HS code + GST invoice generation per order (India side)
- [ ] DSCSA / UDI capture for relevant SKUs
- [ ] DPDP (India) + PIPL (China) data residency & consent flows
- [ ] Tax: GST IGST on imports, China VAT export refund support flows

## Next steps

In rough priority order:

1. Wire up Supabase Auth confirmation emails + buyer onboarding flow (mirror of supplier signup)
2. Supplier product CRUD UI (`/supplier/products/new`)
3. RFQ response workflow + comparison UI for buyers
4. Quote → Order conversion flow
5. AfterShip (or direct carrier) integration for shipment events
6. Razorpay + Stripe Connect integration
