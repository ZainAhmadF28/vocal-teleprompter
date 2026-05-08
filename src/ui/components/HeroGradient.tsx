import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Cheap gradient backdrop using stacked Views with opacity gradient.
 * Doesn't require react-native-svg — good enough for subtle hero washes.
 * For hi-fi gradients, swap in expo-linear-gradient later.
 */
export function HeroGradient({ height = 240, style }: Props) {
  const { colors } = useTheme();
  const [top, mid, bottom] = colors.heroGradient;

  return (
    <View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height,
          backgroundColor: top,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <View style={{ flex: 1, backgroundColor: mid, opacity: 0.6 }} />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40%',
          backgroundColor: bottom,
          opacity: 0.5,
        }}
      />
    </View>
  );
}
