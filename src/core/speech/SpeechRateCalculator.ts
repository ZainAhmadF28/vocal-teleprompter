interface WindowEntry {
  time: number;
  wordCount: number;
}

export class SpeechRateCalculator {
  private window: WindowEntry[] = [];

  // ===========================================================================
  // TUNING KNOBS — ubah 2 angka ini buat fine-tune deteksi WPS.
  // ===========================================================================

  /**
   * Window waktu (ms) buat hitung WPS. Update transcript dalam window ini
   * dipakai hitung kecepatan kata/detik.
   *
   * - 600-1000 = responsif perubahan kecepatan, tapi WPS bisa jittery.
   * - 1200-1500 = balance.
   * - 2000-3000 = halus, tapi lag kerasa pas user ubah kecepatan.
   *
   * Sekarang: 1200.
   */
  private readonly WINDOW_SIZE_MS = 1200;

  /**
   * Kalau update STT terakhir > STALE_MS lalu, getCurrentWPS() return 0
   * (auto-detect "user diam"). Kombinasi sama PAUSE_GRACE_MS di ScrollEngine
   * nentuin total stop time.
   *
   * - 300-500 = cepat detect diam, tapi BISA stuck kalau STT restart pas
   *   user lagi ngomong.
   * - 600-800 = balance.
   * - 1000+ = forgiving banget, tapi delay detect.
   *
   * Sekarang: 600.
   */
  private readonly STALE_MS = 600;

  // ===========================================================================
  // END TUNING KNOBS
  // ===========================================================================

  onWordsUpdate(transcript: string): void {
    const words = transcript.trim().split(/\s+/).filter(Boolean).length;
    const now = Date.now();

    this.window.push({ time: now, wordCount: words });

    while (this.window.length > 0 && this.window[0].time < now - this.WINDOW_SIZE_MS) {
      this.window.shift();
    }
  }

  getCurrentWPS(): number {
    if (this.window.length < 2) return 0;

    const last = this.window[this.window.length - 1];
    if (Date.now() - last.time > this.STALE_MS) return 0;

    const first = this.window[0];
    const deltaWords = last.wordCount - first.wordCount;
    const deltaSec = (last.time - first.time) / 1000;

    if (deltaSec === 0) return 0;
    return Math.max(0, deltaWords / deltaSec);
  }

  reset(): void {
    this.window = [];
  }
}
