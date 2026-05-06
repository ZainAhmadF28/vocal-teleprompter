import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraType,
} from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import {
  X,
  RotateCw,
  Mic,
  MicOff,
  Image as ImageIcon,
  Camera as CameraIcon,
} from 'lucide-react-native';
import { useScriptsStore } from '@/store/scriptsStore';
import { usePrompterStore } from '@/store/prompterStore';
import { usePrompterEngine } from '@/ui/hooks/usePrompterEngine';
import { useKeepAwake } from '@/ui/hooks/useKeepAwake';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/components/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function PermissionGate({
  cameraGranted,
  micGranted,
  onRequest,
}: {
  cameraGranted: boolean;
  micGranted: boolean;
  onRequest: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.pill,
          backgroundColor: colors.accentSubtle,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
        }}
      >
        <CameraIcon size={32} color={colors.accent} strokeWidth={1.75} />
      </View>
      <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>
        Camera Access Needed
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
        Vocal Teleprompter perlu izin {!cameraGranted && 'kamera'}
        {!cameraGranted && !micGranted && ' & '}
        {!micGranted && 'microphone'} buat record video dengan teleprompter overlay.
      </Text>
      <View style={{ height: spacing.md }} />
      <Button label="Grant Permissions" variant="primary" fullWidth onPress={onRequest} />
      <Button label="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
    </View>
  );
}

export default function CameraStudioScreen() {
  const { id } = useLocalSearchParams<{ id: string; fontSize?: string }>();
  const { colors, typography, spacing, radius } = useTheme();

  const fontSize = 24; // smaller for overlay panel
  const getScript = useScriptsStore((s) => s.getScript);
  const script = getScript(id);

  const [cameraPerm, requestCamera] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [mediaPerm, requestMedia] = MediaLibrary.usePermissions();

  const [facing, setFacing] = useState<CameraType>('front');
  const [micEnabled, setMicEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isPaused,
    scrollPosition,
    currentWordIndex,
    isListening,
    pause,
    resume,
  } = usePrompterStore();
  const { startSession, stopSession, engine, words } = usePrompterEngine(
    script?.content ?? ''
  );

  useKeepAwake(true);

  // Start prompter session on mount
  useEffect(() => {
    startSession().catch(console.error);
    return () => {
      stopSession();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  // Update scroll position for prompter overlay (using inner ScrollView)
  const overlayScrollRef = useRef<ScrollView | null>(null);
  useEffect(() => {
    overlayScrollRef.current?.scrollTo({ y: scrollPosition, animated: false });
  }, [scrollPosition]);

  const wordPositionsRef = useRef<number[]>([]);
  const [, forceUpdate] = useState(0);

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

  const handleStartRecording = async () => {
    if (!cameraRef.current || !isCameraReady || isRecording) return;
    try {
      setIsRecording(true);
      setRecordSec(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSec((s) => s + 1);
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 1800, // 30 min cap
      });

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setIsRecording(false);

      if (video?.uri) {
        setIsSaving(true);
        // Save to MediaLibrary in dedicated 'Vocal Teleprompter' album
        if (!mediaPerm?.granted) {
          await requestMedia();
        }
        const asset = await MediaLibrary.createAssetAsync(video.uri);
        const album = await MediaLibrary.getAlbumAsync('Vocal Teleprompter');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('Vocal Teleprompter', asset, false);
        }
        setIsSaving(false);
        Alert.alert('Saved', 'Recording tersimpan di album "Vocal Teleprompter".', [
          { text: 'OK' },
        ]);
      }
    } catch (e: any) {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setIsRecording(false);
      setIsSaving(false);
      Alert.alert('Recording Error', String(e?.message ?? e));
    }
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;
    try {
      cameraRef.current.stopRecording();
      // recordAsync's promise will resolve in handleStartRecording
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      Alert.alert('Stop Recording', 'Recording sedang berjalan. Stop dan keluar?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop & Exit',
          style: 'destructive',
          onPress: async () => {
            await handleStopRecording();
            stopSession();
            router.back();
          },
        },
      ]);
      return;
    }
    stopSession();
    router.back();
  };

  const handleFlipCamera = () => {
    setFacing((f) => (f === 'front' ? 'back' : 'front'));
  };

  const handleRequestPermissions = async () => {
    await requestCamera();
    await requestMic();
    await requestMedia();
  };

  const lineHeight = useMemo(() => fontSize * 1.5, [fontSize]);

  if (!script) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[typography.body, { color: colors.danger }]}>Script tidak ditemukan.</Text>
        <View style={{ height: 12 }} />
        <Button label="Back" onPress={() => router.back()} variant="secondary" />
      </View>
    );
  }

  if (!cameraPerm || !micPerm) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!cameraPerm.granted || !micPerm.granted) {
    return (
      <PermissionGate
        cameraGranted={cameraPerm.granted}
        micGranted={micPerm.granted}
        onRequest={handleRequestPermissions}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Camera viewfinder full-bleed */}
      <CameraView
        ref={(r) => {
          cameraRef.current = r;
        }}
        style={{ flex: 1 }}
        facing={facing}
        mode="video"
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Top bar — recording indicator + close */}
      <View
        style={{
          position: 'absolute',
          top: 48,
          left: spacing.lg,
          right: spacing.lg,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        pointerEvents="box-none"
      >
        {isRecording ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: 'rgba(0,0,0,0.7)',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.pill,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.danger,
              }}
            />
            <Text style={[typography.caption, { color: '#FFFFFF' }]}>
              {`${Math.floor(recordSec / 60)
                .toString()
                .padStart(2, '0')}:${(recordSec % 60).toString().padStart(2, '0')}`}
            </Text>
          </View>
        ) : (
          <View />
        )}

        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <X size={20} color="#FFFFFF" strokeWidth={1.75} />
        </Pressable>
      </View>

      {/* Prompter overlay panel — top half, draggable in future iteration */}
      <View
        style={{
          position: 'absolute',
          top: SCREEN_HEIGHT * 0.12,
          left: spacing.lg,
          right: spacing.lg,
          height: SCREEN_HEIGHT * 0.45,
          backgroundColor: 'rgba(0,0,0,0.55)',
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
        pointerEvents="box-none"
      >
        <View
          style={{
            alignItems: 'center',
            paddingVertical: spacing.xs,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.3)',
            }}
          />
        </View>
        <ScrollView
          ref={overlayScrollRef}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: SCREEN_HEIGHT * 0.18,
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
              return (
                <View
                  key={i}
                  onLayout={(e) => recordWordPosition(i, e.nativeEvent.layout.y)}
                >
                  <Text
                    style={{
                      color: isCurrent
                        ? colors.accent
                        : isSpoken
                        ? 'rgba(255,255,255,0.4)'
                        : '#FFFFFF',
                      fontSize,
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
          <View style={{ height: SCREEN_HEIGHT * 0.3 }} />
        </ScrollView>

        {/* Reading line on overlay */}
        <View
          style={{
            position: 'absolute',
            top: SCREEN_HEIGHT * 0.18 + spacing.xs,
            left: spacing.md,
            right: spacing.md,
            height: 1.5,
            backgroundColor: colors.accent,
            opacity: 0.5,
          }}
          pointerEvents="none"
        />
      </View>

      {/* Bottom controls bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 32,
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: spacing.xl,
        }}
      >
        {/* Flip camera */}
        <Pressable
          onPress={handleFlipCamera}
          disabled={isRecording}
          style={({ pressed }) => [
            {
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : isRecording ? 0.4 : 1,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            },
          ]}
        >
          <RotateCw size={20} color="#FFFFFF" strokeWidth={1.75} />
        </Pressable>

        {/* Record button */}
        <Pressable
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          disabled={!isCameraReady || isSaving}
          style={({ pressed }) => [
            {
              width: 76,
              height: 76,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: '#FFFFFF',
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : isRecording ? (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: colors.danger,
              }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.pill,
                backgroundColor: colors.danger,
              }}
            />
          )}
        </Pressable>

        {/* Mic toggle */}
        <Pressable
          onPress={() => setMicEnabled((v) => !v)}
          style={({ pressed }) => [
            {
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            },
          ]}
        >
          {micEnabled ? (
            <Mic size={20} color="#FFFFFF" strokeWidth={1.75} />
          ) : (
            <MicOff size={20} color={colors.danger} strokeWidth={1.75} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
