import React from 'react';
import { View, Text, Pressable } from 'react-native';
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

const LABELS: Record<string, string> = {
  index: 'Scripts',
  studio: 'Studio',
  overlay: 'Overlay',
  settings: 'Settings',
};

function CustomTabBar({ state, navigation }: any) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.sm,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const Icon = ICONS[route.name] ?? FileText;
        const label = LABELS[route.name] ?? route.name;

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

        const tint = isFocused ? colors.accent : colors.textTertiary;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 4,
              paddingVertical: spacing.sm,
              borderRadius: 12,
              backgroundColor: isFocused ? colors.accentSubtle : 'transparent',
            }}
          >
            <Icon size={22} color={tint} strokeWidth={isFocused ? 2 : 1.75} />
            <Text
              style={[
                typography.micro,
                { color: tint, letterSpacing: 0.5 },
              ]}
            >
              {label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
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
