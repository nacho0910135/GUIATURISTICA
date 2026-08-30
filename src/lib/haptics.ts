import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticIntent = 'selection' | 'impact' | 'success' | 'warning' | 'error';

/** Fire-and-forget tactile feedback. Web and unsupported devices remain silent. */
export async function haptic(intent: HapticIntent) {
  if (Platform.OS === 'web') return;

  try {
    if (intent === 'selection') {
      await Haptics.selectionAsync();
      return;
    }
    if (intent === 'impact') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    await Haptics.notificationAsync(
      intent === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : intent === 'warning'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Error,
    );
  } catch {
    // Haptics are enhancement-only and must never block the user action.
  }
}
