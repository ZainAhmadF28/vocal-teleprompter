import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  calibrateNoiseFloor,
  calibrateSpeechRate,
  getCalibrationSentence,
} from '@/core/calibration/CalibrationService';
import { usePrompterStore } from '@/store/prompterStore';
import { colors } from '@/theme/colors';
import { storage } from '@/storage/mmkv';

type CalibStep = 'noise' | 'speech' | 'ready' | 'done';

export default function CalibrateScreen() {
  const params = useLocalSearchParams<{
    scriptId: string;
    fontSize: string;
    sensitivity: string;
    overlay: string;
  }>();

  const { scriptId, fontSize, sensitivity, overlay } = params;
  const detectedLanguage = usePrompterStore((s) => s.detectedLanguage);

  const [step, setStep] = useState<CalibStep>('noise');
  const [noiseProgress, setNoiseProgress] = useState(0);
  const [baselineWPS, setBaselineWPS] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const testSentence = getCalibrationSentence(detectedLanguage);

  // Auto-start noise calibration on mount
  useEffect(() => {
    startNoiseCalibration();
  }, []);

  const startNoiseCalibration = async () => {
    setIsRunning(true);
    setNoiseProgress(0);

    await calibrateNoiseFloor(3000, (p) => setNoiseProgress(p));

    setIsRunning(false);
    setStep('speech');
  };

  const startSpeechCalibration = async () => {
    setIsRunning(true);
    setStep('ready');

    const wps = await calibrateSpeechRate(
      detectedLanguage,
      testSentence,
      () => {} // sentence already shown on screen
    );

    setBaselineWPS(wps);
    storage.set('baseline_wps', wps);
    setIsRunning(false);
    setStep('done');
  };

  const handleStart = () => {
    const wps = baselineWPS ?? storage.getNumber('baseline_wps') ?? 2.5;
    router.replace(
      `/prompter/${scriptId}?fontSize=${fontSize}&sensitivity=${sensitivity}&overlay=${overlay}&baselineWPS=${wps}`
    );
  };

  const handleSkip = () => {
    const wps = storage.getNumber('baseline_wps') ?? 2.5;
    router.replace(
      `/prompter/${scriptId}?fontSize=${fontSize}&sensitivity=${sensitivity}&overlay=${overlay}&baselineWPS=${wps}`
    );
  };

  return (
    <View style={styles.container}>
      {step === 'noise' && (
        <View style={styles.stepContainer}>
          <Text style={styles.icon}>🤫</Text>
          <Text style={styles.title}>Diam dulu 3 detik</Text>
          <Text style={styles.subtitle}>Mengukur noise level lingkungan...</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${noiseProgress * 100}%` }]} />
          </View>
          <Text style={styles.caption}>{Math.round(noiseProgress * 3)}s / 3s</Text>
        </View>
      )}

      {step === 'speech' && (
        <View style={styles.stepContainer}>
          <Text style={styles.icon}>🗣</Text>
          <Text style={styles.title}>Sekarang baca 1 kalimat</Text>
          <View style={styles.sentenceBox}>
            <Text style={styles.sentence}>"{testSentence}"</Text>
          </View>
          <Text style={styles.caption}>
            Ini untuk mengukur kecepatan bicara natural kamu
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={startSpeechCalibration}>
            <Text style={styles.primaryBtnText}>Mulai Ukur</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>Lewati (gunakan default)</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'ready' && (
        <View style={styles.stepContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.title}>Sedang merekam...</Text>
          <View style={styles.sentenceBox}>
            <Text style={styles.sentence}>"{testSentence}"</Text>
          </View>
          <Text style={styles.caption}>Baca kalimat di atas dengan kecepatan normal</Text>
        </View>
      )}

      {step === 'done' && (
        <View style={styles.stepContainer}>
          <Text style={styles.icon}>✅</Text>
          <Text style={styles.title}>Kalibrasi selesai!</Text>
          <Text style={styles.subtitle}>
            Kecepatan bicara kamu:{' '}
            <Text style={styles.highlight}>
              {baselineWPS?.toFixed(1)} kata/detik
            </Text>
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleStart}>
            <Text style={styles.primaryBtnText}>Mulai Teleprompter →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  icon: { fontSize: 64 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  highlight: { color: colors.primary, fontWeight: '700' },
  caption: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sentenceBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sentence: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  skipBtn: { padding: 12 },
  skipBtnText: { color: colors.textSecondary, fontSize: 14 },
});
