/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        forest: { 50: '#f1f8f4', 500: '#16714c', 600: '#0b5b3c', 700: '#084d36', 800: '#063f30', 900: '#053326', 950: '#02251b' },
        frog: { 100: '#dff8e8', 200: '#b9f3d0', 300: '#78dfa1', 400: '#37c774', 500: '#13a95b' },
        mint: { 50: '#f7fbf8', 100: '#edf7f1', 200: '#dceee5', 300: '#c3e1d2', 600: '#75a291' },
        coral: { 50: '#fff5f3', 200: '#ffd0cb', 500: '#ff5d52', 600: '#d94c43' },
        caribbean: { 500: '#159ed1', 600: '#087db4' },
      },
    },
  },
  plugins: [],
};
