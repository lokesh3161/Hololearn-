/**
 * Polymer Chemistry Specific Type Definitions — HoloLearn Virtual Laboratory
 * Experiment 06: Preparation of Phenol-Formaldehyde Polymer
 */

export interface PhenolFormaldehydeConfig {
  id: "phenol-formaldehyde-polymer";
  pathway: "resol" | "novolac";
  catalystCondition: "acidic" | "basic";
  educationalParameters: {
    reactionProgressRate: number;
    condensationThreshold: number;
    gelationThreshold: number;
    curingProgressRate: number;
  };
  visualModel: {
    initialAppearance: string;
    intermediateAppearance: string;
    polymerAppearance: string;
  };
  safety: {
    virtualOnly: true;
    hazardousReagentWarning: true;
  };
}

export interface PolymerReactionState {
  phenolPresent: boolean;
  formaldehydePresent: boolean;
  catalystConditionMet: boolean;
  temperatureConditionMet: boolean;
  reactionProgress: number; // 0 - 100%
  hydroxymethylationProgress: number; // 0 - 100%
  condensationProgress: number; // 0 - 100%
  oligomerFraction: number; // 0 - 1
  polymerFraction: number; // 0 - 1
  crosslinkDensity: number; // 0 - 1
  waterByproductRelative: number; // 0 - 1
  viscosity: number; // in cP (centipoise)
  gelationProgress: number; // 0 - 100%
  curingProgress: number; // 0 - 100%
  finalState:
    | "unreacted"
    | "mixed"
    | "reacting"
    | "oligomer-forming"
    | "polymer-forming"
    | "gel-forming"
    | "cured";
}

export interface ThermalState {
  currentTemperature: number; // °C
  targetTemperature: number; // °C
  heatingActive: boolean;
  temperatureProgress: number; // 0 - 1
  overheating: boolean;
}

export interface PolymerExperimentRecord {
  pathway: "resol" | "novolac";
  reagentEvents: string[];
  reactionCondition: string;
  mixingCompleted: boolean;
  thermalHistory: {
    minimumTemperature: number;
    maximumTemperature: number;
  };
  finalReactionProgress: number;
  finalPolymerFraction: number;
  finalViscosity: number;
  finalCrosslinkDensity: number;
  curingCompleted: boolean;
  eventLogIds: string[];
}

export type PolymerEvent =
  | { type: "polymer_lab_started" }
  | { type: "reagent_selected"; reagent: "phenol" | "formaldehyde" | "catalyst" }
  | { type: "reagent_measured"; reagent: string; simulatedAmount: number }
  | { type: "reagent_transferred"; reagent: string }
  | { type: "reaction_condition_selected"; condition: "acidic" | "basic" }
  | { type: "mixing_started" }
  | { type: "mixing_completed" }
  | { type: "heating_started" }
  | { type: "temperature_reached" }
  | { type: "reaction_progressed"; progress: number }
  | { type: "viscosity_changed"; viscosity: number }
  | { type: "gelation_started" }
  | { type: "polymer_formed" }
  | { type: "curing_started" }
  | { type: "curing_completed" }
  | { type: "polymer_sample_inspected" };

export type MolecularStage =
  | "monomers"
  | "intermediates"
  | "oligomers"
  | "polymer-chains"
  | "crosslinked-network";

export interface PolymerMaterialVisualState {
  phase: "liquid" | "viscous-liquid" | "gel" | "cured-solid";
  viscosity: number;
  opacity: number;
  surfaceMotion: number;
  flowSpeed: number;
  shapeRetention: number;
  polymerFraction: number;
  crosslinkDensity: number;
  colorHex: string;
  label: string;
}
