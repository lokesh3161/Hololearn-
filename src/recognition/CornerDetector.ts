import type { Point } from './types';

export class CornerDetector {
  /**
   * Detects dominant geometric corners in a stroke while suppressing stylus jitter noise.
   */
  public static detectCorners(points: Point[], diagonal: number): Point[] {
    const n = points.length;
    if (n < 12) return [];

    const windowSize = Math.max(3, Math.floor(n / 20));
    const curvatures: number[] = [];

    for (let i = 0; i < n; i++) {
      const prev = points[(i - windowSize + n) % n];
      const curr = points[i];
      const next = points[(i + windowSize) % n];

      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };

      const cross = v1.x * v2.y - v1.y * v2.x;
      const dot = v1.x * v2.x + v1.y * v2.y;
      curvatures.push(Math.abs(Math.atan2(cross, dot)));
    }

    // Smooth curvatures to suppress high-frequency stylus noise
    const smoothedCurvatures = curvatures.map((c, i) => {
      const p1 = curvatures[(i - 2 + n) % n];
      const p2 = curvatures[(i - 1 + n) % n];
      const n1 = curvatures[(i + 1) % n];
      const n2 = curvatures[(i + 2) % n];
      return (p1 + p2 + c + n1 + n2) / 5;
    });

    const mean = smoothedCurvatures.reduce((s, c) => s + c, 0) / n;
    const variance = smoothedCurvatures.reduce((s, c) => s + (c - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Uniform curvature around loop (circle/ellipse) -> NO sharp corners!
    if (cv < 0.22) return [];

    const threshold = 0.35; // ~20 degrees
    const minGap = Math.max(3, Math.floor(n / 14));
    const rawCorners: Point[] = [];

    for (let i = 0; i < n; i++) {
      if (smoothedCurvatures[i] < threshold) continue;

      let isMax = true;
      for (let offset = -minGap; offset <= minGap; offset++) {
        if (offset === 0) continue;
        const j = (i + offset + n) % n;
        if (smoothedCurvatures[j] > smoothedCurvatures[i]) {
          isMax = false;
          break;
        }
      }
      if (isMax) rawCorners.push(points[i]);
    }

    return this.mergeNearbyCorners(rawCorners, Math.max(12, diagonal * 0.08));
  }

  public static mergeNearbyCorners(corners: Point[], threshold: number): Point[] {
    const merged: Point[] = [];
    const used = new Set<number>();

    for (let i = 0; i < corners.length; i++) {
      if (used.has(i)) continue;
      const group = [corners[i]];
      for (let j = i + 1; j < corners.length; j++) {
        if (!used.has(j) && Math.hypot(corners[i].x - corners[j].x, corners[i].y - corners[j].y) < threshold) {
          group.push(corners[j]);
          used.add(j);
        }
      }
      merged.push({
        x: group.reduce((s, p) => s + p.x, 0) / group.length,
        y: group.reduce((s, p) => s + p.y, 0) / group.length,
      });
      used.add(i);
    }
    return merged;
  }
}
