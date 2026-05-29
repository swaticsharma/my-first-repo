import Link from 'next/link';
import { Building2, Stethoscope } from 'lucide-react';

export default function ChooseOnboarding() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">Welcome to Medwise</h1>
      <p className="mt-2 text-slate-600">
        Tell us how you'll use Medwise so we can set up the right account.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/buyer/signup"
          className="rounded-lg border border-slate-200 bg-white p-6 transition hover:border-brand-500 hover:shadow-md"
        >
          <Stethoscope className="h-8 w-8 text-brand-600" />
          <h2 className="mt-3 text-lg font-semibold">I'm a buyer</h2>
          <p className="mt-2 text-sm text-slate-600">
            Indian hospital, distributor, OEM or clinic chain sourcing medical equipment.
          </p>
        </Link>
        <Link
          href="/supplier/signup"
          className="rounded-lg border border-slate-200 bg-white p-6 transition hover:border-brand-500 hover:shadow-md"
        >
          <Building2 className="h-8 w-8 text-brand-600" />
          <h2 className="mt-3 text-lg font-semibold">I'm a supplier</h2>
          <p className="mt-2 text-sm text-slate-600">
            Chinese medtech manufacturer listing products for Indian buyers.
          </p>
        </Link>
      </div>
    </div>
  );
}
