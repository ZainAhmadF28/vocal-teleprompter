import React from 'react';
import { View, StatusBar, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  hideStatusBar?: boolean;
}

export function Screen({ children, style, edges = ['top'], hideStatusBar = false }: Props) {
  const { colors, resolvedScheme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar
        barStyle={resolvedScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
        hidden={hideStatusBar}
      />
      <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function useBottomInset() {
  return useSafeAreaInsets().bottom;
}
