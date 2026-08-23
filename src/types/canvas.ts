export type ToolType =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'shape'
  | 'text'
  | 'equation'
  | 'eraser'
  | 'pixel-eraser'
  | 'vector-eraser'
  | 'lasso'
  | 'hand'
  | 'zoom-in'
  | 'zoom-out';

export type ShapeSubtype =
  | 'circle'
  | 'rectangle'
  | 'square'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone';

export type ObjectType =
  | 'stroke'
  | 'handwriting'
  | 'equation'
  | 'text'
  | 'shape'
  | 'shape2D'
  | 'graph'
  | 'model3D'
  | 'image'
  | 'annotation'
  | 'diagram'
  | 'ai-generated'
  | 'simulation';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
  tiltX?: number;
  tiltY?: number;
  twist?: number;
  pointerType?: 'pen' | 'touch' | 'mouse';
  velocity?: number;
}

export interface ObjectRelationship {
  targetId: string;
  relationType: 'controls' | 'derived_from' | 'annotates' | 'grouped_with';
}

export interface BoardObjectMetadata {
  authorId?: string;
  isLocked: boolean;
  isHidden: boolean;
  tags: string[];
}

export interface BoardObject {
  id: string;
  type: ObjectType;
  position: { x: number; y: number; zIndex: number };
  dimensions: { width: number; height: number };
  rotation: number;
  content: {
    rawStrokes?: Array<{ points: Array<[number, number, number, number]> }>;
    rawLatex?: string;
    ast?: any;
    sourceStrokeIds?: string[];
    shapeKind?: 'circle' | 'triangle' | 'polygon' | 'rectangle' | 'square' | 'line' | 'cube' | 'sphere' | 'cylinder' | 'cone';
    vertices?: Point[];
    parameters?: Record<string, number>;
    linkedEquationId?: string;
    rangeX?: [number, number];
    rangeY?: [number, number];
    resolution?: number;
    geometryType?: string;
    rotation3D?: [number, number, number];
    text?: string;
  };
  metadata: BoardObjectMetadata;
  confidence: number;
  source: 'manual_drawing' | 'ocr_recognition' | 'ai_generated' | 'imported_asset';
  relationships: ObjectRelationship[];
  createdAt: number;
  updatedAt: number;
}

export interface CanvasObject {
  id: string;
  type: ObjectType;
  shapeSubtype?: ShapeSubtype;
  points: Point[];
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  text?: string;
  mathLatex?: string;
  label?: string;
  zIndex: number;
  aiDetectedType?: string | null;
  confidence?: number;
  isGlowing?: boolean;
  semanticShape?: any;
  recognizedShapeType?: string;
  originalStroke?: CanvasObject;
  isConverted?: boolean;
}

export interface DetectionResult {
  objectId: string;
  sourceObjectId?: string;
  type: 'shape' | 'equation' | 'text';
  detectedName: string;
  confidence: number;
  boundingBox: BoundingBox;
  mathFormula?: string;
  suggestedActions: ('Convert' | 'Explain' | 'Visualize' | 'Simulate' | 'Quiz' | 'Open Virtual Lab' | 'Plot Graph' | 'Convert 3D')[];
  simulationType?: SimulationId;
  recognitionResult?: any;
}

export type SimulationId =
  | 'projectile'
  | 'newton'
  | 'ohm'
  | 'wave'
  | 'shm'
  | 'graph'
  | 'kinetic'
  | 'kinetics'
  | 'gravitation'
  | 'lens'
  | 'gas'
  | 'pendulum'
  | 'circuit'
  | 'lorentz'
  | 'thermodynamic'
  | 'fluid'
  | 'interference'
  | 'photoelectric'
  | 'decay'
  | 'circle-area'
  | 'geometry3d'
  | 'chemistry'
  | 'titration'
  | 'water-lab'
  | 'circular'
  | 'torque'
  | 'einstein'
  | 'refraction'
  | 'capacitor'
  | 'coulomb'
  | 'field'
  | 'heat'
  | 'equilibrium'
  | 'electrochemistry';

export interface AIMessage {
  id: string;
  sender: 'teacher' | 'ai';
  text: string;
  timestamp: string;
  actions?: {
    label: string;
    actionType: 'simulation' | 'explain' | 'quiz' | 'preset';
    payload?: SimulationId;
  }[];
}

export type AppMode = 'teacher' | 'student';
