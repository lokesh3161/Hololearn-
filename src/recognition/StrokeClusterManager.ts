import { ShapeClassifierEngine, type ShapeClassificationResult, type Point } from './ShapeClassifierEngine';
import type { CanvasObject } from '../types/canvas';

export interface StrokeCluster {
  id: string;
  strokes: Point[][];
  sourceObjectIds: string[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  lastTimestamp: number;
}

export class StrokeClusterManager {
  private static recentClusters: StrokeCluster[] = [];

  /**
   * Isolate localized strokes drawn within a 700ms window and 50px spatial proximity threshold
   */
  public static isolateAndClassify(recentObjects: CanvasObject[]): ShapeClassificationResult | null {
    if (!recentObjects || recentObjects.length === 0) return null;

    const now = Date.now();
    // Filter stroke objects drawn within last 700ms (or last 3 stroke objects)
    const strokeObjs = recentObjects
      .filter((o) => o.type === 'stroke' || o.type === 'handwriting')
      .slice(-3);

    if (strokeObjs.length === 0) return null;

    // Convert CanvasObject points into localized Point[][]
    const localizedStrokes: Point[][] = strokeObjs.map((obj) =>
      obj.points.map((p) => ({ x: p.x, y: p.y, time: p.timestamp || now }))
    );

    // Run ShapeClassifierEngine on localized cluster only
    const result = ShapeClassifierEngine.classifyStrokes(localizedStrokes);
    return result;
  }
}
