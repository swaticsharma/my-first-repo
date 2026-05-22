import Link from 'next/link';
import { Activity } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-brand-700">
          <Activity className="h-6 w-6" />
          Medwise
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-600">
          <Link href="/catalogue" className="hover:text-slate-900">Catalogue</Link>
          <Link href="/rfq/new" className="hover:text-slate-900">Post an RFQ</Link>
          <Link href="/orders" className="hover:text-slate-900">My orders</Link>
          <Link
            href="/supplier/signup"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
          >
            Become a supplier
          </Link>
        </nav>
      </div>
    </header>
  );
}
