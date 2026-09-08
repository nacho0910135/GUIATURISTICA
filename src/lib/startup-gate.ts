let exploreReady = false;
const listeners = new Set<() => void>();

export function isExploreStartupReady() {
  return exploreReady;
}

export function markExploreStartupReady() {
  if (exploreReady) return;
  exploreReady = true;
  listeners.forEach((listener) => listener());
  listeners.clear();
}

export function subscribeToExploreStartupReady(listener: () => void) {
  if (exploreReady) {
    listener();
    return () => undefined;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
