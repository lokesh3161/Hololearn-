import type { Point, RecognizedShapeType, ShapeCandidate, ShapeGeometry } from './types';

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function pct(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function noMatch(type: RecognizedShapeType): ShapeCandidate {
  return {
    type,
    confidence: 0,
    label: '',
    geometry: { type } as ShapeGeometry,
  };
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
