import type { Point } from './types';

export class StrokeResampler {
  /**
   * Resamples points along arc-length to produce N uniformly spaced points.
   */
  public static resample(points: Point[], targetCount: number = 128): Point[] {
    if (!points || points.length < 2) return points || [];

    const totalLen = this.totalArcLength(points);
    if (totalLen === 0) return points;

    const interval = totalLen / (targetCount - 1);
    const resampled: Point[] = [{ ...points[0] }];
    let accumulated = 0;
    let currentIdx = 1;
    let workingPts = [...points];

    while (resampled.length < targetCount - 1 && currentIdx < workingPts.length) {
      const prev = workingPts[currentIdx - 1];
      const curr = workingPts[currentIdx];
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);

      if (accumulated + dist >= interval) {
        const t = (interval - accumulated) / (dist || 1);
        const interpolated: Point = {
          x: prev.x + t * (curr.x - prev.x),
          y: prev.y + t * (curr.y - prev.y),
          pressure: prev.pressure !== undefined && curr.pressure !== undefined ? prev.pressure + t * (curr.pressure - prev.pressure) : 0.5,
          timestamp: prev.timestamp,
          pointerType: prev.pointerType,
        };
        resampled.push(interpolated);
        workingPts = [interpolated, ...workingPts.slice(currentIdx)];
        currentIdx = 1;
        accumulated = 0;
      } else {
        accumulated += dist;
        currentIdx++;
      }
    }

    while (resampled.length < targetCount) {
      resampled.push({ ...points[points.length - 1] });
    }

    return resampled.slice(0, targetCount);
  }

  public static totalArcLength(points: Point[]): number {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return len;
  }
}
