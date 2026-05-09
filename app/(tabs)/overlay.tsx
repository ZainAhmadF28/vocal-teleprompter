import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  PictureInPicture2,
  Info,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings as SettingsIcon,
  FileText,
  X,
  Power,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { usePrompterStore } from '@/store/prompterStore';
import { useScriptsStore, type Script } from '@/store/scriptsStore';
import { usePrompterEngine } from '@/ui/hooks/usePrompterEngine';
import { Screen } from '@/ui/components/Screen';
import { Header } from '@/ui/components/Header';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { IconButton } from '@/ui/components/IconButton';
import TeleprompterOverlay from '../../modules/expo-teleprompter-overlay/src/index';

function FloatingOverlaySession({
  script,
  onClose,
}: {
  script: Script;
  onClose: () => void;
}) {
  const scrollMode = useSettingsStore((s) => s.scrollMode);
  const scrollWPM = useSettingsStore((s) => s.scrollWPM);
  const overlayBackdrop = useSettingsStore((s) => s.overlayBackdrop);
  const setScrollMode = useSettingsStore((s) => s.setScrollMode);
  const setScrollWPM = useSettingsStore((s) => s.setScrollWPM);
  const setOverlayBackdrop = useSettingsStore((s) => s.setOverlayBackdrop);
  const setOverlayDefaultSize = useSettingsStore((s) => s.setOverlayDefaultSize);

  const isPaused = usePrompterStore((s) => s.isPaused);
  const currentWordIndex = usePrompterStore((s) => s.currentWordIndex);
  const pause = usePrompterStore((s) => s.pause);
  const resume = usePrompterStore((s) => s.resume);
  const setMode = usePrompterStore((s) => s.setMode);
  const setActiveScript = usePrompterStore((s) => s.setActiveScript);

  const { startSession, stopSession, restartSession, seekToWord } = usePrompterEngine(script.content);

  useEffect(() => {
    setMode('overlay');
    setActiveScript(script.id);
    startSession().catch(console.error);
    return () => {
      stopSession();
      setMode('idle');
      setActiveScript(null);
    };
  }, [script.content, script.id, setActiveScript, setMode, startSession, stopSession]);

  useEffect(() => {
    // Push JS index to native ONLY in voice mode. In auto mode the native
    // overlay owns the index (background-safe Handler timer) and JS just
    // mirrors via the 'indexChanged' event. Pushing here would overwrite
    // native's advance and cause the "mental-mental" jumping the user saw.
    if (scrollMode === 'voice') {
      TeleprompterOverlay.setCurrentWordIndex(currentWordIndex);
    }
  }, [currentWordIndex, scrollMode]);

  useEffect(() => {
    TeleprompterOverlay.setPaused(isPaused);
  }, [isPaused]);

  useEffect(() => {
    TeleprompterOverlay.setScrollMode(scrollMode);
    TeleprompterOverlay.setSpeedLabel(String(scrollWPM));
  }, [scrollMode, scrollWPM]);

  useEffect(() => {
    TeleprompterOverlay.setBackdrop(overlayBackdrop);
  }, [overlayBackdrop]);

  useEffect(() => {
    const subs = [
      TeleprompterOverlay.addListener('controlPressed', async (event) => {
        switch (event.action) {
          case 'togglePause':
            usePrompterStore.getState().isPaused ? resume() : pause();
            break;
          case 'restart':
            restartSession();
            break;
          case 'close':
            await TeleprompterOverlay.hide();
            onClose();
            break;
          case 'toggleMode': {
            // Read fresh state — closure can be stale after rapid taps
            const cur = useSettingsStore.getState().scrollMode;
            setScrollMode(cur === 'auto' ? 'voice' : 'auto');
            break;
          }
          case 'slower': {
            const cur = useSettingsStore.getState().scrollWPM;
            setScrollWPM(Math.max(60, cur - 10));
            break;
          }
          case 'faster': {
            const cur = useSettingsStore.getState().scrollWPM;
            setScrollWPM(Math.min(250, cur + 10));
            break;
          }
          case 'toggleBackdrop': {
            // Native cycles transparent → dim → blur → transparent. Mirror it
            // into the JS settings store so the config tab stays in sync.
            const order: Array<'transparent' | 'dim' | 'blur'> = [
              'transparent',
              'dim',
              'blur',
            ];
            const cur = useSettingsStore.getState().overlayBackdrop;
            const next = order[(order.indexOf(cur) + 1) % order.length];
            setOverlayBackdrop(next);
            break;
          }
          case 'toggleToolbar':
            // Native handles visibility locally; nothing to mirror in JS.
            break;
        }
      }),
      TeleprompterOverlay.addListener('sizeChanged', (size) => {
        setOverlayDefaultSize({
          width: Math.max(260, Math.round(size.width)),
          height: Math.max(170, Math.round(size.height)),
        });
      }),
      // Native auto-scroll advances index in background. We mirror it into
      // JS state so matcher stays in sync (otherwise toggling back to voice
      // would have a stale matcher index and STT wouldn't match anything).
      TeleprompterOverlay.addListener('indexChanged', ({ index }) => {
        seekToWord(index);
      }),
    ];

    return () => subs.forEach((sub) => sub.remove());
  }, [
    onClose,
    pause,
    restartSession,
    resume,
    seekToWord,
    setOverlayBackdrop,
    setOverlayDefaultSize,
    setScrollMode,
    setScrollWPM,
  ]);

  return null;
}

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

function ScriptPickerModal({
  visible,
  scripts,
  onPick,
  onClose,
}: {
  visible: boolean;
  scripts: Script[];
  onPick: (s: Script) => void;
  onClose: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxl,
            paddingHorizontal: spacing.lg,
            maxHeight: '70%',
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: spacing.md,
            }}
          />
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
            Pilih Script
          </Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {scripts.length === 0 ? (
              <Text
                style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.xl }]}
              >
                Belum ada script. Bikin di tab Scripts dulu.
              </Text>
            ) : (
              scripts.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => onPick(s)}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: pressed ? colors.bgSubtle : 'transparent',
                    },
                  ]}
                >
                  <FileText size={18} color={colors.textSecondary} strokeWidth={1.75} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyEmph, { color: colors.text }]} numberOfLines={1}>
                      {s.title}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function OverlayTab() {
  const { colors, typography, spacing, radius } = useTheme();
  const settings = useSettingsStore();
  const scripts = useScriptsStore((s) => s.scripts);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [activeScript, setActiveScript] = useState<Script | null>(null);

  // Sync state when user returns to this tab — handles the case where they
  // dismissed the overlay (or system did) while the app was in the background.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const shown = await TeleprompterOverlay.isShown();
          if (cancelled) return;
          if (!shown && overlayActive) {
            setOverlayActive(false);
            setActiveScript(null);
          }
        } catch {
          // module not linked; ignore
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [overlayActive])
  );

  return (
    <Screen>
      {overlayActive && activeScript ? (
        <FloatingOverlaySession
          script={activeScript}
          onClose={() => {
            setOverlayActive(false);
            setActiveScript(null);
          }}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => router.push('/settings' as any)}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: radius.pill,
                backgroundColor: colors.bgElevated,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <SettingsIcon size={20} color={colors.text} strokeWidth={1.75} />
          </Pressable>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.displayXL, { color: colors.text }]}>
            Floating{'\n'}Overlay
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, maxWidth: 320 }]}>
            Atur tampilan window prompter yang ngambang di atas app lain.
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
                  small: { width: 320, height: 220 },
                  medium: { width: 460, height: 320 },
                  large: { width: 640, height: 440 },
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

        {overlayActive ? (
          <Button
            label="Hide Floating Overlay"
            variant="danger"
            fullWidth
            leftIcon={<Power size={18} color={colors.textInverse} strokeWidth={1.75} />}
            onPress={async () => {
              await TeleprompterOverlay.hide();
              setOverlayActive(false);
              setActiveScript(null);
            }}
          />
        ) : (
          <Button
            label="Launch Floating Mode"
            variant="primary"
            fullWidth
            leftIcon={<PictureInPicture2 size={18} color={colors.textInverse} strokeWidth={1.75} />}
            onPress={async () => {
              const granted = await TeleprompterOverlay.hasPermission();
              if (!granted) {
                Alert.alert(
                  '"Display over other apps" Belum Diizinkan',
                  'Buka system settings buat enable, lalu coba lagi.',
                  [
                    { text: 'Batal', style: 'cancel' },
                    {
                      text: 'Buka Settings',
                      onPress: async () => {
                        await TeleprompterOverlay.requestPermission();
                      },
                    },
                  ]
                );
                return;
              }
              if (scripts.length === 0) {
                Alert.alert(
                  'Belum Ada Script',
                  'Bikin script dulu di tab Scripts sebelum launch overlay.'
                );
                return;
              }
              setPickerOpen(true);
            }}
          />
        )}
      </ScrollView>

      <ScriptPickerModal
        visible={pickerOpen}
        scripts={scripts}
        onClose={() => setPickerOpen(false)}
        onPick={async (script) => {
          setPickerOpen(false);
          try {
            const sizeWidth = settings.overlayDefaultSize.width;
            const sizeHeight = settings.overlayDefaultSize.height;
            await TeleprompterOverlay.show({
              text: script.content,
              fontSize: 22,
              fontColor: '#FFFFFF',
              backgroundColor: '#000000',
              opacity: settings.overlayOpacity,
              position: { x: 24, y: 120 },
              size: {
                width: Math.max(320, sizeWidth),
                height: Math.max(220, sizeHeight),
              },
              scrollMode: settings.scrollMode,
              isPaused: usePrompterStore.getState().isPaused,
              speedLabel: String(settings.scrollWPM),
              backdrop: settings.overlayBackdrop,
            });
            setOverlayActive(true);
            setActiveScript(script);
            Alert.alert(
              'Overlay Aktif',
              'Bisa di-drag dari handle/area teks. Tombol floating bisa pause, restart, mode, speed, dan close.'
            );
          } catch (e: any) {
            Alert.alert('Error', String(e?.message ?? e));
          }
        }}
      />
    </Screen>
  );
}
