import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvPersistConfig } from '@/storage/mmkv';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeMode;
  defaultFontSize: number;
  defaultSensitivity: 'low' | 'medium' | 'high';
  smoothingStrength: number;
  speedMultiplier: number;
  scrollWPM: number; // target reading pace (Words Per Minute)
  micSource: 'internal' | 'external'; // mic input source
  noiseCancellation: boolean;
  bluetoothMicEnabled: boolean;
  voiceCommandsEnabled: boolean;
  overlayDefaultSize: { width: number; height: number };
  overlayOpacity: number;
  overlayAlignment: 'left' | 'center' | 'right';
  overlayBackdrop: 'transparent' | 'dim' | 'blur';

  setThemeMode: (m: ThemeMode) => void;
  setDefaultFontSize: (size: number) => void;
  setDefaultSensitivity: (s: SettingsState['defaultSensitivity']) => void;
  setSmoothingStrength: (v: number) => void;
  setSpeedMultiplier: (v: number) => void;
  setScrollWPM: (v: number) => void;
  setMicSource: (s: SettingsState['micSource']) => void;
  setNoiseCancellation: (v: boolean) => void;
  setBluetoothMicEnabled: (v: boolean) => void;
  setVoiceCommandsEnabled: (v: boolean) => void;
  setOverlayDefaultSize: (size: { width: number; height: number }) => void;
  setOverlayOpacity: (v: number) => void;
  setOverlayAlignment: (a: SettingsState['overlayAlignment']) => void;
  setOverlayBackdrop: (b: SettingsState['overlayBackdrop']) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'dark',
      defaultFontSize: 48,
      defaultSensitivity: 'medium',
      smoothingStrength: 0.15,
      speedMultiplier: 1.0,
      scrollWPM: 140,
      micSource: 'internal',
      noiseCancellation: true,
      bluetoothMicEnabled: true,
      voiceCommandsEnabled: true,
      overlayDefaultSize: { width: 400, height: 200 },
      overlayOpacity: 0.85,
      overlayAlignment: 'center',
      overlayBackdrop: 'dim',

      setThemeMode: (m) => set({ themeMode: m }),
      setDefaultFontSize: (size) => set({ defaultFontSize: size }),
      setDefaultSensitivity: (s) => set({ defaultSensitivity: s }),
      setSmoothingStrength: (v) => set({ smoothingStrength: v }),
      setSpeedMultiplier: (v) => set({ speedMultiplier: v }),
      setScrollWPM: (v) => set({ scrollWPM: v }),
      setMicSource: (s) => set({ micSource: s }),
      setNoiseCancellation: (v) => set({ noiseCancellation: v }),
      setBluetoothMicEnabled: (v) => set({ bluetoothMicEnabled: v }),
      setVoiceCommandsEnabled: (v) => set({ voiceCommandsEnabled: v }),
      setOverlayDefaultSize: (size) => set({ overlayDefaultSize: size }),
      setOverlayOpacity: (v) => set({ overlayOpacity: v }),
      setOverlayAlignment: (a) => set({ overlayAlignment: a }),
      setOverlayBackdrop: (b) => set({ overlayBackdrop: b }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => mmkvPersistConfig),
    }
  )
);
