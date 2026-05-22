import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getOrderWithTracking, subscribeToShipmentEvents } from '@medwise/db';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_ORDER,
  type Order,
  type Shipment,
  type ShipmentEvent,
} from '@medwise/types';
import { formatUSD, orderProgressPercent } from '@medwise/ui';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getOrderWithTracking(supabase, id)
      .then(({ order, shipment, events }) => {
        setOrder(order);
        setShipment(shipment);
        setEvents(events);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!shipment) return;
    return subscribeToShipmentEvents(supabase, shipment.id, (ev) =>
      setEvents((prev) => [ev, ...prev]),
    );
  }, [shipment]);

  if (loading || !order) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  const pct = orderProgressPercent(order.status);

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="p-4">
        <Text className="text-xl font-bold">{order.order_no}</Text>
        <Text className="mt-1 text-slate-600">{ORDER_STATUS_LABEL[order.status]}</Text>
        <Text className="mt-2 text-lg font-semibold">{formatUSD(order.total_usd)}</Text>

        <View className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold">Progress</Text>
            <Text className="text-sm text-slate-500">{pct}%</Text>
          </View>
          <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <View className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
          </View>
          {ORDER_STATUS_ORDER.map((s, i) => {
            const idx = ORDER_STATUS_ORDER.indexOf(order.status);
            const reached = idx >= i && order.status !== 'cancelled';
            return (
              <Text
                key={s}
                className={
                  'mt-1 text-xs ' + (reached ? 'font-semibold text-brand-700' : 'text-slate-500')
                }
              >
                {ORDER_STATUS_LABEL[s]}
              </Text>
            );
          })}
        </View>

        <View className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <Text className="font-semibold">Live tracking</Text>
          {events.length === 0 ? (
            <Text className="mt-2 text-sm text-slate-500">No events yet.</Text>
          ) : (
            events.map((e) => (
              <View key={e.id} className="mt-3 border-l-2 border-brand-600 pl-3">
                <Text className="font-medium">{e.status}</Text>
                <Text className="text-xs text-slate-500">
                  {new Date(e.occurred_at).toLocaleString()}
                </Text>
                {e.description && <Text className="text-sm text-slate-600">{e.description}</Text>}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
