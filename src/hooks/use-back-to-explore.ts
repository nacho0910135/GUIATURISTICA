import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useBackToExplore() {
  const router = useRouter();
  return useCallback(() => router.replace('/(tabs)/explore'), [router]);
}
