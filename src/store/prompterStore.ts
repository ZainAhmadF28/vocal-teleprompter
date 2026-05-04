import { create } from 'zustand';

type PrompterMode = 'fullscreen' | 'overlay' | 'idle';

interface PrompterState {
  scrollPosition: number;
  scrollSpeed: number;
  currentWPS: number;
  isPaused: boolean;
  isListening: boolean;
  detectedLanguage: string;
  lastSpeechTime: number;
  mode: PrompterMode;
  activeScriptId: string | null;

  setScrollSpeed: (speed: number) => void;
  setScrollPosition: (pos: number) => void;
  setWPS: (wps: number) => void;
  pause: () => void;
  resume: () => void;
  setListening: (v: boolean) => void;
  setDetectedLanguage: (lang: string) => void;
  setLastSpeechTime: (t: number) => void;
  setMode: (mode: PrompterMode) => void;
  setActiveScript: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  scrollPosition: 0,
  scrollSpeed: 0,
  currentWPS: 0,
  isPaused: false,
  isListening: false,
  detectedLanguage: 'id-ID',
  lastSpeechTime: 0,
  mode: 'idle' as PrompterMode,
  activeScriptId: null,
};

export const usePrompterStore = create<PrompterState>()((set) => ({
  ...initialState,

  setScrollSpeed: (speed) => set({ scrollSpeed: speed }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  setWPS: (wps) => set({ currentWPS: wps }),
  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),
  setListening: (v) => set({ isListening: v }),
  setDetectedLanguage: (lang) => set({ detectedLanguage: lang }),
  setLastSpeechTime: (t) => set({ lastSpeechTime: t }),
  setMode: (mode) => set({ mode }),
  setActiveScript: (id) => set({ activeScriptId: id }),
  reset: () => set(initialState),
}));
