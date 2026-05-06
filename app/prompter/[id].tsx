import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { X, Pause, Play, Gauge } from 'lucide-react-native';
import { useScriptsStore } from '@/store/scriptsStore';
import { usePrompterStore } from '@/store/prompterStore';
import { usePrompterEngine } from '@/ui/hooks/usePrompterEngine';
import { useKeepAwake } from '@/ui/hooks/useKeepAwake';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/components/Screen';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const READING_LINE_Y = SCREEN_HEIGHT * 0.42;

export default function PrompterScreen() {
  const { id, fontSize } = useLocalSearchParams<{
    id: string;
    fontSize: string;
    baselineWPS: string;
  }>();
  const { colors, typography, spacing, radius } = useTheme();

  const parsedFontSize = parseInt(fontSize ?? '48', 10);

  const getScript = useScriptsStore((s) => s.getScript);
  const script = getScript(id);

  const { isPaused, scrollPosition, currentWordIndex, isListening, pause, resume } =
    usePrompterStore();

  const { startSession, stopSession, engine, seekToWord, words } = usePrompterEngine(
    script?.content ?? ''
  );
  useKeepAwake(isListening);

  const scrollRef = useRef<ScrollView>(null);
  const wordPositionsRef = useRef<number[]>([]);
  const [, forceUpdate] = useState(0);
  const userScrollingRef = useRef(false);

  useEffect(() => {
    startSession().catch(console.error);
    return () => stopSession();
  }, []);

  useEffect(() => {
    // Hindari fight engine vs user kalau user lagi geser manual saat paused
    if (userScrollingRef.current) return;
    scrollRef.current?.scrollTo({ y: scrollPosition, animated: false });
  }, [scrollPosition]);

  // Pas user finish manual drag (paused), find nearest word + sync engine state
  const handleScrollEnd = (e: any) => {
    if (!isPaused) return;
    userScrollingRef.current = false;
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
    if (positions.length === 0) return;
    const targetIdx = Math.min(currentWordIndex + 1, positions.length - 1);
    const y = positions[targetIdx];
    if (typeof y === 'number') engine.setTargetPosition(y);
  }, [currentWordIndex, engine]);

  const recordWordPosition = useCallback(
    (idx: number, y: number) => {
      const arr = wordPositionsRef.current;
      if (arr[idx] === y) return;
      arr[idx] = y;
      if (idx === currentWordIndex || idx === currentWordIndex + 1) {
        forceUpdate((n) => n + 1);
      }
    },
    [currentWordIndex]
  );

  const handleStop = () => {
    stopSession();
    router.back();
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
      <ScrollView
        ref={scrollRef}
        scrollEnabled={isPaused}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          if (isPaused) userScrollingRef.current = true;
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
            const isSpoken = i < currentWordIndex;
            const isCurrent = i === currentWordIndex;
            const wordColor = isCurrent
              ? colors.karaokeCurrent
              : isSpoken
              ? colors.karaokeSpoken
              : colors.karaokePending;
            return (
              <View
                key={i}
                onLayout={(e) => recordWordPosition(i, e.nativeEvent.layout.y)}
              >
                <Text
                  style={{
                    color: wordColor,
                    fontSize: parsedFontSize,
                    lineHeight,
                    fontWeight: isCurrent ? '700' : '400',
                  }}
                >
                  {word.original + ' '}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ height: SCREEN_HEIGHT - READING_LINE_Y }} />
      </ScrollView>

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

      {/* Controls */}
      <View
        style={{
          position: 'absolute',
          bottom: spacing.xxl,
          left: spacing.lg,
          right: spacing.lg,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.55)',
          borderRadius: radius.xl,
          padding: spacing.sm,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
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
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gauge size={20} color="#FFFFFF" strokeWidth={1.75} />
          </View>
        </Animated.View>
      </View>

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
            word {currentWordIndex + 1}/{words.length} · {Math.round(scrollPosition)}px
            {isPaused ? ' · PAUSED' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}
