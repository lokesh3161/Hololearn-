/**
 * PH Measurement Engine & Electrochemical Simulation Infrastructure
 * HoloLearn Virtual Laboratory — Experiment 05
 */

import type {
  PHExperimentConfig,
  PHMeterState,
  PHStabilityState,
} from '../types/phExperimentTypes';

export const DEFAULT_PH_EXPERIMENT_CONFIG: PHExperimentConfig = {
  id: "ph-water-soil",
  instrument: {
    name: "Digital pH Meter",
    resolutionPh: 0.01,
    stabilizationThresholdPh: 0.02,
    stabilizationTimeMs: 3000,
    temperatureCompensationEnabled: true,
  },
  calibration: {
    required: true,
    buffers: [
      { ph: 7.00, tolerancePh: 0.05 },
      { ph: 4.00, tolerancePh: 0.05 },
      { ph: 10.00, tolerancePh: 0.05 },
    ],
    acceptableCalibrationErrorPh: 0.05,
  },
  waterSample: {
    name: "WATER SAMPLE A",
    hiddenPH: 6.86,
    temperatureC: 25.0,
    sampleVolumeMl: 50,
  },
  soilSample: {
    name: "GARDEN SOIL EXTRACT",
    hiddenPH: 5.65,
    temperatureC: 25.0,
    soilMassG: 10.0,
    extractionLiquidVolumeMl: 50.0,
    extractionMethod: "1:5 Soil-Water Extract Suspension",
  },
  measurement: {
    stabilizationTolerancePh: 0.02,
    stableReadingDurationMs: 2500,
    repeatMeasurements: 3,
    acceptableRepeatDifferencePh: 0.05,
  },
  realisticVariation: {
    enabled: true,
    electrodeNoisePh: 0.01,
    temperatureEffectPh: 0.03,
    readingVariationPh: 0.02,
  },
};

export class PHMeasurementEngine {
  /**
   * Calculate Hydrogen Ion Concentration [H+] in mol/L
   * [H+] = 10^-pH
   */
  static calculateHydrogenIonConcentration(ph: number): number {
    if (ph <= 0) return 1.0;
    return Math.pow(10, -ph);
  }

  /**
   * Calculate target reading for electrode based on chemical state, calibration state,
   * rinsing state, temperature, and realistic variation settings.
   */
  static calculateTargetInstrumentPH(
    truePH: number,
    meterState: PHMeterState,
    config: PHExperimentConfig = DEFAULT_PH_EXPERIMENT_CONFIG,
    options?: {
      isDirtyElectrode?: boolean;
      previousPH?: number | null;
      realisticModeEnabled?: boolean;
    }
  ): number {
    let target = truePH;

    // 1. Calibration Offset Effect
    // If uncalibrated, introduce a default systematic offset (~ +0.45 pH)
    if (meterState.calibrationState === 'uncalibrated') {
      target += 0.45;
    } else if (meterState.calibrationState === 'calibrated') {
      target += meterState.calibrationOffsetPh;
    } else if (meterState.calibrationState === 'calibration-failed') {
      target += 1.25;
    }

    // 2. Dirty Electrode Carryover Effect (if electrode was not rinsed)
    if (options?.isDirtyElectrode && options?.previousPH != null) {
      const carryover = (options.previousPH - truePH) * 0.15;
      target += carryover;
    }

    // 3. Uncompensated Temperature Effect
    if (!config.instrument.temperatureCompensationEnabled && meterState.temperatureC !== 25.0) {
      const tempDelta = meterState.temperatureC - 25.0;
      target += tempDelta * 0.003; // Nernstian slope temperature effect shift
    }

    // 4. Realistic Noise (controlled deterministic offset)
    if (options?.realisticModeEnabled && config.realisticVariation?.enabled) {
      target += (config.realisticVariation.readingVariationPh || 0.01);
    }

    // Round to resolution
    const precision = config.instrument.resolutionPh === 0.01 ? 2 : 1;
    return Number(target.toFixed(precision));
  }

  /**
   * Smoothly step displayed pH towards target value (Stabilization Loop)
   */
  static stepStabilization(
    currentState: PHStabilityState,
    targetPH: number,
    config: PHExperimentConfig = DEFAULT_PH_EXPERIMENT_CONFIG,
    dtSeconds: number = 0.1
  ): PHStabilityState {
    const diff = targetPH - currentState.currentPH;
    const absDiff = Math.abs(diff);
    const threshold = config.instrument.stabilizationThresholdPh;

    if (absDiff <= threshold) {
      return {
        currentPH: targetPH,
        targetInstrumentPH: targetPH,
        driftRate: 0,
        noiseAmplitude: 0,
        stabilityScore: 100,
        stable: true,
      };
    }

    // Asymptotic convergence towards target
    const step = diff * Math.min(1.0, dtSeconds * 1.5);
    const newPH = Number((currentState.currentPH + step).toFixed(2));
    const newAbsDiff = Math.abs(targetPH - newPH);

    // Calculate stability score (0 to 100%)
    const initialSpan = Math.max(1.0, Math.abs(targetPH - currentState.currentPH));
    const rawScore = Math.max(0, Math.min(100, Math.round((1 - newAbsDiff / initialSpan) * 100)));
    const stable = newAbsDiff <= threshold;

    return {
      currentPH: newPH,
      targetInstrumentPH: targetPH,
      driftRate: Math.abs(step),
      noiseAmplitude: config.realisticVariation?.electrodeNoisePh || 0.005,
      stabilityScore: stable ? 100 : rawScore,
      stable,
    };
  }

  /**
   * Evaluate calibration point
   */
  static evaluateCalibrationPoint(
    expectedBufferPH: number,
    observedPH: number,
    config: PHExperimentConfig = DEFAULT_PH_EXPERIMENT_CONFIG
  ): { valid: boolean; offset: number; errorMsg?: string } {
    const offset = Number((observedPH - expectedBufferPH).toFixed(2));
    const maxErr = config.calibration.acceptableCalibrationErrorPh;

    if (Math.abs(offset) > maxErr) {
      return {
        valid: false,
        offset,
        errorMsg: `Calibration point outside tolerance (Expected ${expectedBufferPH.toFixed(2)}, Observed ${observedPH.toFixed(2)}).`,
      };
    }

    return { valid: true, offset };
  }

  /**
   * Classify pH into standard soil/water environmental acidity categories
   */
  static classifyPH(ph: number): string {
    if (ph < 3.5) return "Extremely Acidic";
    if (ph < 5.0) return "Strongly Acidic";
    if (ph < 6.0) return "Moderately Acidic";
    if (ph < 6.8) return "Slightly Acidic";
    if (ph <= 7.2) return "Neutral";
    if (ph < 8.0) return "Slightly Alkaline";
    if (ph < 9.0) return "Moderately Alkaline";
    if (ph < 10.5) return "Strongly Alkaline";
    return "Extremely Alkaline";
  }
}
