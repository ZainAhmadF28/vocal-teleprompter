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
      scrollMode: settings.scrollMode,
      isPaused: false,
      speedLabel: String(settings.scrollWPM),
    });

    setMode('overlay');
    return true;
  };

  useEffect(() => {
    const subs = [
      Overlay.addListener('controlPressed', (event) => {
        switch (event.action) {
          case 'togglePause':
            usePrompterStore.getState().isPaused ? resume() : pause();
            break;
          case 'close':
            Overlay.hide();
            setMode('idle');
            break;
          case 'toggleMode':
            settings.setScrollMode(settings.scrollMode === 'auto' ? 'voice' : 'auto');
            break;
          case 'slower':
            settings.setScrollWPM(Math.max(60, settings.scrollWPM - 10));
            break;
          case 'faster':
            settings.setScrollWPM(Math.min(250, settings.scrollWPM + 10));
            break;
          case 'restart':
          default:
            break;
        }
      }),
    ];

    return () => subs.forEach((s) => s.remove());
  }, [pause, resume, setMode, settings]);

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
