import type { Point, StrokeMetrics, RecognitionFeatures, BoundingBox } from './types';
import { StrokePreprocessor } from './StrokePreprocessor';
import { StrokeResampler } from './StrokeResampler';
import { CornerDetector } from './CornerDetector';

export class FeatureExtractor {
  public static extract(rawPoints: Point[]): { metrics: StrokeMetrics; features: RecognitionFeatures } {
    const preprocessed = StrokePreprocessor.preprocess(rawPoints);
    const resampled = StrokeResampler.resample(preprocessed, 128);

    const bbox = this.computeBoundingBox(resampled);
    const diagonal = Math.hypot(bbox.width, bbox.height);
    const totalLength = StrokeResampler.totalArcLength(resampled);

    const startPoint = resampled[0] ?? { x: 0, y: 0 };
    const endPoint = resampled[resampled.length - 1] ?? { x: 0, y: 0 };

    const closureDistance = this.computeClosureDistance(resampled);
    const closureRatio = diagonal > 0 ? closureDistance / diagonal : 1;
    const isClosed = closureRatio < 0.28;

    const directLength = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    const straightness = totalLength > 0 ? Math.min(1.0, directLength / totalLength) : 0;

    const corners = CornerDetector.detectCorners(resampled, diagonal);
    const cornerCount = corners.length;

    // Radial Residuals & Circularity Metrics
    const distances = resampled.map((p) => Math.hypot(p.x - bbox.centerX, p.y - bbox.centerY));
    const meanRadius = distances.reduce((s, d) => s + d, 0) / (distances.length || 1);
    const radialVariance = distances.reduce((s, d) => s + (d - meanRadius) ** 2, 0) / (distances.length || 1);
    const radialError = meanRadius > 0 ? Math.sqrt(radialVariance) / meanRadius : 1.0;
    const circularity = Math.max(0, 1.0 - radialError * 4.0);

    const aspectRatio = bbox.height > 5 ? bbox.width / bbox.height : 1.0;

    const normalizedPoints = resampled.map((p) => ({
      x: (p.x - bbox.x) / (diagonal || 1),
      y: (p.y - bbox.y) / (diagonal || 1),
    }));

    const metrics: StrokeMetrics = {
      points: resampled,
      normalizedPoints,
      boundingBox: bbox,
      totalLength,
      startPoint,
      endPoint,
      isClosed,
      closureDistance,
      closureRatio,
      pointCount: resampled.length,
      aspectRatio,
      diagonal,
    };

    const features: RecognitionFeatures = {
      closureRatio,
      isClosed,
      straightness,
      circularity,
      cornerCount,
      aspectRatio,
      radialError,
      angleQuality: 0.85,
      parallelism: 0.85,
      diagonal,
      totalLength,
    };

    return { metrics, features };
  }

  private static computeClosureDistance(points: Point[]): number {
    if (points.length < 8) {
      const p1 = points[0] ?? { x: 0, y: 0 };
      const p2 = points[points.length - 1] ?? { x: 0, y: 0 };
      return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    const n = points.length;
    const start = points[0];
    const end = points[n - 1];

    let minDist = Math.hypot(start.x - end.x, start.y - end.y);

    const headSlice = Math.floor(n * 0.35);
    for (let i = 0; i < headSlice; i++) {
      const d = Math.hypot(end.x - points[i].x, end.y - points[i].y);
      if (d < minDist) minDist = d;
    }

    const tailSlice = Math.floor(n * 0.65);
    for (let i = tailSlice; i < n; i++) {
      const d = Math.hypot(start.x - points[i].x, start.y - points[i].y);
      if (d < minDist) minDist = d;
    }

    return minDist;
  }

  private static computeBoundingBox(points: Point[]): BoundingBox {
    if (!points || points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const width = Math.max(maxX - minX, 5);
    const height = Math.max(maxY - minY, 5);

    return {
      x: minX,
      y: minY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2,
    };
  }
}
