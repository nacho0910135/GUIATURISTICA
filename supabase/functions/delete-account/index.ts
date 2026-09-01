import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'unauthorized' }, 401);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const buckets = ['profile-avatars', 'fauna-photos', 'business-photos', 'chat-media', 'review-photos', 'destination-user-photos', 'traveler-posts'];
  for (const bucket of buckets) {
    const paths: string[] = [];
    const walk = async (prefix: string) => {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error) throw error;
      for (const entry of data ?? []) {
        const path = `${prefix}/${entry.name}`;
        if (entry.id) paths.push(path); else await walk(path);
      }
    };
    await walk(user.id);
    if (paths.length) {
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (error) throw error;
    }
  }

  for (const [table, column, extra] of [
    ['destination_suggestions', 'user_id', undefined],
    ['fauna_species', 'created_by', undefined],
    ['commercial_services', 'owner_id', { source: 'owner_registered' }],
  ] as const) {
    let query = admin.from(table).delete().eq(column, user.id);
    if (extra) query = query.eq('source', extra.source);
    const { error } = await query;
    if (error) throw error;
  }
  const { error: profileError } = await admin.from('users').delete().eq('id', user.id);
  if (profileError) return json({ error: 'profile_deletion_failed' }, 500);
  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) return json({ error: 'auth_deletion_failed' }, 500);
  return json({ deleted: true });
});
