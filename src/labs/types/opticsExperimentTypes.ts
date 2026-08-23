/**
 * Optics Specific Type Definitions — HoloLearn Virtual Laboratory
 * Experiment 07: Determination of Radius of Curvature of a Given Plano-Convex Lens by Newton’s Rings
 */

export interface OpticsLightSource {
  id: string;
  name: string;
  wavelengthNm: number; // in nanometers (e.g. 589 nm)
  colorHex: string;
}

export interface NewtonsRingsConfig {
  id: "newtons-rings";
  defaultWavelengthNm: number; // e.g. 589 nm
  defaultRadiusCm: number; // e.g. 100 cm
  lightSources: OpticsLightSource[];
}

export interface MicroscopeState {
  positionXMm: number; // position in mm (e.g. -15.0 mm to +15.0 mm)
  focusBlurPx: number; // 0 = sharp, >0 = blurred
  isFocused: boolean;
  mainScaleMm: number; // Vernier main scale reading in mm
  vernierScaleMm: number; // Vernier scale fractional reading in mm
  leastCountMm: number; // 0.01 mm
  locked: boolean;
}

export interface NewtonsRingsReading {
  ringOrder: number; // n (e.g. 2, 4, 6, 8, 10, 12, 14, 16)
  leftReadingMm: number;
  rightReadingMm: number;
  diameterMm: number;
  diameterCm: number;
  diameterSqCm2: number;
}

export interface NewtonsRingsState {
  wavelengthNm: number;
  radiusCm: number;
  microscope: MicroscopeState;
  readings: NewtonsRingsReading[];
  noiseEnabled: boolean;
  activeView: 'APPARATUS' | 'MICROSCOPE' | 'TOP' | 'RINGS' | 'MEASUREMENT';
}

export type OpticsEvent =
  | { type: "optics_lab_started" }
  | { type: "light_source_selected"; wavelengthNm: number }
  | { type: "microscope_focused" }
  | { type: "microscope_moved"; positionMm: number }
  | { type: "reading_added"; ringOrder: number; leftMm: number; rightMm: number }
  | { type: "data_cleared" }
  | { type: "graph_fitted"; slope: number; derivedRadiusCm: number }
  | { type: "noise_toggled"; enabled: boolean };

export interface MisconceptionWarning {
  id: string;
  title: string;
  message: string;
  eventTrigger: string;
  severity: "warning" | "info";
}

export interface TrialData {
  trialId: number;
  wavelengthNm: number;
  readings: NewtonsRingsReading[];
  slopeCm2PerN: number;
  derivedRadiusCm: number;
  rSquared: number;
}
