/**
 * Carey Foster's Bridge Specific Type Definitions — HoloLearn Virtual Laboratory
 * Experiment 08: Verification of Laws of Series and Parallel Combination of Resistances by Carey Foster's Bridge Method
 */

export interface ExperimentConfig {
  id: "carey-foster-bridge";
  bridgeWire: {
    lengthCm: number; // 100
    resistancePerCmOhm: number; // r = 0.05 ohm/cm
  };
  resistanceBoxSteps: number[]; // [1, 2, 5, 10, 20, 50, 100]
  signConvention: "l2-minus-l1" | "l1-minus-l2";
  nullTolerance: {
    maxDeflectionDivisionsToRecord: number; // e.g. 0.5
  };
  noise?: {
    enabled: boolean;
    galvanometerJitterDivisions: number;
    jockeyReadingNoiseCm: number;
  };
  contactResistance?: {
    idealMode: boolean;
    realisticExtraOhm: number;
  };
}

export interface CircuitState {
  mode: "series" | "parallel";
  resistors: { id: string; name: string; ohms: number; inCircuit: boolean }[];
  standardResistanceOhm: number; // P (Resistance Box)
  unknownResistanceOhm: number; // Y (Derived equivalent under test)
  reversed: boolean; // Commutator state (swaps P and Y)
  keyClosed: boolean;
  jockeyPositionCm: number; // 0 - 100 cm
}

export interface NullPointMeasurement {
  jockeyPositionCm: number;
  galvanometerDeflectionDivisions: number;
  reversed: boolean;
  t: number;
}

export interface ResistanceTrial {
  trialNumber: number;
  combination: "series" | "parallel";
  resistorIds: string[];
  l1Cm: number; // Initial balance length
  l2Cm: number; // Balance length after reversal
  deltaLCm: number; // l2 - l1
  experimentalResistanceOhm: number; // Y = P + r * deltaL
  theoreticalResistanceOhm: number; // Rs = R1 + R2 or Rp = (R1*R2)/(R1+R2)
  absoluteErrorOhm: number;
  percentageError: number;
}

export type LabEvent =
  | { type: "component_connected"; componentId: string; t: number }
  | { type: "combination_selected"; mode: "series" | "parallel"; t: number }
  | { type: "key_closed"; t: number }
  | { type: "jockey_moved"; positionCm: number; t: number }
  | { type: "null_point_recorded"; measurement: NullPointMeasurement; t: number }
  | { type: "commutator_reversed"; t: number }
  | { type: "trial_recorded"; trial: ResistanceTrial; t: number }
  | { type: "invalid_record_attempt"; deflectionDivisions: number; t: number };

export interface MisconceptionWarning {
  id: string;
  title: string;
  message: string;
  eventTrigger: string;
  severity: "warning" | "info";
}
