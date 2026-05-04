import { useEffect } from 'react';
import Overlay from '../../../modules/expo-teleprompter-overlay/src/index';
import { usePrompterStore } from '@/store/prompterStore';
import { Script } from '@/store/scriptsStore';
import { useSettingsStore } from '@/store/settingsStore';

export function useOverlayMode() {
  const setMode = usePrompterStore((s) => s.setMode);
  const pause = usePrompterStore((s) => s.pause);
  const resume = usePrompterStore((s) => s.resume);
  const settings = useSettingsStore();

  const enableOverlay = async (script: Script): Promise<boolean> => {
    const hasPermission = await Overlay.hasPermission();

    if (!hasPermission) {
      const granted = await Overlay.requestPermission();
      if (!granted) return false;
    }

    await Overlay.show({
      text: script.content,
      fontSize: 32,
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      position: { x: 100, y: 200 },
      size: settings.overlayDefaultSize,
      opacity: settings.overlayOpacity,
    });

    setMode('overlay');
    return true;
  };

  useEffect(() => {
    const subs = [
      Overlay.addListener('pausePressed', pause),
      Overlay.addListener('resumePressed', resume),
      Overlay.addListener('closePressed', () => {
        Overlay.hide();
        setMode('idle');
      }),
    ];

    return () => subs.forEach((s) => s.remove());
  }, [pause, resume, setMode]);

  // Subscribe to scroll position and push to overlay
  useEffect(() => {
    let lastPos = 0;
    const unsub = usePrompterStore.subscribe((state) => {
      if (state.scrollPosition !== lastPos) {
        lastPos = state.scrollPosition;
        Overlay.setScrollPosition(state.scrollPosition);
      }
    });
    return unsub;
  }, []);

  return { enableOverlay };
}
