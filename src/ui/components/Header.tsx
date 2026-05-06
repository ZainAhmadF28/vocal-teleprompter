import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  centered?: boolean;
}

export function Header({ title, left, right, centered = true }: Props) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        minHeight: 56,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bg,
        gap: spacing.sm,
      }}
    >
      <View style={{ minWidth: 44, alignItems: 'flex-start', flexShrink: 0 }}>{left}</View>
      {title && (
        <Text
          style={[
            typography.h2,
            { color: colors.text, flex: 1, textAlign: centered ? 'center' : 'left' },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
      <View style={{ minWidth: 44, alignItems: 'flex-end', flexShrink: 0 }}>{right}</View>
    </View>
  );
}
