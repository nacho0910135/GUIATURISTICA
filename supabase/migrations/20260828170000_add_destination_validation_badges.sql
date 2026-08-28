-- Store the institutions that validate each published destination.
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS validated_by text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.destinations
SET validated_by = ARRAY_REMOVE(
  ARRAY[
    CASE WHEN source_url ILIKE '%visitcostarica.com%' THEN 'ICT'::text END,
    CASE WHEN sinac_restricted OR requires_sinac_booking THEN 'SINAC'::text END
  ],
  NULL
);
