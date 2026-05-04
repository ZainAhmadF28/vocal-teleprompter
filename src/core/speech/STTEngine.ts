import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import type { EventSubscription } from 'expo-modules-core';

export class STTEngine {
  private isActive = false;
  private currentLang = 'id-ID';
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private resultSub: EventSubscription | null = null;
  private endSub: EventSubscription | null = null;

  async start(
    lang: string,
    onResult: (transcript: string, isFinal: boolean) => void
  ): Promise<void> {
    this.currentLang = lang;
    this.isActive = true;
    this.onResultCallback = onResult;

    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) throw new Error('Microphone permission denied');

    this._attachListeners(onResult);

    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: true,
    });
  }

  private _attachListeners(
    onResult: (transcript: string, isFinal: boolean) => void
  ) {
    this.resultSub?.remove();
    this.endSub?.remove();

    this.resultSub = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event: ExpoSpeechRecognitionResultEvent) => {
        const transcript = event.results[0]?.transcript ?? '';
        const isFinal = event.isFinal ?? false;
        onResult(transcript, isFinal);
      }
    );

    this.endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
      if (this.isActive && this.onResultCallback) {
        setTimeout(() => {
          if (this.isActive && this.onResultCallback) {
            this._attachListeners(this.onResultCallback);
            ExpoSpeechRecognitionModule.start({
              lang: this.currentLang,
              interimResults: true,
              continuous: true,
            });
          }
        }, 100);
      }
    });
  }

  stop(): void {
    this.isActive = false;
    this.onResultCallback = null;
    this.resultSub?.remove();
    this.endSub?.remove();
    this.resultSub = null;
    this.endSub = null;
    ExpoSpeechRecognitionModule.stop();
  }

  setLanguage(lang: string): void {
    this.currentLang = lang;
  }
}
