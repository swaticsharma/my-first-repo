import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { searchProducts } from '@medwise/db';
import { formatLeadTime, formatUSD } from '@medwise/ui';
import type { Product } from '@medwise/types';

export default function BrowseScreen() {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    searchProducts(supabase, { q: q || undefined, limit: 30 })
      .then((p) => live && setProducts(p))
      .catch(() => live && setProducts([]))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [q]);

  return (
    <View className="flex-1 bg-slate-50 px-4 pt-4">
      <Text className="text-2xl font-bold text-slate-900">Catalogue</Text>
      <Text className="mt-1 text-sm text-slate-600">
        Verified Chinese medtech, real lead times.
      </Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search products, GMDN, brands…"
        className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-3"
        autoCapitalize="none"
      />

      {loading ? (
        <ActivityIndicator className="mt-12" />
      ) : (
        <FlatList
          className="mt-4"
          data={products}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProductRow product={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <View className="mt-16 items-center">
              <Text className="text-slate-500">No products yet.</Text>
              <Link href="/rfqs/new" asChild>
                <Pressable className="mt-4 rounded-md bg-brand-600 px-4 py-2">
                  <Text className="font-medium text-white">Post an RFQ</Text>
                </Pressable>
              </Link>
            </View>
          }
        />
      )}
    </View>
  );
}

function ProductRow({ product }: { product: Product & { supplier?: any } }) {
  return (
    <Link href={`/products/${product.id}`} asChild>
      <Pressable className="rounded-lg border border-slate-200 bg-white p-4">
        <Text className="font-semibold text-slate-900">{product.name}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">
          {(product as any).supplier?.display_name}
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-semibold">{formatUSD(product.unit_price_usd)}</Text>
          <Text className="text-sm text-slate-600">{formatLeadTime(product.lead_time_days)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}
