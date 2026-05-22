'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { subscribeToShipmentEvents } from '@medwise/db';
import type { Shipment, ShipmentEvent } from '@medwise/types';

export function LiveTrackingPanel({
  shipment,
  initialEvents,
}: {
  shipment: Shipment;
  initialEvents: ShipmentEvent[];
}) {
  const [events, setEvents] = useState<ShipmentEvent[]>(initialEvents);

  useEffect(() => {
    const db = getSupabaseBrowser();
    const unsub = subscribeToShipmentEvents(db, shipment.id, (ev) => {
      setEvents((prev) => [ev, ...prev]);
    });
    return unsub;
  }, [shipment.id]);

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Live tracking</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No tracking events yet. Updates will appear here in real time as the supplier and
          carrier post them.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900">{e.status}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(e.occurred_at).toLocaleString()}
                  </span>
                </div>
                {e.description && (
                  <p className="text-sm text-slate-600">{e.description}</p>
                )}
                {e.location && (
                  <p className="text-xs text-slate-500">{e.location}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
