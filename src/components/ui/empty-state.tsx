import { Compass } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';

export type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ action, className = '', description, icon, title }: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View className={`min-h-60 items-center justify-center rounded-card border border-dashed border-ui-border bg-ui-surface px-6 py-10 dark:border-ui-dark-border dark:bg-ui-dark-surface ${className}`}>
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
        {icon ?? <Compass color={colors.primary} size={26} strokeWidth={1.8} />}
      </View>
      <Text className="mt-5 text-center font-display text-xl text-ui-text dark:text-ui-dark-text">{title}</Text>
      <Text className="mt-2 max-w-sm text-center font-sans text-sm leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{description}</Text>
      {action ? <View className="mt-6">{action}</View> : null}
    </View>
  );
}
