import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Save,
  TextCursorInput,
  Gauge,
  Languages,
  Mic,
  Check,
} from 'lucide-react-native';
import { useScriptsStore } from '@/store/scriptsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePrompterStore } from '@/store/prompterStore';
import { detectLanguageFromScript, getLanguageLabel } from '@/core/speech/LanguageDetector';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { IconButton } from '@/ui/components/IconButton';
import { Button } from '@/ui/components/Button';

const SUPPORTED_LANGUAGES = [
  { bcp47: 'id-ID', label: 'Indonesian' },
  { bcp47: 'en-US', label: 'English' },
  { bcp47: 'ja-JP', label: 'Japanese' },
  { bcp47: 'ko-KR', label: 'Korean' },
  { bcp47: 'zh-CN', label: 'Mandarin' },
];

const FONT_SIZES = [32, 40, 48, 56, 64];
const SPEED_PRESETS = [
  { wpm: 100, label: 'Slow' },
  { wpm: 140, label: 'Normal' },
  { wpm: 180, label: 'Fast' },
];

function ToolbarButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.md,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      {icon}
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: string | number; label: string; sub?: string }[];
  selectedValue: string | number;
  onSelect: (v: any) => void;
  onClose: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
            }}
          />
          <Text style={[typography.h2, { color: colors.text }]}>{title}</Text>
          <View style={{ gap: spacing.xs }}>
            {options.map((opt) => {
              const active = opt.value === selectedValue;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      borderRadius: radius.md,
                      backgroundColor: pressed ? colors.bgSubtle : 'transparent',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text }]}>{opt.label}</Text>
                    {opt.sub && (
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {opt.sub}
                      </Text>
                    )}
                  </View>
                  {active && <Check size={20} color={colors.accent} strokeWidth={2} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radius } = useTheme();

  const getScript = useScriptsStore((s) => s.getScript);
  const updateScript = useScriptsStore((s) => s.updateScript);
  const settings = useSettingsStore();
  const setDetectedLanguage = usePrompterStore((s) => s.setDetectedLanguage);
  const setActiveScript = usePrompterStore((s) => s.setActiveScript);

  const script = getScript(id);

  const [title, setTitle] = useState(script?.title ?? '');
  const [content, setContent] = useState(script?.content ?? '');
  const [language, setLanguage] = useState(script?.language ?? 'id-ID');
  const [fontSize, setFontSize] = useState(settings.defaultFontSize);
  const [wpm, setWpm] = useState(settings.scrollWPM);

  const [openPicker, setOpenPicker] = useState<null | 'size' | 'speed' | 'lang'>(null);

  // Auto language detect
  useEffect(() => {
    if (content.length > 30) {
      const { lang } = detectLanguageFromScript(content);
      setLanguage(lang);
    }
  }, [content]);

  // Autosave
  useEffect(() => {
    if (!script) return;
    const timer = setTimeout(() => {
      const wps = wpm / 60;
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      updateScript(id, {
        title,
        content,
        language,
        estimatedDurationSec: Math.round(words / wps),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, language, wpm, id, script, updateScript]);

  const wordsCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content]
  );

  const handleStartPrompter = () => {
    setDetectedLanguage(language);
    setActiveScript(id);
    router.push(`/preflight/${id}` as any);
  };

  const handleSave = () => {
    updateScript(id, { title, content, language });
    router.back();
  };

  if (!script) {
    return (
      <Screen>
        <Header
          title="Editor"
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

  return (
    <Screen>
      <Header
        title="Edit Script"
        left={
          <IconButton
            icon={<ChevronLeft size={22} color={colors.text} strokeWidth={1.75} />}
            onPress={() => router.back()}
          />
        }
        right={
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                backgroundColor: colors.accent,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Save size={16} color={colors.textInverse} strokeWidth={1.75} />
            <Text style={[typography.bodyEmph, { color: colors.textInverse }]}>Save</Text>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Untitled Script"
            placeholderTextColor={colors.textTertiary}
            style={[
              typography.display,
              { color: colors.text, paddingVertical: spacing.sm },
            ]}
          />

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Start typing your script here..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            style={[
              typography.h2,
              {
                color: colors.text,
                fontWeight: '400',
                lineHeight: 28,
                minHeight: 280,
              },
            ]}
          />

          {wordsCount > 0 && (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {wordsCount} words · {getLanguageLabel(language)} · ~{Math.round(wordsCount / (wpm / 60))}s @ {wpm} wpm
            </Text>
          )}

          <Button
            label="Continue to Pre-flight"
            variant="primary"
            fullWidth
            leftIcon={<Mic size={18} color={colors.textInverse} strokeWidth={1.75} />}
            onPress={handleStartPrompter}
            disabled={!content.trim()}
          />
        </ScrollView>

        {/* Bottom toolbar */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.bgElevated,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.sm,
          }}
        >
          <ToolbarButton
            icon={<TextCursorInput size={20} color={colors.text} strokeWidth={1.75} />}
            label={`Size · ${fontSize}px`}
            onPress={() => setOpenPicker('size')}
          />
          <ToolbarButton
            icon={<Gauge size={20} color={colors.text} strokeWidth={1.75} />}
            label={`Speed · ${wpm}wpm`}
            onPress={() => setOpenPicker('speed')}
          />
          <ToolbarButton
            icon={<Languages size={20} color={colors.text} strokeWidth={1.75} />}
            label={`Lang · ${language === 'id-ID' ? 'ID' : language.split('-')[0].toUpperCase()}`}
            onPress={() => setOpenPicker('lang')}
          />
        </View>
      </KeyboardAvoidingView>

      <PickerModal
        visible={openPicker === 'size'}
        title="Font Size"
        options={FONT_SIZES.map((s) => ({ value: s, label: `${s}px` }))}
        selectedValue={fontSize}
        onSelect={(v) => setFontSize(v as number)}
        onClose={() => setOpenPicker(null)}
      />
      <PickerModal
        visible={openPicker === 'speed'}
        title="Reading Speed"
        options={SPEED_PRESETS.map((p) => ({
          value: p.wpm,
          label: p.label,
          sub: `${p.wpm} words per minute`,
        }))}
        selectedValue={wpm}
        onSelect={(v) => setWpm(v as number)}
        onClose={() => setOpenPicker(null)}
      />
      <PickerModal
        visible={openPicker === 'lang'}
        title="Language"
        options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.bcp47, label: l.label }))}
        selectedValue={language}
        onSelect={(v) => setLanguage(v as string)}
        onClose={() => setOpenPicker(null)}
      />
    </Screen>
  );
}
