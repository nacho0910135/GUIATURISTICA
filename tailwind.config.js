const tokens = require('./src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: tokens.colors.forest, caribbean: tokens.colors.caribbean, sand: tokens.colors.sand, neutral: tokens.colors.neutral,
        frog: { 100: tokens.colors.forest[100], 200: tokens.colors.forest[200], 300: tokens.colors.forest[300], 400: tokens.colors.forest[400], 500: tokens.colors.forest[500] },
        mint: { 50: tokens.colors.neutral[50], 100: tokens.colors.neutral[100], 200: tokens.colors.neutral[200], 300: tokens.colors.neutral[300], 600: tokens.colors.neutral[500] },
        coral: { 50: '#FFF5F3', 200: '#FFD0CB', 500: tokens.colors.status.danger, 600: '#A92E2E' },
        ui: {
          primary: tokens.colors.light.primary, 'primary-pressed': tokens.colors.light.primaryPressed, 'primary-soft': tokens.colors.light.primarySoft,
          secondary: tokens.colors.light.secondary, background: tokens.colors.light.background, surface: tokens.colors.light.surface,
          muted: tokens.colors.light.surfaceMuted, text: tokens.colors.light.text, 'text-muted': tokens.colors.light.textMuted,
          border: tokens.colors.light.border, focus: tokens.colors.light.focus, success: tokens.colors.light.success,
          warning: tokens.colors.light.warning, danger: tokens.colors.light.danger, info: tokens.colors.light.info,
          glass: tokens.colors.light.glass, scrim: tokens.colors.light.scrim,
          dark: {
            primary: tokens.colors.dark.primary, 'primary-pressed': tokens.colors.dark.primaryPressed, 'primary-soft': tokens.colors.dark.primarySoft,
            secondary: tokens.colors.dark.secondary, background: tokens.colors.dark.background, surface: tokens.colors.dark.surface,
            muted: tokens.colors.dark.surfaceMuted, text: tokens.colors.dark.text, 'text-muted': tokens.colors.dark.textMuted,
            border: tokens.colors.dark.border, focus: tokens.colors.dark.focus, success: tokens.colors.dark.success,
            warning: tokens.colors.dark.warning, danger: tokens.colors.dark.danger, info: tokens.colors.dark.info,
            glass: tokens.colors.dark.glass, scrim: tokens.colors.dark.scrim,
          },
        },
      },
      fontFamily: {
        sans: [tokens.typography.families.body],
        display: [tokens.typography.families.display],
        medium: [tokens.typography.families.medium],
        semibold: [tokens.typography.families.semibold],
        bold: [tokens.typography.families.bold],
        extrabold: [tokens.typography.families.extrabold],
      },
      borderRadius: { card: `${tokens.radius.card}px`, control: `${tokens.radius.md}px`, modal: `${tokens.radius.modal}px` },
      boxShadow: { card: tokens.elevation.card, floating: tokens.elevation.floating },
      maxWidth: { content: `${tokens.layout.contentMaxWidth}px`, feed: `${tokens.layout.feedMaxWidth}px` },
    },
  },
  plugins: [],
};
