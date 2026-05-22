import { signupSupplierAction } from './actions';

const CAPABILITIES = [
  'OEM',
  'ODM',
  'OBM',
  'Custom design',
  'CE marking',
  'NMPA registration',
  'CDSCO export support',
  'Sterilization (EO)',
  'Sterilization (gamma)',
  'Clean-room assembly',
];

const PAYMENT_TERMS = ['TT 30/70', 'TT 50/50', 'LC at sight', 'LC 30d', 'Escrow', 'Open account'];
const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CIF', 'CIP', 'DAP', 'DDP'];

export default function SupplierSignupPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">List your factory on Medwise</h1>
      <p className="mt-2 text-slate-600">
        Reach Indian hospitals, distributors and OEMs actively sourcing from China. We verify
        certifications and surface real lead times — so qualified buyers find you faster.
      </p>

      <form action={signupSupplierAction} className="mt-8 space-y-6">
        <Section title="Company">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name (as on business license)" required>
              <input name="legal_name" required className="input" />
            </Field>
            <Field label="Display name" required>
              <input name="display_name" required className="input" />
            </Field>
            <Field label="Website">
              <input name="website" type="url" className="input" />
            </Field>
            <Field label="Established year">
              <input name="established_year" type="number" min={1950} max={2030} className="input" />
            </Field>
          </div>
          <Field label="About">
            <textarea name="about" rows={3} className="input" />
          </Field>
        </Section>

        <Section title="Factory">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" required>
              <input name="factory_city" required className="input" />
            </Field>
            <Field label="Province" required>
              <input name="factory_province" required className="input" />
            </Field>
          </div>
          <Field label="Factory address">
            <input name="factory_address" className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Employees">
              <input name="employee_count" type="number" className="input" />
            </Field>
            <Field label="Annual revenue (USD)">
              <input name="annual_revenue_usd" type="number" step="0.01" className="input" />
            </Field>
            <Field label="Min lead time (days)">
              <input name="min_lead_time_days" type="number" className="input" />
            </Field>
          </div>
        </Section>

        <Section title="Regulatory">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business license #" required>
              <input name="business_license_no" required className="input" />
            </Field>
            <Field label="NMPA registration #">
              <input name="nmpa_registration_no" className="input" />
            </Field>
            <Field label="Export license #">
              <input name="export_license_no" className="input" />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            You'll be able to upload ISO 13485, CE, FDA 510(k), NMPA and CDSCO documents after
            sign-up. Verification typically takes 3–5 business days.
          </p>
        </Section>

        <Section title="Commercial">
          <Field label="Capabilities">
            <div className="flex flex-wrap gap-3">
              {CAPABILITIES.map((c) => (
                <label key={c} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="capabilities" value={c} />
                  {c}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Payment terms accepted">
            <div className="flex flex-wrap gap-3">
              {PAYMENT_TERMS.map((t) => (
                <label key={t} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="payment_terms_accepted" value={t} />
                  {t}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Incoterms offered">
            <div className="flex flex-wrap gap-3">
              {INCOTERMS.map((t) => (
                <label key={t} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="incoterms_offered" value={t} />
                  {t}
                </label>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Account">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" required>
              <input name="full_name" required className="input" />
            </Field>
            <Field label="Work email" required>
              <input name="email" type="email" required className="input" />
            </Field>
            <Field label="Phone (with country code)" required>
              <input name="phone" required className="input" />
            </Field>
            <Field label="Password" required>
              <input name="password" type="password" required minLength={8} className="input" />
            </Field>
          </div>
        </Section>

        <button
          type="submit"
          className="w-full rounded-md bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
        >
          Submit for verification
        </button>
      </form>

      <style>{`
        .input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
        .input:focus { outline: 2px solid rgb(30 136 229); outline-offset: 2px; }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
