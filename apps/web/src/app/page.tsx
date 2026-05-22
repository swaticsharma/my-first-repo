import Link from 'next/link';
import { ArrowRight, ShieldCheck, Truck, Clock, Globe2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-600">
            India ↔ China medtech marketplace
          </p>
          <h1 className="mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">
            Medical equipment, sourced fast. Tracked end-to-end.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Medwise connects Indian hospitals, distributors and OEMs with verified Chinese
            manufacturers — with real lead times, live shipment tracking, and compliance built in.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
            >
              Browse catalogue <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/supplier/signup"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              List your factory
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-4">
          <ValueProp icon={<Clock className="h-6 w-6" />} title="Real lead times">
            Suppliers commit to lead times. Buyers see actuals vs. promised.
          </ValueProp>
          <ValueProp icon={<ShieldCheck className="h-6 w-6" />} title="Verified compliance">
            ISO 13485, NMPA, CDSCO Import, CE & FDA documents verified on file.
          </ValueProp>
          <ValueProp icon={<Truck className="h-6 w-6" />} title="Live shipment tracking">
            Carrier webhooks push status from factory floor to delivery dock.
          </ValueProp>
          <ValueProp icon={<Globe2 className="h-6 w-6" />} title="Cross-border made simple">
            HS codes, GST invoicing, Incoterms and customs guidance baked in.
          </ValueProp>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-bold text-slate-900">How Medwise works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Step n={1} title="Browse or post an RFQ">
              Search the catalogue, or post a requirement and let verified suppliers come to you.
            </Step>
            <Step n={2} title="Compare quotes & timelines">
              Side-by-side comparison of price, lead time, certifications and supplier track record.
            </Step>
            <Step n={3} title="Order with confidence">
              Real-time tracking from PO to delivery, with escrow and dispute resolution.
            </Step>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueProp({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="text-brand-600">{icon}</div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
        {n}
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  );
}
