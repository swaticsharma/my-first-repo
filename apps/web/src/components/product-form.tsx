'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

export type ProductFormInitial = {
  id?: string;
  name?: string;
  sku?: string | null;
  category_id?: number | null;
  short_description?: string | null;
  long_description?: string | null;
  device_class?: string | null;
  hs_code?: string | null;
  gmdn_code?: string | null;
  moq?: number | null;
  unit_price_usd?: number | null;
  lead_time_days?: number | null;
  lead_time_days_express?: number | null;
  warranty_months?: number | null;
  active?: boolean | null;
  specs?: Record<string, unknown> | null;
  images?: string[] | null;
};

export type CategoryOption = { id: number; name: string };

export function ProductForm({
  action,
  categories,
  initial = {},
  submitLabel,
  mode,
}: {
  action: (formData: FormData) => Promise<void>;
  categories: CategoryOption[];
  initial?: ProductFormInitial;
  submitLabel: string;
  mode: 'create' | 'edit';
}) {
  const [specs, setSpecs] = useState<Array<{ k: string; v: string }>>(() => {
    const entries = Object.entries(initial.specs ?? {});
    return entries.length > 0
      ? entries.map(([k, v]) => ({ k, v: String(v) }))
      : [{ k: '', v: '' }];
  });
  const [images, setImages] = useState<string[]>(() =>
    initial.images && initial.images.length > 0 ? initial.images : [''],
  );

  return (
    <form action={action} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <Section title="Basics">
        <Field label="Product name" required>
          <input
            name="name"
            required
            defaultValue={initial.name ?? ''}
            className="input"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU">
            <input name="sku" defaultValue={initial.sku ?? ''} className="input" />
          </Field>
          <Field label="Category">
            <select
              name="category_id"
              defaultValue={initial.category_id ?? ''}
              className="input"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Short description">
          <input
            name="short_description"
            defaultValue={initial.short_description ?? ''}
            placeholder="One-line tagline shown in catalogue cards"
            className="input"
          />
        </Field>
        <Field label="Full description">
          <textarea
            name="long_description"
            rows={4}
            defaultValue={initial.long_description ?? ''}
            className="input"
          />
        </Field>
      </Section>

      <Section title="Regulatory & classification">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Device class">
            <select
              name="device_class"
              defaultValue={initial.device_class ?? ''}
              className="input"
            >
              <option value="">—</option>
              <option value="I">Class I</option>
              <option value="IIa">Class IIa</option>
              <option value="IIb">Class IIb</option>
              <option value="III">Class III</option>
            </select>
          </Field>
          <Field label="HS code">
            <input
              name="hs_code"
              defaultValue={initial.hs_code ?? ''}
              placeholder="e.g., 9018.19"
              className="input"
            />
          </Field>
          <Field label="GMDN code">
            <input
              name="gmdn_code"
              defaultValue={initial.gmdn_code ?? ''}
              placeholder="e.g., 35119"
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Commercial">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="MOQ">
            <input
              type="number"
              name="moq"
              min={1}
              defaultValue={initial.moq ?? ''}
              className="input"
            />
          </Field>
          <Field label="Unit price (USD)">
            <input
              type="number"
              step="0.01"
              name="unit_price_usd"
              defaultValue={initial.unit_price_usd ?? ''}
              className="input"
            />
          </Field>
          <Field label="Warranty (months)">
            <input
              type="number"
              name="warranty_months"
              defaultValue={initial.warranty_months ?? ''}
              className="input"
            />
          </Field>
          <Field label="Lead time (days)" required>
            <input
              type="number"
              name="lead_time_days"
              required
              min={1}
              defaultValue={initial.lead_time_days ?? ''}
              className="input"
            />
          </Field>
          <Field label="Express lead time (days)">
            <input
              type="number"
              name="lead_time_days_express"
              min={1}
              defaultValue={initial.lead_time_days_express ?? ''}
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Technical specs">
        <p className="text-xs text-slate-500">
          Free-form key/value pairs shown to buyers on the product page.
        </p>
        <div className="space-y-2">
          {specs.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <input
                name="spec_key"
                defaultValue={s.k}
                placeholder="Key, e.g., Screen size"
                className="input"
              />
              <input
                name="spec_value"
                defaultValue={s.v}
                placeholder="Value, e.g., 12.1 inch"
                className="input"
              />
              <button
                type="button"
                onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Remove spec"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSpecs((prev) => [...prev, { k: '', v: '' }])}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-3 w-3" /> Add spec
          </button>
        </div>
      </Section>

      <Section title="Images">
        <p className="text-xs text-slate-500">
          Paste image URLs. (Direct file upload comes later — for now, use any public URL e.g.
          Cloudinary, S3, or a hosted CDN.)
        </p>
        <div className="space-y-2">
          {images.map((url, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
              <input
                name="image_url"
                defaultValue={url}
                placeholder="https://example.com/image.jpg"
                className="input"
              />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setImages((prev) => [...prev, ''])}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-3 w-3" /> Add image URL
          </button>
        </div>
      </Section>

      <Section title="Visibility">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial.active ?? false}
            value="true"
          />
          Publish immediately (buyers can see and RFQ this product)
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Uncheck to save as a draft. You can publish later from the products list.
        </p>
      </Section>

      <button
        type="submit"
        className="w-full rounded-md bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
      >
        {submitLabel}
      </button>

      <style>{`
        .input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
        .input:focus { outline: 2px solid rgb(30 136 229); outline-offset: 2px; }
      `}</style>
    </form>
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
