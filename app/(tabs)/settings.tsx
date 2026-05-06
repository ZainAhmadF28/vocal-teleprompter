import React from 'react';
import { View, Text, ScrollView, Switch, Pressable } from 'react-native';
import {
  Sun,
  Moon,
  Monitor,
  Crown,
  ChevronRight,
  LogOut,
  Mic,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore, type ThemeMode } from '@/store/settingsStore';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { Card } from '@/ui/components/Card';

function ThemeSwitcher() {
  const { colors, radius, spacing, typography } = useTheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  const options: { mode: ThemeMode; label: string; Icon: any }[] = [
    { mode: 'light', label: 'Light', Icon: Sun },
    { mode: 'dark', label: 'Dark', Icon: Moon },
    { mode: 'system', label: 'System', Icon: Monitor },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {options.map(({ mode, label, Icon }) => {
        const active = themeMode === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => setThemeMode(mode)}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: active ? colors.accentSubtle : colors.bgSubtle,
              borderWidth: 1,
              borderColor: active ? colors.accent : colors.border,
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <Icon
              size={20}
              color={active ? colors.accent : colors.textSecondary}
              strokeWidth={1.75}
            />
            <Text
              style={[
                typography.caption,
                {
                  color: active ? colors.accent : colors.textSecondary,
                  fontWeight: active ? '600' : '400',
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Text
      style={[
        typography.h2,
        { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
      ]}
    >
      {children}
    </Text>
  );
}

function SettingRow({
  label,
  description,
  right,
  onPress,
  destructive,
}: {
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const { colors, typography, spacing } = useTheme();
  const Container: any = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: any) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[
            typography.body,
            { color: destructive ? colors.danger : colors.text, fontWeight: '500' },
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{description}</Text>
        )}
      </View>
      {right}
    </Container>
  );
}

function GroupedCard({ children }: { children: React.ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  // Stack rows with hairline dividers
  const items = React.Children.toArray(children);
  return (
    <View
      style={{
        backgroundColor: colors.bgElevated,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {items.map((child, i) => (
        <View key={i}>
          {child}
          {i < items.length - 1 && (
            <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg }} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function SettingsTab() {
  const { colors, typography, spacing, radius } = useTheme();
  const settings = useSettingsStore();

  return (
    <Screen>
      <Header title="Settings" />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <SectionTitle>Appearance</SectionTitle>
        <ThemeSwitcher />

        <SectionTitle>Prompter Preferences</SectionTitle>
        <GroupedCard>
          <SettingRow
            label="Base Font Size"
            description="Default scaling for new scripts"
            right={
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {settings.defaultFontSize}px
              </Text>
            }
            onPress={() => {
              const sizes = [32, 40, 48, 56, 64];
              const idx = sizes.indexOf(settings.defaultFontSize);
              const next = sizes[(idx + 1) % sizes.length];
              settings.setDefaultFontSize(next);
            }}
          />
          <SettingRow
            label="Scroll Speed"
            description="Target reading pace"
            right={
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {settings.scrollWPM} WPM
              </Text>
            }
            onPress={() => {
              const wpms = [100, 120, 140, 160, 180, 200];
              const idx = wpms.indexOf(settings.scrollWPM);
              const next = wpms[(idx + 1) % wpms.length];
              settings.setScrollWPM(next);
            }}
          />
        </GroupedCard>

        <SectionTitle>Audio Integration</SectionTitle>
        <GroupedCard>
          <SettingRow
            label="Mic Source"
            description="Input for voice scrolling"
            right={
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.md,
                  backgroundColor: colors.bgSubtle,
                }}
              >
                <Mic size={14} color={colors.textSecondary} strokeWidth={1.75} />
                <Text style={[typography.caption, { color: colors.text }]}>
                  {settings.micSource === 'external' ? 'External' : 'Internal'}
                </Text>
              </View>
            }
            onPress={() =>
              settings.setMicSource(settings.micSource === 'external' ? 'internal' : 'external')
            }
          />
          <SettingRow
            label="AI Noise Cancellation"
            description="Improve tracking in loud environments"
            right={
              <Switch
                value={settings.noiseCancellation}
                onValueChange={settings.setNoiseCancellation}
                trackColor={{ true: colors.accent, false: colors.bgSubtle }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingRow
            label="Voice Commands"
            description="Pause / resume / restart by voice"
            right={
              <Switch
                value={settings.voiceCommandsEnabled}
                onValueChange={settings.setVoiceCommandsEnabled}
                trackColor={{ true: colors.accent, false: colors.bgSubtle }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </GroupedCard>

        <SectionTitle>Account</SectionTitle>
        <GroupedCard>
          <SettingRow
            label="Pro Subscription"
            right={
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.pill,
                  backgroundColor: colors.accentSubtle,
                }}
              >
                <Crown size={12} color={colors.accent} strokeWidth={2} />
                <Text style={[typography.micro, { color: colors.accent }]}>ACTIVE</Text>
              </View>
            }
          />
          <SettingRow
            label="Manage Billing"
            right={<ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />}
            onPress={() => {}}
          />
          <SettingRow
            label="Log Out"
            destructive
            right={<LogOut size={18} color={colors.danger} strokeWidth={1.75} />}
            onPress={() => {}}
          />
        </GroupedCard>
      </ScrollView>
    </Screen>
  );
}
