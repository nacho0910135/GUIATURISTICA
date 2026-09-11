import { useIsFocused } from 'expo-router/react-navigation';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

const subscribe = (onChange: () => void) => {
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
};
const getSnapshot = () => AppState.currentState === 'active';

export function useScreenActive() {
  const focused = useIsFocused();
  const foreground = useSyncExternalStore(subscribe, getSnapshot, () => true);
  return focused && foreground;
}
