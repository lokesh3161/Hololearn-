export type RecognizedShapeType =
  | 'circle'
  | 'ellipse'
  | 'rectangle'
  | 'square'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'arc'
  | 'polygon'
  | 'parallelogram'
  | 'rhombus'
  | 'trapezoid'
  | 'axes'
  | 'spring'
  | 'wave'
  | 'fbd'
  | 'inclined_plane'
  | 'circuit_symbol'
  | 'unknown';

export type RecognitionStatus = 'recognized' | 'uncertain' | 'rejected';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  velocity?: number;
  timestamp?: number;
  pointerType?: 'mouse' | 'pen' | 'touch';
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface StrokeMetrics {
  points: Point[];
  normalizedPoints: Point[];
  boundingBox: BoundingBox;
  totalLength: number;
  startPoint: Point;
  endPoint: Point;
  isClosed: boolean;
  closureDistance: number;
  closureRatio: number;
  pointCount: number;
  aspectRatio: number;
  diagonal: number;
}

export interface RecognitionFeatures {
  closureRatio: number;
  isClosed: boolean;
  straightness: number;
  circularity: number;
  cornerCount: number;
  aspectRatio: number;
  radialError: number;
  angleQuality: number;
  parallelism: number;
  diagonal: number;
  totalLength: number;
}

export interface CircleGeometry {
  type: 'circle';
  centerX: number;
  centerY: number;
  radius: number;
}

export interface EllipseGeometry {
  type: 'ellipse';
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
}

export interface RectangleGeometry {
  type: 'rectangle' | 'square' | 'parallelogram' | 'rhombus' | 'trapezoid';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  corners?: Point[];
}

export interface TriangleGeometry {
  type: 'triangle';
  p1: Point;
  p2: Point;
  p3: Point;
}

export interface LineGeometry {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
  angle: number;
}

export interface ArrowGeometry {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  headSize: number;
  direction: 'forward' | 'backward' | 'both';
}

export interface ArcGeometry {
  type: 'arc';
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface PolygonGeometry {
  type: 'polygon';
  vertices: Point[];
  sides: number;
}

export interface DiagramGeometry {
  type: 'axes' | 'spring' | 'wave' | 'fbd' | 'inclined_plane' | 'circuit_symbol';
  subType?: string;
  metadata?: Record<string, any>;
}

export type ShapeGeometry =
  | CircleGeometry
  | EllipseGeometry
  | RectangleGeometry
  | TriangleGeometry
  | LineGeometry
  | ArrowGeometry
  | ArcGeometry
  | PolygonGeometry
  | DiagramGeometry;

export interface ShapeCandidate {
  type: RecognizedShapeType;
  confidence: number; // 0.0 to 1.0
  geometry: ShapeGeometry;
  label: string;
  reasons?: string[];
  is3DTarget?: string;
}

export interface RecognitionResult {
  status: RecognitionStatus;
  strokeId: string;
  sourceObjectId: string;
  rawPoints: Point[];
  metrics: StrokeMetrics;
  candidates: ShapeCandidate[];
  bestCandidate: ShapeCandidate | null;
  secondBestCandidate: ShapeCandidate | null;
  best: ShapeCandidate | null;
  confidenceMargin: number;
  features: RecognitionFeatures;
  processingTimeMs: number;
  timestamp: number;
  reason?: string;
}

export interface SemanticShapeObject {
  id: string;
  sourceObjectId: string;
  type: RecognizedShapeType;
  shapeSubtype?: string;
  geometry: ShapeGeometry;
  metadata: {
    convertedFrom: 'freehand';
    originalPoints: Point[];
    confidence: number;
    convertedAt: number;
  };
}

export interface ConversionResult {
  success: boolean;
  originalStrokeId: string;
  convertedObject: SemanticShapeObject | null;
  animationPath?: Point[][];
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export const RECOGNITION_CONFIG = {
  MIN_CONFIDENCE: 0.80,
  MIN_CONFIDENCE_MARGIN: 0.12,
  MIN_DIAGONAL: 18,
  MIN_POINTS: 6,
};

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return 'high';
  if (score >= 0.60) return 'medium';
  if (score >= 0.35) return 'low';
  return 'none';
}
