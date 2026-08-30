import { BlurView } from 'expo-blur';
import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';

type CardVariant = 'raised' | 'outlined' | 'soft';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = PropsWithChildren<{
  className?: string;
  padding?: CardPadding;
  variant?: CardVariant;
}>;

const cardVariantClasses: Record<CardVariant, string> = {
  raised: 'border border-ui-border bg-ui-surface shadow-card dark:border-ui-dark-border dark:bg-ui-dark-surface',
  outlined: 'border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface',
  soft: 'border border-transparent bg-ui-muted dark:bg-ui-dark-muted',
};

const cardPaddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({ children, className = '', padding = 'md', variant = 'outlined' }: CardProps) {
  return <View className={`rounded-card ${cardVariantClasses[variant]} ${cardPaddingClasses[padding]} ${className}`}>{children}</View>;
}

export type PressableCardProps = Omit<ComponentProps<typeof Pressable>, 'children'> & CardProps;

export function PressableCard({ children, className = '', padding = 'md', variant = 'outlined', ...props }: PressableCardProps) {
  return (
    <Pressable
      accessibilityRole={props.accessibilityRole ?? 'button'}
      className={`rounded-card focus-visible:ring-2 focus-visible:ring-ui-focus active:opacity-85 dark:focus-visible:ring-ui-dark-focus ${cardVariantClasses[variant]} ${cardPaddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export function GlassSurface({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  const { mode } = useAppTheme();

  return (
    <View className={`overflow-hidden border border-ui-border/80 bg-ui-glass dark:border-ui-dark-border/80 dark:bg-ui-dark-glass ${className}`}>
      <BlurView intensity={mode === 'dark' ? 48 : 64} style={StyleSheet.absoluteFill} tint={mode === 'dark' ? 'dark' : 'light'} />
      <View className="absolute inset-0 bg-ui-glass/80 dark:bg-ui-dark-glass/80" pointerEvents="none" />
      {children}
    </View>
  );
}
