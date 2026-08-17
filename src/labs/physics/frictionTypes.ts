export type SurfacePair =
  | 'wood-wood'
  | 'rubber-wood'
  | 'plastic-wood'
  | 'metal-metal'
  | 'felt-wood'
  | 'glass-glass';

export interface SurfaceProfile {
  id: SurfacePair;
  label: string;            // e.g. "Wood on Wood"
  muSRef: number;           // internal reference μₛ
  muKRef: number;           // internal reference μₖ
  roughness: number;        // 0–1 visual texture & roughness representation
  noiseAmplitude: number;   // baseline sensor jitter for this surface
  color: string;            // surface visual track style
}

export const SURFACE_PROFILES: Record<SurfacePair, SurfaceProfile> = {
  'wood-wood': {
    id: 'wood-wood',
    label: 'Wood on Wood',
    muSRef: 0.50,
    muKRef: 0.40,
    roughness: 0.35,
    noiseAmplitude: 0.05,
    color: '#8b5a2b',
  },
  'rubber-wood': {
    id: 'rubber-wood',
    label: 'Rubber on Wood',
    muSRef: 0.70,
    muKRef: 0.60,
    roughness: 0.60,
    noiseAmplitude: 0.08,
    color: '#333333',
  },
  'plastic-wood': {
    id: 'plastic-wood',
    label: 'Plastic on Wood',
    muSRef: 0.35,
    muKRef: 0.25,
    roughness: 0.25,
    noiseAmplitude: 0.04,
    color: '#2563eb',
  },
  'metal-metal': {
    id: 'metal-metal',
    label: 'Metal on Metal',
    muSRef: 0.25,
    muKRef: 0.18,
    roughness: 0.20,
    noiseAmplitude: 0.03,
    color: '#64748b',
  },
  'felt-wood': {
    id: 'felt-wood',
    label: 'Felt on Wood',
    muSRef: 0.45,
    muKRef: 0.35,
    roughness: 0.50,
    noiseAmplitude: 0.06,
    color: '#059669',
  },
  'glass-glass': {
    id: 'glass-glass',
    label: 'Glass on Glass',
    muSRef: 0.94,
    muKRef: 0.40,
    roughness: 0.10,
    noiseAmplitude: 0.02,
    color: '#38bdf8',
  },
};

export type MotionState = 'static' | 'impending' | 'sliding';
export type Method = 'horizontal' | 'inclined';

export interface SimulationState {
  method: Method;
  surface: SurfacePair;
  blockMass: number;         // kg
  additionalLoad: number;    // kg
  appliedForce: number;      // N (horizontal method)
  angleDeg: number;          // deg (inclined method)
  velocity: number;          // m/s
  position: number;          // m along track
  motionState: MotionState;
  frictionForce: number;     // computed N
  normalForce: number;       // computed N
  noiseEnabled: boolean;
  timestamp: number;
}

export interface FrictionTrial {
  id: string;
  method: Method;
  surface: SurfacePair;
  blockMass: number;
  additionalLoad: number;
  totalMass: number;
  normalForce: number;
  maxStaticFriction?: number;   // horizontal method
  kineticFriction?: number;
  criticalAngleDeg?: number;    // inclined method
  muSExperimental?: number;
  muKExperimental?: number;
  muSReference: number;         // revealed only in final report
  muKReference: number;
  percentErrorMuS?: number;
  percentErrorMuK?: number;
  measurementUncertainty: number;
  recordedAt: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  count: number;
}
