export class MathEngine {
  // Quadratic Solver ax² + bx + c = 0
  solveQuadratic(a: number, b: number, c: number): { disc: number; roots: number[]; vertex: { x: number; y: number } } {
    const safeA = a === 0 ? 0.0001 : a;
    const disc = b * b - 4 * safeA * c;
    const vertex = {
      x: -b / (2 * safeA),
      y: c - (b * b) / (4 * safeA),
    };

    const roots: number[] = [];
    if (disc >= 0) {
      const r1 = (-b + Math.sqrt(disc)) / (2 * safeA);
      const r2 = (-b - Math.sqrt(disc)) / (2 * safeA);
      roots.push(r1, r2);
    }
    return { disc, roots, vertex };
  }

  // Trigonometry
  trigSine(deg: number): number {
    return Math.sin((deg * Math.PI) / 180);
  }
  trigCosine(deg: number): number {
    return Math.cos((deg * Math.PI) / 180);
  }
  trigTangent(deg: number): number {
    return Math.tan((deg * Math.PI) / 180);
  }

  // Vectors
  vectorMagnitude(x: number, y: number, z: number = 0): number {
    return Math.sqrt(x * x + y * y + z * z);
  }
  dotProduct(v1: [number, number, number], v2: [number, number, number]): number {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  }
  crossProduct(v1: [number, number, number], v2: [number, number, number]): [number, number, number] {
    return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0],
    ];
  }

  // Statistics
  mean(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  variance(data: number[]): number {
    if (data.length <= 1) return 0;
    const avg = this.mean(data);
    return data.reduce((a, b) => a + (b - avg) ** 2, 0) / (data.length - 1);
  }
  stdDev(data: number[]): number {
    return Math.sqrt(this.variance(data));
  }
}

export const mathEngine = new MathEngine();
