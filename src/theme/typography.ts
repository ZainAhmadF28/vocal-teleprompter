import { Platform, type TextStyle } from 'react-native';

/**
 * Typography scale — Inter-style scale tapi pakai system font default
 * (San Francisco di iOS, Roboto di Android — no extra asset).
 */

export const fontFamily = Platform.select({
  android: 'sans-serif',
  default: 'System',
});

export type TypographyScale = {
  /** Hero / Greeting — gigantic, very bold, tight tracking. v2 morphism style. */
  displayXL: TextStyle;
  display: TextStyle;
  h1: TextStyle;
  h2: TextStyle;
  body: TextStyle;
  bodyEmph: TextStyle;
  caption: TextStyle;
  micro: TextStyle;
};

export const typography: TypographyScale = {
  displayXL: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -1.2,
  },
  display: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyEmph: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  micro: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
};

// Backward-compat exports
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 56,
  '6xl': 64,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8,
};
