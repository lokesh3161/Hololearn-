export interface WireSpec {
  materialId: string;
  materialName: string;
  referenceG_GPa: number; // e.g. Steel = 79.3 GPa, Brass = 37.0 GPa, Copper = 45.0 GPa
  lengthM: number; // 0.5 m - 2.0 m
  diameterMm: number; // 0.2 mm - 1.5 mm
}

export interface DiscSpec {
  massKg: number; // 0.1 kg - 2.0 kg
  radiusM: number; // 0.05 m - 0.15 m (5 cm - 15 cm)
}

export interface SlottedMassSpec {
  massEachKg: number; // e.g. 0.1 kg to 0.5 kg each
  positionRadiusM: number; // distance from center of disc
  count: number; // 0, 2, 4
}

export interface ScrewGaugeReading {
  id: string;
  positionName: string; // 'Top', 'Middle', 'Bottom'
  mainScaleMm: number;
  circularScaleDivisions: number;
  zeroCorrectionMm: number;
  measuredDiameterMm: number;
}

export interface OscillationState {
  isOscillating: boolean;
  initialAngleDeg: number;
  currentAngleDeg: number;
  angularVelocityRadS: number;
  angularAccelRadS2: number;
  elapsedTimeSeconds: number;
  targetOscillations: number;
  currentOscillationCount: number;
  dampingLevel: 'OFF' | 'LOW' | 'REALISTIC';
  noiseLevel: 'OFF' | 'REALISTIC';
}

export interface TorsionalTrial {
  trialNumber: number;
  addedMassTotalKg: number;
  totalMassKg: number;
  totalMomentOfInertiaKgM2: number;
  numOscillations: number;
  totalTimeSeconds: number;
  periodTSeconds: number;
  periodSquaredT2: number;
  derivedG_GPa?: number;
  notes?: string;
}

export interface TorsionalRegressionResult {
  slope: number; // m = T^2 / I (s^2 / (kg*m^2))
  rSquared: number;
  experimentalG_GPa: number;
  referenceG_GPa: number;
  percentageError: number;
}

export interface LabEvent {
  type:
    | 'wire_measured'
    | 'screw_gauge_read'
    | 'disc_rotated'
    | 'pendulum_released'
    | 'oscillation_completed'
    | 'trial_saved'
    | 'material_changed';
  t: number;
  [key: string]: any;
}

export interface MisconceptionWarning {
  id: string;
  title: string;
  message: string;
  severity: 'warning' | 'error' | 'info';
}
