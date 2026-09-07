import { useQueries } from '@tanstack/react-query';
import { getRoadDistances, roadPointKey, type RoadPoint } from './road-distance';

export function useRoadDistances(origin: RoadPoint | null | undefined, points: RoadPoint[]) {
  const source = origin ? roadPointKey(origin) : '';
  const keys = [...new Set(points.map(roadPointKey).filter(Boolean))].sort();
  const batches: string[][] = [];
  if (source) for (let index = 0; index < keys.length; index += 24) batches.push(keys.slice(index, index + 24));
  const queries = useQueries({ queries: batches.map((batch) => ({
    queryKey: ['road-distances-v1', source, ...batch],
    queryFn: ({ signal }: { signal: AbortSignal }) => getRoadDistances(source, batch, signal),
    staleTime: 60_000,
    gcTime: 60_000,
    retry: false,
    networkMode: 'always' as const,
  })) });
  const distances = new Map<string, number | null | undefined>();
  batches.forEach((batch, index) => batch.forEach((key, column) => {
    const query = queries[index];
    distances.set(key, query.isError ? null : query.data?.[column]);
  }));
  return (point: RoadPoint) => source && roadPointKey(point) ? distances.get(roadPointKey(point)) : null;
}
