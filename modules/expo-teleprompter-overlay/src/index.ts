import { requireNativeModule } from 'expo-modules-core';

export interface OverlayConfig {
  text: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  opacity: number;
}

export interface OverlayEvents {
  pausePressed: () => void;
  resumePressed: () => void;
  closePressed: () => void;
  positionChanged: (pos: { x: number; y: number }) => void;
  sizeChanged: (size: { width: number; height: number }) => void;
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
  }): Promise<void>;
  hide(): void;
  setText(text: string): void;
  setScrollPosition(y: number): void;
  setOpacity(opacity: number): void;
  isShown(): Promise<boolean>;
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
  setOpacity(opacity: number): void {
    if (!Native) return;
    Native.setOpacity(opacity);
  },
  async isShown(): Promise<boolean> {
    if (!Native) return false;
    return Native.isShown();
  },
  // Event subscriptions reserved for next iteration (Sprint 4 polish)
  addListener<K extends keyof OverlayEvents>(
    _event: K,
    _handler: OverlayEvents[K]
  ): { remove: () => void } {
    return { remove: () => {} };
  },
};

export default TeleprompterOverlay;
