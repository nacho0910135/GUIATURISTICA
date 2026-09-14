import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query';

import { queryStorage } from '@/lib/query-storage';

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 7 * DAY,
      networkMode: 'offlineFirst',
      placeholderData: (previousData: unknown) => previousData,
      retry: 1,
      refetchOnWindowFocus: false,
      throwOnError: false,
    },
    mutations: { networkMode: 'offlineFirst', retry: 0, throwOnError: false },
  },
});

const CACHE_KEY = 'query-cache-v1';
const PERSISTED_QUERIES = new Set(['app-options', 'explore-places', 'planner-options', 'ferry-routes', 'commerce-regions']);

export async function restoreQueryCache() {
  try {
    const value = await queryStorage.getItem(CACHE_KEY);
    if (!value) return;
    const saved = JSON.parse(value) as { savedAt: number; state: Parameters<typeof hydrate>[1] };
    if (Date.now() - saved.savedAt < DAY) hydrate(queryClient, saved.state);
    else await queryStorage.removeItem(CACHE_KEY);
  } catch { await queryStorage.removeItem(CACHE_KEY); }
}

export function persistQueryCache() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return queryClient.getQueryCache().subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const state = dehydrate(queryClient, { shouldDehydrateQuery: (query) => query.state.status === 'success' && PERSISTED_QUERIES.has(String(query.queryKey[0])) });
      void Promise.resolve(queryStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), state }))).catch(() => undefined);
    }, 1000);
  });
}
