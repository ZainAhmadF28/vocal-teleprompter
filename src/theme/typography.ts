import { Platform } from 'react-native';

export const fontFamily = Platform.select({
  android: 'sans-serif',
  default: 'System',
});

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
