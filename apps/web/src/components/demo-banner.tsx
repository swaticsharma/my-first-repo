import Link from 'next/link';
import { Info } from 'lucide-react';
import { isDemoMode } from '@medwise/db';

export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2 text-sm text-amber-800">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          <strong>Demo mode.</strong> You're seeing sample suppliers, products, and orders. Sign-ups
          and orders won't persist.
        </span>
        <Link href="/DEPLOY.md" className="ml-auto hidden text-amber-700 hover:underline sm:inline">
          Connect Supabase →
        </Link>
      </div>
    </div>
  );
}
