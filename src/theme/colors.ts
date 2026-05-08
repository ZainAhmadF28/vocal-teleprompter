/**
 * Color tokens — dark + light palettes.
 * Pakai useTheme() di komponen buat pilih sesuai theme mode aktif.
 *
 * v2 (modern morphism): tambah `cardTints` palette buat action cards berwarna,
 * dan `gradient` untuk hero backgrounds.
 */

export interface ColorTint {
  /** Background fill of the tinted card */
  bg: string;
  /** Icon color when icon sits inside the tint bg */
  icon: string;
  /** Text label tint, biasanya senada dengan icon */
  label: string;
  /** Subtle border for the tinted card (optional) */
  border: string;
}

export interface ColorTints {
  blue: ColorTint;
  green: ColorTint;
  yellow: ColorTint;
  pink: ColorTint;
  orange: ColorTint;
  purple: ColorTint;
}

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

  // Tinted action cards (v2)
  tints: ColorTints;

  // Hero gradient stops (top → bottom). Sebagai array buat react-native-svg LinearGradient
  // kalau diperlukan, atau bisa di-fake pakai layered Views.
  heroGradient: [string, string, string];

  // Glass / morphism — translucent surface for floating elements
  glass: string;
  glassBorder: string;
};

export const darkColors: ColorTokens = {
  bg: '#0A0A0F',
  bgElevated: '#13131A',
  bgSubtle: '#1A1A22',
  border: 'rgba(99, 102, 241, 0.18)',
  borderStrong: 'rgba(99, 102, 241, 0.40)',

  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#52525B',
  textDim: '#27272A',
  textInverse: '#0A0A0F',

  accent: '#6366F1', // indigo — lebih kekinian dibanding blue murni
  accentHover: '#4F46E5',
  accentSubtle: 'rgba(99, 102, 241, 0.14)',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  karaokeSpoken: '#3F3F46',
  karaokeCurrent: '#818CF8',
  karaokePending: '#FAFAFA',

  readingLine: '#818CF8',

  tints: {
    blue:   { bg: 'rgba(99, 102, 241, 0.14)',  icon: '#A5B4FC', label: '#C7D2FE', border: 'rgba(99, 102, 241, 0.30)' },
    green:  { bg: 'rgba(16, 185, 129, 0.14)',  icon: '#6EE7B7', label: '#A7F3D0', border: 'rgba(16, 185, 129, 0.30)' },
    yellow: { bg: 'rgba(234, 179, 8, 0.14)',   icon: '#FDE68A', label: '#FEF3C7', border: 'rgba(234, 179, 8, 0.30)'  },
    pink:   { bg: 'rgba(236, 72, 153, 0.14)',  icon: '#F9A8D4', label: '#FBCFE8', border: 'rgba(236, 72, 153, 0.30)' },
    orange: { bg: 'rgba(249, 115, 22, 0.14)',  icon: '#FED7AA', label: '#FFEDD5', border: 'rgba(249, 115, 22, 0.30)' },
    purple: { bg: 'rgba(168, 85, 247, 0.14)',  icon: '#D8B4FE', label: '#E9D5FF', border: 'rgba(168, 85, 247, 0.30)' },
  },

  heroGradient: ['#0A0A0F', '#13131A', '#1A1A22'],

  glass: 'rgba(20, 20, 28, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
};

export const lightColors: ColorTokens = {
  bg: '#F5F1E8', // cream paper — modern morphism light bg
  bgElevated: '#FFFFFF',
  bgSubtle: '#EFEBE0',
  border: 'rgba(99, 102, 241, 0.18)',
  borderStrong: '#D4D4D8',

  text: '#0A0A0F',
  textSecondary: '#52525B',
  textTertiary: '#A1A1AA',
  textDim: '#D4D4D8',
  textInverse: '#FAFAFA',

  accent: '#4F46E5',
  accentHover: '#4338CA',
  accentSubtle: 'rgba(79, 70, 229, 0.10)',

  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',

  karaokeSpoken: '#D4D4D8',
  karaokeCurrent: '#4F46E5',
  karaokePending: '#0A0A0F',

  readingLine: '#4F46E5',

  tints: {
    blue:   { bg: '#DBEAFE', icon: '#2563EB', label: '#1E3A8A', border: '#BFDBFE' },
    green:  { bg: '#D1FAE5', icon: '#059669', label: '#064E3B', border: '#A7F3D0' },
    yellow: { bg: '#FEF3C7', icon: '#D97706', label: '#78350F', border: '#FDE68A' },
    pink:   { bg: '#FCE7F3', icon: '#DB2777', label: '#831843', border: '#FBCFE8' },
    orange: { bg: '#FED7AA', icon: '#EA580C', label: '#7C2D12', border: '#FED7AA' },
    purple: { bg: '#E9D5FF', icon: '#7C3AED', label: '#581C87', border: '#DDD6FE' },
  },

  heroGradient: ['#FAFAFA', '#F4F4F5', '#EFE9FE'],

  glass: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
};

/**
 * Backward-compat alias — code lama yg import `colors` dari sini.
 * BARU: pakai `useTheme()` dari `@/theme/ThemeProvider` untuk theming aware light/dark.
 */
export const colors = {
  ...darkColors,
  background: darkColors.bg,
  surface: darkColors.bgSubtle,
  surfaceElevated: darkColors.bgElevated,
  primary: darkColors.accent,
  primaryDim: darkColors.accentSubtle,
};
