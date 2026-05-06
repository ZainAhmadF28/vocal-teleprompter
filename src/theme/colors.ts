/**
 * Color tokens — dark + light palettes.
 * Pakai useTheme() di komponen buat pilih sesuai theme mode aktif.
 */

export type ColorTokens = {
  // Surfaces
  bg: string;
  bgElevated: string;
  bgSubtle: string;
  border: string;
  borderStrong: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textDim: string;
  textInverse: string; // text on accent bg

  // Accent
  accent: string;
  accentHover: string;
  accentSubtle: string;

  // Semantic
  success: string;
  warning: string;
  danger: string;

  // Karaoke prompter states
  karaokeSpoken: string;
  karaokeCurrent: string;
  karaokePending: string;

  // Reading line
  readingLine: string;
};

export const darkColors: ColorTokens = {
  bg: '#000000',
  bgElevated: '#0A0A0A',
  bgSubtle: '#141414',
  border: '#1F1F1F',
  borderStrong: '#2A2A2A',

  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#52525B',
  textDim: '#27272A',
  textInverse: '#0A0A0A',

  accent: '#3B82F6',
  accentHover: '#2563EB',
  accentSubtle: 'rgba(59, 130, 246, 0.12)',

  success: '#22C55E',
  warning: '#EAB308',
  danger: '#EF4444',

  karaokeSpoken: '#3F3F46',
  karaokeCurrent: '#3B82F6',
  karaokePending: '#FAFAFA',

  readingLine: '#3B82F6',
};

export const lightColors: ColorTokens = {
  bg: '#FFFFFF',
  bgElevated: '#F9FAFB',
  bgSubtle: '#F3F4F6',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  text: '#18181B',
  textSecondary: '#52525B',
  textTertiary: '#A1A1AA',
  textDim: '#D4D4D8',
  textInverse: '#FAFAFA',

  accent: '#2563EB',
  accentHover: '#1D4ED8',
  accentSubtle: 'rgba(37, 99, 235, 0.10)',

  success: '#16A34A',
  warning: '#CA8A04',
  danger: '#DC2626',

  karaokeSpoken: '#D4D4D8',
  karaokeCurrent: '#2563EB',
  karaokePending: '#18181B',

  readingLine: '#2563EB',
};

/**
 * Backward-compat alias — code lama yg import `colors` dari sini.
 * BARU: pakai `useTheme()` dari `@/theme/ThemeProvider` untuk theming aware light/dark.
 */
export const colors = {
  ...darkColors,
  // Aliases for legacy key names
  background: darkColors.bg,
  surface: darkColors.bgSubtle,
  surfaceElevated: darkColors.bgElevated,
  primary: darkColors.accent,
  primaryDim: darkColors.accentSubtle,
};
