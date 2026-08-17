import type {
  Point,
  RecognitionResult,
  ConversionResult,
  SemanticShapeObject,
  StrokeMetrics,
} from './types';
import { StrokeAnalyzer } from './StrokeAnalyzer';
import { GeometryClassifier } from './GeometryClassifier';
import { ShapeConverter } from './ShapeConverter';

function debugRecognition(points: Point[], result: RecognitionResult) {
  console.group('🔍 Shape Recognition Debug');
  console.log('Points:', points.length);
  console.log('Bounding box:', result.metrics.boundingBox);
  console.log('Aspect ratio:', result.metrics.aspectRatio.toFixed(3));
  console.log('Is closed:', result.metrics.isClosed);
  console.log('Closure distance:', result.metrics.closureDistance.toFixed(1));
  console.log('Arc length:', result.metrics.totalLength.toFixed(1));
  console.log('Candidates:');
  result.candidates.forEach((c) => {
    console.log(`  ${c.type}: ${(c.confidence * 100).toFixed(1)}%`);
  });
  console.log(
    'Best:',
    result.best?.type ?? 'none',
    result.best ? `(${(result.best.confidence * 100).toFixed(1)}%)` : ''
  );
  console.groupEnd();
}

export class RecognitionCalibrator {
  private log: Array<{
    shape: string;
    metrics: Partial<StrokeMetrics>;
    confidence: number;
    wasCorrect: boolean;
  }> = [];

  recordSuccess(type: string, m: StrokeMetrics, confidence: number) {
    this.log.push({
      shape: type,
      metrics: { aspectRatio: m.aspectRatio, isClosed: m.isClosed },
      confidence,
      wasCorrect: true,
    });
    this.printStats();
  }

  recordFailure(type: string, m: StrokeMetrics, confidence: number) {
    this.log.push({
      shape: type,
      metrics: { aspectRatio: m.aspectRatio },
      confidence,
      wasCorrect: false,
    });
    this.printStats();
  }

  private printStats() {
    const byShape = new Map<string, { ok: number; fail: number }>();
    this.log.forEach((entry) => {
      if (!byShape.has(entry.shape)) {
        byShape.set(entry.shape, { ok: 0, fail: 0 });
      }
      const s = byShape.get(entry.shape)!;
      entry.wasCorrect ? s.ok++ : s.fail++;
    });
    console.table(Object.fromEntries(byShape));
  }
}

export const calibrator = new RecognitionCalibrator();

export class ShapeRecognitionEngine {
  private analyzer = new StrokeAnalyzer();
  private classifier = new GeometryClassifier();
  private converter = new ShapeConverter();
  private cache = new Map<string, RecognitionResult>();

  recognizeSync(sourceObjectId: string, points: Point[]): RecognitionResult {
    if (this.cache.has(sourceObjectId)) {
      return this.cache.get(sourceObjectId)!;
    }

    const start = performance.now();
    const metrics = this.analyzer.analyze(points);
    const candidates = this.classifier.classifyAll(metrics);
    const best = candidates[0] || null;

    const result: RecognitionResult = {
      strokeId: sourceObjectId,
      sourceObjectId,
      rawPoints: points,
      metrics,
      candidates,
      best,
      processingTimeMs: performance.now() - start,
      timestamp: Date.now(),
    };

    debugRecognition(points, result);

    this.cache.set(sourceObjectId, result);
    return result;
  }

  async recognize(sourceObjectId: string, points: Point[]): Promise<RecognitionResult> {
    return this.recognizeSync(sourceObjectId, points);
  }

  convert(result: RecognitionResult): ConversionResult {
    if (!result || !result.best || !result.sourceObjectId) {
      console.warn('[HoloLearn Convert Failed] Invalid result or no candidate shape found.');
      return {
        success: false,
        originalStrokeId: result?.sourceObjectId || '',
        convertedObject: null,
      };
    }

    const frames = this.converter.generateConversionFrames(result.rawPoints, result.best, 20);

    const converted: SemanticShapeObject = {
      id: `shape_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      sourceObjectId: result.sourceObjectId,
      type: result.best.type,
      geometry: result.best.geometry,
      metadata: {
        convertedFrom: 'freehand',
        originalPoints: result.rawPoints,
        confidence: result.best.confidence,
        convertedAt: Date.now(),
      },
    };

    if (!this.isValidGeometry(converted)) {
      console.warn('[HoloLearn Convert Failed] Geometry validation failed for converted shape.');
      return {
        success: false,
        originalStrokeId: result.sourceObjectId,
        convertedObject: null,
      };
    }

    console.log('[HoloLearn Convert]', {
      sourceObjectId: result.sourceObjectId,
      convertedShapeId: converted.id,
      shapeType: converted.type,
      geometry: converted.geometry,
    });

    return {
      success: true,
      originalStrokeId: result.sourceObjectId,
      convertedObject: converted,
      animationPath: frames,
    };
  }

  private isValidGeometry(semantic: SemanticShapeObject): boolean {
    if (!semantic || !semantic.geometry) return false;
    const geo = semantic.geometry;
    if (geo.type === 'circle')
      return typeof geo.centerX === 'number' && typeof geo.radius === 'number' && geo.radius > 0;
    if (geo.type === 'ellipse')
      return typeof geo.centerX === 'number' && geo.radiusX > 0 && geo.radiusY > 0;
    if (geo.type === 'rectangle' || geo.type === 'square')
      return typeof geo.x === 'number' && geo.width > 0 && geo.height > 0;
    if (geo.type === 'triangle') return !!(geo.p1 && geo.p2 && geo.p3);
    if (geo.type === 'line') return typeof geo.startX === 'number' && typeof geo.endX === 'number';
    if (geo.type === 'arrow') return typeof geo.startX === 'number' && typeof geo.endX === 'number';
    return true;
  }

  clearCache(strokeId?: string): void {
    if (strokeId) this.cache.delete(strokeId);
    else this.cache.clear();
  }
}
