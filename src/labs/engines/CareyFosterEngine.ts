/**
 * Carey Foster's Bridge Physics Engine & Circuit Math
 * HoloLearn Virtual Physics Laboratory — Experiment 08
 */

import type {
  ExperimentConfig,
  CircuitState,
  NullPointMeasurement,
  ResistanceTrial,
  LabEvent,
  MisconceptionWarning,
} from '../types/careyFosterTypes';

export const DEFAULT_CAREY_FOSTER_CONFIG: ExperimentConfig = {
  id: 'carey-foster-bridge',
  bridgeWire: {
    lengthCm: 100,
    resistancePerCmOhm: 0.05, // r = 0.05 ohm/cm
  },
  resistanceBoxSteps: [1, 2, 5, 10, 20, 50, 100],
  signConvention: 'l2-minus-l1',
  nullTolerance: {
    maxDeflectionDivisionsToRecord: 0.5,
  },
  noise: {
    enabled: false,
    galvanometerJitterDivisions: 0.1,
    jockeyReadingNoiseCm: 0.05,
  },
  contactResistance: {
    idealMode: true,
    realisticExtraOhm: 0.02,
  },
};

export class CareyFosterEngine {
  /**
   * Initial default CircuitState
   */
  static getInitialCircuitState(): CircuitState {
    return {
      mode: 'series',
      resistors: [
        { id: 'r1', name: 'Resistor R1 (2.0 Ω)', ohms: 2.0, inCircuit: true },
        { id: 'r2', name: 'Resistor R2 (3.0 Ω)', ohms: 3.0, inCircuit: true },
        { id: 'r3', name: 'Resistor R3 (5.0 Ω)', ohms: 5.0, inCircuit: false },
      ],
      standardResistanceOhm: 2.0, // P = 2.0 Ω
      unknownResistanceOhm: 5.0, // Y = 5.0 Ω (Series 2+3)
      reversed: false,
      keyClosed: false,
      jockeyPositionCm: 50.0,
    };
  }

  /**
   * Calculate theoretical combined resistance (Series / Parallel)
   */
  static calculateTheoreticalResistance(
    mode: 'series' | 'parallel',
    resistorOhms: number[]
  ): number {
    if (resistorOhms.length === 0) return 0.0;

    if (mode === 'series') {
      const sum = resistorOhms.reduce((a, b) => a + b, 0);
      return Number(sum.toFixed(3));
    } else {
      const invSum = resistorOhms.reduce((acc, r) => acc + (r > 0 ? 1.0 / r : 0), 0);
      const parallel = invSum > 0 ? 1.0 / invSum : 0;
      return Number(parallel.toFixed(3));
    }
  }

  /**
   * Compute true null position l0 on 100 cm bridge wire
   * Formula: l0 = (100*r + Y - P) / (2*r)
   */
  static calculateTrueNullPositionCm(
    state: CircuitState,
    config: ExperimentConfig = DEFAULT_CAREY_FOSTER_CONFIG
  ): number {
    const r = config.bridgeWire.resistancePerCmOhm;
    const P = state.standardResistanceOhm;
    
    // Include contact resistance if realistic mode active
    const extraR = !config.contactResistance?.idealMode
      ? (config.contactResistance?.realisticExtraOhm || 0.02) * 2
      : 0.0;

    const Y = state.unknownResistanceOhm + extraR;

    // Direct null: l1 = (100*r + Y - P) / (2*r)
    let l0 = (100 * r + Y - P) / (2 * r);

    // If commutator is reversed (swaps P and Y), balance shifts to l2 = 100 - l0
    if (state.reversed) {
      l0 = (100 * r + P - Y) / (2 * r);
    }

    // Clamp l0 to physical wire bounds 5 cm - 95 cm
    return Math.max(5.0, Math.min(95.0, l0));
  }

  /**
   * Continuous Galvanometer Deflection Function
   * Returns deflection in scale divisions (-30 to +30)
   */
  static calculateGalvanometerDeflection(
    state: CircuitState,
    config: ExperimentConfig = DEFAULT_CAREY_FOSTER_CONFIG
  ): number {
    if (!state.keyClosed) return 0.0;

    const l0 = CareyFosterEngine.calculateTrueNullPositionCm(state, config);
    const diff = state.jockeyPositionCm - l0;

    // Continuous deflection slope: ~1.5 divisions per cm imbalance
    let deflection = Math.max(-30.0, Math.min(30.0, diff * 1.5));

    // Add noise jitter if enabled
    if (config.noise?.enabled) {
      const jitter = (Math.random() - 0.5) * (config.noise.galvanometerJitterDivisions || 0.1);
      deflection += jitter;
    }

    return Number(deflection.toFixed(2));
  }

  /**
   * Derive experimental resistance Y from balance lengths l1 and l2
   * Formula: Y = P + r * (l2 - l1)
   */
  static calculateExperimentalResistance(
    l1Cm: number,
    l2Cm: number,
    standardPOhm: number,
    config: ExperimentConfig = DEFAULT_CAREY_FOSTER_CONFIG
  ): { deltaLCm: number; experimentalResistanceOhm: number } {
    const r = config.bridgeWire.resistancePerCmOhm;
    const deltaLCm = Number((l2Cm - l1Cm).toFixed(2));
    const experimentalResistanceOhm = Number((standardPOhm + r * deltaLCm).toFixed(3));

    return {
      deltaLCm,
      experimentalResistanceOhm,
    };
  }

  /**
   * Grounded Misconception Detection
   */
  static detectMisconceptions(
    events: LabEvent[],
    state: CircuitState,
    trials: ResistanceTrial[]
  ): MisconceptionWarning[] {
    const warnings: MisconceptionWarning[] = [];

    // Check for open key measurement attempt
    const openKeyEvents = events.filter((e) => e.type === 'invalid_record_attempt');
    if (openKeyEvents.length > 0) {
      warnings.push({
        id: 'open-key-attempt',
        title: 'Circuit Plug Key Disconnected',
        message: 'Attempted to measure balance point with the plug key open. Close the plug key to energize the bridge.',
        eventTrigger: 'invalid_record_attempt',
        severity: 'warning',
      });
    }

    // Check for un-reversed commutator trial recording (l1 == l2)
    trials.forEach((t) => {
      if (Math.abs(t.l1Cm - t.l2Cm) < 0.1 && t.l1Cm > 0) {
        warnings.push({
          id: `unreversed-trial-${t.trialNumber}`,
          title: `Commutator Reversal Omitted (Trial ${t.trialNumber})`,
          message: `Balance lengths l1 and l2 are identical (${t.l1Cm} cm). Ensure you reverse the commutator switch between recordings to eliminate copper strip resistance errors.`,
          eventTrigger: `trial_recorded_${t.trialNumber}`,
          severity: 'warning',
        });
      }
    });

    return warnings;
  }
}
