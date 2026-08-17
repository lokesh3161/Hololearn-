import type { StrokeMetrics, RecognizedShapeType } from './types';

export class ConfidenceCalculator {
  calculateScore(
    type: RecognizedShapeType,
    rawConfidence: number,
    metrics: StrokeMetrics
  ): number {
    let score = rawConfidence;

    // Apply closed stroke rules
    if (type === 'circle' || type === 'ellipse' || type === 'rectangle' || type === 'square' || type === 'triangle') {
      if (!metrics.isClosed) {
        score *= 0.5;
      }
    }

    // Apply open stroke rules
    if (type === 'line' || type === 'arrow') {
      if (metrics.isClosed) {
        score *= 0.3;
      }
    }

    return Math.max(0, Math.min(1, score));
  }
}
