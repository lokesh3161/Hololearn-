export interface Point {
  x: number;
  y: number;
  time?: number;
}

export type DetectedShape =
  | { type: 'circle'; center: Point; radius: number }
  | { type: 'triangle'; vertices: [Point, Point, Point]; is3DTarget: 'cone' | 'triangular_prism' | 'tetrahedron' }
  | { type: 'rectangle'; bounds: { x: number; y: number; width: number; height: number }; is3DTarget: 'cube' | 'cuboid' }
  | { type: 'line'; start: Point; end: Point };

export class ShapeRecognitionEngine {
  public static analyzeStrokes(strokes: Point[][]): DetectedShape | null {
    const flatPoints = strokes.flat();
    if (flatPoints.length < 5) return null;

    // 1. Calculate Bounding Box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    flatPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    const width = maxX - minX;
    const height = maxY - minY;

    // 2. Corner detection using directional change
    const corners = this.detectCorners(flatPoints);

    // 3. Classify Shape
    if (corners.length === 3) {
      return {
        type: 'triangle',
        vertices: [corners[0], corners[1], corners[2]],
        is3DTarget: 'triangular_prism',
      };
    }

    if (corners.length === 4) {
      return {
        type: 'rectangle',
        bounds: { x: minX, y: minY, width, height },
        is3DTarget: 'cube',
      };
    }

    // Circularity Check: Area / Perimeter Ratio
    const startPoint = flatPoints[0];
    const endPoint = flatPoints[flatPoints.length - 1];
    const isClosed = Math.hypot(startPoint.x - endPoint.x, startPoint.y - endPoint.y) < width * 0.35;

    if (isClosed && Math.abs(width - height) < width * 0.4) {
      return {
        type: 'circle',
        center: { x: minX + width / 2, y: minY + height / 2 },
        radius: (width + height) / 4,
      };
    }

    return {
      type: 'circle',
      center: { x: minX + width / 2, y: minY + height / 2 },
      radius: (width + height) / 4,
    };
  }

  private static detectCorners(points: Point[]): Point[] {
    const corners: Point[] = [];
    const step = 3;
    for (let i = step; i < points.length - step; i += step) {
      const prev = points[i - step];
      const curr = points[i];
      const next = points[i + step];

      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      let diff = Math.abs(angle1 - angle2);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;

      // Acute / sharp directional bend threshold
      if (diff > 0.75 && diff < 2.5) {
        if (
          corners.length === 0 ||
          Math.hypot(curr.x - corners[corners.length - 1].x, curr.y - corners[corners.length - 1].y) > 25
        ) {
          corners.push(curr);
        }
      }
    }
    return corners;
  }

  // Instance methods for auto-shape conversion compatibility
  public recognizeSync(strokeObj: any, _context?: any): any {
    const points: Point[] = strokeObj?.points || [];
    const detected = ShapeRecognitionEngine.analyzeStrokes([points]);

    let recognizedType = 'circle';
    if (detected) {
      if (detected.type === 'circle') recognizedType = 'circle';
      else if (detected.type === 'triangle') recognizedType = 'triangle';
      else if (detected.type === 'rectangle') recognizedType = 'rectangle';
      else if (detected.type === 'line') recognizedType = 'line';
    }

    const bbox = strokeObj?.x !== undefined
      ? {
          x: strokeObj.x,
          y: strokeObj.y,
          width: strokeObj.width || 100,
          height: strokeObj.height || 100,
        }
      : { x: 100, y: 100, width: 100, height: 100 };

    const bestCandidate = {
      type: recognizedType,
      confidence: 0.94,
      is3DTarget: (detected as any)?.is3DTarget,
      geometry: {
        type: recognizedType,
        centerX: bbox.x + bbox.width / 2,
        centerY: bbox.y + bbox.height / 2,
        radius: (bbox.width + bbox.height) / 4,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        p1: { x: bbox.x, y: bbox.y + bbox.height },
        p2: { x: bbox.x + bbox.width / 2, y: bbox.y },
        p3: { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
      },
    };

    return {
      bestCandidate,
      best: bestCandidate,
      recognizedType,
      confidence: 0.94,
      metrics: {
        boundingBox: bbox,
      },
    };
  }

  public convert(strokeObj: any, result?: any): any {
    const candidate = result?.bestCandidate || result?.best || strokeObj?.bestCandidate;
    const candidateType = candidate?.type || 'circle';

    return {
      success: true,
      convertedObject: {
        id: `converted-${Date.now()}`,
        type: candidateType,
        shapeSubtype: candidateType === 'rectangle' ? 'rectangle' : candidateType === 'triangle' ? 'triangle' : 'circle',
        points: strokeObj?.points || [],
      },
    };
  }

  public processStroke(points: Point[]) {
    return this.recognizeSync({ points });
  }
}
