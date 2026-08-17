import type { Point, ShapeCandidate } from './types';

export class ShapeConverter {
  generateConversionFrames(
    rawPoints: Point[],
    target: ShapeCandidate,
    frameCount: number = 20
  ): Point[][] {
    const targetPoints = this.shapeToPoints(target, 128);
    const frames: Point[][] = [];
    const normalized = this.resampleToCount(rawPoints, 128);

    for (let f = 0; f <= frameCount; f++) {
      const t = this.easeInOut(f / frameCount);
      const frame = normalized.map((p, i) => {
        const tp = targetPoints[i] || p;
        return {
          x: p.x + (tp.x - p.x) * t,
          y: p.y + (tp.y - p.y) * t,
        };
      });
      frames.push(frame);
    }
    return frames;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  shapeToPoints(candidate: ShapeCandidate, n: number): Point[] {
    if (!candidate || !candidate.geometry) {
      return Array.from({ length: n }, () => ({ x: 0, y: 0 }));
    }

    const geo = candidate.geometry;
    switch (geo.type) {
      case 'circle': {
        const cx = geo.centerX ?? 0;
        const cy = geo.centerY ?? 0;
        const r = geo.radius ?? 10;
        return Array.from({ length: n }, (_, i) => ({
          x: cx + r * Math.cos((2 * Math.PI * i) / n),
          y: cy + r * Math.sin((2 * Math.PI * i) / n),
        }));
      }
      case 'ellipse': {
        const cx = geo.centerX ?? 0;
        const cy = geo.centerY ?? 0;
        const rx = geo.radiusX ?? 10;
        const ry = geo.radiusY ?? 10;
        return Array.from({ length: n }, (_, i) => ({
          x: cx + rx * Math.cos((2 * Math.PI * i) / n),
          y: cy + ry * Math.sin((2 * Math.PI * i) / n),
        }));
      }
      case 'rectangle':
      case 'square': {
        const x = geo.x ?? 0;
        const y = geo.y ?? 0;
        const w = Math.max(10, geo.width ?? 20);
        const h = Math.max(10, geo.height ?? 20);
        const perimeter = 2 * (w + h);
        return Array.from({ length: n }, (_, i) => {
          const d = (i / n) * perimeter;
          if (d < w) return { x: x + d, y };
          if (d < w + h) return { x: x + w, y: y + (d - w) };
          if (d < 2 * w + h) return { x: x + w - (d - w - h), y: y + h };
          return { x, y: y + h - (d - 2 * w - h) };
        });
      }
      case 'triangle': {
        const p1 = geo.p1 || { x: 0, y: 0 };
        const p2 = geo.p2 || { x: 50, y: 100 };
        const p3 = geo.p3 || { x: 100, y: 0 };
        const steps = Math.floor(n / 3);
        const sides = [
          ...this.lerp(p1, p2, steps),
          ...this.lerp(p2, p3, steps),
          ...this.lerp(p3, p1, n - steps * 2),
        ];
        return sides.slice(0, n);
      }
      case 'line':
      case 'arrow': {
        const sx = geo.startX ?? 0;
        const sy = geo.startY ?? 0;
        const ex = geo.endX ?? 100;
        const ey = geo.endY ?? 100;
        return Array.from({ length: n }, (_, i) => ({
          x: sx + (ex - sx) * (i / (n - 1)),
          y: sy + (ey - sy) * (i / (n - 1)),
        }));
      }
      default:
        return Array.from({ length: n }, () => ({ x: 0, y: 0 }));
    }
  }

  private resampleToCount(points: Point[], n: number): Point[] {
    if (!points || points.length === 0) return Array.from({ length: n }, () => ({ x: 0, y: 0 }));
    if (points.length < 2) return Array(n).fill(points[0] || { x: 0, y: 0 });

    let totalLen = 0;
    for (let i = 1; i < points.length; i++) {
      totalLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    const interval = totalLen / (n - 1);
    const result: Point[] = [points[0]];
    let accumulated = 0;

    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      if (accumulated + d >= interval) {
        const t = (interval - accumulated) / (d || 1);
        const newPoint = {
          x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
          y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
        };
        result.push(newPoint);
        accumulated = 0;
      } else {
        accumulated += d;
      }
    }

    while (result.length < n) {
      result.push(points[points.length - 1]);
    }
    return result.slice(0, n);
  }

  private lerp(a: Point, b: Point, steps: number): Point[] {
    const count = Math.max(1, Math.floor(steps));
    return Array.from({ length: count }, (_, i) => ({
      x: a.x + (b.x - a.x) * (i / count),
      y: a.y + (b.y - a.y) * (i / count),
    }));
  }
}
