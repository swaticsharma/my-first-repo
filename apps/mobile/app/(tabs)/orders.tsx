import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ORDER_STATUS_LABEL, type Order } from '@medwise/types';
import { formatUSD } from '@medwise/ui';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data ?? []) as Order[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View className="flex-1 bg-slate-50 px-4 pt-6">
      <Text className="text-2xl font-bold text-slate-900">My orders</Text>
      {loading ? (
        <ActivityIndicator className="mt-12" />
      ) : (
        <FlatList
          className="mt-4"
          data={orders}
          keyExtractor={(o) => o.id}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={<Text className="mt-12 text-center text-slate-500">No orders yet.</Text>}
          renderItem={({ item }) => (
            <Link href={`/orders/${item.id}`} asChild>
              <View className="rounded-lg border border-slate-200 bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold">{item.order_no}</Text>
                  <Text className="text-xs text-slate-500">
                    {ORDER_STATUS_LABEL[item.status]}
                  </Text>
                </View>
                <Text className="mt-1 text-sm text-slate-600">
                  Qty {item.quantity} · {formatUSD(item.total_usd)}
                </Text>
                {item.promised_delivery_on && (
                  <Text className="mt-0.5 text-xs text-slate-500">
                    ETA {item.promised_delivery_on}
                  </Text>
                )}
              </View>
            </Link>
          )}
        />
      )}
    </View>
  );
}
