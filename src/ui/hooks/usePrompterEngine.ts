import { useEffect, useRef, useCallback, useMemo } from 'react';
import { STTEngine } from '@/core/speech/STTEngine';
import { ScrollEngine } from '@/core/scroll/ScrollEngine';
import { TextMatcher } from '@/core/speech/TextMatcher';
import { detectVoiceCommand } from '@/core/speech/VoiceCommandDetector';
import { usePrompterStore } from '@/store/prompterStore';
import { useSettingsStore } from '@/store/settingsStore';

const AUTO_TICK_MS = 100;
const MIN_WPM = 60;
const MAX_WPM = 250;

const clampWPM = (wpm: number) => Math.max(MIN_WPM, Math.min(MAX_WPM, wpm));

/**
 * Position-based prompter engine.
 *
 * Voice mode advances currentWordIndex from STT + TextMatcher.
 * Auto mode advances currentWordIndex at settings.scrollWPM.
 * Screens decide how to translate currentWordIndex into real scroll position.
 */
export function usePrompterEngine(scriptContent: string) {
  const sttRef = useRef(new STTEngine());
  const engineRef = useRef(new ScrollEngine());
  const matcherRef = useRef(new TextMatcher(scriptContent));
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRemainderRef = useRef(0);
  const lastAutoTickRef = useRef(Date.now());
  const sessionActiveRef = useRef(false);

  const isPaused = usePrompterStore((s) => s.isPaused);
  const detectedLanguage = usePrompterStore((s) => s.detectedLanguage);
  const setScrollPosition = usePrompterStore((s) => s.setScrollPosition);
  const setCurrentWordIndex = usePrompterStore((s) => s.setCurrentWordIndex);
  const setListening = usePrompterStore((s) => s.setListening);
  const setLastSpeechTime = usePrompterStore((s) => s.setLastSpeechTime);
  const pause = usePrompterStore((s) => s.pause);
  const resume = usePrompterStore((s) => s.resume);

  const scrollMode = useSettingsStore((s) => s.scrollMode);
  const defaultSensitivity = useSettingsStore((s) => s.defaultSensitivity);

  useEffect(() => {
    matcherRef.current.setScript(scriptContent);
    engineRef.current.reset();
    setScrollPosition(0);
    setCurrentWordIndex(-1);
  }, [scriptContent, setScrollPosition, setCurrentWordIndex]);

  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe((pos) => {
      setScrollPosition(pos);
    });
    return unsubscribe;
  }, [setScrollPosition]);

  useEffect(() => {
    if (isPaused) engineRef.current.pause();
    else engineRef.current.resume();
  }, [isPaused]);

  const words = useMemo(() => matcherRef.current.getWords(), [scriptContent]);

  useEffect(() => {
    matcherRef.current.setSensitivity(defaultSensitivity);
  }, [defaultSensitivity]);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const restartSession = useCallback(() => {
    autoRemainderRef.current = 1;
    lastAutoTickRef.current = Date.now();
    matcherRef.current.reset();
    engineRef.current.reset();
    setScrollPosition(0);
    setCurrentWordIndex(-1);
    setLastSpeechTime(0);
    resume();
  }, [resume, setCurrentWordIndex, setLastSpeechTime, setScrollPosition]);

  const adjustSpeed = useCallback((deltaWPM: number) => {
    const settings = useSettingsStore.getState();
    settings.setScrollWPM(clampWPM(settings.scrollWPM + deltaWPM));
  }, []);

  const handleVoiceCommand = useCallback(
    (cmd: ReturnType<typeof detectVoiceCommand>) => {
      switch (cmd) {
        case 'pause':
          pause();
          break;
        case 'resume':
          resume();
          break;
        case 'restart':
          restartSession();
          break;
        case 'slower':
          adjustSpeed(-10);
          break;
        case 'faster':
          adjustSpeed(10);
          break;
        case 'close':
        case 'louder':
        default:
          break;
      }
    },
    [adjustSpeed, pause, restartSession, resume]
  );

  const handleTranscript = useCallback(
    (transcript: string, _isFinal: boolean) => {
      if (!transcript) return;

      const settings = useSettingsStore.getState();
      if (settings.voiceCommandsEnabled) {
        const cmd = detectVoiceCommand(transcript);
        if (cmd) {
          handleVoiceCommand(cmd);
          return;
        }
      }

      if (usePrompterStore.getState().isPaused) return;

      const newIndex = matcherRef.current.processTranscript(transcript);
      setCurrentWordIndex(newIndex);
      setLastSpeechTime(Date.now());
    },
    [handleVoiceCommand, setCurrentWordIndex, setLastSpeechTime]
  );

  const startAutoTimer = useCallback(() => {
    clearAutoTimer();
    autoRemainderRef.current = 1;
    lastAutoTickRef.current = Date.now();

    autoTimerRef.current = setInterval(() => {
      const prompterState = usePrompterStore.getState();
      if (prompterState.isPaused) {
        lastAutoTickRef.current = Date.now();
        return;
      }

      const total = matcherRef.current.getWordCount();
      if (total <= 0) return;

      const now = Date.now();
      const elapsedMs = now - lastAutoTickRef.current;
      lastAutoTickRef.current = now;

      const wpm = clampWPM(useSettingsStore.getState().scrollWPM);
      autoRemainderRef.current += (elapsedMs * wpm) / 60000;

      let nextIndex = prompterState.currentWordIndex;
      while (autoRemainderRef.current >= 1 && nextIndex + 1 < total) {
        nextIndex += 1;
        autoRemainderRef.current -= 1;
      }

      if (nextIndex !== prompterState.currentWordIndex) {
        matcherRef.current.seekToWord(nextIndex);
        setCurrentWordIndex(nextIndex);
        setLastSpeechTime(now);
      }
    }, AUTO_TICK_MS);
  }, [clearAutoTimer, setCurrentWordIndex, setLastSpeechTime]);

  const stopTransport = useCallback(() => {
    clearAutoTimer();
    sttRef.current.stop();
    setListening(false);
  }, [clearAutoTimer, setListening]);

  const startTransport = useCallback(async () => {
    stopTransport();
    setListening(true);

    if (useSettingsStore.getState().scrollMode === 'auto') {
      // In overlay mode the native side runs its own background-safe auto
      // timer (Handler.postDelayed). Running JS setInterval here too causes
      // both to advance currentWordIndex and fight via push effects, which is
      // the "mental-mental" jumping. Let native be authoritative; JS catches
      // up via the 'indexChanged' event listener.
      const isOverlayMode = usePrompterStore.getState().mode === 'overlay';
      if (!isOverlayMode) {
        startAutoTimer();
      }
      return;
    }

    try {
      await sttRef.current.start(detectedLanguage, handleTranscript);
    } catch (error) {
      setListening(false);
      throw error;
    }
  }, [detectedLanguage, handleTranscript, setListening, startAutoTimer, stopTransport]);

  const startSession = useCallback(async () => {
    if (sessionActiveRef.current) return;
    sessionActiveRef.current = true;
    engineRef.current.start();
    resume();
    await startTransport();
  }, [resume, startTransport]);

  const stopSession = useCallback(() => {
    sessionActiveRef.current = false;
    stopTransport();
    engineRef.current.stop();
    matcherRef.current.reset();
    engineRef.current.reset();
    setScrollPosition(0);
    setCurrentWordIndex(-1);
  }, [setCurrentWordIndex, setScrollPosition, stopTransport]);

  useEffect(() => {
    if (!sessionActiveRef.current) return;
    startTransport().catch(console.error);
  }, [detectedLanguage, scrollMode, startTransport]);

  const seekToWord = useCallback(
    (idx: number) => {
      matcherRef.current.seekToWord(idx);
      setCurrentWordIndex(idx);
    },
    [setCurrentWordIndex]
  );

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      clearAutoTimer();
      sttRef.current.stop();
      engineRef.current.stop();
    };
  }, [clearAutoTimer]);

  return {
    startSession,
    stopSession,
    restartSession,
    adjustSpeed,
    seekToWord,
    engine: engineRef.current,
    matcher: matcherRef.current,
    words,
  };
}
