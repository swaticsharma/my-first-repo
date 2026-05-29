import { redirect } from 'next/navigation';
import { getSupabaseServer } from './supabase-server';

export type AuthedSession = {
  userId: string;
  email: string;
  orgId: string;
  orgKind: 'supplier' | 'buyer' | 'both';
  role: string;
};

/**
 * Require any authenticated user with an org. Redirects to /login if not.
 * Use in supplier/* and buyer/* pages.
 */
export async function requireSession(nextPath: string): Promise<AuthedSession> {
  const db = await getSupabaseServer();
  const { data: userRes } = await db.auth.getUser();
  if (!userRes?.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id, email, org_id, role, organizations!inner(kind)')
    .eq('id', userRes.user.id)
    .single();

  if (!profile || !profile.org_id) {
    redirect('/onboarding/choose');
  }

  const orgKind = (profile as any).organizations?.kind as AuthedSession['orgKind'];
  return {
    userId: profile.id,
    email: profile.email,
    orgId: profile.org_id,
    orgKind,
    role: profile.role,
  };
}

export async function requireSupplier(nextPath: string): Promise<AuthedSession> {
  const session = await requireSession(nextPath);
  if (session.orgKind !== 'supplier' && session.orgKind !== 'both') {
    redirect('/?error=supplier_required');
  }
  return session;
}

export async function requireBuyer(nextPath: string): Promise<AuthedSession> {
  const session = await requireSession(nextPath);
  if (session.orgKind !== 'buyer' && session.orgKind !== 'both') {
    redirect('/?error=buyer_required');
  }
  return session;
}
