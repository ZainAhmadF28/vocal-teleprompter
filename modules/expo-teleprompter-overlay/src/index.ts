// Placeholder — implementasi native (Sprint 4)
// TypeScript API sesuai planning doc akan ada di sini

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

// Stub implementation for development before native module is built
const TeleprompterOverlay = {
  async hasPermission(): Promise<boolean> {
    return false;
  },
  async requestPermission(): Promise<boolean> {
    return false;
  },
  async show(_config: OverlayConfig): Promise<void> {
    console.warn('TeleprompterOverlay native module not yet implemented');
  },
  async hide(): Promise<void> {},
  setScrollPosition(_y: number): void {},
  setText(_text: string): void {},
  addListener<K extends keyof OverlayEvents>(
    _event: K,
    _handler: OverlayEvents[K]
  ): { remove: () => void } {
    return { remove: () => {} };
  },
};

export default TeleprompterOverlay;
