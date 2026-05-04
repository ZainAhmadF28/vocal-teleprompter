type PositionCallback = (position: number) => void;

export class ScrollEngine {
  private currentSpeed = 0;
  private targetSpeed = 0;
  private scrollPosition = 0;
  private lastSpeechTime = Date.now();
  private isPaused = false;
  private isRunning = false;
  private rafId: number | null = null;
  private subscribers: Set<PositionCallback> = new Set();
  private lastFrameTime = 0;

  // ===========================================================================
  // TUNING KNOBS — ubah 4 angka di bawah untuk fine-tune behavior scroll.
  // Save file → Metro auto-reload, langsung kerasa di HP (no rebuild needed).
  // ===========================================================================

  /**
   * Berapa lama (ms) tunggu sebelum scroll mulai berhenti setelah event suara
   * terakhir dari STT.
   *
   * - 200-300 = stop super cepat, tapi BISA STUTTER karena gap normal antar
   *   event STT Android itu 200-500ms (scroll bakal cycle on/off antar event).
   * - 350-500 = balance — toleran gap STT, stop wajar.
   * - 600-800 = halus banget tapi delay stop kerasa lama.
   *
   * Sekarang: 350 (default agresif).
   */
  private readonly PAUSE_GRACE_MS = 200;

  /**
   * Faktor deselerasi per frame (~16.67ms). targetSpeed *= DECAY_RATE tiap
   * frame setelah PAUSE_GRACE_MS terlewat.
   *
   * - 0.6-0.75 = stop kayak rem mendadak (~50-150ms full stop setelah grace).
   * - 0.80-0.88 = stop lumayan cepat (~150-300ms full stop setelah grace).
   * - 0.90-0.95 = stop pelan & smooth (~400-700ms full stop setelah grace).
   *
   * Sekarang: 0.0 (rem mendadak setelah 200ms).
   */
  private readonly DECAY_RATE = 0.0;

  /**
   * Smoothing factor — seberapa cepat currentSpeed nge-follow targetSpeed.
   * Makin besar = makin responsif tapi bisa jittery.
   *
   * - 0.1-0.18 = halus banget, tapi laggy kerasa.
   * - 0.2-0.3 = balance.
   * - 0.35-0.5 = responsif, bisa kerasa kasar.
   *
   * Sekarang: 0.8 (current speed langsung mengikuti target speed saat direm).
   */
  private readonly EMA_ALPHA = 0.8;

  /**
   * Ambang batas snap-to-zero — kalau speed udah di bawah ini & target=0,
   * langsung jadi 0 biar gak ngambang dekat-0.
   *
   * Biasanya gak perlu diubah. Range wajar: 0.3-1.0.
   */
  private readonly STOP_THRESHOLD = 2.0;

  // ===========================================================================
  // END TUNING KNOBS
  // ===========================================================================

  setTargetSpeed(speed: number): void {
    this.targetSpeed = speed;
    this.lastSpeechTime = Date.now();
  }

  onVADSpeechEnd(): void {
    this.targetSpeed = 0;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  seekTo(position: number): void {
    this.scrollPosition = position;
    this.notifySubscribers();
  }

  subscribe(cb: PositionCallback): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((cb) => cb(this.scrollPosition));
  }

  private tick = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaMs = this.lastFrameTime ? timestamp - this.lastFrameTime : 16.67;
    this.lastFrameTime = timestamp;
    const deltaSec = Math.min(deltaMs / 1000, 0.05); // cap at 50ms to avoid jumps

    if (!this.isPaused) {
      const timeSinceSpeech = Date.now() - this.lastSpeechTime;

      if (timeSinceSpeech > this.PAUSE_GRACE_MS) {
        this.targetSpeed *= this.DECAY_RATE;
        if (this.targetSpeed < this.STOP_THRESHOLD) this.targetSpeed = 0;
      }

      this.currentSpeed =
        this.currentSpeed * (1 - this.EMA_ALPHA) +
        this.targetSpeed * this.EMA_ALPHA;

      if (this.currentSpeed < this.STOP_THRESHOLD && this.targetSpeed === 0) {
        this.currentSpeed = 0;
      }

      if (this.currentSpeed > 0.1) {
        this.scrollPosition += this.currentSpeed * deltaSec;
        this.notifySubscribers();
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.currentSpeed = 0;
    this.targetSpeed = 0;
  }

  reset(): void {
    this.scrollPosition = 0;
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.notifySubscribers();
  }

  getPosition(): number {
    return this.scrollPosition;
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }
}
