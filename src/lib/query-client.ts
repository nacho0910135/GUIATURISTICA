import { QueryClient } from '@tanstack/react-query';

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
