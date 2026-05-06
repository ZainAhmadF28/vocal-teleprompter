type PositionCallback = (position: number) => void;

/**
 * Position-based scroll engine — karaoke style.
 *
 * Bukan integrasi kecepatan (yang punya delay/decay problem). Ini langsung
 * smooth-animate dari scrollPosition saat ini ke targetPosition tiap frame.
 *
 * Flow:
 *   1. UI/hook hitung posisi Y dari kata yang sedang/akan diucapin
 *   2. setTargetPosition(y)
 *   3. Engine smooth animate scrollPosition → targetPosition
 *   4. notifySubscribers tiap frame yang berubah
 */

export class ScrollEngine {
  private scrollPosition = 0;
  private targetPosition = 0;
  private isPaused = false;
  private isRunning = false;
  private rafId: number | null = null;
  private subscribers: Set<PositionCallback> = new Set();

  // ===========================================================================
  // TUNING KNOBS — tweak smoothness scroll
  // ===========================================================================

  /**
   * Per-frame interpolation factor. Tiap frame:
   *   scrollPosition += (target - scrollPosition) * SMOOTH_FACTOR
   *
   * - 0.05-0.10 = halus banget tapi lambat sampe (ease-out panjang).
   * - 0.12-0.20 = smooth & responsif (RECOMMENDED).
   * - 0.25-0.40 = cepat snap, bisa kerasa kasar.
   *
   * Sekarang: 0.18
   */
  private readonly SMOOTH_FACTOR = 0.18;

  /** Snap threshold (px) — kalau diff dekat banget, langsung sama target. */
  private readonly SNAP_THRESHOLD = 0.5;

  // ===========================================================================

  setTargetPosition(y: number): void {
    this.targetPosition = Math.max(0, y);
  }

  pause(): void { this.isPaused = true; }
  resume(): void { this.isPaused = false; }

  seekTo(position: number): void {
    this.scrollPosition = Math.max(0, position);
    this.targetPosition = this.scrollPosition;
    this.notifySubscribers();
  }

  subscribe(cb: PositionCallback): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((cb) => cb(this.scrollPosition));
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      const diff = this.targetPosition - this.scrollPosition;
      const absDiff = Math.abs(diff);
      if (absDiff > this.SNAP_THRESHOLD) {
        this.scrollPosition += diff * this.SMOOTH_FACTOR;
        this.notifySubscribers();
      } else if (absDiff > 0) {
        this.scrollPosition = this.targetPosition;
        this.notifySubscribers();
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  reset(): void {
    this.scrollPosition = 0;
    this.targetPosition = 0;
    this.notifySubscribers();
  }

  getPosition(): number { return this.scrollPosition; }
  getTargetPosition(): number { return this.targetPosition; }

  // ---------------------------------------------------------------------------
  // Backward-compat stubs — biar import lama gak break
  // (mode speed-based deprecated, sekarang full position-based)
  // ---------------------------------------------------------------------------
  setTargetSpeed(_s: number): void { /* no-op */ }
  onVADSpeechEnd(): void { /* no-op */ }
  getCurrentSpeed(): number { return 0; }
}
