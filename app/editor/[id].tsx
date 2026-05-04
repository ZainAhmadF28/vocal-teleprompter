import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useScriptsStore } from '@/store/scriptsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePrompterStore } from '@/store/prompterStore';
import { detectLanguageFromScript, getLanguageLabel } from '@/core/speech/LanguageDetector';
import { colors } from '@/theme/colors';

const SUPPORTED_LANGUAGES = [
  { bcp47: 'id-ID', label: 'Indonesian' },
  { bcp47: 'en-US', label: 'English' },
  { bcp47: 'ja-JP', label: 'Japanese' },
  { bcp47: 'ko-KR', label: 'Korean' },
  { bcp47: 'zh-CN', label: 'Mandarin' },
];

function estimateDuration(text: string, wps = 2.5): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / wps);
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} detik`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${min} mnt ${s} dtk` : `${min} menit`;
}

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
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
  const [sensitivity, setSensitivity] = useState(settings.defaultSensitivity);
  const [useOverlay, setUseOverlay] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Auto-detect language when content changes
  useEffect(() => {
    if (content.length > 30) {
      const { lang } = detectLanguageFromScript(content);
      setLanguage(lang);
    }
  }, [content]);

  // Auto-save to store on changes
  useEffect(() => {
    if (!script) return;
    const timer = setTimeout(() => {
      updateScript(id, {
        title,
        content,
        language,
        estimatedDurationSec: estimateDuration(content),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, language, id, script, updateScript]);

  // Update nav title
  useEffect(() => {
    navigation.setOptions({ title: title || 'Editor' });
  }, [title, navigation]);

  const handleStart = () => {
    updateScript(id, { title, content, language });
    setDetectedLanguage(language);
    setActiveScript(id);
    router.push(`/calibrate?scriptId=${id}&fontSize=${fontSize}&sensitivity=${sensitivity}&overlay=${useOverlay}`);
  };

  if (!script) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Script tidak ditemukan.</Text>
      </View>
    );
  }

  const detectedConf = content.length > 30
    ? Math.round(Math.min(0.99, content.length / 200) * 100)
    : null;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Judul script..."
          placeholderTextColor={colors.textDim}
          returnKeyType="next"
        />

        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          placeholder="Paste atau ketik script kamu di sini..."
          placeholderTextColor={colors.textDim}
          multiline
          textAlignVertical="top"
        />

        {/* Language row */}
        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => setShowLangPicker(!showLangPicker)}
        >
          <Text style={styles.infoLabel}>🌐 Bahasa</Text>
          <Text style={styles.infoValue}>
            {getLanguageLabel(language)}
            {detectedConf ? ` (${detectedConf}%)` : ''}
            {'  ▼'}
          </Text>
        </TouchableOpacity>

        {showLangPicker && (
          <View style={styles.langPicker}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.bcp47}
                style={[
                  styles.langOption,
                  language === l.bcp47 && styles.langOptionActive,
                ]}
                onPress={() => {
                  setLanguage(l.bcp47);
                  setShowLangPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.langOptionText,
                    language === l.bcp47 && styles.langOptionTextActive,
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {content.length > 0 && (
          <Text style={styles.estimate}>
            📊 Estimasi: {formatDuration(estimateDuration(content))} @ kecepatan normal
          </Text>
        )}

        {/* Font size */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>⚙ Ukuran Font</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepper}
              onPress={() => setFontSize(Math.max(24, fontSize - 4))}
            >
              <Text style={styles.stepperText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.settingValue}>{fontSize}pt</Text>
            <TouchableOpacity
              style={styles.stepper}
              onPress={() => setFontSize(Math.min(96, fontSize + 4))}
            >
              <Text style={styles.stepperText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sensitivity */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>⚙ Sensitivitas</Text>
          <View style={styles.segmentedControl}>
            {(['low', 'medium', 'high'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.segment,
                  sensitivity === s && styles.segmentActive,
                ]}
                onPress={() => setSensitivity(s)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    sensitivity === s && styles.segmentTextActive,
                  ]}
                >
                  {s === 'low' ? 'Rendah' : s === 'medium' ? 'Sedang' : 'Tinggi'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mode */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Mode Overlay</Text>
          <Switch
            value={useOverlay}
            onValueChange={setUseOverlay}
            trackColor={{ true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>

        <TouchableOpacity
          style={[styles.startBtn, !content.trim() && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!content.trim()}
        >
          <Text style={styles.startBtnText}>🎙  KALIBRASI & MULAI</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { padding: 16, gap: 16 },
  titleInput: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  contentInput: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 180,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.text, fontSize: 15 },
  infoValue: { color: colors.primary, fontSize: 15 },
  langPicker: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  langOption: { padding: 14 },
  langOptionActive: { backgroundColor: colors.primaryDim },
  langOptionText: { color: colors.textSecondary, fontSize: 15 },
  langOptionTextActive: { color: colors.primary, fontWeight: '600' },
  estimate: { color: colors.textSecondary, fontSize: 13 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: { color: colors.text, fontSize: 15 },
  settingValue: { color: colors.textSecondary, fontSize: 15, minWidth: 48, textAlign: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperText: { color: colors.text, fontSize: 20 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { paddingHorizontal: 12, paddingVertical: 8 },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontSize: 13 },
  segmentTextActive: { color: colors.text, fontWeight: '600' },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  errorText: { color: colors.danger, textAlign: 'center', marginTop: 40 },
});
