export interface Point {
  x: number;
  y: number;
  time?: number;
}

export interface BoundingBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeClassificationResult {
  kind: '2D' | '3D';
  shapeType: 'circle' | 'ellipse' | 'triangle' | 'rectangle' | 'line' | 'cube' | 'cylinder' | 'cone' | 'pyramid';
  confidence: number;
  boundingBox: BoundingBoxRect;
  regularizedGeometry?: any;
  extrude3DTarget?: 'cylinder' | 'sphere' | 'prism' | 'cone' | 'cube';
}

export class ShapeClassifierEngine {
  /**
   * Main entry point for multi-stroke 2D and 3D sketch recognition
   */
  public static classifyStrokes(strokes: Point[][]): ShapeClassificationResult | null {
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

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const boundingBox: BoundingBoxRect = { x: minX, y: minY, width, height };

    // 2. Corner Vertex Detection using angular deviation
    const corners = ShapeClassifierEngine.detectCorners(flatPoints);
    const strokeCount = strokes.length;

    // 3. Direct 3D Sketch Recognition Heuristics
    // A. Isometric Cube: 2+ strokes (overlapping rectangles or Y-junction lines) or 6-8 sharp corners
    if (strokeCount >= 2 && corners.length >= 6) {
      return {
        kind: '3D',
        shapeType: 'cube',
        confidence: 0.94,
        boundingBox,
        extrude3DTarget: 'cube',
      };
    }

    // B. Cylinder Sketch: 2+ strokes with parallel elliptical caps
    if (strokeCount >= 2 && corners.length <= 4 && height > width * 1.1) {
      return {
        kind: '3D',
        shapeType: 'cylinder',
        confidence: 0.92,
        boundingBox,
        extrude3DTarget: 'cylinder',
      };
    }

    // C. Cone Sketch: Apex vertex with base curve
    if (strokeCount >= 2 && corners.length === 1 && height > width * 0.8) {
      return {
        kind: '3D',
        shapeType: 'cone',
        confidence: 0.91,
        boundingBox,
        extrude3DTarget: 'cone',
      };
    }

    // 4. 2D Primitive Recognition
    // A. Triangle: 3 dominant corners
    if (corners.length === 3) {
      return {
        kind: '2D',
        shapeType: 'triangle',
        confidence: 0.95,
        boundingBox,
        extrude3DTarget: 'prism',
      };
    }

    // B. Rectangle / Square: 4 dominant corners
    if (corners.length === 4) {
      return {
        kind: '2D',
        shapeType: 'rectangle',
        confidence: 0.94,
        boundingBox,
        extrude3DTarget: 'cube',
      };
    }

    // C. Circle vs Ellipse (0-2 corners, closed loop check)
    const startPoint = flatPoints[0];
    const endPoint = flatPoints[flatPoints.length - 1];
    const isClosed = Math.hypot(startPoint.x - endPoint.x, startPoint.y - endPoint.y) < width * 0.3;

    if (isClosed) {
      const aspectRatio = width / height;
      if (Math.abs(aspectRatio - 1.0) < 0.25) {
        return {
          kind: '2D',
          shapeType: 'circle',
          confidence: 0.96,
          boundingBox,
          extrude3DTarget: 'sphere',
        };
      } else {
        return {
          kind: '2D',
          shapeType: 'ellipse',
          confidence: 0.93,
          boundingBox,
          extrude3DTarget: 'cylinder',
        };
      }
    }

    // D. Line / Vector
    if (corners.length <= 1) {
      return {
        kind: '2D',
        shapeType: 'line',
        confidence: 0.90,
        boundingBox,
      };
    }

    return {
      kind: '2D',
      shapeType: 'rectangle',
      confidence: 0.85,
      boundingBox,
      extrude3DTarget: 'cube',
    };
  }

  /**
   * Angular deviation corner vertex detector
   */
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

      // Acute bend threshold
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
}
