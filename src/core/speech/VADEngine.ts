/**
 * VAD stub — disabled for MVP.
 * Pause detection is handled by ScrollEngine's decay logic (PAUSE_GRACE_MS).
 * Re-add a VAD library in a future sprint if faster pause response is needed.
 */
export class VADEngine {
  async start(
    _onVoiceStart: () => void,
    _onVoiceEnd: () => void,
    _sensitivity = 0.5
  ): Promise<void> {
    // no-op
  }

  stop(): void {
    // no-op
  }
}
