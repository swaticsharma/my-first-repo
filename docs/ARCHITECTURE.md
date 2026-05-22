# Medwise — architecture

## High-level

```
┌────────────────┐        ┌────────────────┐
│  Web (Next.js) │        │ Mobile (Expo)  │
└──────┬─────────┘        └────────┬───────┘
       │   shares: @medwise/types  │
       │           @medwise/db     │
       │           @medwise/ui     │
       └───────────┬───────────────┘
                   │
                   ▼
           ┌───────────────┐
           │   Supabase    │
           │ Postgres + RLS│
           │   Auth        │
           │   Storage     │
           │   Realtime    │
           └───────┬───────┘
                   │
        ┌──────────┴───────────┐
        │  Carrier webhooks    │   Razorpay / Stripe (Phase 3)
        │  /api/webhooks/...   │   AfterShip (Phase 2)
        └──────────────────────┘
```

## Key domain objects

| Entity | Role |
|---|---|
| `organizations` | Buyer or supplier company |
| `supplier_profiles` | China-side regulatory + commercial info |
| `buyer_profiles` | India-side GSTIN, CDSCO license |
| `products` | Catalogue items with specs JSONB, HS code, GMDN |
| `org_certifications` / `product_certifications` | ISO 13485, NMPA, CDSCO, CE, FDA, MDSAP |
| `rfqs` + `rfq_responses` | Buyer requirement → supplier quote |
| `orders` | Quote accepted → live order |
| `shipments` + `shipment_events` | Live tracking; events feed Realtime channel |

## RLS principles

- Catalogue is public (read-only) for active products.
- Suppliers can only write their own products and read RFQs they're invited to or that are open.
- Buyers can only read/write their own RFQs and orders.
- Order parties (buyer org + supplier org) can read the order, its shipments, and shipment events.
- All write paths go through Next.js server actions or webhook endpoints, never direct from client with anon key.

## Carrier webhook flow

Normalized payload shape (see `/api/webhooks/shipment`):

```json
{
  "tracking_no": "COSU6789012345",
  "occurred_at": "2026-05-22T09:30:00Z",
  "status": "Customs cleared",
  "location": "Nhava Sheva, India",
  "description": "Customs released",
  "source": "aftership"
}
```

Adapt per-carrier by adding a transform layer at `/api/webhooks/aftership`, `/api/webhooks/fedex`, etc.,
that converts to the normalized shape and forwards.

## Search

`products.search_tsv` is auto-populated by trigger from name/short_description/long_description/gmdn_code.
The `gin(search_tsv)` and `gin(name gin_trgm_ops)` indexes support both full-text and substring search.

For multilingual (English ↔ Chinese product names), switch the trigger to use `'simple'` and add a
language-specific column or move to Meilisearch when the catalogue grows.

## Payment design (Phase 3)

```
Buyer (INR) → Razorpay → Medwise escrow (Razorpay X)
                              │
                              ├── on milestone (dispatch / delivery)
                              ▼
                       Supplier (USD) ← Stripe Connect → CN bank
```

Do NOT hold customer funds without an escrow license. Use an RBI-authorized escrow partner (e.g.,
ICICI, RazorpayX) for the India leg and Stripe Connect for the China payout leg.
```
