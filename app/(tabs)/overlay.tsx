import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import {
  PictureInPicture2,
  Info,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { IconButton } from '@/ui/components/IconButton';

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => React.ReactNode;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.bgSubtle,
        borderRadius: radius.md,
        padding: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              alignItems: 'center',
              borderRadius: radius.sm,
              backgroundColor: active ? colors.accent : 'transparent',
            }}
          >
            {renderLabel ? (
              renderLabel(opt)
            ) : (
              <Text
                style={[
                  typography.caption,
                  { color: active ? colors.textInverse : colors.textSecondary, fontWeight: '600' },
                ]}
              >
                {opt[0].toUpperCase() + opt.slice(1)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function OverlayTab() {
  const { colors, typography, spacing, radius } = useTheme();
  const settings = useSettingsStore();

  return (
    <Screen>
      <Header
        title="Overlay"
        right={
          <IconButton
            icon={<SettingsIcon size={20} color={colors.text} strokeWidth={1.75} />}
            onPress={() => router.push('/settings')}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.h1, { color: colors.text }]}>Overlay Configuration</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Customize your floating prompter appearance.
          </Text>
        </View>

        {/* Preview */}
        <Card padded={false}>
          <View
            style={{
              aspectRatio: 16 / 9,
              backgroundColor: colors.bgSubtle,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                opacity: settings.overlayOpacity,
                maxWidth: '85%',
              }}
            >
              <Text style={[typography.body, { color: '#FFFFFF', textAlign: 'center' }]}>
                Welcome to the broadcast. Today we will be discussing the
              </Text>
              <View
                style={{
                  height: 2,
                  backgroundColor: colors.accent,
                  marginTop: spacing.sm,
                  borderRadius: 1,
                }}
              />
            </View>
          </View>
        </Card>

        {/* Opacity slider */}
        <Card>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.micro, { color: colors.textSecondary }]}>OVERLAY OPACITY</Text>
              <Text style={[typography.micro, { color: colors.text }]}>
                {Math.round(settings.overlayOpacity * 100)}%
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {[0.4, 0.6, 0.8, 1.0].map((v) => {
                const active = Math.abs(settings.overlayOpacity - v) < 0.05;
                return (
                  <Pressable
                    key={v}
                    onPress={() => settings.setOverlayOpacity(v)}
                    style={{
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: active ? colors.accent : colors.bgSubtle,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: active ? colors.textInverse : colors.textSecondary, fontWeight: '600' },
                      ]}
                    >
                      {Math.round(v * 100)}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Window size */}
        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.micro, { color: colors.textSecondary }]}>WINDOW SIZE</Text>
            <SegmentedControl
              options={['small', 'medium', 'large'] as const}
              value={
                settings.overlayDefaultSize.width <= 320
                  ? 'small'
                  : settings.overlayDefaultSize.width <= 480
                  ? 'medium'
                  : 'large'
              }
              onChange={(v) => {
                const sizeMap = {
                  small: { width: 280, height: 160 },
                  medium: { width: 400, height: 200 },
                  large: { width: 560, height: 280 },
                };
                settings.setOverlayDefaultSize(sizeMap[v]);
              }}
            />
          </View>
        </Card>

        {/* Alignment */}
        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.micro, { color: colors.textSecondary }]}>ALIGNMENT</Text>
            <SegmentedControl
              options={['left', 'center', 'right'] as const}
              value={settings.overlayAlignment}
              onChange={settings.setOverlayAlignment}
              renderLabel={(opt) => {
                const Icon = opt === 'left' ? AlignLeft : opt === 'center' ? AlignCenter : AlignRight;
                const active = opt === settings.overlayAlignment;
                return (
                  <Icon
                    size={18}
                    color={active ? colors.textInverse : colors.textSecondary}
                    strokeWidth={1.75}
                  />
                );
              }}
            />
          </View>
        </Card>

        {/* Backdrop */}
        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.micro, { color: colors.textSecondary }]}>BACKDROP</Text>
            <SegmentedControl
              options={['transparent', 'dim', 'blur'] as const}
              value={settings.overlayBackdrop}
              onChange={settings.setOverlayBackdrop}
            />
          </View>
        </Card>

        {/* Permission notice */}
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
            <Info size={18} color={colors.warning} strokeWidth={1.75} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 19 }]}>
              Floating mode requires the{' '}
              <Text style={{ color: colors.text, fontWeight: '600' }}>'Display over other apps'</Text>{' '}
              permission to function outside of the main application window.
            </Text>
          </View>
        </Card>

        <Button
          label="Launch Floating Mode"
          variant="primary"
          fullWidth
          leftIcon={<PictureInPicture2 size={18} color={colors.textInverse} strokeWidth={1.75} />}
          onPress={() => {
            // TODO: launch overlay (Sprint 4 native module)
            router.push('/');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
