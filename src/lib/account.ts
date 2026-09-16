import { supabase } from '@/lib/supabase';

export async function deleteMyAccount(acknowledgeActiveGooglePlaySubscriptions = false) {
  const { error } = await supabase.functions.invoke('delete-account', { body: { acknowledgeActiveGooglePlaySubscriptions } });
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
