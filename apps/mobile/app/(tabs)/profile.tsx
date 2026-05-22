import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <View className="flex-1 bg-slate-50 px-4 pt-6">
      <Text className="text-2xl font-bold text-slate-900">Profile</Text>
      {email ? (
        <>
          <Text className="mt-1 text-sm text-slate-600">{email}</Text>
          <Pressable
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/login');
            }}
            className="mt-8 rounded-md border border-slate-300 bg-white px-4 py-2.5"
          >
            <Text className="text-center font-medium">Sign out</Text>
          </Pressable>
        </>
      ) : (
        <View className="mt-8 gap-3">
          <Link href="/login" asChild>
            <Pressable className="rounded-md bg-brand-600 px-4 py-2.5">
              <Text className="text-center font-medium text-white">Sign in</Text>
            </Pressable>
          </Link>
          <Link href="/signup" asChild>
            <Pressable className="rounded-md border border-slate-300 bg-white px-4 py-2.5">
              <Text className="text-center font-medium">Create account</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </View>
  );
}
