import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Check,
  Globe,
  Mic,
  SlidersHorizontal,
  Maximize2,
  Layers,
  Video,
} from 'lucide-react-native';
import type { ScrollMode } from '@/store/settingsStore';
import { useScriptsStore } from '@/store/scriptsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePrompterStore } from '@/store/prompterStore';
import {
  detectLanguageFromScript,
  getLanguageLabel,
} from '@/core/speech/LanguageDetector';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';

type DisplayMode = 'fullscreen' | 'floating' | 'camera';

const DISPLAY_MODES: { id: DisplayMode; label: string; Icon: any }[] = [
  { id: 'fullscreen', label: 'Fullscreen', Icon: Maximize2 },
  { id: 'floating', label: 'Float', Icon: Layers },
  { id: 'camera', label: 'Studio', Icon: Video },
];

function formatRelativeSeconds(ms: number): string {
  if (ms < 0) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const widthRef = useRef(0);
  const stateRef = useRef({ min, max, step, onChange });
  stateRef.current = { min, max, step, onChange };

  const update = (x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const { min, max, step, onChange } = stateRef.current;
    const ratio = Math.max(0, Math.min(1, x / w));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, stepped)));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => update(e.nativeEvent.locationX),
        onPanResponderMove: (e) => update(e.nativeEvent.locationX),
      }),
    []
  );

  const pct = max === min ? 0 : (value - min) / (max - min);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
      style={{ height: 28, justifyContent: 'center' }}
      hitSlop={{ top: 12, bottom: 12 }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.bgSubtle,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(pct * 100)}%`,
            height: '100%',
            backgroundColor: colors.text,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${Math.round(pct * 100)}%`,
          marginLeft: -10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </View>
  );
}

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();

  const scripts = useScriptsStore((s) => s.scripts);
  const getScript = useScriptsStore((s) => s.getScript);
  const updateScript = useScriptsStore((s) => s.updateScript);
  const settings = useSettingsStore();
  const setDetectedLanguage = usePrompterStore((s) => s.setDetectedLanguage);
  const setActiveScript = usePrompterStore((s) => s.setActiveScript);

  const script = getScript(id);

  const [title, setTitle] = useState(script?.title ?? '');
  const [content, setContent] = useState(script?.content ?? '');
  const [language, setLanguage] = useState(script?.language ?? 'id-ID');
  const [confidence, setConfidence] = useState(0.98);

  const [fontSize, setFontSize] = useState(settings.defaultFontSize);
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>(
    settings.defaultSensitivity
  );
  const [wpm, setWpm] = useState(settings.scrollWPM);
  const [scrollMode, setScrollModeLocal] = useState<ScrollMode>(
    settings.scrollMode
  );
  const [displayMode, setDisplayMode] = useState<DisplayMode>('fullscreen');

  const [lastSavedAt, setLastSavedAt] = useState<number>(
    script?.updatedAt ?? Date.now()
  );
  const [, setTick] = useState(0);

  const scriptIndex = useMemo(() => {
    const idx = scripts.findIndex((s) => s.id === id);
    return idx >= 0 ? idx + 1 : scripts.length + 1;
  }, [scripts, id]);

  // Tick clock so "Auto-saved · Xs ago" updates
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto language detect
  useEffect(() => {
    if (content.length > 30) {
      const { lang, confidence } = detectLanguageFromScript(content);
      setLanguage(lang);
      setConfidence(confidence);
    }
  }, [content]);

  // Autosave (debounced)
  useEffect(() => {
    if (!script) return;
    const timer = setTimeout(() => {
      const wps = wpm / 60;
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      updateScript(id, {
        title,
        content,
        language,
        estimatedDurationSec: Math.round(words / Math.max(0.0001, wps)),
      });
      setLastSavedAt(Date.now());
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, language, wpm, id, script, updateScript]);

  if (!script) {
    return (
      <Screen>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              roundButtonStyle(colors, radius, false),
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[typography.body, { color: colors.danger }]}>
            Script tidak ditemukan.
          </Text>
        </View>
      </Screen>
    );
  }

  const handleLaunch = () => {
    setDetectedLanguage(language);
    setActiveScript(id);
    settings.setDefaultFontSize(fontSize);
    settings.setDefaultSensitivity(sensitivity);
    settings.setScrollMode(scrollMode);
    settings.setScrollWPM(wpm);

    const baselineWPS = wpm / 60;

    if (displayMode === 'fullscreen') {
      router.replace(
        `/prompter/${id}?fontSize=${fontSize}&baselineWPS=${baselineWPS}` as any
      );
    } else if (displayMode === 'camera') {
      router.replace(`/camera/${id}?fontSize=${fontSize}` as any);
    } else {
      router.replace('/overlay' as any);
    }
  };

  const handleConfirm = () => {
    updateScript(id, { title, content, language });
    router.back();
  };

  const sensValue =
    sensitivity === 'low' ? 0 : sensitivity === 'medium' ? 1 : 2;
  const sensLabel =
    sensitivity === 'low' ? 'Low' : sensitivity === 'medium' ? 'Medium' : 'High';

  const sinceSave = formatRelativeSeconds(Date.now() - lastSavedAt);

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              roundButtonStyle(colors, radius, false),
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>

          <Text
            style={[typography.caption, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Auto-saved · {sinceSave}
          </Text>

          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => [
              roundButtonStyle(colors, radius, true),
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Check size={20} color={colors.textInverse} strokeWidth={2.25} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 140,
            gap: spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Script number */}
          <Text
            style={[
              typography.micro,
              { color: colors.textSecondary, marginTop: spacing.sm },
            ]}
          >
            SCRIPT · {String(scriptIndex).padStart(2, '0')}
          </Text>

          {/* Title */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Untitled Script"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={{
              color: colors.text,
              fontWeight: '800',
              fontSize: 32,
              lineHeight: 38,
              letterSpacing: -0.6,
              paddingVertical: 0,
              marginTop: -spacing.sm,
            }}
          />

          {/* Content card (editable) */}
          <View
            style={{
              backgroundColor: colors.bgSubtle,
              borderRadius: radius.lg,
              padding: spacing.lg,
              minHeight: 200,
            }}
          >
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Start typing your script here..."
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              style={{
                color: colors.text,
                fontSize: 16,
                lineHeight: 24,
                fontWeight: '400',
                minHeight: 168,
                paddingVertical: 0,
              }}
            />
          </View>

          {/* Language pill */}
          <View style={{ flexDirection: 'row' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                backgroundColor: colors.bgSubtle,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
              }}
            >
              <Globe size={14} color={colors.textSecondary} strokeWidth={1.75} />
              <Text style={[typography.caption, { color: colors.text }]}>
                {getLanguageLabel(language)} · {Math.round(confidence * 100)}%
              </Text>
            </View>
          </View>

          {/* Font size slider */}
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={[typography.body, { color: colors.text }]}>
                Font size
              </Text>
              <Text
                style={[
                  typography.bodyEmph,
                  { color: colors.text, fontWeight: '700' },
                ]}
              >
                {fontSize} pt
              </Text>
            </View>
            <Slider
              value={fontSize}
              min={24}
              max={96}
              step={4}
              onChange={setFontSize}
            />
          </View>

          {/* Sensitivity / Speed slider */}
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={[typography.body, { color: colors.text }]}>
                {scrollMode === 'voice' ? 'Sensitivity' : 'Speed'}
              </Text>
              <Text
                style={[
                  typography.bodyEmph,
                  { color: colors.text, fontWeight: '700' },
                ]}
              >
                {scrollMode === 'voice' ? sensLabel : `${wpm} WPM`}
              </Text>
            </View>
            {scrollMode === 'voice' ? (
              <Slider
                value={sensValue}
                min={0}
                max={2}
                step={1}
                onChange={(v) =>
                  setSensitivity(v <= 0 ? 'low' : v >= 2 ? 'high' : 'medium')
                }
              />
            ) : (
              <Slider
                value={wpm}
                min={60}
                max={250}
                step={10}
                onChange={setWpm}
              />
            )}
          </View>

          {/* DRIVER */}
          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            <Text style={[typography.micro, { color: colors.textSecondary }]}>
              DRIVER
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <DriverCard
                active={scrollMode === 'voice'}
                title="Vocal"
                subtitle="Scroll mengikuti suara"
                Icon={Mic}
                onPress={() => setScrollModeLocal('voice')}
              />
              <DriverCard
                active={scrollMode === 'auto'}
                title="Auto Scroll"
                subtitle="Kecepatan tetap"
                Icon={SlidersHorizontal}
                onPress={() => setScrollModeLocal('auto')}
              />
            </View>

            {/* Display mode tabs (segmented) */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.bgSubtle,
                borderRadius: radius.pill,
                padding: 4,
                marginTop: spacing.xs,
              }}
            >
              {DISPLAY_MODES.map((m) => {
                const active = displayMode === m.id;
                const { Icon } = m;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setDisplayMode(m.id)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: spacing.sm + 2,
                        borderRadius: radius.pill,
                        backgroundColor: active ? colors.bg : 'transparent',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Icon
                      size={14}
                      color={active ? colors.text : colors.textSecondary}
                      strokeWidth={1.75}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: active ? '700' : '500',
                        color: active ? colors.text : colors.textSecondary,
                        letterSpacing: -0.1,
                      }}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Floating bottom bar: Launch */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
            backgroundColor: colors.bg,
          }}
        >
          <Pressable
            onPress={handleLaunch}
            disabled={!content.trim()}
            style={({ pressed }) => [
              {
                backgroundColor: colors.text,
                borderRadius: radius.pill,
                paddingVertical: spacing.md + 2,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                opacity: !content.trim() ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Mic size={18} color={colors.bg} strokeWidth={2} />
            <Text
              style={{
                color: colors.bg,
                fontSize: 17,
                fontWeight: '700',
                letterSpacing: -0.2,
              }}
            >
              Launch
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function DriverCard({
  active,
  title,
  subtitle,
  Icon,
  onPress,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  Icon: any;
  onPress: () => void;
}) {
  const { colors, typography, spacing, radius, resolvedScheme } = useTheme();
  const NEON = '#D4F542';
  const DARK = '#0A0A0F';

  const bg = active ? DARK : colors.bgSubtle;
  const fg = active ? '#FAFAFA' : colors.text;
  const sub = active ? '#A1A1AA' : colors.textSecondary;

  const inactiveIconBg = resolvedScheme === 'dark' ? colors.bgElevated : '#FFFFFF';
  const inactiveIconColor = colors.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: bg,
          borderRadius: radius.lg,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: active ? DARK : inactiveIconBg,
          borderWidth: active ? 1.5 : 0,
          borderColor: active ? NEON : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          size={18}
          color={active ? NEON : inactiveIconColor}
          strokeWidth={2}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[
            typography.bodyEmph,
            { color: fg, fontWeight: '700' },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[typography.caption, { color: sub }]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function roundButtonStyle(
  colors: ReturnType<typeof useTheme>['colors'],
  radius: ReturnType<typeof useTheme>['radius'],
  filled: boolean
) {
  return {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: filled ? colors.text : colors.bgSubtle,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}
