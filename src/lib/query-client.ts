import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

import { queryStorage } from '@/lib/query-storage';

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 7 * DAY,
      networkMode: 'offlineFirst',
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  key: 'DESCUBRIENDO_CR_QUERY_CACHE',
  storage: queryStorage,
  throttleTime: 1000,
});

export const QUERY_CACHE_MAX_AGE = 7 * DAY;
