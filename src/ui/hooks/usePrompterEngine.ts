import { useEffect, useRef, useCallback, useMemo } from 'react';
import { STTEngine } from '@/core/speech/STTEngine';
import { ScrollEngine } from '@/core/scroll/ScrollEngine';
import { TextMatcher } from '@/core/speech/TextMatcher';
import { detectVoiceCommand } from '@/core/speech/VoiceCommandDetector';
import { usePrompterStore } from '@/store/prompterStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Position-based prompter engine (karaoke style).
 *
 * Flow:
 *   STT result → TextMatcher.processTranscript → currentWordIndex (in store)
 *   UI subscribe currentWordIndex → compute targetY dari layout kata
 *   UI call engine.setTargetPosition(targetY) → smooth animate
 */
export function usePrompterEngine(scriptContent: string) {
  const sttRef = useRef(new STTEngine());
  const engineRef = useRef(new ScrollEngine());
  const matcherRef = useRef(new TextMatcher(scriptContent));

  const {
    isPaused,
    detectedLanguage,
    setScrollPosition,
    setCurrentWordIndex,
    setListening,
    setLastSpeechTime,
    pause,
    resume,
    reset,
  } = usePrompterStore();

  const settings = useSettingsStore();

  // Re-tokenize kalau script berubah (misalnya user edit script lalu balik ke prompter)
  useEffect(() => {
    matcherRef.current.setScript(scriptContent);
    setCurrentWordIndex(-1);
  }, [scriptContent, setCurrentWordIndex]);

  // Subscribe scroll position dari engine ke store
  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe((pos) => {
      setScrollPosition(pos);
    });
    return unsubscribe;
  }, [setScrollPosition]);

  // Sync pause state
  useEffect(() => {
    if (isPaused) engineRef.current.pause();
    else engineRef.current.resume();
  }, [isPaused]);

  const words = useMemo(() => matcherRef.current.getWords(), [scriptContent]);

  const startSession = useCallback(async () => {
    const engine = engineRef.current;
    const stt = sttRef.current;
    const matcher = matcherRef.current;

    engine.start();
    setListening(true);

    await stt.start(detectedLanguage, (transcript, _isFinal) => {
      if (!transcript) return;

      // Voice commands first (pause/resume/restart)
      if (settings.voiceCommandsEnabled) {
        const cmd = detectVoiceCommand(transcript);
        if (cmd) {
          handleVoiceCommand(cmd);
          return;
        }
      }

      // Karaoke matching: process transcript, advance currentWordIndex if matched
      const newIndex = matcher.processTranscript(transcript);
      setCurrentWordIndex(newIndex);
      setLastSpeechTime(Date.now());
    });
  }, [detectedLanguage, settings, setListening, setCurrentWordIndex, setLastSpeechTime]);

  const stopSession = useCallback(() => {
    sttRef.current.stop();
    engineRef.current.stop();
    matcherRef.current.reset();
    setListening(false);
    setCurrentWordIndex(-1);
  }, [setListening, setCurrentWordIndex]);

  const handleVoiceCommand = (cmd: ReturnType<typeof detectVoiceCommand>) => {
    switch (cmd) {
      case 'pause':
        pause();
        break;
      case 'resume':
        resume();
        break;
      case 'restart':
        engineRef.current.reset();
        matcherRef.current.reset();
        setCurrentWordIndex(-1);
        reset();
        break;
      // 'slower'/'faster' tidak dipakai di mode karaoke — kecepatan = kecepatan ngomong
      case 'slower':
      case 'faster':
        break;
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      sttRef.current.stop();
      engineRef.current.stop();
    };
  }, []);

  return {
    startSession,
    stopSession,
    engine: engineRef.current,
    matcher: matcherRef.current,
    words,
  };
}
