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
  private velocity = 0;
  private lastTickTime = 0;
  private isPaused = false;
  private isRunning = false;
  private rafId: number | null = null;
  private subscribers: Set<PositionCallback> = new Set();

  // ===========================================================================
  // TUNING KNOBS — critically-damped spring (smooth voice mode catch-up)
  // ===========================================================================

  /**
   * Spring stiffness. Higher = faster catch-up.
   *  - 120  : slow, very smooth (~450ms settle)
   *  - 200  : balanced (~300ms settle)        ← default
   *  - 320  : snappy (~220ms settle)
   *  - 500+ : near-instant, can feel jumpy on burst targets
   */
  private readonly STIFFNESS = 200;

  /**
   * Damping ratio. ~2*sqrt(STIFFNESS) = critical damping (no overshoot).
   *  - Critical: 2*sqrt(200) ≈ 28.3 → settle clean
   *  - Lower    : underdamped → overshoot (bad untuk teleprompter)
   *  - Higher   : overdamped → sluggish ending
   */
  private readonly DAMPING = 28;

  /** Settle thresholds — kalau pos & vel udah dekat banget, snap & idle. */
  private readonly REST_DISTANCE = 0.5;
  private readonly REST_VELOCITY = 1.0;

  /** Max dt clamp untuk frame drops — supaya gak ngeloncat tiba2 abis lag spike. */
  private readonly MAX_DT = 1 / 30;
  private readonly MIN_DT = 1 / 240;

  // ===========================================================================

  setTargetPosition(y: number): void {
    this.targetPosition = Math.max(0, y);
  }

  pause(): void { this.isPaused = true; }
  resume(): void {
    this.isPaused = false;
    // Reset waktu supaya dt frame berikutnya wajar (bukan jeda pause yg gede).
    this.lastTickTime = 0;
  }

  seekTo(position: number): void {
    this.scrollPosition = Math.max(0, position);
    this.targetPosition = this.scrollPosition;
    this.velocity = 0;
    this.lastTickTime = 0;
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

  private tick = (timestamp: number): void => {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      const dtRaw = this.lastTickTime === 0 ? 1 / 60 : (timestamp - this.lastTickTime) / 1000;
      const dt = Math.min(this.MAX_DT, Math.max(this.MIN_DT, dtRaw));
      this.lastTickTime = timestamp;

      const diff = this.targetPosition - this.scrollPosition;
      const settled =
        Math.abs(diff) < this.REST_DISTANCE && Math.abs(this.velocity) < this.REST_VELOCITY;

      if (settled) {
        if (this.scrollPosition !== this.targetPosition || this.velocity !== 0) {
          this.scrollPosition = this.targetPosition;
          this.velocity = 0;
          this.notifySubscribers();
        }
      } else {
        // Critically-damped spring: a = k*x - c*v
        const accel = diff * this.STIFFNESS - this.velocity * this.DAMPING;
        this.velocity += accel * dt;
        this.scrollPosition += this.velocity * dt;
        this.notifySubscribers();
      }
    } else {
      // Pause: jangan akumulasi waktu.
      this.lastTickTime = 0;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTickTime = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.isRunning = false;
    this.lastTickTime = 0;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  reset(): void {
    this.scrollPosition = 0;
    this.targetPosition = 0;
    this.velocity = 0;
    this.lastTickTime = 0;
    this.notifySubscribers();
  }

  getPosition(): number { return this.scrollPosition; }
  getTargetPosition(): number { return this.targetPosition; }
  getVelocity(): number { return this.velocity; }

  // ---------------------------------------------------------------------------
  // Backward-compat stubs — biar import lama gak break
  // (mode speed-based deprecated, sekarang full position-based)
  // ---------------------------------------------------------------------------
  setTargetSpeed(_s: number): void { /* no-op */ }
  onVADSpeechEnd(): void { /* no-op */ }
  getCurrentSpeed(): number { return 0; }
}
