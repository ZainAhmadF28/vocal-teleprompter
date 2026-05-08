import React from 'react';
import { View, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Video, Layers, Settings } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: Record<string, React.ComponentType<any>> = {
  index: FileText,
  studio: Video,
  overlay: Layers,
  settings: Settings,
};

/**
 * Floating pill dock — modern morphism style. Tab bar mengambang di atas
 * konten (transparent bg di sekelilingnya), pill dengan glass-effect.
 * Active tab pakai accent fill biar jelas.
 */
function CustomTabBar({ state, navigation }: any) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        paddingTop: spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.glass,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          paddingVertical: 6,
          paddingHorizontal: 6,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const Icon = ICONS[route.name] ?? FileText;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                {
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: spacing.md - 2,
                  borderRadius: radius.pill,
                  backgroundColor: isFocused ? colors.accent : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Icon
                size={22}
                color={isFocused ? colors.textInverse : colors.textSecondary}
                strokeWidth={isFocused ? 2.2 : 1.75}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="studio" />
      <Tabs.Screen name="overlay" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
