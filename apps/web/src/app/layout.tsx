import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Medwise — Medtech marketplace, India ↔ China',
  description:
    'Source verified medtech equipment from China suppliers with real-time lead times and shipment tracking. Built for Indian hospitals, distributors and OEMs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Medwise. India ↔ China medtech marketplace.
        </footer>
      </body>
    </html>
  );
}
