/**
 * Match spoken transcript against the script text — karaoke-style.
 *
 * Tiap kali STT delivery transcript baru, matcher cari posisi kata terakhir
 * yang diucapin di dalam script (di window setelah currentIndex).
 * Kalau ketemu, currentIndex maju.
 *
 * Toleransi:
 *  - Lowercase + strip tanda baca
 *  - Edit-distance ≤ 1 untuk kata ≥ 4 huruf (tahan typo STT)
 *  - Prefix match ≥ 3 huruf (tahan affix Bahasa Indonesia: "makan" vs "makanan")
 */

export interface ScriptWord {
  original: string;   // kata asli dengan tanda baca
  normalized: string; // lowercase, no punctuation
}

export class TextMatcher {
  private words: ScriptWord[];
  private currentIndex = -1;

  // ===========================================================================
  // TUNING KNOBS — tweak fuzzy matching behavior
  // ===========================================================================

  /**
   * Berapa kata ke depan dari currentIndex yang di-search untuk match.
   * - Kecil (5-10) = strict, user harus baca berurutan
   * - Besar (20-40) = lenient, user bisa skip beberapa kata
   * Default 25, bisa di-override via `setSensitivity()` (low=15, med=25, high=40).
   */
  private LOOKAHEAD_WORDS = 25;

  /**
   * Berapa kata terakhir dari transcript yang dipakai sebagai context match.
   * Lebih banyak = match lebih reliable tapi lebih lama process.
   * Sekarang: 4
   */
  private readonly RECENT_CONTEXT = 4;

  // ===========================================================================

  constructor(scriptText: string) {
    this.words = this.tokenize(scriptText);
  }

  /**
   * Process new STT transcript. Coba majukan currentIndex kalau ketemu match.
   * Returns currentIndex (mungkin sama, mungkin maju, gak pernah mundur).
   *
   * Algoritma:
   *   1. Iterasi FORWARD dari currentIndex+1 → prefer match TERDEKAT
   *      (assumption: user baca berurutan, bukan loncat-loncat)
   *   2. Score = berapa banyak kata context (selain anchor) yang juga match
   *      di posisi sebelumnya di script
   *   3. Acceptance threshold tergantung distance:
   *      - distance ≤ 2 (sequential reading) → terima match anchor doang
   *      - distance 3-7 (medium jump)        → butuh ≥ 1 context word
   *      - distance ≥ 8 (long jump)          → butuh ≥ 2 context words
   *      Ini cegah loncat ke kata yang sama di tempat lain karena
   *      transcript pendek (mis. setelah STT restart cuma 1 kata).
   */
  processTranscript(transcript: string): number {
    const spoken = transcript
      .split(/\s+/)
      .map((w) => this.normalize(w))
      .filter(Boolean);

    if (spoken.length === 0) return this.currentIndex;

    const searchStart = Math.max(0, this.currentIndex + 1);
    const searchEnd = Math.min(this.words.length, searchStart + this.LOOKAHEAD_WORDS);
    if (searchStart >= searchEnd) return this.currentIndex;

    const recent = spoken.slice(-this.RECENT_CONTEXT);
    const anchor = recent[recent.length - 1];

    let bestIndex = this.currentIndex;

    for (let i = searchStart; i < searchEnd; i++) {
      if (!this.wordsMatch(anchor, this.words[i].normalized)) continue;

      // Score by how many prior context words also align (sequential)
      let score = 0;
      const maxContext = Math.min(recent.length - 1, 3);
      for (let k = 1; k <= maxContext; k++) {
        const spokenAtK = recent[recent.length - 1 - k];
        const scriptIdx = i - k;
        if (scriptIdx < 0) break;
        if (this.wordsMatch(spokenAtK, this.words[scriptIdx].normalized)) {
          score++;
        } else {
          break; // stop di mismatch pertama (context harus berurutan)
        }
      }

      const distance = i - searchStart;
      const requiredScore = distance <= 2 ? 0 : distance <= 7 ? 1 : 2;

      if (score >= requiredScore) {
        bestIndex = i;
        break; // first valid forward match wins (nearest)
      }
    }

    if (bestIndex > this.currentIndex) {
      this.currentIndex = bestIndex;
    }
    return this.currentIndex;
  }

  getCurrentIndex(): number { return this.currentIndex; }
  getWords(): ScriptWord[] { return this.words; }
  getWordCount(): number { return this.words.length; }

  reset(): void {
    this.currentIndex = -1;
  }

  setScript(text: string): void {
    this.words = this.tokenize(text);
    this.currentIndex = -1;
  }

  /** Manual seek (mis. user pause + tap kata buat reposisi) */
  seekToWord(index: number): void {
    this.currentIndex = Math.max(-1, Math.min(this.words.length - 1, index));
  }

  /** Adjust lookahead range based on sensitivity (low=strict, high=lenient) */
  setSensitivity(level: 'low' | 'medium' | 'high'): void {
    this.LOOKAHEAD_WORDS = level === 'low' ? 15 : level === 'high' ? 40 : 25;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private tokenize(text: string): ScriptWord[] {
    const result: ScriptWord[] = [];
    const wordRegex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = wordRegex.exec(text)) !== null) {
      result.push({
        original: match[0],
        normalized: this.normalize(match[0]),
      });
    }
    return result;
  }

  private normalize(word: string): string {
    return word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  }

  private wordsMatch(spoken: string, script: string): boolean {
    if (!spoken || !script) return false;
    if (spoken === script) return true;
    if (spoken.length >= 4 && script.length >= 4 && this.isEditDistanceAtMost1(spoken, script)) {
      return true;
    }
    if (spoken.length >= 3 && script.startsWith(spoken)) return true;
    if (script.length >= 3 && spoken.startsWith(script)) return true;
    return false;
  }

  private isEditDistanceAtMost1(a: string, b: string): boolean {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;

    if (a.length === b.length) {
      let diffs = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i] && ++diffs > 1) return false;
      }
      return true;
    }

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    let i = 0, j = 0, diffs = 0;
    while (i < longer.length && j < shorter.length) {
      if (longer[i] === shorter[j]) {
        i++; j++;
      } else {
        i++;
        if (++diffs > 1) return false;
      }
    }
    return true;
  }
}
