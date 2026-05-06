import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'plain' | 'subtle' | 'accent' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  icon: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: number;
}

export function IconButton({
  icon,
  onPress,
  variant = 'plain',
  size = 'md',
  style,
  disabled,
  hitSlop = 8,
}: Props) {
  const { colors, radius } = useTheme();

  const dimension = size === 'sm' ? 36 : size === 'md' ? 44 : 56;

  const bg = (() => {
    if (disabled) return colors.bgSubtle;
    switch (variant) {
      case 'plain': return 'transparent';
      case 'subtle': return colors.bgSubtle;
      case 'accent': return colors.accentSubtle;
      case 'danger': return colors.danger;
    }
  })();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        {
          width: dimension,
          height: dimension,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}
