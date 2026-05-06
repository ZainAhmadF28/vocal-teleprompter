import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Maximize2,
  Layers,
  Video,
  Play,
  TextCursorInput,
  Mic,
  MicOff,
  AudioLines,
  Minus,
  Plus,
  Gauge,
  Voicemail,
} from 'lucide-react-native';
import type { ScrollMode } from '@/store/settingsStore';
import { useScriptsStore } from '@/store/scriptsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePrompterStore } from '@/store/prompterStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { IconButton } from '@/ui/components/IconButton';
import { Button } from '@/ui/components/Button';

type Mode = 'fullscreen' | 'floating' | 'camera';

const MODES: { id: Mode; label: string; Icon: any; description: string }[] = [
  { id: 'fullscreen', label: 'Fullscreen', Icon: Maximize2, description: 'Standard view' },
  { id: 'floating', label: 'Floating', Icon: Layers, description: 'Over other apps' },
  { id: 'camera', label: 'Camera Studio', Icon: Video, description: 'Record video with prompter' },
];

function ModeCard({
  mode,
  active,
  onPress,
}: {
  mode: typeof MODES[number];
  active: boolean;
  onPress: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const { Icon } = mode;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: active ? colors.accentSubtle : colors.bgElevated,
          borderRadius: radius.lg,
          borderWidth: active ? 1.5 : 1,
          borderColor: active ? colors.accent : colors.border,
          padding: spacing.lg,
          minHeight: 130,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon
        size={28}
        color={active ? colors.accent : colors.textSecondary}
        strokeWidth={1.75}
      />
      <Text
        style={[
          typography.bodyEmph,
          { color: active ? colors.accent : colors.text, textAlign: 'center' },
        ]}
        numberOfLines={1}
      >
        {mode.label}
      </Text>
      <Text
        style={[
          typography.caption,
          { color: colors.textSecondary, textAlign: 'center' },
        ]}
        numberOfLines={1}
      >
        {mode.description}
      </Text>
    </Pressable>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
  formatLabel,
  leftIcon,
  rightIcon,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatLabel?: (v: number) => string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const pct = (value - min) / (max - min);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {leftIcon}
        <View style={{ flex: 1, height: 4, backgroundColor: colors.bgSubtle, borderRadius: 2, overflow: 'hidden' }}>
          <View
            style={{
              width: `${Math.round(pct * 100)}%`,
              height: '100%',
              backgroundColor: colors.accent,
            }}
          />
        </View>
        {rightIcon}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={dec}
          style={({ pressed }) => [
            {
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: colors.bgSubtle,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Minus size={16} color={colors.text} strokeWidth={1.75} />
        </Pressable>
        <Text style={[typography.bodyEmph, { color: colors.text }]}>
          {formatLabel ? formatLabel(value) : value}
        </Text>
        <Pressable
          onPress={inc}
          style={({ pressed }) => [
            {
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: colors.bgSubtle,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Plus size={16} color={colors.text} strokeWidth={1.75} />
        </Pressable>
      </View>
    </View>
  );
}

export default function PreflightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();

  const getScript = useScriptsStore((s) => s.getScript);
  const settings = useSettingsStore();
  const setDetectedLanguage = usePrompterStore((s) => s.setDetectedLanguage);
  const setActiveScript = usePrompterStore((s) => s.setActiveScript);

  const script = getScript(id);

  const [mode, setMode] = useState<Mode>('fullscreen');
  const [scrollMode, setScrollModeLocal] = useState<ScrollMode>(settings.scrollMode);
  const [fontSize, setFontSize] = useState(settings.defaultFontSize);
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>(
    settings.defaultSensitivity
  );
  const [wpm, setWpm] = useState(settings.scrollWPM);

  const sensitivityToValue = (s: typeof sensitivity) =>
    s === 'low' ? 0 : s === 'medium' ? 1 : 2;
  const valueToSensitivity = (v: number): typeof sensitivity =>
    v <= 0 ? 'low' : v >= 2 ? 'high' : 'medium';

  if (!script) {
    return (
      <Screen>
        <Header
          title="Pre-flight"
          left={
            <IconButton
              icon={<ChevronLeft size={22} color={colors.text} strokeWidth={1.75} />}
              onPress={() => router.back()}
            />
          }
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[typography.body, { color: colors.danger }]}>Script tidak ditemukan.</Text>
        </View>
      </Screen>
    );
  }

  const handleLaunch = () => {
    setDetectedLanguage(script.language);
    setActiveScript(id);
    settings.setDefaultFontSize(fontSize);
    settings.setDefaultSensitivity(sensitivity);
    settings.setScrollMode(scrollMode);
    settings.setScrollWPM(wpm);

    const baselineWPS = wpm / 60;

    if (mode === 'fullscreen') {
      router.replace(`/prompter/${id}?fontSize=${fontSize}&baselineWPS=${baselineWPS}`);
    } else if (mode === 'camera') {
      router.replace(`/camera/${id}?fontSize=${fontSize}` as any);
    } else {
      // floating: navigate to overlay tab for now (config-only). Native overlay = Sprint 4
      router.replace('/overlay' as any);
    }
  };

  return (
    <Screen>
      <Header
        title="Pre-flight"
        left={
          <IconButton
            icon={<ChevronLeft size={22} color={colors.text} strokeWidth={1.75} />}
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }}>
        {/* Script title */}
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.h1, { color: colors.text }]} numberOfLines={2}>
            {script.title}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Configure your reading environment.
          </Text>
        </View>

        {/* Display Mode */}
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.micro, { color: colors.textSecondary }]}>DISPLAY MODE</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <ModeCard mode={MODES[0]} active={mode === 'fullscreen'} onPress={() => setMode('fullscreen')} />
            <ModeCard mode={MODES[1]} active={mode === 'floating'} onPress={() => setMode('floating')} />
          </View>
          <ModeCard mode={MODES[2]} active={mode === 'camera'} onPress={() => setMode('camera')} />
        </View>

        {/* Scroll Mode (Voice-driven vs Auto-scroll) */}
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.micro, { color: colors.textSecondary }]}>SCROLL MODE</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Pressable
              onPress={() => setScrollModeLocal('voice')}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: scrollMode === 'voice' ? colors.accentSubtle : colors.bgElevated,
                  borderRadius: radius.lg,
                  borderWidth: scrollMode === 'voice' ? 1.5 : 1,
                  borderColor: scrollMode === 'voice' ? colors.accent : colors.border,
                  padding: spacing.lg,
                  gap: spacing.xs,
                  opacity: pressed ? 0.85 : 1,
                  alignItems: 'center',
                },
              ]}
            >
              <Voicemail
                size={22}
                color={scrollMode === 'voice' ? colors.accent : colors.textSecondary}
                strokeWidth={1.75}
              />
              <Text
                style={[
                  typography.bodyEmph,
                  { color: scrollMode === 'voice' ? colors.accent : colors.text },
                ]}
              >
                Voice-driven
              </Text>
              <Text
                style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}
              >
                Scroll ngikutin suara
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setScrollModeLocal('auto')}
              style={({ pressed }) => [
                {
                  flex: 1,
                  backgroundColor: scrollMode === 'auto' ? colors.accentSubtle : colors.bgElevated,
                  borderRadius: radius.lg,
                  borderWidth: scrollMode === 'auto' ? 1.5 : 1,
                  borderColor: scrollMode === 'auto' ? colors.accent : colors.border,
                  padding: spacing.lg,
                  gap: spacing.xs,
                  opacity: pressed ? 0.85 : 1,
                  alignItems: 'center',
                },
              ]}
            >
              <Gauge
                size={22}
                color={scrollMode === 'auto' ? colors.accent : colors.textSecondary}
                strokeWidth={1.75}
              />
              <Text
                style={[
                  typography.bodyEmph,
                  { color: scrollMode === 'auto' ? colors.accent : colors.text },
                ]}
              >
                Auto-scroll
              </Text>
              <Text
                style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}
              >
                Kecepatan tetap
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Telemetry */}
        <View style={{ gap: spacing.lg }}>
          <Text style={[typography.micro, { color: colors.textSecondary }]}>TELEMETRY</Text>

          {/* Font Size */}
          <View
            style={{
              backgroundColor: colors.bgElevated,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[typography.bodyEmph, { color: colors.text }]}>Font Size</Text>
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 4,
                  backgroundColor: colors.bgSubtle,
                  borderRadius: radius.sm,
                }}
              >
                <Text style={[typography.caption, { color: colors.text, fontFamily: 'monospace' }]}>
                  {fontSize}px
                </Text>
              </View>
            </View>
            <Stepper
              value={fontSize}
              min={24}
              max={96}
              step={4}
              onChange={setFontSize}
              leftIcon={<TextCursorInput size={16} color={colors.textSecondary} strokeWidth={1.75} />}
              rightIcon={<TextCursorInput size={20} color={colors.textSecondary} strokeWidth={1.75} />}
            />
          </View>

          {/* Voice Sync (sensitivity) — only visible in voice mode */}
          {scrollMode === 'voice' ? (
            <View
              style={{
                backgroundColor: colors.bgElevated,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.lg,
                gap: spacing.md,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={[typography.bodyEmph, { color: colors.text }]}>Voice Sync</Text>
                  <Mic size={14} color={colors.textSecondary} strokeWidth={1.75} />
                </View>
                <View
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: 4,
                    backgroundColor: colors.bgSubtle,
                    borderRadius: radius.sm,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.text }]}>
                    {sensitivity === 'low' ? 'Low' : sensitivity === 'medium' ? 'Medium' : 'High'}
                  </Text>
                </View>
              </View>
              <Stepper
                value={sensitivityToValue(sensitivity)}
                min={0}
                max={2}
                step={1}
                onChange={(v) => setSensitivity(valueToSensitivity(v))}
                formatLabel={(v) => (v === 0 ? 'Low' : v === 1 ? 'Medium' : 'High')}
                leftIcon={<MicOff size={16} color={colors.textSecondary} strokeWidth={1.75} />}
                rightIcon={<AudioLines size={20} color={colors.textSecondary} strokeWidth={1.75} />}
              />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Low = strict matching · High = lenient (toleran kalau STT salah dengar)
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.bgElevated,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.lg,
                gap: spacing.md,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={[typography.bodyEmph, { color: colors.text }]}>Reading Speed</Text>
                  <Gauge size={14} color={colors.textSecondary} strokeWidth={1.75} />
                </View>
                <View
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: 4,
                    backgroundColor: colors.bgSubtle,
                    borderRadius: radius.sm,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.text, fontFamily: 'monospace' }]}>
                    {wpm} WPM
                  </Text>
                </View>
              </View>
              <Stepper
                value={wpm}
                min={60}
                max={250}
                step={10}
                onChange={setWpm}
                formatLabel={(v) => `${v} WPM`}
                leftIcon={<Gauge size={16} color={colors.textSecondary} strokeWidth={1.75} />}
                rightIcon={<Gauge size={20} color={colors.textSecondary} strokeWidth={1.75} />}
              />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Words per minute. Normal speech: 130-160 WPM.
              </Text>
            </View>
          )}
        </View>

        <Button
          label="LAUNCH PROMPTER"
          variant="primary"
          fullWidth
          leftIcon={<Play size={18} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />}
          onPress={handleLaunch}
        />
      </ScrollView>
    </Screen>
  );
}
