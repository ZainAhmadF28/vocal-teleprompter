import { useEffect, useRef, useCallback } from 'react';
import { STTEngine } from '@/core/speech/STTEngine';
import { VADEngine } from '@/core/speech/VADEngine';
import { SpeechRateCalculator } from '@/core/speech/SpeechRateCalculator';
import { ScrollEngine } from '@/core/scroll/ScrollEngine';
import { ScrollSpeedMapper, estimatePixelsPerWord } from '@/core/scroll/ScrollSpeedMapper';
import { detectVoiceCommand } from '@/core/speech/VoiceCommandDetector';
import { usePrompterStore } from '@/store/prompterStore';
import { useSettingsStore } from '@/store/settingsStore';

export function usePrompterEngine(fontSize: number, baselineWPS: number) {
  const sttRef = useRef(new STTEngine());
  const vadRef = useRef(new VADEngine());
  const calculatorRef = useRef(new SpeechRateCalculator());
  const engineRef = useRef(new ScrollEngine());
  const mapperRef = useRef(
    new ScrollSpeedMapper(baselineWPS, estimatePixelsPerWord(fontSize))
  );

  const {
    isPaused,
    detectedLanguage,
    setScrollPosition,
    setScrollSpeed,
    setWPS,
    setListening,
    setLastSpeechTime,
    pause,
    resume,
    reset,
  } = usePrompterStore();

  const settings = useSettingsStore();

  // Subscribe to scroll engine position updates
  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe((pos) => {
      setScrollPosition(pos);
      setScrollSpeed(engineRef.current.getCurrentSpeed());
    });
    return unsubscribe;
  }, [setScrollPosition, setScrollSpeed]);

  // Sync pause state to engine
  useEffect(() => {
    if (isPaused) {
      engineRef.current.pause();
    } else {
      engineRef.current.resume();
    }
  }, [isPaused]);

  // Sync speed multiplier from settings
  useEffect(() => {
    mapperRef.current.setSpeedMultiplier(settings.speedMultiplier);
  }, [settings.speedMultiplier]);

  const startSession = useCallback(async () => {
    const engine = engineRef.current;
    const stt = sttRef.current;
    const vad = vadRef.current;
    const calculator = calculatorRef.current;
    const mapper = mapperRef.current;

    mapper.setBaselineWPS(baselineWPS);
    mapper.setPixelsPerWord(estimatePixelsPerWord(fontSize));

    engine.start();
    setListening(true);

    // Start VAD for fast pause detection
    try {
      await vad.start(
        () => {
          // Voice started — resume if was paused by silence
          setLastSpeechTime(Date.now());
        },
        () => {
          // Voice ended — signal engine to stop
          engine.onVADSpeechEnd();
        },
        settings.defaultSensitivity === 'low' ? 0.3
          : settings.defaultSensitivity === 'high' ? 0.7
          : 0.5
      );
    } catch {
      // VAD optional — STT alone can drive scroll
    }

    // Start STT for WPS measurement
    await stt.start(detectedLanguage, (transcript, _isFinal) => {
      if (!transcript) return;

      // Check for voice commands first
      if (settings.voiceCommandsEnabled) {
        const cmd = detectVoiceCommand(transcript);
        if (cmd) {
          handleVoiceCommand(cmd);
          return;
        }
      }

      calculator.onWordsUpdate(transcript);
      let wps = calculator.getCurrentWPS();

      // Fallback: STT just delivered words but window doesn't have enough
      // entries yet (e.g. right after STT auto-restart). Use baseline so
      // scroll keeps moving instead of freezing until 2nd data point.
      if (wps === 0 && transcript.trim().length > 0) {
        wps = baselineWPS;
      }

      setWPS(wps);

      const speed = mapper.wpsToSpeed(wps);
      engine.setTargetSpeed(speed);
      setLastSpeechTime(Date.now());
    });
  }, [baselineWPS, fontSize, detectedLanguage, settings, setListening, setWPS, setLastSpeechTime]);

  const stopSession = useCallback(() => {
    sttRef.current.stop();
    vadRef.current.stop();
    engineRef.current.stop();
    calculatorRef.current.reset();
    setListening(false);
  }, [setListening]);

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
        reset();
        break;
      case 'slower':
        mapperRef.current.setSpeedMultiplier(
          Math.max(0.3, settings.speedMultiplier - 0.1)
        );
        break;
      case 'faster':
        mapperRef.current.setSpeedMultiplier(
          Math.min(3.0, settings.speedMultiplier + 0.1)
        );
        break;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sttRef.current.stop();
      vadRef.current.stop();
      engineRef.current.stop();
    };
  }, []);

  return {
    startSession,
    stopSession,
    engine: engineRef.current,
  };
}
