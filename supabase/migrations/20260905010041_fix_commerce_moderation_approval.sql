-- The public directory must never rely on the caller's broader owner/admin RLS
-- visibility: only approved businesses belong in this feed.
create or replace view public.vw_ranked_commercial_services
with (security_invoker = true)
as
select
  service.id, service.owner_id, service.main_category, service.subcategory,
  service.title, service.description, service.price_range, service.location,
  service.phone_whatsapp, service.external_url, service.accepts_sinpe,
  service.accepts_cards, service.pet_friendly, service.is_verified_ict,
  service.cst_stars, service.is_sponsored, service.sponsored_tier,
  service.photos, service.created_at, service.osm_type, service.osm_id,
  service.osm_tags, service.data_source, service.source_license,
  service.source_updated_at, service.imported_at, service.has_parking,
  service.business_verified_at, service.business_verification_evidence_url,
  service.business_updated_at, service.whatsapp, service.menu_url,
  service.opening_hours, service.parking, service.payment_methods,
  service.accessibility, service.languages, service.experience_type,
  service.booking_url, service.certifications, service.cover_image_url,
  service.claim_status, service.category, service.subcategories,
  service.region_id, service.is_claimed, service.source,
  service.source_record_id,
  coalesce(rating.avg_rating, 0::numeric) as avg_rating,
  coalesce(rating.total_reviews, 0) as total_reviews
from public.commercial_services service
left join public.vw_target_ratings rating
  on rating.target_type::text = 'service'::text
 and rating.target_id = service.id
where service.moderation_status = 'approved';

-- The public RPC is the only exposed entry point. It runs with its owner's
-- permission solely to reach the private function, which performs the admin
-- identity check before changing any row.
create or replace function public.review_user_submission(
  p_kind text,
  p_id uuid,
  p_decision text
)
returns void
language sql
security definer
set search_path = ''
as $$ select private.review_user_submission(p_kind, p_id, p_decision) $$;

revoke all on function public.review_user_submission(text,uuid,text) from public, anon;
grant execute on function public.review_user_submission(text,uuid,text) to authenticated;

notify pgrst, 'reload schema';
