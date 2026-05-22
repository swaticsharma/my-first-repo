import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function RfqsScreen() {
  return (
    <View className="flex-1 bg-slate-50 px-4 pt-6">
      <Text className="text-2xl font-bold text-slate-900">RFQs</Text>
      <Text className="mt-1 text-sm text-slate-600">
        Track requirements you've posted and quotes received.
      </Text>
      <View className="mt-8 items-center rounded-lg border border-dashed border-slate-300 bg-white p-8">
        <Text className="font-semibold">No RFQs yet</Text>
        <Text className="mt-1 text-center text-sm text-slate-500">
          Post a requirement and verified Chinese suppliers will respond within 48h.
        </Text>
        <Link href="/rfqs/new" asChild>
          <Pressable className="mt-4 rounded-md bg-brand-600 px-4 py-2">
            <Text className="font-medium text-white">+ Post an RFQ</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
