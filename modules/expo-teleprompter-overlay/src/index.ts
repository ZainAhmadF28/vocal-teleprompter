import {
  requireNativeModule,
  type EventSubscription,
} from 'expo-modules-core';

export type OverlayBackdrop = 'transparent' | 'dim' | 'blur';

export type OverlayControlAction =
  | 'togglePause'
  | 'restart'
  | 'close'
  | 'toggleMode'
  | 'slower'
  | 'faster'
  | 'toggleBackdrop'
  | 'toggleToolbar';

export interface OverlayConfig {
  text: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  opacity: number;
  scrollMode?: 'voice' | 'auto';
  isPaused?: boolean;
  speedLabel?: string;
  backdrop?: OverlayBackdrop;
}

export interface OverlayEvents {
  [eventName: string]: (...args: any[]) => void;
  controlPressed: (event: { action: OverlayControlAction }) => void;
  positionChanged: (pos: { x: number; y: number }) => void;
  sizeChanged: (size: { width: number; height: number }) => void;
  indexChanged: (event: { index: number }) => void;
}

interface NativeOverlayModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  show(config: {
    text: string;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    opacity: number;
    x: number;
    y: number;
    width: number;
    height: number;
    scrollMode: 'voice' | 'auto';
    isPaused: boolean;
    speedLabel: string;
    backdrop: OverlayBackdrop;
  }): Promise<void>;
  hide(): void;
  setText(text: string): void;
  setScrollPosition(y: number): void;
  setCurrentWordIndex(index: number): void;
  setPaused(paused: boolean): void;
  setScrollMode(mode: 'voice' | 'auto'): void;
  setSpeedLabel(label: string): void;
  setOpacity(opacity: number): void;
  setBackdrop(mode: OverlayBackdrop): void;
  setToolbarVisible(visible: boolean): void;
  isShown(): Promise<boolean>;
  addListener<K extends keyof OverlayEvents>(
    event: K,
    handler: OverlayEvents[K]
  ): EventSubscription;
}

let Native: NativeOverlayModule | null = null;
try {
  Native = requireNativeModule<NativeOverlayModule>('ExpoTeleprompterOverlay');
} catch {
  // Module not linked yet (e.g. during SSR / before prebuild ran)
  Native = null;
}

const TeleprompterOverlay = {
  async hasPermission(): Promise<boolean> {
    if (!Native) return false;
    return Native.hasPermission();
  },
  async requestPermission(): Promise<boolean> {
    if (!Native) return false;
    return Native.requestPermission();
  },
  async show(config: OverlayConfig): Promise<void> {
    if (!Native) {
      console.warn('TeleprompterOverlay native module not available');
      return;
    }
    return Native.show({
      text: config.text,
      fontSize: config.fontSize,
      fontColor: config.fontColor,
      backgroundColor: config.backgroundColor,
      opacity: config.opacity,
      x: config.position.x,
      y: config.position.y,
      width: config.size.width,
      height: config.size.height,
      scrollMode: config.scrollMode ?? 'voice',
      isPaused: config.isPaused ?? false,
      speedLabel: config.speedLabel ?? '140',
      backdrop: config.backdrop ?? 'dim',
    });
  },
  async hide(): Promise<void> {
    if (!Native) return;
    Native.hide();
  },
  setText(text: string): void {
    if (!Native) return;
    Native.setText(text);
  },
  setScrollPosition(y: number): void {
    if (!Native) return;
    Native.setScrollPosition(y);
  },
  setCurrentWordIndex(index: number): void {
    if (!Native) return;
    Native.setCurrentWordIndex(index);
  },
  setPaused(paused: boolean): void {
    if (!Native) return;
    Native.setPaused(paused);
  },
  setScrollMode(mode: 'voice' | 'auto'): void {
    if (!Native) return;
    Native.setScrollMode(mode);
  },
  setSpeedLabel(label: string): void {
    if (!Native) return;
    Native.setSpeedLabel(label);
  },
  setOpacity(opacity: number): void {
    if (!Native) return;
    Native.setOpacity(opacity);
  },
  setBackdrop(mode: OverlayBackdrop): void {
    // Older native binaries (built before this method was added) won't expose
    // it. Guard so a stale APK doesn't crash the JS app — the new behavior
    // simply no-ops until the user rebuilds the Android module.
    if (!Native || typeof Native.setBackdrop !== 'function') return;
    Native.setBackdrop(mode);
  },
  setToolbarVisible(visible: boolean): void {
    if (!Native || typeof Native.setToolbarVisible !== 'function') return;
    Native.setToolbarVisible(visible);
  },
  async isShown(): Promise<boolean> {
    if (!Native) return false;
    return Native.isShown();
  },
  addListener<K extends keyof OverlayEvents>(
    event: K,
    handler: OverlayEvents[K]
  ): EventSubscription {
    if (!Native) return { remove: () => {} };
    return Native.addListener(event, handler);
  },
};

export default TeleprompterOverlay;
