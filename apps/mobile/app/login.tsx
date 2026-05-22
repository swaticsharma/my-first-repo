import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign-in failed', error.message);
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <View className="flex-1 justify-center bg-slate-50 px-6">
      <Text className="text-2xl font-bold">Sign in to Medwise</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        className="mt-6 rounded-md border border-slate-300 bg-white px-3 py-3"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-3"
      />
      <Pressable
        onPress={onSubmit}
        disabled={loading}
        className="mt-4 rounded-md bg-brand-600 px-4 py-3"
      >
        <Text className="text-center font-semibold text-white">
          {loading ? 'Signing in…' : 'Sign in'}
        </Text>
      </Pressable>
    </View>
  );
}
