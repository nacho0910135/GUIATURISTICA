import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, 'Supabase test environment is incomplete');

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const email = `account-deletion-test-${crypto.randomUUID()}@example.invalid`;
const password = `${crypto.randomUUID()}Aa1!`;
let userId;
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  const user = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const signedIn = await user.auth.signInWithPassword({ email, password });
  assert.ifError(signedIn.error);
  const deleted = await user.functions.invoke('delete-account', { body: {} });
  assert.ifError(deleted.error);
  assert.equal(deleted.data?.deleted, true);
  const profile = await admin.from('users').select('id').eq('id', userId).maybeSingle();
  assert.ifError(profile.error);
  assert.equal(profile.data, null);
  const lookup = await admin.auth.admin.getUserById(userId);
  assert.equal(lookup.data.user, null);
  console.log('Live account deletion removed the disposable user from Supabase Auth.');
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}
