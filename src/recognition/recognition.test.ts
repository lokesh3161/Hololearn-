import { describe, test, expect } from 'vitest';
import { ShapeRecognitionEngine } from './ShapeRecognitionEngine';
import type { Point } from './types';

// Helper Generators for Synthetic Point Sets
function generateLinePoints(start: Point, end: Point, count: number = 30): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    points.push({
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    });
  }
  return points;
}

function generateCirclePoints(center: Point, radius: number, count: number = 60): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / (count - 1)) * Math.PI * 2;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
  return points;
}

function generateEllipsePoints(center: Point, rx: number, ry: number, count: number = 60): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / (count - 1)) * Math.PI * 2;
    points.push({
      x: center.x + Math.cos(angle) * rx,
      y: center.y + Math.sin(angle) * ry,
    });
  }
  return points;
}

function generateRectanglePoints(x: number, y: number, w: number, h: number): Point[] {
  const p1 = generateLinePoints({ x, y }, { x: x + w, y }, 15);
  const p2 = generateLinePoints({ x: x + w, y }, { x: x + w, y: y + h }, 15);
  const p3 = generateLinePoints({ x: x + w, y: y + h }, { x, y: y + h }, 15);
  const p4 = generateLinePoints({ x, y: y + h }, { x, y }, 15);
  return [...p1, ...p2, ...p3, ...p4];
}

function generateTrianglePoints(p1: Point, p2: Point, p3: Point): Point[] {
  const l1 = generateLinePoints(p1, p2, 15);
  const l2 = generateLinePoints(p2, p3, 15);
  const l3 = generateLinePoints(p3, p1, 15);
  return [...l1, ...l2, ...l3];
}

function addJitterNoise(points: Point[], amount: number = 2.0): Point[] {
  return points.map((p) => ({
    x: p.x + (Math.random() - 0.5) * amount,
    y: p.y + (Math.random() - 0.5) * amount,
  }));
}

describe('High-Precision Shape Recognition 2.0 Test Suite', () => {
  const engine = new ShapeRecognitionEngine();

  test('1. Horizontal Line should be recognized as line (NOT triangle/circle)', () => {
    const pts = generateLinePoints({ x: 50, y: 100 }, { x: 350, y: 100 });
    const res = engine.recognizeSync({ id: 'test-line-1', points: pts });
    expect(res.status).toBe('recognized');
    expect(res.bestCandidate?.type).toBe('line');
  });

  test('2. Vertical Line should be recognized as line', () => {
    const pts = generateLinePoints({ x: 150, y: 50 }, { x: 150, y: 350 });
    const res = engine.recognizeSync({ id: 'test-line-2', points: pts });
    expect(res.status).toBe('recognized');
    expect(res.bestCandidate?.type).toBe('line');
  });

  test('3. Diagonal Line should be recognized as line', () => {
    const pts = generateLinePoints({ x: 50, y: 50 }, { x: 250, y: 250 });
    const res = engine.recognizeSync({ id: 'test-line-3', points: pts });
    expect(res.status).toBe('recognized');
    expect(res.bestCandidate?.type).toBe('line');
  });

  test('4. Circle should be recognized as circle', () => {
    const pts = generateCirclePoints({ x: 200, y: 200 }, 80);
    const res = engine.recognizeSync({ id: 'test-circle-1', points: pts });
    expect(res.status).toBe('recognized');
    expect(res.bestCandidate?.type).toBe('circle');
  });

  test('5. Rectangle should be recognized as rectangle/square', () => {
    const pts = generateRectanglePoints(100, 100, 200, 120);
    const res = engine.recognizeSync({ id: 'test-rect-1', points: pts });
    expect(res.status).toBe('recognized');
    expect(['rectangle', 'square']).toContain(res.bestCandidate?.type);
  });

  test('6. Square should be recognized as square', () => {
    const pts = generateRectanglePoints(100, 100, 150, 150);
    const res = engine.recognizeSync({ id: 'test-square-1', points: pts });
    expect(res.status).toBe('recognized');
    expect(['square', 'rectangle']).toContain(res.bestCandidate?.type);
  });

  test('7. Triangle should be recognized as triangle', () => {
    const pts = generateTrianglePoints({ x: 200, y: 50 }, { x: 300, y: 250 }, { x: 100, y: 250 });
    const res = engine.recognizeSync({ id: 'test-tri-1', points: pts });
    expect(res.status).toBe('recognized');
    expect(res.bestCandidate?.type).toBe('triangle');
  });

  test('8. Short stroke / tiny scribble should be rejected', () => {
    const pts = [
      { x: 10, y: 10 },
      { x: 12, y: 11 },
      { x: 11, y: 12 },
    ];
    const res = engine.recognizeSync({ id: 'test-short', points: pts });
    expect(res.status).toBe('rejected');
    expect(res.bestCandidate).toBeNull();
  });

  test('9. Random noise squiggle should NOT be recognized as clean shape', () => {
    const pts: Point[] = [];
    for (let i = 0; i < 30; i++) {
      pts.push({ x: 100 + (i % 2 === 0 ? 20 : -20), y: 100 + i * 5 });
    }
    const res = engine.recognizeSync({ id: 'test-noise', points: pts });
    expect(res.status).not.toBe('recognized');
  });

  test('10. Ellipse with 2:1 aspect ratio should be recognized as ellipse', () => {
    const pts = generateEllipsePoints({ x: 200, y: 200 }, 120, 60);
    const res = engine.recognizeSync({ id: 'test-ellipse-1', points: pts });
    expect(res.status).toBe('recognized');
    expect(res.bestCandidate?.type).toBe('ellipse');
  });

  test('11. Noisy circle should tolerate light jitter and remain circle', () => {
    const raw = generateCirclePoints({ x: 200, y: 200 }, 80);
    const pts = addJitterNoise(raw, 2.5);
    const res = engine.recognizeSync({ id: 'test-noisy-circle', points: pts });
    expect(res.status).toBe('recognized');
    expect(res.bestCandidate?.type).toBe('circle');
  });

  test('12. Noisy rectangle should tolerate stylus jitter and remain rectangle', () => {
    const raw = generateRectanglePoints(100, 100, 200, 120);
    const pts = addJitterNoise(raw, 2.0);
    const res = engine.recognizeSync({ id: 'test-noisy-rect', points: pts });
    expect(res.status).toBe('recognized');
    expect(['rectangle', 'square']).toContain(res.bestCandidate?.type);
  });

  test('13. Right-angled triangle should be recognized as triangle', () => {
    const pts = generateTrianglePoints({ x: 100, y: 100 }, { x: 100, y: 300 }, { x: 300, y: 300 });
    const res = engine.recognizeSync({ id: 'test-right-tri', points: pts });
    expect(res.status).toBe('recognized');
    expect(res.bestCandidate?.type).toBe('triangle');
  });

  test('14. Open arc curve should NOT be recognized as closed circle', () => {
    const pts: Point[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 1.2;
      pts.push({ x: 200 + Math.cos(angle) * 80, y: 200 + Math.sin(angle) * 80 });
    }
    const res = engine.recognizeSync({ id: 'test-open-arc', points: pts });
    expect(res.bestCandidate?.type).not.toBe('circle');
  });
});
