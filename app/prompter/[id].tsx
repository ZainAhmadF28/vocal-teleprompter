import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useScriptsStore } from '@/store/scriptsStore';
import { usePrompterStore } from '@/store/prompterStore';
import { usePrompterEngine } from '@/ui/hooks/usePrompterEngine';
import { useKeepAwake } from '@/ui/hooks/useKeepAwake';
import { colors } from '@/theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const READING_LINE_Y = SCREEN_HEIGHT * 0.42;

export default function PrompterScreen() {
  const { id, fontSize, baselineWPS } = useLocalSearchParams<{
    id: string;
    fontSize: string;
    baselineWPS: string;
  }>();

  const parsedFontSize = parseInt(fontSize ?? '48', 10);
  const parsedWPS = parseFloat(baselineWPS ?? '2.5');

  const getScript = useScriptsStore((s) => s.getScript);
  const script = getScript(id);

  const { isPaused, scrollPosition, currentWPS, isListening, pause, resume } =
    usePrompterStore();

  const { startSession, stopSession } = usePrompterEngine(parsedFontSize, parsedWPS);
  useKeepAwake(isListening);

  const scrollRef = useRef<ScrollView>(null);
  const translateY = useSharedValue(0);

  // Start session on mount
  useEffect(() => {
    startSession().catch(console.error);
    return () => stopSession();
  }, []);

  // Sync scroll position to the ScrollView
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: scrollPosition, animated: false });
  }, [scrollPosition]);

  const handleStop = () => {
    stopSession();
    router.back();
  };

  const animatedMicStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isListening && !isPaused ? 1 : 0.3, { duration: 300 }),
    transform: [{ scale: withTiming(isListening && !isPaused ? 1.1 : 1, { duration: 300 }) }],
  }));

  if (!script) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Script tidak ditemukan.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Scrolling text */}
      <ScrollView
        ref={scrollRef}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: READING_LINE_Y },
        ]}
      >
        <Text
          style={[styles.scriptText, { fontSize: parsedFontSize, lineHeight: parsedFontSize * 1.5 }]}
        >
          {script.content}
        </Text>
        {/* Bottom padding so last line can scroll to reading line */}
        <View style={{ height: SCREEN_HEIGHT - READING_LINE_Y }} />
      </ScrollView>

      {/* Reading line */}
      <View style={[styles.readingLine, { top: READING_LINE_Y }]} pointerEvents="none" />

      {/* Gradient overlay top */}
      <View style={styles.topGradient} pointerEvents="none" />

      {/* Controls */}
      <View style={styles.controls}>
        <Animated.Text style={[styles.micIcon, animatedMicStyle]}>🎙</Animated.Text>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={isPaused ? resume : pause}
        >
          <Text style={styles.controlBtnText}>{isPaused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.stopBtn]}
          onPress={handleStop}
        >
          <Text style={styles.controlBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Debug HUD (dev only) */}
      {__DEV__ && (
        <View style={styles.hud}>
          <Text style={styles.hudText}>
            {currentWPS.toFixed(1)} WPS · {Math.round(scrollPosition)}px
            {isPaused ? ' · PAUSED' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 0 },
  scriptText: {
    color: colors.text,
    fontWeight: '400',
  },
  readingLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.readingLine,
    opacity: 0.7,
    borderRadius: 1,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#00000099',
  },
  controls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  micIcon: {
    fontSize: 28,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF44',
  },
  stopBtn: { backgroundColor: '#FF453A33', borderColor: '#FF453A66' },
  controlBtnText: { color: colors.text, fontSize: 18 },
  hud: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: '#00000088',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hudText: { color: '#FFFFFF88', fontSize: 11 },
  errorText: { color: colors.danger, textAlign: 'center', marginTop: 40 },
});
