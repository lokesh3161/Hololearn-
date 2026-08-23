import type {
  Point,
  RecognitionResult,
  ShapeCandidate,
  SemanticShapeObject,
  ConversionResult,
} from './types';
import { RECOGNITION_CONFIG } from './types';
import { FeatureExtractor } from './FeatureExtractor';
import { GeometryClassifier } from './GeometryClassifier';
import { ShapeConverter } from './ShapeConverter';

export class ShapeRecognitionEngine {
  private classifier = new GeometryClassifier();
  private converter = new ShapeConverter();
  private cache = new Map<string, RecognitionResult>();

  public recognizeSync(strokeObj: any, _context?: any): RecognitionResult {
    const start = performance.now();
    const rawPoints: Point[] = strokeObj?.points || (Array.isArray(strokeObj) ? strokeObj : []);
    const sourceObjectId = strokeObj?.id || `stroke-${Date.now()}`;

    if (this.cache.has(sourceObjectId)) {
      return this.cache.get(sourceObjectId)!;
    }

    // Step 1: Feature Extraction & Metrics Computation
    const { metrics, features } = FeatureExtractor.extract(rawPoints);

    // Step 2: Scale & Dimension Validation
    if (
      metrics.pointCount < RECOGNITION_CONFIG.MIN_POINTS ||
      metrics.diagonal < RECOGNITION_CONFIG.MIN_DIAGONAL ||
      metrics.totalLength < 18
    ) {
      const emptyResult: RecognitionResult = {
        status: 'rejected',
        strokeId: sourceObjectId,
        sourceObjectId,
        rawPoints,
        metrics,
        candidates: [],
        bestCandidate: null,
        secondBestCandidate: null,
        best: null,
        confidenceMargin: 0,
        features,
        processingTimeMs: performance.now() - start,
        timestamp: Date.now(),
        reason: 'Stroke dimensions or point count below minimum thresholds',
      };
      this.cache.set(sourceObjectId, emptyResult);
      return emptyResult;
    }

    // Step 3: Run Hierarchical Geometry Classifier
    const candidates = this.classifier.classifyAll(metrics);

    const bestCandidate = candidates[0] || null;
    const secondBestCandidate = candidates[1] || null;
    const confidenceMargin = bestCandidate
      ? bestCandidate.confidence - (secondBestCandidate ? secondBestCandidate.confidence : 0)
      : 0;

    // Step 4: Decision Logic (Precision > Recall)
    let status: 'recognized' | 'uncertain' | 'rejected' = 'rejected';
    let reason = '';

    if (!bestCandidate) {
      status = 'rejected';
      reason = 'No valid geometric shape candidate found';
    } else if (
      bestCandidate.confidence >= RECOGNITION_CONFIG.MIN_CONFIDENCE &&
      confidenceMargin >= RECOGNITION_CONFIG.MIN_CONFIDENCE_MARGIN
    ) {
      status = 'recognized';
      reason = `Recognized ${bestCandidate.type} with ${Math.round(bestCandidate.confidence * 100)}% confidence and ${Math.round(confidenceMargin * 100)}% margin`;
    } else if (bestCandidate.confidence >= 0.50) {
      status = 'uncertain';
      reason = `Candidate ${bestCandidate.type} score (${Math.round(bestCandidate.confidence * 100)}%) or margin (${Math.round(confidenceMargin * 100)}%) is ambiguous`;
    } else {
      status = 'rejected';
      reason = `Top candidate score (${Math.round(bestCandidate.confidence * 100)}%) below absolute minimum threshold`;
    }

    const result: RecognitionResult = {
      status,
      strokeId: sourceObjectId,
      sourceObjectId,
      rawPoints,
      metrics,
      candidates,
      bestCandidate,
      secondBestCandidate,
      best: status === 'recognized' ? bestCandidate : null,
      confidenceMargin,
      features,
      processingTimeMs: performance.now() - start,
      timestamp: Date.now(),
      reason,
    };

    this.cache.set(sourceObjectId, result);
    return result;
  }

  public async recognize(strokeObj: any): Promise<RecognitionResult> {
    return this.recognizeSync(strokeObj);
  }

  public convert(strokeObj: any, resultParam?: RecognitionResult): ConversionResult {
    const result = resultParam || this.recognizeSync(strokeObj);
    const candidate = result?.bestCandidate || result?.best;

    if (!candidate || result.status !== 'recognized') {
      return {
        success: false,
        originalStrokeId: strokeObj?.id || '',
        convertedObject: null,
      };
    }

    const converted: SemanticShapeObject = {
      id: `shape_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sourceObjectId: result.sourceObjectId,
      type: candidate.type,
      shapeSubtype: candidate.type === 'square' ? 'rectangle' : candidate.type,
      geometry: candidate.geometry,
      metadata: {
        convertedFrom: 'freehand',
        originalPoints: result.rawPoints,
        confidence: candidate.confidence,
        convertedAt: Date.now(),
      },
    };

    return {
      success: true,
      originalStrokeId: result.sourceObjectId,
      convertedObject: converted,
    };
  }

  public clearCache(strokeId?: string): void {
    if (strokeId) this.cache.delete(strokeId);
    else this.cache.clear();
  }

  // Static helper for backward compatibility
  public static analyzeStrokes(strokes: Point[][]): any {
    const flatPoints = strokes.flat();
    const engine = new ShapeRecognitionEngine();
    const res = engine.recognizeSync({ points: flatPoints });
    return res.bestCandidate ? { type: res.bestCandidate.type, confidence: res.bestCandidate.confidence } : null;
  }
}
