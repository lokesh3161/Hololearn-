/**
 * Dielectric Constant Specific Type Definitions — HoloLearn Virtual Laboratory
 * Experiment 09: Determination of Dielectric Constant Using Charging and Discharging Method
 */

export interface DielectricMaterial {
  id: string;
  name: string; // "Air" | "Paper" | "Glass" | "Mica" | "Ceramic" | "Plastic" | "Custom"
  relativePermittivity: number; // Simulation reference value (eps_r)
  typicalRange?: [number, number];
  colorHex: string;
  isCustom?: boolean;
}

export interface ExperimentConfig {
  id: "dielectric-constant-rc";
  plate: {
    areaRangeM2: [number, number]; // e.g. [0.01, 0.05] (100 to 500 cm²)
    separationRangeMm: [number, number]; // e.g. [1, 10] mm
  };
  supply: { voltageRangeV: [number, number] }; // e.g. [1, 12] V
  resistor: { ohmsRangeOhm: [number, number] }; // e.g. [10000, 100000] (10k to 100k)
  materials: DielectricMaterial[];
  sampling: {
    intervalSeconds: number; // e.g. 1.0s
  };
  noise?: {
    enabled: boolean;
    voltageNoiseFractionOfReading: number;
    timingNoiseSeconds: number;
  };
}

export interface CapacitorState {
  areaM2: number; // e.g. 0.02 m² (200 cm²)
  separationM: number; // e.g. 0.002 m (2 mm)
  dielectric: {
    materialId: string;
    insertionFraction: number; // 0.0 (outside) to 1.0 (fully inserted)
  };
  customPermittivity?: number;
}

export interface RCCircuitState {
  mode: "charging" | "discharging" | "idle";
  supplyVoltageV: number; // e.g. 10 V
  resistanceOhm: number; // e.g. 50,000 Ω (50 kΩ)
  switchClosed: boolean;
  elapsedTimeSeconds: number;
}

export interface Reading {
  tSeconds: number;
  voltageV: number;
  currentA: number;
  mode: "charging" | "discharging";
  materialId: string;
  dielectricInsertionFraction: number;
}

export interface ExperimentalResult {
  materialId: string;
  slopeFromLnVvsT: number; // Linear regression fit of ln(V/V0) vs t
  experimentalCapacitanceF: number; // -1 / (R * slope)
  experimentalTimeConstantS: number;
  referenceEpsR: number; // Theoretical reference
  experimentalEpsR: number; // Derived: C_exp / C_air_exp
  percentageError: number;
}

export type LabEvent =
  | { type: "component_connected"; componentId: string; t: number }
  | { type: "circuit_validated"; valid: boolean; issue?: string; t: number }
  | { type: "switch_closed"; mode: "charging" | "discharging"; t: number }
  | { type: "reading_recorded"; reading: Reading; t: number }
  | { type: "dielectric_moved"; insertionFraction: number; t: number }
  | { type: "material_selected"; materialId: string; t: number }
  | { type: "result_calculated"; result: ExperimentalResult; t: number };

export interface MisconceptionWarning {
  id: string;
  title: string;
  message: string;
  eventTrigger: string;
  severity: "warning" | "info";
}
