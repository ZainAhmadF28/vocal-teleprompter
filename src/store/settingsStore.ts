import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvPersistConfig } from '@/storage/mmkv';

interface SettingsState {
  defaultFontSize: number;
  defaultSensitivity: 'low' | 'medium' | 'high';
  smoothingStrength: number;
  speedMultiplier: number;
  bluetoothMicEnabled: boolean;
  voiceCommandsEnabled: boolean;
  overlayDefaultSize: { width: number; height: number };
  overlayOpacity: number;

  setDefaultFontSize: (size: number) => void;
  setDefaultSensitivity: (s: SettingsState['defaultSensitivity']) => void;
  setSmoothingStrength: (v: number) => void;
  setSpeedMultiplier: (v: number) => void;
  setBluetoothMicEnabled: (v: boolean) => void;
  setVoiceCommandsEnabled: (v: boolean) => void;
  setOverlayDefaultSize: (size: { width: number; height: number }) => void;
  setOverlayOpacity: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultFontSize: 48,
      defaultSensitivity: 'medium',
      smoothingStrength: 0.15,
      speedMultiplier: 1.0,
      bluetoothMicEnabled: true,
      voiceCommandsEnabled: true,
      overlayDefaultSize: { width: 400, height: 200 },
      overlayOpacity: 0.85,

      setDefaultFontSize: (size) => set({ defaultFontSize: size }),
      setDefaultSensitivity: (s) => set({ defaultSensitivity: s }),
      setSmoothingStrength: (v) => set({ smoothingStrength: v }),
      setSpeedMultiplier: (v) => set({ speedMultiplier: v }),
      setBluetoothMicEnabled: (v) => set({ bluetoothMicEnabled: v }),
      setVoiceCommandsEnabled: (v) => set({ voiceCommandsEnabled: v }),
      setOverlayDefaultSize: (size) => set({ overlayDefaultSize: size }),
      setOverlayOpacity: (v) => set({ overlayOpacity: v }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => mmkvPersistConfig),
    }
  )
);
