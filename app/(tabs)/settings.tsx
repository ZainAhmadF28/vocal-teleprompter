import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore, type ThemeMode } from '@/store/settingsStore';
import { useScriptsStore } from '@/store/scriptsStore';
import { Screen } from '@/ui/components/Screen';
import TeleprompterOverlay from '../../modules/expo-teleprompter-overlay/src/index';

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────

function GradientAvatar() {
  const { radius } = useTheme();
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        overflow: 'hidden',
        backgroundColor: '#FED7AA',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#A7F3D0',
          opacity: 0.55,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -10,
          right: -10,
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: '#FCA5A5',
          opacity: 0.65,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: -10,
          left: -10,
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: '#FDE68A',
          opacity: 0.7,
        }}
      />
    </View>
  );
}

function SectionHeader({ children }: { children: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Text
      style={[
        typography.micro,
        {
          color: colors.textSecondary,
          marginTop: spacing.xl,
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.sm,
          letterSpacing: 1.5,
        },
      ]}
    >
      {children}
    </Text>
  );
}

function GroupCard({ children }: { children: React.ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
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
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginLeft: spacing.lg,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

interface RowProps {
  label: string;
  description?: string;
  value?: string;
  valueColor?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

function Row({
  label,
  description,
  value,
  valueColor,
  trailing,
  onPress,
  destructive,
}: RowProps) {
  const { colors, typography, spacing } = useTheme();
  const Container: any = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: any) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          gap: spacing.md,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[
            typography.body,
            {
              color: destructive ? colors.danger : colors.text,
              fontWeight: '500',
              fontSize: 16,
            },
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>

      {trailing ?? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {value && (
            <Text
              style={[
                typography.body,
                {
                  color: valueColor ?? colors.textSecondary,
                  fontWeight: valueColor ? '600' : '400',
                  fontSize: 15,
                },
              ]}
            >
              {value}
            </Text>
          )}
          {onPress && (
            <ChevronRight
              size={18}
              color={colors.textTertiary}
              strokeWidth={1.75}
            />
          )}
        </View>
      )}
    </Container>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <Row
      label={label}
      description={description}
      trailing={
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.text, false: colors.bgSubtle }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.bgSubtle}
        />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pickers
// ─────────────────────────────────────────────────────────────────────────────

function ThemeSwitcher() {
  const { colors, radius, spacing, typography } = useTheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  const options: { mode: ThemeMode; label: string; Icon: any }[] = [
    { mode: 'light', label: 'Light', Icon: Sun },
    { mode: 'dark', label: 'Dark', Icon: Moon },
    { mode: 'system', label: 'Auto', Icon: Monitor },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        backgroundColor: colors.bgElevated,
        padding: 6,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
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
              backgroundColor: active ? colors.text : 'transparent',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon
              size={18}
              color={active ? colors.textInverse : colors.textSecondary}
              strokeWidth={1.75}
            />
            <Text
              style={[
                typography.caption,
                {
                  color: active ? colors.textInverse : colors.textSecondary,
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

// ─────────────────────────────────────────────────────────────────────────────
// Cycling helpers
// ─────────────────────────────────────────────────────────────────────────────

function cycle<T>(arr: readonly T[], current: T): T {
  const idx = arr.indexOf(current);
  return arr[(idx + 1) % arr.length];
}

const FONT_SIZES = [32, 40, 48, 56, 64] as const;
const SENSITIVITY = ['low', 'medium', 'high'] as const;
const SMOOTHING = [0.10, 0.15, 0.25, 0.35] as const;
const MULTIPLIERS = [0.7, 0.85, 1.0, 1.15, 1.3, 1.5] as const;
const NOISE_FILTERS = ['off', 'medium', 'aggressive'] as const;
const MIC_SOURCES = ['internal', 'external'] as const;
const OVERLAY_OPACITIES = [0.5, 0.7, 0.85, 1.0] as const;

const SMOOTHING_LABELS: Record<number, string> = {
  0.10: 'Light',
  0.15: 'Medium',
  0.25: 'Heavy',
  0.35: 'Max',
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsTab() {
  const { colors, typography, spacing } = useTheme();
  const settings = useSettingsStore();
  const scriptsCount = useScriptsStore((s) => s.scripts.length);

  const [overlayPerm, setOverlayPerm] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const refreshOverlayPerm = useCallback(async () => {
    try {
      const ok = await TeleprompterOverlay.hasPermission();
      setOverlayPerm(ok ? 'granted' : 'denied');
    } catch {
      setOverlayPerm('unknown');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshOverlayPerm();
    }, [refreshOverlayPerm])
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 120,
        }}
      >
        {/* Title */}
        <Text
          style={[
            typography.h1,
            {
              color: colors.text,
              textAlign: 'center',
              marginTop: spacing.md,
              marginBottom: spacing.xl,
              fontSize: 24,
              fontWeight: '700',
            },
          ]}
        >
          Settings
        </Text>

        {/* Profile / Pro card */}
        <Pressable
          onPress={() => Alert.alert('Vocal Teleprompter Pro', 'Manage subscription coming soon.')}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              backgroundColor: colors.bgElevated,
              padding: spacing.lg,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <GradientAvatar />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[typography.bodyEmph, { color: colors.text, fontSize: 16, fontWeight: '700' }]}>
              Vocal Teleprompter Pro
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {scriptsCount} script{scriptsCount === 1 ? '' : 's'} saved
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Manage</Text>
          <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
        </Pressable>

        {/* APPEARANCE */}
        <SectionHeader>APPEARANCE</SectionHeader>
        <ThemeSwitcher />

        {/* PROMPTER */}
        <SectionHeader>PROMPTER</SectionHeader>
        <GroupCard>
          <Row
            label="Default font size"
            value={`${settings.defaultFontSize} pt`}
            onPress={() =>
              settings.setDefaultFontSize(cycle(FONT_SIZES, settings.defaultFontSize as any))
            }
          />
          <Row
            label="Sensitivity"
            value={
              settings.defaultSensitivity === 'low'
                ? 'Low'
                : settings.defaultSensitivity === 'high'
                ? 'High'
                : 'Medium'
            }
            onPress={() =>
              settings.setDefaultSensitivity(cycle(SENSITIVITY, settings.defaultSensitivity))
            }
          />
          <Row
            label="Smoothing"
            value={SMOOTHING_LABELS[settings.smoothingStrength] ?? 'Medium'}
            onPress={() =>
              settings.setSmoothingStrength(cycle(SMOOTHING, settings.smoothingStrength as any))
            }
          />
          <Row
            label="Speed multiplier"
            value={`${settings.speedMultiplier.toFixed(2).replace(/\.?0+$/, '')}×`}
            onPress={() =>
              settings.setSpeedMultiplier(cycle(MULTIPLIERS, settings.speedMultiplier as any))
            }
          />
          <Row
            label="Reading speed"
            value={`${settings.scrollWPM} WPM`}
            onPress={() => {
              const wpms = [100, 120, 140, 160, 180, 200];
              settings.setScrollWPM(cycle(wpms, settings.scrollWPM));
            }}
          />
        </GroupCard>

        {/* AUDIO */}
        <SectionHeader>AUDIO</SectionHeader>
        <GroupCard>
          <ToggleRow
            label="Bluetooth mic"
            value={settings.bluetoothMicEnabled}
            onChange={settings.setBluetoothMicEnabled}
          />
          <ToggleRow
            label="Voice commands"
            value={settings.voiceCommandsEnabled}
            onChange={settings.setVoiceCommandsEnabled}
          />
          <Row
            label="Mic source"
            value={settings.micSource === 'external' ? 'External USB' : 'Internal'}
            onPress={() => settings.setMicSource(cycle(MIC_SOURCES, settings.micSource))}
          />
          <Row
            label="Noise filter"
            value={
              settings.noiseFilterLevel === 'off'
                ? 'Off'
                : settings.noiseFilterLevel === 'aggressive'
                ? 'Aggressive'
                : 'Medium'
            }
            onPress={() =>
              settings.setNoiseFilterLevel(cycle(NOISE_FILTERS, settings.noiseFilterLevel))
            }
          />
        </GroupCard>

        {/* OVERLAY */}
        <SectionHeader>OVERLAY</SectionHeader>
        <GroupCard>
          <Row
            label="Display over apps"
            value={
              overlayPerm === 'granted'
                ? 'Granted'
                : overlayPerm === 'denied'
                ? 'Denied'
                : 'Check'
            }
            valueColor={
              overlayPerm === 'granted'
                ? colors.success
                : overlayPerm === 'denied'
                ? colors.danger
                : undefined
            }
            onPress={async () => {
              const ok = await TeleprompterOverlay.hasPermission();
              if (!ok) {
                await TeleprompterOverlay.requestPermission();
              } else {
                Linking.openSettings();
              }
              refreshOverlayPerm();
            }}
          />
          <Row
            label="Default size"
            value={`${settings.overlayDefaultSize.width} × ${settings.overlayDefaultSize.height}`}
            onPress={() => {
              const sizes = [
                { width: 280, height: 160 },
                { width: 400, height: 200 },
                { width: 560, height: 280 },
              ];
              const idx = sizes.findIndex(
                (s) =>
                  s.width === settings.overlayDefaultSize.width &&
                  s.height === settings.overlayDefaultSize.height
              );
              const next = sizes[(idx + 1) % sizes.length];
              settings.setOverlayDefaultSize(next);
            }}
          />
          <Row
            label="Opacity"
            value={`${Math.round(settings.overlayOpacity * 100)}%`}
            onPress={() =>
              settings.setOverlayOpacity(cycle(OVERLAY_OPACITIES, settings.overlayOpacity as any))
            }
          />
        </GroupCard>

        {/* ACCOUNT */}
        <SectionHeader>ACCOUNT</SectionHeader>
        <GroupCard>
          <Row
            label="Manage Billing"
            onPress={() => Alert.alert('Manage Billing', 'Billing management coming soon.')}
          />
          <Row
            label="Log Out"
            destructive
            onPress={() =>
              Alert.alert('Log Out', 'Yakin mau logout?', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => {} },
              ])
            }
          />
        </GroupCard>

        {/* App version footer */}
        <Text
          style={[
            typography.caption,
            {
              color: colors.textTertiary,
              textAlign: 'center',
              marginTop: spacing.xl,
            },
          ]}
        >
          Vocal Teleprompter · v1.0.0
        </Text>
      </ScrollView>
    </Screen>
  );
}
