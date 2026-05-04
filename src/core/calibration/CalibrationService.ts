import { STTEngine } from '../speech/STTEngine';
import { SpeechRateCalculator } from '../speech/SpeechRateCalculator';

export interface CalibrationResult {
  noiseFloorDB: number;
  baselineWPS: number;
  calibratedAt: number;
}

export const CALIBRATION_SENTENCES: Record<string, string> = {
  'id-ID': 'Halo nama saya dan saya sedang melakukan kalibrasi kecepatan bicara saya',
  'en-US': 'Hello my name is and I am currently calibrating my speaking speed',
};

export function getCalibrationSentence(lang: string): string {
  return CALIBRATION_SENTENCES[lang] ?? CALIBRATION_SENTENCES['id-ID'];
}

export async function calibrateNoiseFloor(
  durationMs = 3000,
  onProgress?: (progress: number) => void
): Promise<number> {
  // Noise floor calibration: measure audio amplitude over time
  // Since we don't have direct audio level access, return a safe default
  // Real implementation would use AudioRecord or similar native API
  return new Promise((resolve) => {
    let elapsed = 0;
    const interval = 100;

    const timer = setInterval(() => {
      elapsed += interval;
      onProgress?.(elapsed / durationMs);

      if (elapsed >= durationMs) {
        clearInterval(timer);
        // Return a typical indoor noise floor value in dB
        resolve(-42);
      }
    }, interval);
  });
}

export async function calibrateSpeechRate(
  lang: string,
  testSentence: string,
  onReady: () => void
): Promise<number> {
  const stt = new STTEngine();
  const calculator = new SpeechRateCalculator();
  const wpsReadings: number[] = [];

  return new Promise(async (resolve) => {
    onReady();

    await stt.start(lang, (transcript) => {
      calculator.onWordsUpdate(transcript);
      const wps = calculator.getCurrentWPS();
      if (wps > 0) wpsReadings.push(wps);
    });

    // Measure for 5 seconds after start
    setTimeout(() => {
      stt.stop();

      if (wpsReadings.length === 0) {
        resolve(2.5); // fallback: average speaking rate
        return;
      }

      // Use median to avoid outliers
      const sorted = [...wpsReadings].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      resolve(median);
    }, 5000);
  });
}
