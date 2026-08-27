const tokens = require('./src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: tokens.colors.neutral, caribbean: tokens.colors.caribbean, sand: tokens.colors.sand, neutral: tokens.colors.neutral,
        frog: { 100: tokens.colors.forest[100], 200: tokens.colors.forest[200], 300: tokens.colors.forest[300], 400: tokens.colors.forest[400], 500: tokens.colors.forest[500] },
        mint: { 50: tokens.colors.neutral[50], 100: tokens.colors.neutral[100], 200: tokens.colors.neutral[200], 300: tokens.colors.neutral[300], 600: tokens.colors.neutral[500] },
        coral: { 50: '#FFF5F3', 200: '#FFD0CB', 500: tokens.colors.status.danger, 600: '#A92E2E' },
        ui: { primary: tokens.colors.light.primary, 'primary-pressed': tokens.colors.light.primaryPressed, 'primary-soft': tokens.colors.light.primarySoft, secondary: tokens.colors.light.secondary, background: tokens.colors.light.background, surface: tokens.colors.light.surface, muted: tokens.colors.light.surfaceMuted, text: tokens.colors.light.text, 'text-muted': tokens.colors.light.textMuted, border: tokens.colors.light.border, danger: tokens.colors.light.danger, dark: { primary: tokens.colors.dark.primary, 'primary-pressed': tokens.colors.dark.primaryPressed, 'primary-soft': tokens.colors.dark.primarySoft, secondary: tokens.colors.dark.secondary, background: tokens.colors.dark.background, surface: tokens.colors.dark.surface, muted: tokens.colors.dark.surfaceMuted, text: tokens.colors.dark.text, 'text-muted': tokens.colors.dark.textMuted, border: tokens.colors.dark.border, danger: tokens.colors.dark.danger } },
      },
      borderRadius: { card: `${tokens.radius.card}px`, control: `${tokens.radius.md}px`, modal: `${tokens.radius.modal}px` },
      maxWidth: { content: `${tokens.layout.contentMaxWidth}px`, feed: `${tokens.layout.feedMaxWidth}px` },
    },
  },
  plugins: [],
};
