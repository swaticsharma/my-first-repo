import { signupBuyerAction } from './actions';

const BUYER_SEGMENTS = [
  { value: 'hospital', label: 'Hospital / hospital chain' },
  { value: 'distributor', label: 'Distributor / dealer' },
  { value: 'oem', label: 'OEM / device manufacturer' },
  { value: 'clinic_chain', label: 'Clinic / diagnostic chain' },
  { value: 'government', label: 'Government / PSU' },
  { value: 'other', label: 'Other' },
];

const INDIAN_STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Gujarat','Haryana',
  'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab',
  'Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal',
];

export default function BuyerSignupPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Set up your buyer account</h1>
      <p className="mt-2 text-slate-600">
        For Indian hospitals, distributors and OEMs sourcing medtech from China.
        We verify GST + CDSCO credentials so Chinese suppliers can quote with confidence.
      </p>

      <form action={signupBuyerAction} className="mt-8 space-y-6">
        <Section title="Organization">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name (as on GST)" required>
              <input name="legal_name" required className="input" />
            </Field>
            <Field label="Display name" required>
              <input name="display_name" required className="input" />
            </Field>
            <Field label="Website">
              <input name="website" type="url" className="input" />
            </Field>
            <Field label="Buyer segment" required>
              <select name="buyer_segment" required className="input">
                <option value="">Select…</option>
                {BUYER_SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="About">
            <textarea name="about" rows={3} className="input" />
          </Field>
        </Section>

        <Section title="Billing & tax">
          <Field label="Billing address" required>
            <textarea name="billing_address" rows={2} required className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State" required>
              <select name="billing_state" required className="input">
                <option value="">Select…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Annual procurement (₹, optional)">
              <input name="annual_procurement_inr" type="number" step="1" className="input" />
            </Field>
            <Field label="GSTIN" required>
              <input
                name="gstin"
                required
                pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                placeholder="22ABCDE1234F1Z5"
                className="input uppercase"
              />
            </Field>
            <Field label="PAN" required>
              <input
                name="pan"
                required
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                placeholder="ABCDE1234F"
                className="input uppercase"
              />
            </Field>
          </div>
        </Section>

        <Section title="Regulatory">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CDSCO Importer license #">
              <input
                name="cdsco_importer_license_no"
                placeholder="e.g., IMP-12345"
                className="input"
              />
            </Field>
            <Field label="License expiry">
              <input name="cdsco_license_expiry" type="date" className="input" />
            </Field>
            <Field label="Drug license # (if applicable)">
              <input name="drug_license_no" className="input" />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            CDSCO importer license is required for ordering Class IIb and Class III devices.
            You can add it later, but those products will be locked until verified.
          </p>
        </Section>

        <Section title="Your account">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" required>
              <input name="full_name" required className="input" />
            </Field>
            <Field label="Work email" required>
              <input name="email" type="email" required className="input" />
            </Field>
            <Field label="Phone (with country code)" required>
              <input name="phone" required placeholder="+91 98765 43210" className="input" />
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
          Create buyer account
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
