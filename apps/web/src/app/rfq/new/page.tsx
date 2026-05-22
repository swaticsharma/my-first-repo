import { createRfqAction } from './actions';
import { getSupabaseServer } from '@/lib/supabase-server';
import { listCategories } from '@medwise/db';

const CERT_OPTIONS = [
  'ISO_13485',
  'CE',
  'FDA_510K',
  'NMPA',
  'CDSCO_IMPORT',
  'CDSCO_MFG',
  'MDSAP',
  'WHO_PQ',
] as const;

export default async function NewRfqPage() {
  const db = await getSupabaseServer();
  const categories = await listCategories(db).catch(() => []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Post a Request for Quote</h1>
      <p className="mt-2 text-slate-600">
        Describe what you need. We'll invite matching verified suppliers in China to respond,
        usually within 48 hours.
      </p>

      <form action={createRfqAction} className="mt-8 space-y-6">
        <Field label="Title" required>
          <input
            name="title"
            required
            placeholder="e.g., 50× multi-parameter patient monitors, 5-para, CDSCO-cleared"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required>
            <select
              name="category_id"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity" required>
            <input
              name="quantity"
              type="number"
              min={1}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </Field>
        </div>

        <Field label="Detailed requirements">
          <textarea
            name="description"
            rows={5}
            placeholder="Specs, intended use, accessories, packaging, after-sales expectations…"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Target unit price (USD)">
            <input
              name="target_unit_price_usd"
              type="number"
              step="0.01"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </Field>
          <Field label="Required lead time (days)">
            <input
              name="required_lead_time_days"
              type="number"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </Field>
          <Field label="Incoterm">
            <select
              name="incoterm"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">—</option>
              <option>EXW</option>
              <option>FOB</option>
              <option>CIF</option>
              <option>DDP</option>
            </select>
          </Field>
        </div>

        <Field label="Delivery port (India)">
          <input
            name="delivery_port"
            placeholder="e.g., Nhava Sheva, Chennai, Delhi ICD"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </Field>

        <Field label="Required certifications">
          <div className="flex flex-wrap gap-3">
            {CERT_OPTIONS.map((c) => (
              <label key={c} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="required_certifications" value={c} />
                {c.replace('_', ' ')}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Closes at">
          <input
            name="closes_at"
            type="datetime-local"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </Field>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Post RFQ
          </button>
        </div>
      </form>
    </div>
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
