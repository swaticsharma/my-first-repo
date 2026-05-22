# Medwise — deployment runbook

Step-by-step from a working scaffold to a published web app + iOS + Android.

> **Estimated calendar time:** 3–4 weeks (mostly Apple/Google review queues, not engineering work).
> **Estimated infra cost (year 1):** ~₹35,000–₹50,000 (≈ $400–$600).

---

## 0. Prerequisites (one-time accounts)

| Account | URL | Cost | Why |
|---|---|---|---|
| GitHub | github.com | Free | Source of truth (already done) |
| Vercel | vercel.com | Free → $20/mo | Hosts the web app |
| Supabase | supabase.com | Free → $25/mo | DB + Auth + Storage + Realtime |
| Expo / EAS | expo.dev | Free → $19/mo | Mobile builds |
| Apple Developer | developer.apple.com | **$99/year** | iOS App Store |
| Google Play Console | play.google.com/console | **$25 one-time** | Android Play Store |
| Domain registrar | Cloudflare / Namecheap | ~$12/year | e.g., medwise.com |
| Resend | resend.com | Free → $20/mo | Transactional email |
| Sentry | sentry.io | Free dev | Error monitoring |

---

## 1. Production Supabase

```bash
# In supabase.com dashboard:
# • New project, region: Mumbai (ap-south-1) — closer to Indian buyers + DPDP-friendlier
# • Upgrade to Pro ($25/mo) BEFORE launch — free tier auto-pauses after 7d inactive
# • Settings → Auth → Site URL = https://medwise.com (your prod domain)
# • Settings → Auth → Enable email confirmations
# • Settings → API → copy URL, anon key, service_role key (keep service_role secret!)
```

Apply schema:

```bash
brew install supabase/tap/supabase   # one-time
cd /Users/swati.c.sharma/Documents/medwise
supabase link --project-ref YOUR-PROD-REF
supabase db push                      # applies migrations in order
```

CI also runs migrations against a throwaway Postgres on every PR that touches `supabase/` — see `.github/workflows/db-migrations.yml`.

Storage buckets (create in dashboard):

| Bucket | Public? | Used for |
|---|---|---|
| `certificates` | private (signed URLs only) | ISO 13485, NMPA, CDSCO, CE, FDA PDFs |
| `product-images` | public | Product photos in catalogue |
| `kyc` | private | GST, PAN, business license scans |

---

## 2. Web app on Vercel

### 2a. Connect the repo

1. vercel.com → Add New → Project → Import `swaticsharma/my-first-repo`
2. **Framework Preset:** Next.js (auto-detected via `vercel.json`)
3. **Root Directory:** leave as repo root (the `vercel.json` handles monorepo paths)
4. **Build & Output Settings:** auto-loaded from `vercel.json`
5. **Environment Variables** (Production scope):
   ```
   NEXT_PUBLIC_SUPABASE_URL        = https://YOUR-PROD.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY   = ey...
   SUPABASE_SERVICE_ROLE_KEY       = ey...
   RAZORPAY_KEY_ID                 = (Phase 3)
   RAZORPAY_KEY_SECRET             = (Phase 3)
   STRIPE_SECRET_KEY               = (Phase 3)
   ```
6. Click **Deploy**. First build takes ~3 min.

### 2b. Custom domain

1. Buy domain at Cloudflare (registrar at cost, ~$10/yr for `.com`).
2. Vercel → Project → Settings → Domains → Add `medwise.com` and `www.medwise.com`.
3. Vercel shows CNAME / A records — paste them into your DNS provider.
4. Update Supabase Auth → Site URL to `https://medwise.com`.

### 2c. CI

`.github/workflows/ci.yml` runs typecheck + lint + a web build smoke test on every PR. Vercel does its own deploy build separately — CI catches issues before Vercel even tries.

---

## 3. Mobile apps via EAS

### 3a. First-time setup

```bash
npm i -g eas-cli
cd /Users/swati.c.sharma/Documents/medwise/apps/mobile
eas login
eas init     # creates an EAS project, writes projectId into app.json
```

Edit `apps/mobile/eas.json` and replace the placeholder env values with your real Supabase URL + anon key for each profile (development, preview, production).

### 3b. iOS

```bash
# First build — EAS will:
#   • generate a bundle identifier (com.medwise.app)
#   • prompt for Apple Developer credentials ($99/year)
#   • create signing cert + provisioning profile (managed credentials)
eas build --platform ios --profile production

# Once App Store Connect listing exists (see 3d):
eas submit --platform ios --latest
```

### 3c. Android

```bash
# Generate signing key (managed by EAS)
eas build --platform android --profile production

# After uploading first APK/AAB manually to set up Play Console listing:
eas submit --platform android --latest
```

### 3d. Store listings (the slow part)

**Apple App Store Connect** needs, for review:
- App name + subtitle + description (multi-language optional)
- Keywords (100 chars)
- Privacy Policy URL (required) → host `medwise.com/privacy`
- Support URL → `medwise.com/support`
- Screenshots: 6.7" iPhone (1290×2796), 5.5" iPhone (1242×2208), and 12.9" iPad if supporting iPad
- **Demo account credentials** — Apple reviewers need a working login. Create one buyer + one supplier in production Supabase with `verified=true`.
- App Privacy disclosures (what data you collect, used for what) — extensive form
- Encryption export compliance (Medwise uses HTTPS → "Yes, but exempt")

**Google Play Console** needs:
- Title (50 chars), short description (80), full description (4000)
- Privacy Policy URL
- Screenshots: phone (min 2), 7" tablet, 10" tablet
- Content rating questionnaire
- Data Safety form
- Target API level (Expo SDK 51 = Android 14 / API 34 — currently meets requirement)

> **Review timelines (2026):** Apple 24–48h typical, up to 7 days first-time. Google Play 24–72h.

---

## 4. Email + monitoring

### Resend (transactional email)

1. Sign up at resend.com, verify your domain (`medwise.com`) via DNS.
2. Supabase → Auth → SMTP Settings → custom SMTP with Resend's credentials.
3. Sender: `noreply@medwise.com`. Reply-to: `support@medwise.com`.

### Sentry

```bash
# Web
cd apps/web
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# Mobile
cd ../mobile
pnpm add @sentry/react-native
npx @sentry/wizard@latest -i reactNative
```

Both wizards prompt for your Sentry DSN and add config files. Add the DSN to Vercel + EAS env vars.

---

## 5. Pre-launch checklist

### Legal & compliance

- [ ] Privacy Policy published at `/privacy` (DPDP + Apple/Google compliant)
- [ ] Terms of Service published at `/terms`
- [ ] Cookie/consent banner on web (if targeting EU traffic, GDPR; for India, DPDP banner)
- [ ] DPDP Act: data export endpoint (`/account/export`), deletion endpoint, breach-notification SOP
- [ ] PIPL: consent capture for Chinese supplier individuals (separate from org consent)
- [ ] GST registration if processing payments through Indian entity
- [ ] CDSCO importer license verification flow gates Class IIb+ orders for buyers
- [ ] NMPA registration verified for every supplier before products go live

### Security

- [ ] **RLS hardened** — `0003_rls_hardening.sql` applied to production
- [ ] Service role key only in server-side env (never `NEXT_PUBLIC_*`)
- [ ] Webhook signing secret rotated and per-carrier (replace the dev hack in `/api/webhooks/shipment`)
- [ ] Rate limiting on RFQ create + webhook (Vercel WAF or Upstash)
- [ ] Supabase Auth: password policy, MFA optional, brute-force lockout
- [ ] Backups: Supabase Pro daily backups, retention ≥14 days
- [ ] Sentry installed on web + mobile

### Product

- [ ] At least 10 verified Chinese suppliers onboarded with ≥3 products each
- [ ] At least 5 verified Indian buyer organizations onboarded
- [ ] Smoke test the full flow: signup → browse → RFQ → quote → order → tracking
- [ ] Demo credentials for App Store / Play Store review baked into prod data
- [ ] Customer support inbox (`support@medwise.com`) monitored

---

## 6. Soft-launch sequence

| Week | Channel | Audience | Goal |
|---|---|---|---|
| 1–2 | TestFlight + Play Internal | 5–10 invited contacts | Crash-free sessions, basic UX feedback |
| 2–4 | Web closed beta (signup gate) | 20–30 invited buyers/suppliers | First real RFQs end-to-end |
| 4–6 | App Store + Play Store public, web open | Organic + word of mouth | First paid order |
| 6+ | Marketing launch | LinkedIn, MedTech India events, CMEF | Scale onboarding |

---

## 7. Day-2 operations

### Deploys

- Push to `main` → Vercel deploys web automatically (~2 min)
- Push to `main` → CI runs typecheck + DB migration smoke (~3 min)
- Mobile: `eas build --profile production` then `eas submit` (manual gate — you choose when to ship)

### Database migrations

```bash
# Create a new migration
supabase migration new short_descriptive_name
# Edit the generated SQL file in supabase/migrations/
git add supabase/migrations/...
git commit -m "db: <description>"
git push
# CI proves it applies cleanly against ephemeral Postgres.
# Then in prod:
supabase db push
```

Never edit a migration after it's been applied to production. Add a new one.

### Rolling back

- **Web:** Vercel → Deployments → click an older deploy → Promote to Production. ~30s.
- **Mobile:** OTA updates via Expo Updates for JS-only changes. Native rollbacks require resubmitting an older binary (slow).
- **DB:** never roll back schema in place — write a forward-fix migration.

### On-call basics

- Sentry alerts → Slack/email
- Supabase dashboard → Database → Reports for slow queries
- Vercel → Analytics for web vitals
- EAS → Builds for mobile distribution health

---

## What this runbook does NOT cover (yet)

- **Payments (Phase 3):** Razorpay onboarding, Stripe Connect, escrow partner contract, GST invoicing engine
- **AfterShip or direct carrier integration:** the webhook endpoint is normalized; you still need a carrier-specific transform layer
- **Customer success ops:** onboarding playbooks, KYB workflow, supplier audit cadence
- **Marketing site / SEO:** the current landing is functional, not optimized

Open these as separate workstreams once Phase 0 is live.
