/**
 * pH Experiment Specific Type Definitions — HoloLearn Virtual Laboratory
 * Experiment 05: Determination of pH of Water and Soil Samples
 */

export interface PHExperimentConfig {
  id: "ph-water-soil";
  instrument: {
    name: string;
    resolutionPh: number;
    stabilizationThresholdPh: number;
    stabilizationTimeMs: number;
    temperatureCompensationEnabled: boolean;
  };
  calibration: {
    required: boolean;
    buffers: {
      ph: number;
      tolerancePh: number;
    }[];
    acceptableCalibrationErrorPh: number;
  };
  waterSample: {
    name: string;
    hiddenPH: number;
    temperatureC: number;
    sampleVolumeMl: number;
  };
  soilSample: {
    name: string;
    hiddenPH: number;
    temperatureC: number;
    soilMassG: number;
    extractionLiquidVolumeMl: number;
    extractionMethod: string;
  };
  measurement: {
    stabilizationTolerancePh: number;
    stableReadingDurationMs: number;
    repeatMeasurements: number;
    acceptableRepeatDifferencePh: number;
  };
  realisticVariation?: {
    enabled: boolean;
    electrodeNoisePh: number;
    temperatureEffectPh: number;
    readingVariationPh: number;
  };
}

export interface PHSampleState {
  sampleType: "water" | "soil-extract";
  truePH: number;
  temperatureC: number;
  prepared: boolean;
  homogenized: boolean;
  settled: boolean;
  electrodeInserted: boolean;
  electrodeStable: boolean;
  measuredPH: number | null;
  measurementCount: number;
}

export interface PHMeterState {
  powerOn: boolean;
  calibrationState:
    | "uncalibrated"
    | "calibrating"
    | "calibrated"
    | "calibration-failed";
  selectedBufferPH: number | null;
  electrodeCondition:
    | "dry"
    | "ready"
    | "rinsing"
    | "immersed"
    | "stabilizing"
    | "stable";
  temperatureC: number;
  displayedPH: number | null;
  stablePH: number | null;
  stabilityScore: number;
  calibrationOffsetPh: number;
  measurementValid: boolean;
}

export interface PHStabilityState {
  currentPH: number;
  targetInstrumentPH: number;
  driftRate: number;
  noiseAmplitude: number;
  stabilityScore: number;
  stable: boolean;
}

export interface PHMeasurement {
  measurementNumber: number;
  sampleType: "water" | "soil-extract";
  measuredPH: number;
  temperatureC: number;
  stable: boolean;
  calibrationValid: boolean;
  electrodeRinsed: boolean;
  eventLogIds: string[];
  timestamp?: string;
}

export type PHEvent =
  | { type: "ph_meter_powered_on" }
  | { type: "electrode_rinsed" }
  | { type: "buffer_selected"; bufferPH: number }
  | { type: "electrode_immersed"; sampleType: string }
  | { type: "calibration_started"; bufferPH: number }
  | { type: "calibration_stabilized"; observedPH: number }
  | { type: "calibration_confirmed"; expectedPH: number; observedPH: number }
  | { type: "calibration_completed" }
  | { type: "water_sample_prepared"; volumeMl: number }
  | { type: "water_measurement_started" }
  | { type: "ph_reading_stabilized"; sampleType: "water" | "soil-extract"; measuredPH: number }
  | { type: "water_measurement_recorded"; measuredPH: number }
  | { type: "soil_weighed"; massG: number }
  | { type: "soil_extraction_liquid_added"; volumeMl: number }
  | { type: "soil_mixed" }
  | { type: "soil_settled" }
  | { type: "soil_measurement_started" }
  | { type: "soil_measurement_recorded"; measuredPH: number };
