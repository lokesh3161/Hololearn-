export interface LaserSpec {
  id: string;
  name: string;
  wavelengthNm: number; // e.g. 650 nm, 635 nm, 532 nm
  colorHex: string; // e.g. '#ef4444' (red), '#22c55e' (green)
  intensityPercent: number; // 0 - 100%
  alignmentDeg: number; // Laser beam axis offset in degrees (-5° to +5°)
}

export interface GratingSpec {
  id: string;
  name: string;
  linesPerMm: number; // e.g. 300, 600, 1000, 1200 lines/mm
  spacingM: number; // d = 1 / (linesPerMm * 1000) meters
  rotationDeg: number; // Grating normal rotation angle (-10° to +10°)
}

export interface DiffractionOrderSpot {
  orderN: number; // ... -3, -2, -1, 0, +1, +2, +3 ...
  angleRad: number; // theta_n in radians
  angleDeg: number; // theta_n in degrees
  displacementXM: number; // x_n = L * tan(theta_n) on projection screen in meters
  intensityRatio: number; // 1.0 for central m=0, decaying for higher orders
  isObservable: boolean; // true if sin(theta) <= 1.0 and within screen bounds
}

export interface DiffractionTrial {
  trialNumber: number;
  laserName: string;
  theoreticalWavelengthNm: number;
  linesPerMm: number;
  gratingSpacingM: number;
  orderN: number;
  screenDistanceL: number; // meters
  measuredDisplacementXM: number; // meters
  calculatedAngleDeg: number;
  experimentalWavelengthNm: number;
  errorPercent: number;
}

export interface DiffractionRegressionResult {
  slope: number;
  rSquared: number;
  experimentalWavelengthNm: number;
  theoreticalWavelengthNm: number;
  percentageError: number;
}

export interface GoniometerReading {
  mainScaleDeg: number;
  vernierDivisions: number;
  leastCountDeg: number; // 0.01°
  totalAngleDeg: number;
}

export interface MisconceptionWarning {
  id: string;
  title: string;
  message: string;
  severity: 'warning' | 'error' | 'info';
}
