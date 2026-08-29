-- spatial_ref_sys is maintained by PostGIS. Client roles only need lookup access.
revoke insert, update, delete, truncate, references, trigger
on table public.spatial_ref_sys
from anon, authenticated;

grant select
on table public.spatial_ref_sys
to anon, authenticated;
