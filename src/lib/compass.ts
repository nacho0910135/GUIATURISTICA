export function normalizeHeading(value: number) {
  return ((value % 360) + 360) % 360;
}

// Keep the filtered angle unwrapped: 359 -> 1 travels two degrees, not 358.
export function smoothHeading(previous: number | null, next: number, alpha = 0.2) {
  if (!Number.isFinite(next)) return previous;
  if (previous === null) return normalizeHeading(next);
  const delta = normalizeHeading(next - previous + 180) - 180;
  return previous + alpha * delta;
}

export function usableHeading(heading: { trueHeading: number; accuracy: number }) {
  return Number.isFinite(heading.trueHeading) && heading.trueHeading >= 0 && heading.trueHeading < 360
    && heading.accuracy >= 2;
}
