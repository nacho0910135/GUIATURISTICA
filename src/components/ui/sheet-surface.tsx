import type { BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';
import { memo, type PropsWithChildren } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';

export const PremiumSheetBackground = memo(function PremiumSheetBackground({ style }: BottomSheetBackgroundProps) {
  const { colors, tokens } = useAppTheme();
  return (
    <View
      className="rounded-t-modal border border-ui-border bg-ui-surface shadow-floating dark:border-ui-dark-border dark:bg-ui-dark-surface"
      pointerEvents="none"
      style={[style, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderTopLeftRadius: tokens.radius.modal,
        borderTopRightRadius: tokens.radius.modal,
        borderWidth: 1,
      }]}
    />
  );
});

export function SheetHandle() {
  return (
    <View accessibilityElementsHidden className="items-center pb-2 pt-3" importantForAccessibility="no-hide-descendants">
      <View className="h-1 w-9 rounded-full bg-neutral-300 dark:bg-neutral-600" />
    </View>
  );
}

export function SheetSurface({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <View className={`bg-ui-surface px-5 pb-8 dark:bg-ui-dark-surface ${className}`}>{children}</View>;
}
