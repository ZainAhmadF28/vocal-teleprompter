import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ColorTints } from '@/theme/colors';

export type TintVariant = keyof ColorTints;

interface Props {
  tint: TintVariant;
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Action card with a soft tinted background. Inspired by modern morphism UIs
 * (e.g. document scanning apps with playful pastel cards). Light mode uses
 * pastels; dark mode uses translucent saturated overlays.
 */
export function TintedCard({
  tint,
  children,
  onPress,
  style,
  active,
  size = 'md',
}: Props) {
  const { colors, radius, spacing } = useTheme();
  const tintTokens = colors.tints[tint];

  const padding = size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg;

  const baseStyle: ViewStyle = {
    backgroundColor: tintTokens.bg,
    borderRadius: radius.xl,
    borderWidth: active ? 2 : 1,
    borderColor: active ? tintTokens.icon : tintTokens.border,
    padding,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          {
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
}
