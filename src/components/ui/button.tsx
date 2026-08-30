import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useAppTheme } from '@/theme/theme-provider';

type ButtonIntent = 'primary' | 'neutral' | 'success' | 'danger';
type ButtonEmphasis = 'solid' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type NativePressableProps = ComponentProps<typeof Pressable>;

export type ButtonProps = Omit<NativePressableProps, 'children' | 'disabled'> & {
  label: string;
  icon?: ReactNode;
  intent?: ButtonIntent;
  emphasis?: ButtonEmphasis;
  size?: ButtonSize;
  busy?: boolean;
  disabled?: boolean;
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-10 rounded-control px-4',
  md: 'min-h-12 rounded-control px-5',
  lg: 'min-h-14 rounded-2xl px-6',
};

const buttonClasses: Record<ButtonEmphasis, Record<ButtonIntent, string>> = {
  solid: {
    primary: 'border border-ui-primary bg-ui-primary active:bg-ui-primary-pressed dark:border-ui-dark-primary dark:bg-ui-dark-primary dark:active:bg-ui-dark-primary-pressed',
    neutral: 'border border-ui-text bg-ui-text active:opacity-80 dark:border-ui-dark-text dark:bg-ui-dark-text',
    success: 'border border-ui-success bg-ui-success active:opacity-80 dark:border-ui-dark-success dark:bg-ui-dark-success',
    danger: 'border border-ui-danger bg-ui-danger active:opacity-80 dark:border-ui-dark-danger dark:bg-ui-dark-danger',
  },
  outline: {
    primary: 'border border-ui-primary bg-ui-surface active:bg-ui-primary-soft dark:border-ui-dark-primary dark:bg-ui-dark-surface dark:active:bg-ui-dark-primary-soft',
    neutral: 'border border-ui-border bg-ui-surface active:bg-ui-muted dark:border-ui-dark-border dark:bg-ui-dark-surface dark:active:bg-ui-dark-muted',
    success: 'border border-ui-success bg-ui-surface active:bg-ui-primary-soft dark:border-ui-dark-success dark:bg-ui-dark-surface dark:active:bg-ui-dark-primary-soft',
    danger: 'border border-ui-danger bg-ui-surface active:opacity-70 dark:border-ui-dark-danger dark:bg-ui-dark-surface',
  },
  ghost: {
    primary: 'border border-transparent bg-transparent active:bg-ui-primary-soft dark:active:bg-ui-dark-primary-soft',
    neutral: 'border border-transparent bg-transparent active:bg-ui-muted dark:active:bg-ui-dark-muted',
    success: 'border border-transparent bg-transparent active:bg-ui-primary-soft dark:active:bg-ui-dark-primary-soft',
    danger: 'border border-transparent bg-transparent active:opacity-60',
  },
};

const labelClasses: Record<ButtonEmphasis, Record<ButtonIntent, string>> = {
  solid: {
    primary: 'text-white dark:text-ui-dark-background',
    neutral: 'text-white dark:text-ui-dark-background',
    success: 'text-white dark:text-ui-dark-background',
    danger: 'text-white dark:text-ui-dark-background',
  },
  outline: {
    primary: 'text-ui-primary dark:text-ui-dark-primary',
    neutral: 'text-ui-text dark:text-ui-dark-text',
    success: 'text-ui-success dark:text-ui-dark-success',
    danger: 'text-ui-danger dark:text-ui-dark-danger',
  },
  ghost: {
    primary: 'text-ui-primary dark:text-ui-dark-primary',
    neutral: 'text-ui-text dark:text-ui-dark-text',
    success: 'text-ui-success dark:text-ui-dark-success',
    danger: 'text-ui-danger dark:text-ui-dark-danger',
  },
};

export function Button({
  accessibilityState,
  busy = false,
  className = '',
  disabled = false,
  emphasis = 'solid',
  icon,
  intent = 'primary',
  label,
  size = 'md',
  ...props
}: ButtonProps) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || busy;
  const spinnerColor = emphasis === 'solid' ? colors.onPrimary : colors[intent === 'neutral' ? 'text' : intent];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, busy, disabled: isDisabled }}
      className={`flex-row items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-ui-focus disabled:opacity-45 dark:focus-visible:ring-ui-dark-focus ${buttonSizeClasses[size]} ${buttonClasses[emphasis][intent]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {busy ? <ActivityIndicator color={spinnerColor} size="small" /> : icon}
      <Text className={`font-semibold ${size === 'sm' ? 'text-sm' : 'text-base'} ${labelClasses[emphasis][intent]}`}>{label}</Text>
    </Pressable>
  );
}

export type IconButtonProps = Omit<NativePressableProps, 'children'> & {
  accessibilityLabel: string;
  icon: ReactNode;
  size?: 'sm' | 'md';
  selected?: boolean;
};

export function IconButton({ accessibilityLabel, accessibilityState, className = '', icon, selected = false, size = 'md', ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected, ...accessibilityState }}
      className={`${size === 'sm' ? 'h-10 w-10' : 'h-11 w-11'} items-center justify-center rounded-full border focus-visible:ring-2 focus-visible:ring-ui-focus dark:focus-visible:ring-ui-dark-focus ${selected ? 'border-ui-primary bg-ui-primary-soft dark:border-ui-dark-primary dark:bg-ui-dark-primary-soft' : 'border-ui-border bg-ui-surface active:bg-ui-muted dark:border-ui-dark-border dark:bg-ui-dark-surface dark:active:bg-ui-dark-muted'} ${className}`}
      hitSlop={4}
      {...props}
    >
      {icon}
    </Pressable>
  );
}
