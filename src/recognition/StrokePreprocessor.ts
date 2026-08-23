import type { Point } from './types';

export class StrokePreprocessor {
  private static readonly MIN_DIST = 1.2;

  /**
   * Preprocesses raw input points by removing duplicates, stationary points, and light jitter.
   */
  public static preprocess(rawPoints: Point[]): Point[] {
    if (!rawPoints || rawPoints.length < 2) return rawPoints || [];

    // Step 1: Remove stationary / duplicate points
    const deduped: Point[] = [rawPoints[0]];
    for (let i = 1; i < rawPoints.length; i++) {
      const prev = deduped[deduped.length - 1];
      const curr = rawPoints[i];
      const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      if (d >= this.MIN_DIST) {
        deduped.push(curr);
      }
    }

    if (deduped.length < 3) return deduped;

    // Step 2: Smooth high-frequency noise using weighted 3-point moving average
    const smoothed: Point[] = [deduped[0]];
    for (let i = 1; i < deduped.length - 1; i++) {
      const prev = deduped[i - 1];
      const curr = deduped[i];
      const next = deduped[i + 1];
      smoothed.push({
        x: prev.x * 0.25 + curr.x * 0.5 + next.x * 0.25,
        y: prev.y * 0.25 + curr.y * 0.5 + next.y * 0.25,
        pressure: curr.pressure,
        timestamp: curr.timestamp,
        pointerType: curr.pointerType,
      });
    }
    smoothed.push(deduped[deduped.length - 1]);

    return smoothed;
  }
}
