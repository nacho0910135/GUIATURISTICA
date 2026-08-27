import tokens from './tokens.json';

export const appTheme = {
  ...tokens,
  components: {
    button: { height: 48, horizontalPadding: 20, radius: tokens.radius.md },
    input: { minHeight: 48, horizontalPadding: 16, radius: tokens.radius.md, borderWidth: 1 },
    card: { padding: 16, radius: tokens.radius.card, borderWidth: 1 },
    avatar: { small: 32, medium: 44, large: 72 },
    chip: { height: 32, horizontalPadding: 12, radius: tokens.radius.pill },
  },
} as const;

export type AppTheme = typeof appTheme;
