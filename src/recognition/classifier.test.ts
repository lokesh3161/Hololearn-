import type { Point } from './types';
import { StrokeAnalyzer } from './StrokeAnalyzer';
import { GeometryClassifier } from './GeometryClassifier';

const analyzer = new StrokeAnalyzer();
const classifier = new GeometryClassifier();

// Test helpers
export function circlePoints(
  cx: number,
  cy: number,
  r: number,
  noise: number = 0,
  n: number = 60
): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return {
      x: cx + r * Math.cos(a) + (Math.random() - 0.5) * noise,
      y: cy + r * Math.sin(a) + (Math.random() - 0.5) * noise,
    };
  });
}

// Overlapped circle (1.25 turns)
export function overlappedCirclePoints(
  cx: number,
  cy: number,
  r: number,
  noise: number = 0,
  n: number = 60
): Point[] {
  const total = Math.floor(n * 1.25);
  return Array.from({ length: total }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return {
      x: cx + r * Math.cos(a) + (Math.random() - 0.5) * noise,
      y: cy + r * Math.sin(a) + (Math.random() - 0.5) * noise,
    };
  });
}

// Open circle (0.88 turns, gap)
export function openCirclePoints(
  cx: number,
  cy: number,
  r: number,
  noise: number = 0,
  n: number = 60
): Point[] {
  const total = Math.floor(n * 0.88);
  return Array.from({ length: total }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return {
      x: cx + r * Math.cos(a) + (Math.random() - 0.5) * noise,
      y: cy + r * Math.sin(a) + (Math.random() - 0.5) * noise,
    };
  });
}

export function rectPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  noise: number = 0
): Point[] {
  const pts: Point[] = [];
  const n = 15;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x + t * w + (Math.random() - 0.5) * noise, y: y + (Math.random() - 0.5) * noise });
  }
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x + w + (Math.random() - 0.5) * noise, y: y + t * h + (Math.random() - 0.5) * noise });
  }
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x + w - t * w + (Math.random() - 0.5) * noise, y: y + h + (Math.random() - 0.5) * noise });
  }
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: x + (Math.random() - 0.5) * noise, y: y + h - t * h + (Math.random() - 0.5) * noise });
  }
  pts.push(pts[0]);
  return pts;
}

export function linePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  noise: number = 0,
  n: number = 30
): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return {
      x: x1 + t * (x2 - x1) + (Math.random() - 0.5) * noise,
      y: y1 + t * (y2 - y1) + (Math.random() - 0.5) * noise,
    };
  });
}

export const testCases = [
  // Perfect shapes (noise = 0)
  { name: 'Perfect circle', pts: circlePoints(200, 200, 80, 0), expect: 'circle', minConf: 0.90 },
  { name: 'Perfect rect', pts: rectPoints(100, 100, 200, 120, 0), expect: 'rectangle', minConf: 0.88 },
  { name: 'Perfect square', pts: rectPoints(100, 100, 150, 150, 0), expect: 'square', minConf: 0.85 },
  { name: 'Perfect line', pts: linePoints(50, 50, 300, 200, 0), expect: 'line', minConf: 0.92 },

  // Realistic noise (teacher drawing)
  { name: 'Noisy circle 5px', pts: circlePoints(200, 200, 80, 5), expect: 'circle', minConf: 0.80 },
  { name: 'Noisy circle 10px', pts: circlePoints(200, 200, 80, 10), expect: 'circle', minConf: 0.70 },
  { name: 'Noisy rect 5px', pts: rectPoints(100, 100, 200, 120, 5), expect: 'rectangle', minConf: 0.75 },
  { name: 'Noisy square 5px', pts: rectPoints(100, 100, 150, 150, 5), expect: 'square', minConf: 0.75 },
  { name: 'Noisy line 4px', pts: linePoints(50, 50, 300, 200, 4), expect: 'line', minConf: 0.82 },

  // Hand-drawn realistic user circles (overlapped and open)
  { name: 'Overlapped circle 1.25 turns', pts: overlappedCirclePoints(200, 200, 80, 5), expect: 'circle', minConf: 0.75 },
  { name: 'Open circle 0.88 turns gap', pts: openCirclePoints(200, 200, 80, 5), expect: 'circle', minConf: 0.70 },

  // Small shapes
  { name: 'Small circle r=30', pts: circlePoints(100, 100, 30, 3), expect: 'circle', minConf: 0.70 },
  { name: 'Small rect 60x40', pts: rectPoints(50, 50, 60, 40, 3), expect: 'rectangle', minConf: 0.68 },

  // Large shapes
  { name: 'Large circle r=200', pts: circlePoints(300, 300, 200, 8), expect: 'circle', minConf: 0.78 },

  // Non-circle should NOT be detected as circle
  {
    name: 'Wide ellipse NOT circle',
    pts: circlePoints(200, 200, 100, 0, 60).map((p) => ({ x: p.x * 1.8, y: p.y })),
    expect: 'ellipse',
    minConf: 0.60,
  },

  // Triangle
  {
    name: 'Triangle',
    pts: [
      ...linePoints(150, 50, 250, 200, 4),
      ...linePoints(250, 200, 50, 200, 4),
      ...linePoints(50, 200, 150, 50, 4),
    ],
    expect: 'triangle',
    minConf: 0.70,
  },
];

export function runClassifierTests(): { passed: number; failed: number; total: number } {
  console.group('🧪 Running Shape Classifier Test Suite');
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const metrics = analyzer.analyze(tc.pts);
    const candidates = classifier.classifyAll(metrics);
    const best = candidates[0] || null;

    const shapeMatches = best?.type === tc.expect;
    const confMatches = best ? best.confidence >= tc.minConf : false;
    const isOk = shapeMatches && confMatches;

    if (isOk) {
      passed++;
      console.log(`✅ [PASS] ${tc.name}: Detected ${best?.type} (${Math.round((best?.confidence || 0) * 100)}%)`);
    } else {
      failed++;
      console.error(
        `❌ [FAIL] ${tc.name}: Expected ${tc.expect} (min ${Math.round(tc.minConf * 100)}%), Got ${best?.type || 'none'} (${Math.round((best?.confidence || 0) * 100)}%)`
      );
    }
  }

  console.log(`\nSummary: ${passed}/${testCases.length} passed (${failed} failed).`);
  console.groupEnd();
  return { passed, failed, total: testCases.length };
}

const res = runClassifierTests();
if (res.failed > 0) {
  const proc = (globalThis as any).process;
  if (proc && proc.exit) {
    proc.exit(1);
  }
}
