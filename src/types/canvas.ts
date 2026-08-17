export type ToolType =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'shape'
  | 'text'
  | 'equation'
  | 'eraser'
  | 'hand'
  | 'zoom-in'
  | 'zoom-out';

export type ShapeSubtype = 'circle' | 'rectangle' | 'square' | 'triangle' | 'line' | 'arrow';

export type ObjectType = 'stroke' | 'shape' | 'text' | 'equation' | 'ai-generated' | 'simulation';

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
  suggestedActions: ('Convert' | 'Explain' | 'Visualize' | 'Simulate' | 'Quiz' | 'Open Virtual Lab')[];
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
