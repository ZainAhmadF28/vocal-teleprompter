import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth,
  style,
  disabled,
  ...rest
}: Props) {
  const { colors, radius, spacing } = useTheme();

  const sizeStyle = sizeStyles[size];
  const variantBg = (() => {
    if (disabled) return colors.bgSubtle;
    switch (variant) {
      case 'primary': return colors.accent;
      case 'secondary': return 'transparent';
      case 'ghost': return 'transparent';
      case 'danger': return colors.danger;
    }
  })();
  const variantTextColor = (() => {
    if (disabled) return colors.textTertiary;
    switch (variant) {
      case 'primary': return colors.textInverse;
      case 'secondary': return colors.text;
      case 'ghost': return colors.text;
      case 'danger': return colors.textInverse;
    }
  })();
  const variantBorder = variant === 'secondary' ? colors.border : 'transparent';

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: variantBg,
          borderColor: variantBorder,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderRadius: radius.md,
          paddingHorizontal: sizeStyle.padX,
          paddingVertical: sizeStyle.padY,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      {...rest}
    >
      {leftIcon}
      <Text
        style={{
          color: variantTextColor,
          fontSize: sizeStyle.fontSize,
          fontWeight: '600',
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
      {rightIcon}
    </Pressable>
  );
}

const sizeStyles = {
  sm: { padX: 12, padY: 8, fontSize: 13 },
  md: { padX: 16, padY: 12, fontSize: 15 },
  lg: { padX: 20, padY: 14, fontSize: 16 },
};
