export interface FunctionPlotOptions {
  type: 'cartesian' | 'parametric' | 'polar';
  expression: string; // e.g. "sin(x)", "x^2 - 4", "exp(x)"
  fn?: (x: number) => number | null;
  parametricX?: (t: number) => number;
  parametricY?: (t: number) => number;
  polarR?: (theta: number) => number;
  color?: string;
  showDerivative?: boolean;
  derivativePointX?: number;
  showIntegralShading?: boolean;
  integralRange?: [number, number];
}

export class GraphEngine {
  evaluateCartesian(fn: (x: number) => number | null, x: number): number | null {
    try {
      const y = fn(x);
      if (y === null || isNaN(y) || !isFinite(y)) return null;
      return y;
    } catch {
      return null;
    }
  }

  calculateDerivative(fn: (x: number) => number | null, x: number, h: number = 0.0001): number | null {
    const y1 = this.evaluateCartesian(fn, x + h);
    const y0 = this.evaluateCartesian(fn, x - h);
    if (y1 === null || y0 === null) return null;
    return (y1 - y0) / (2 * h);
  }

  calculateIntegralArea(fn: (x: number) => number | null, a: number, b: number, steps: number = 200): number {
    if (a >= b) return 0;
    const dx = (b - a) / steps;
    let area = 0;

    for (let i = 0; i < steps; i++) {
      const x = a + (i + 0.5) * dx;
      const y = this.evaluateCartesian(fn, x);
      if (y !== null && isFinite(y)) {
        area += y * dx;
      }
    }
    return area;
  }

  findRoots(fn: (x: number) => number | null, minX: number, maxX: number, steps: number = 100): number[] {
    const roots: number[] = [];
    const dx = (maxX - minX) / steps;
    let prevY = this.evaluateCartesian(fn, minX);

    for (let i = 1; i <= steps; i++) {
      const x = minX + i * dx;
      const currY = this.evaluateCartesian(fn, x);

      if (prevY !== null && currY !== null) {
        if (prevY * currY <= 0) {
          // Root sign change detected in interval
          const rootX = x - dx * (currY / (currY - prevY || 1));
          if (isFinite(rootX)) {
            roots.push(Number(rootX.toFixed(2)));
          }
        }
      }
      prevY = currY;
    }
    return roots;
  }
}

export const graphEngine = new GraphEngine();
