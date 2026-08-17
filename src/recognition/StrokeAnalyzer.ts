import type { Point, StrokeMetrics, BoundingBox } from './types';

export class StrokeAnalyzer {
  // MINIMUM POINTS REQUIRED
  private readonly MIN_POINTS = 8;

  analyze(rawPoints: Point[]): StrokeMetrics {
    if (rawPoints.length < this.MIN_POINTS) {
      return this.emptyMetrics(rawPoints);
    }

    // STEP 1: Remove duplicate/stationary points
    const deduped = this.deduplicate(rawPoints, 1.5);

    // STEP 2: Smooth noise (light running average, window=1)
    const smoothed = this.smooth(deduped, 1);

    // STEP 3: Resample to exactly 128 uniformly spaced points
    const resampled = this.resample(smoothed, 128);

    // STEP 4: Compute bounding box on smoothed points
    const bbox = this.boundingBox(resampled);

    // STEP 5: Scale-normalize for classifiers
    const normalized = this.normalize(resampled, bbox);

    // STEP 6: Compute metrics
    const totalLength = this.arcLength(resampled);
    const start = resampled[0];
    const end = resampled[resampled.length - 1];

    // Closure: handles overlapped loops (1.25 turns) and slightly open strokes
    const diag = Math.sqrt(bbox.width ** 2 + bbox.height ** 2);
    const closureDistance = this.computeClosureDistance(resampled);
    const closureRatio = diag > 0 ? closureDistance / diag : 1;
    const isClosed = closureRatio < 0.28; // 28% of diagonal

    // Aspect ratio with safety
    const aspectRatio = bbox.height > 5 ? bbox.width / bbox.height : 1;

    return {
      points: resampled,
      normalizedPoints: normalized,
      boundingBox: bbox,
      totalLength,
      startPoint: start,
      endPoint: end,
      isClosed,
      closureDistance,
      closureRatio,
      pointCount: resampled.length,
      aspectRatio,
      diagonal: diag,
    };
  }

  private computeClosureDistance(points: Point[]): number {
    if (points.length < 8) {
      const p1 = points[0] ?? { x: 0, y: 0 };
      const p2 = points[points.length - 1] ?? { x: 0, y: 0 };
      return this.dist(p1, p2);
    }

    const n = points.length;
    const start = points[0];
    const end = points[n - 1];

    let minDist = this.dist(start, end);

    // Check overlap: does end point touch earlier points near start?
    const headSlice = Math.floor(n * 0.35);
    for (let i = 0; i < headSlice; i++) {
      const d = this.dist(end, points[i]);
      if (d < minDist) minDist = d;
    }

    // Check overlap: does start point touch later points near end?
    const tailSlice = Math.floor(n * 0.65);
    for (let i = tailSlice; i < n; i++) {
      const d = this.dist(start, points[i]);
      if (d < minDist) minDist = d;
    }

    return minDist;
  }

  private deduplicate(points: Point[], minDist: number): Point[] {
    if (points.length === 0) return [];
    const result = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (this.dist(points[i], result[result.length - 1]) >= minDist) {
        result.push(points[i]);
      }
    }
    return result;
  }

  private smooth(points: Point[], window: number): Point[] {
    if (points.length <= window * 2) return points;
    return points.map((p, i) => {
      const start = Math.max(0, i - window);
      const end = Math.min(points.length - 1, i + window);
      const slice = points.slice(start, end + 1);
      return {
        x: slice.reduce((s, p) => s + p.x, 0) / slice.length,
        y: slice.reduce((s, p) => s + p.y, 0) / slice.length,
      };
    });
  }

  private resample(points: Point[], targetCount: number): Point[] {
    if (points.length < 2) return points;

    const totalLen = this.arcLength(points);
    if (totalLen === 0) return points;

    const interval = totalLen / (targetCount - 1);
    const result: Point[] = [{ ...points[0] }];
    let accumulated = 0;
    let i = 1;
    let currentPoints = [...points];

    while (result.length < targetCount - 1 && i < currentPoints.length) {
      const segLen = this.dist(currentPoints[i - 1], currentPoints[i]);

      if (accumulated + segLen >= interval) {
        const t = (interval - accumulated) / (segLen || 1);
        const newPt: Point = {
          x: currentPoints[i - 1].x + t * (currentPoints[i].x - currentPoints[i - 1].x),
          y: currentPoints[i - 1].y + t * (currentPoints[i].y - currentPoints[i - 1].y),
        };
        result.push(newPt);
        currentPoints = [newPt, ...currentPoints.slice(i)];
        i = 1;
        accumulated = 0;
      } else {
        accumulated += segLen;
        i++;
      }
    }

    while (result.length < targetCount) {
      result.push({ ...currentPoints[currentPoints.length - 1] });
    }

    return result.slice(0, targetCount);
  }

  private normalize(points: Point[], bbox: BoundingBox): Point[] {
    const { x, y, width, height } = bbox;
    const scale = Math.max(width, height, 1);
    return points.map((p) => ({
      x: (p.x - x) / scale,
      y: (p.y - y) / scale,
    }));
  }

  boundingBox(points: Point[]): BoundingBox {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 10),
      height: Math.max(maxY - minY, 10),
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  arcLength(points: Point[]): number {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += this.dist(points[i - 1], points[i]);
    }
    return len;
  }

  dist(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private emptyMetrics(points: Point[]): StrokeMetrics {
    const bbox =
      points.length > 0
        ? this.boundingBox(points)
        : { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    return {
      points,
      normalizedPoints: points,
      boundingBox: bbox,
      totalLength: 0,
      startPoint: points[0] ?? { x: 0, y: 0 },
      endPoint: points[points.length - 1] ?? { x: 0, y: 0 },
      isClosed: false,
      closureDistance: 0,
      closureRatio: 1,
      pointCount: points.length,
      aspectRatio: 1,
      diagonal: 0,
    };
  }
}
