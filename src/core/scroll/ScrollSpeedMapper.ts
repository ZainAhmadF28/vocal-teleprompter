export class ScrollSpeedMapper {
  private readonly MIN_SPEED = 5;
  private readonly MAX_SPEED = 200;

  constructor(
    private baselineWPS: number,
    private pixelsPerWord: number,
    private speedMultiplier = 1.0
  ) {}

  wpsToSpeed(currentWPS: number): number {
    if (currentWPS <= 0) return 0;

    const speed = currentWPS * this.pixelsPerWord * this.speedMultiplier;
    return Math.max(this.MIN_SPEED, Math.min(this.MAX_SPEED, speed));
  }

  setBaselineWPS(wps: number): void {
    this.baselineWPS = wps;
  }

  setSpeedMultiplier(m: number): void {
    this.speedMultiplier = m;
  }

  setPixelsPerWord(ppw: number): void {
    this.pixelsPerWord = ppw;
  }

  getBaselineWPS(): number {
    return this.baselineWPS;
  }
}

export function estimatePixelsPerWord(fontSize: number): number {
  // Rough estimate: average word width ≈ 0.5 × fontSize × 5 chars + spacing
  return fontSize * 0.6 * 4;
}
