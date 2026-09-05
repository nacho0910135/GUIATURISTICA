import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

const CHAT_REFRESH_INTERVAL_MS = 2500;

export function useTravelerMessagesSync(userId: string | undefined, onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!userId) return;
    const refresh = () => onChangeRef.current();
    const channel = supabase
      .channel(`traveler-messages:${userId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'traveler_messages', filter: `recipient_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'traveler_messages', filter: `sender_id=eq.${userId}` }, refresh)
      .subscribe();
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, CHAT_REFRESH_INTERVAL_MS);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(interval);
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
