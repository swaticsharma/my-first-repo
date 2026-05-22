import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getProduct } from '@medwise/db';
import { formatLeadTime, formatUSD } from '@medwise/ui';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    getProduct(supabase, id).then(setProduct).catch(() => setProduct(null));
  }, [id]);

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="aspect-video bg-slate-200" />
      <View className="p-4">
        <Text className="text-2xl font-bold">{product.name}</Text>
        <Text className="mt-1 text-slate-600">{product.short_description}</Text>
        <View className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <Text className="text-xs text-slate-500">Unit price</Text>
          <Text className="text-2xl font-bold">{formatUSD(product.unit_price_usd)}</Text>
          <Text className="mt-2 text-sm">
            Lead time:{' '}
            <Text className="font-semibold">{formatLeadTime(product.lead_time_days)}</Text>
          </Text>
          <Link href={`/rfqs/new?productId=${product.id}`} asChild>
            <Pressable className="mt-4 rounded-md bg-brand-600 px-4 py-3">
              <Text className="text-center font-semibold text-white">Request quote</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
