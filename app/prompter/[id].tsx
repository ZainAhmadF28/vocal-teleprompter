import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Dimensions,
  Pressable,
  Modal,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useAnimatedRef,
  useSharedValue,
  useAnimatedReaction,
  scrollTo,
} from 'react-native-reanimated';
import { X, Pause, Play, Gauge, Minus, Plus, RotateCcw, Voicemail } from 'lucide-react-native';
import { useScriptsStore } from '@/store/scriptsStore';
import { usePrompterStore } from '@/store/prompterStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePrompterEngine } from '@/ui/hooks/usePrompterEngine';
import { useKeepAwake } from '@/ui/hooks/useKeepAwake';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const READING_LINE_Y = SCREEN_HEIGHT * 0.42;

type WordStatus = 'pending' | 'current' | 'spoken';

interface PrompterWordProps {
  index: number;
  text: string;
  status: WordStatus;
  fontSize: number;
  lineHeight: number;
  pendingColor: string;
  currentColor: string;
  spokenColor: string;
  onLayout: (idx: number, y: number) => void;
}

const PrompterWord = memo(function PrompterWord({
  index,
  text,
  status,
  fontSize,
  lineHeight,
  pendingColor,
  currentColor,
  spokenColor,
  onLayout,
}: PrompterWordProps) {
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onLayout(index, e.nativeEvent.layout.y);
    },
    [index, onLayout]
  );
  const color =
    status === 'current' ? currentColor : status === 'spoken' ? spokenColor : pendingColor;
  // Font weight DIBUAT KONSTAN buat semua kata — kalau current di-bold, lebar
  // text berubah → flexWrap reflow → posisi semua kata loncat. Highlight cukup
  // pakai warna kontras + reading line.
  return (
    <View onLayout={handleLayout}>
      <Text
        style={{
          color,
          fontSize,
          lineHeight,
          fontWeight: '600',
        }}
      >
        {text}
      </Text>
    </View>
  );
});

export default function PrompterScreen() {
  const { id, fontSize } = useLocalSearchParams<{
    id: string;
    fontSize: string;
    baselineWPS: string;
  }>();
  const { colors, typography, spacing, radius } = useTheme();
  const settings = useSettingsStore();

  const parsedFontSize = parseInt(fontSize ?? '48', 10);

  const getScript = useScriptsStore((s) => s.getScript);
  const script = getScript(id);

  const isPaused = usePrompterStore((s) => s.isPaused);
  const currentWordIndex = usePrompterStore((s) => s.currentWordIndex);
  const isListening = usePrompterStore((s) => s.isListening);
  const pause = usePrompterStore((s) => s.pause);
  const resume = usePrompterStore((s) => s.resume);

  const { startSession, stopSession, restartSession, engine, seekToWord, words } = usePrompterEngine(
    script?.content ?? ''
  );
  useKeepAwake(isListening);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const userScrolling = useSharedValue(false);
  const scrollReady = useSharedValue(false);
  const wordPositionsRef = useRef<number[]>([]);
  const currentWordIndexRef = useRef(currentWordIndex);
  const engineRef = useRef(engine);
  const [speedPanelOpen, setSpeedPanelOpen] = useState(false);

  useEffect(() => {
    currentWordIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    startSession().catch(console.error);
    return () => stopSession();
  }, []);

  // Subscribe directly to engine — write to UI-thread shared value.
  // No React re-render or JS-bridge call per frame.
  useEffect(() => {
    const unsub = engine.subscribe((pos) => {
      scrollY.value = pos;
    });
    return unsub;
  }, [engine, scrollY]);

  // Drive scrollview from UI thread; gated by:
  //  - scrollReady → ref baru valid setelah ScrollView ke-mount (onLayout)
  //  - userScrolling → manual drag wins
  useAnimatedReaction(
    () => scrollY.value,
    (v) => {
      if (!scrollReady.value) return;
      if (userScrolling.value) return;
      scrollTo(scrollRef, 0, v, false);
    },
    []
  );

  // Pas user finish manual drag (paused), find nearest word + sync engine state
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isPaused) return;
    userScrolling.value = false;
    const y = e.nativeEvent.contentOffset.y;
    const positions = wordPositionsRef.current;
    if (positions.length === 0) return;

    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      if (typeof p !== 'number') continue;
      const diff = Math.abs(p - y);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    seekToWord(bestIdx);
    engine.seekTo(y);
  };

  useEffect(() => {
    if (currentWordIndex < 0) {
      engine.setTargetPosition(0);
      return;
    }
    const positions = wordPositionsRef.current;
    const targetIdx = currentWordIndex + 1;
    const y = positions[targetIdx];
    if (typeof y === 'number') engine.setTargetPosition(y);
    // Kalau target belum di-layout, recordWordPosition akan push ke engine
    // begitu layout fired (lihat callback di bawah).
  }, [currentWordIndex, engine]);

  const recordWordPosition = useCallback((idx: number, y: number) => {
    const arr = wordPositionsRef.current;
    if (arr[idx] === y) return;
    arr[idx] = y;
    // Kalau ini posisi target word yang useEffect tadi belum bisa baca, push sekarang.
    const ci = currentWordIndexRef.current;
    if (idx === ci + 1 || (ci < 0 && idx === 0)) {
      engineRef.current.setTargetPosition(y);
    }
  }, []);

  const handleStop = () => {
    stopSession();
    router.back();
  };

  const changeWPM = (delta: number) => {
    settings.setScrollWPM(Math.max(60, Math.min(250, settings.scrollWPM + delta)));
  };

  const lineHeight = useMemo(() => parsedFontSize * 1.5, [parsedFontSize]);

  const animatedMicStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isListening && !isPaused ? 1 : 0.4, { duration: 300 }),
  }));

  if (!script) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[typography.body, { color: colors.danger }]}>
            Script tidak ditemukan.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEnabled={isPaused}
        showsVerticalScrollIndicator={false}
        onLayout={() => {
          scrollReady.value = true;
        }}
        onScrollBeginDrag={() => {
          if (isPaused) userScrolling.value = true;
        }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: READING_LINE_Y,
          paddingBottom: 0,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {words.map((word, i) => {
            const status: WordStatus =
              i === currentWordIndex ? 'current' : i < currentWordIndex ? 'spoken' : 'pending';
            return (
              <PrompterWord
                key={i}
                index={i}
                text={word.original + ' '}
                status={status}
                fontSize={parsedFontSize}
                lineHeight={lineHeight}
                pendingColor={colors.karaokePending}
                currentColor={colors.karaokeCurrent}
                spokenColor={colors.karaokeSpoken}
                onLayout={recordWordPosition}
              />
            );
          })}
        </View>
        <View style={{ height: SCREEN_HEIGHT - READING_LINE_Y }} />
      </Animated.ScrollView>

      {/* Reading line */}
      <View
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          top: READING_LINE_Y,
          height: 2,
          backgroundColor: colors.readingLine,
          opacity: 0.6,
          borderRadius: 1,
        }}
        pointerEvents="none"
      />

      {/* Top fade */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          backgroundColor: colors.bg,
          opacity: 0.85,
        }}
        pointerEvents="none"
      />

      {/* Controls — glass pill */}
      <View
        style={{
          position: 'absolute',
          bottom: spacing.xxl,
          left: spacing.lg,
          right: spacing.lg,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.glass,
          borderRadius: radius.pill,
          padding: spacing.sm,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [
            {
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <X size={20} color="#FFFFFF" strokeWidth={1.75} />
        </Pressable>

        <Pressable
          onPress={isPaused ? resume : pause}
          style={({ pressed }) => [
            {
              width: 64,
              height: 64,
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          {isPaused ? (
            <Play size={26} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
          ) : (
            <Pause size={26} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} />
          )}
        </Pressable>

        <Animated.View style={animatedMicStyle}>
          <Pressable
            onPress={() => setSpeedPanelOpen(true)}
            style={({ pressed }) => [
              {
                minWidth: 56,
                height: 48,
                borderRadius: radius.pill,
                backgroundColor: 'rgba(255,255,255,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.sm,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Gauge size={20} color="#FFFFFF" strokeWidth={1.75} />
            {settings.scrollMode === 'auto' ? (
              <Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 1 }}>
                {settings.scrollWPM}
              </Text>
            ) : null}
          </Pressable>
        </Animated.View>
      </View>

      <Modal
        visible={speedPanelOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSpeedPanelOpen(false)}
      >
        <Pressable
          onPress={() => setSpeedPanelOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.bgElevated,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              paddingBottom: spacing.xxl,
              gap: spacing.lg,
            }}
          >
            <Text style={[typography.h2, { color: colors.text }]}>Kontrol Scroll</Text>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable
                onPress={() => settings.setScrollMode('voice')}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    settings.scrollMode === 'voice' ? colors.accent : colors.bgSubtle,
                }}
              >
                <Voicemail
                  size={18}
                  color={settings.scrollMode === 'voice' ? colors.textInverse : colors.text}
                  strokeWidth={1.75}
                />
              </Pressable>
              <Pressable
                onPress={() => settings.setScrollMode('auto')}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    settings.scrollMode === 'auto' ? colors.accent : colors.bgSubtle,
                }}
              >
                <Gauge
                  size={18}
                  color={settings.scrollMode === 'auto' ? colors.textInverse : colors.text}
                  strokeWidth={1.75}
                />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Pressable
                onPress={() => changeWPM(-10)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.pill,
                  backgroundColor: colors.bgSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={18} color={colors.text} strokeWidth={1.75} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[typography.micro, { color: colors.textSecondary }]}>SPEED</Text>
                <Text style={[typography.h2, { color: colors.text }]}>{settings.scrollWPM} WPM</Text>
              </View>
              <Pressable
                onPress={() => changeWPM(10)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.pill,
                  backgroundColor: colors.bgSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={18} color={colors.text} strokeWidth={1.75} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                restartSession();
                setSpeedPanelOpen(false);
              }}
              style={{
                height: 48,
                borderRadius: radius.md,
                backgroundColor: colors.bgSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RotateCcw size={18} color={colors.text} strokeWidth={1.75} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Debug HUD */}
      {__DEV__ && (
        <View
          style={{
            position: 'absolute',
            top: 48,
            right: spacing.lg,
            backgroundColor: 'rgba(0,0,0,0.7)',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radius.sm,
          }}
        >
          <Text style={{ color: '#FFFFFF99', fontSize: 11 }}>
            word {currentWordIndex + 1}/{words.length}
            {isPaused ? ' · PAUSED' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}
