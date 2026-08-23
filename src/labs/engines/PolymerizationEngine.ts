/**
 * Polymerization Engine & Reaction Simulation Infrastructure
 * HoloLearn Virtual Laboratory — Experiment 06
 */

import type {
  PhenolFormaldehydeConfig,
  PolymerReactionState,
  ThermalState,
  MolecularStage,
} from '../types/polymerExperimentTypes';

export const DEFAULT_PHENOL_FORMALDEHYDE_CONFIG: PhenolFormaldehydeConfig = {
  id: "phenol-formaldehyde-polymer",
  pathway: "resol",
  catalystCondition: "basic",
  educationalParameters: {
    reactionProgressRate: 1.5, // % per tick
    condensationThreshold: 30, // %
    gelationThreshold: 70, // %
    curingProgressRate: 2.0, // % per tick
  },
  visualModel: {
    initialAppearance: "Clear Pale Amber Solution",
    intermediateAppearance: "Viscous Milky Yellow Emulsion",
    polymerAppearance: "Rigid Crosslinked Reddish-Brown Thermoset Resin",
  },
  safety: {
    virtualOnly: true,
    hazardousReagentWarning: true,
  },
};

export class PolymerizationEngine {
  /**
   * Initial default reaction state
   */
  static getInitialReactionState(): PolymerReactionState {
    return {
      phenolPresent: false,
      formaldehydePresent: false,
      catalystConditionMet: false,
      temperatureConditionMet: false,
      reactionProgress: 0,
      hydroxymethylationProgress: 0,
      condensationProgress: 0,
      oligomerFraction: 0,
      polymerFraction: 0,
      crosslinkDensity: 0,
      waterByproductRelative: 0,
      viscosity: 1.5, // cP
      gelationProgress: 0,
      curingProgress: 0,
      finalState: "unreacted",
    };
  }

  /**
   * Initial default thermal state
   */
  static getInitialThermalState(): ThermalState {
    return {
      currentTemperature: 25.0,
      targetTemperature: 90.0,
      heatingActive: false,
      temperatureProgress: 0,
      overheating: false,
    };
  }

  /**
   * Update thermal state based on heating activation
   */
  static stepThermal(
    currentState: ThermalState,
    dtSeconds: number = 0.2
  ): ThermalState {
    let target = currentState.heatingActive ? currentState.targetTemperature : 25.0;
    let diff = target - currentState.currentTemperature;

    if (Math.abs(diff) < 0.2) {
      return {
        ...currentState,
        currentTemperature: target,
        temperatureProgress: currentState.heatingActive ? 1.0 : 0.0,
        overheating: currentState.currentTemperature > 105.0,
      };
    }

    const step = diff * Math.min(1.0, dtSeconds * 0.4);
    const newTemp = Number((currentState.currentTemperature + step).toFixed(1));
    const progress = Math.max(0, Math.min(1, (newTemp - 25.0) / (90.0 - 25.0)));

    return {
      ...currentState,
      currentTemperature: newTemp,
      temperatureProgress: progress,
      overheating: newTemp > 105.0,
    };
  }

  /**
   * Calculate deterministic reaction progression step
   */
  static stepReaction(
    currentState: PolymerReactionState,
    thermalState: ThermalState,
    isMixed: boolean,
    pathway: "resol" | "novolac" = "resol",
    config: PhenolFormaldehydeConfig = DEFAULT_PHENOL_FORMALDEHYDE_CONFIG
  ): PolymerReactionState {
    // Reaction requires phenol, formaldehyde, correct catalyst condition, mixing, and thermal window (temp >= 60°C)
    const canReact =
      currentState.phenolPresent &&
      currentState.formaldehydePresent &&
      currentState.catalystConditionMet &&
      isMixed &&
      thermalState.currentTemperature >= 55.0;

    if (!canReact) {
      const stateLabel = !isMixed
        ? "mixed"
        : currentState.phenolPresent && currentState.formaldehydePresent
        ? "unreacted"
        : "unreacted";

      return {
        ...currentState,
        temperatureConditionMet: thermalState.currentTemperature >= 55.0,
        finalState: currentState.reactionProgress > 0 ? currentState.finalState : stateLabel,
      };
    }

    // Advance reaction progress
    const rate = config.educationalParameters.reactionProgressRate * (thermalState.currentTemperature / 90.0);
    const newProgress = Math.min(100, currentState.reactionProgress + rate * 0.3);

    // Compute reaction stages based on progress
    const hydroProgress = Math.min(100, newProgress * 1.4);
    const condProgress = Math.max(0, Math.min(100, (newProgress - 20) * 1.25));
    const oligomerFrac = Number(Math.max(0, Math.min(1.0, hydroProgress / 100 - condProgress / 200)).toFixed(2));
    const polymerFrac = Number(Math.max(0, Math.min(1.0, condProgress / 100)).toFixed(2));
    
    // Crosslink density increases in Resol pathway or when curing progresses
    const crosslink = pathway === 'resol'
      ? Number(Math.max(0, Math.min(1.0, (condProgress - 40) / 60)).toFixed(2))
      : Number(Math.max(0, Math.min(0.8, (condProgress - 50) / 70)).toFixed(2));

    const waterByproduct = Number((condProgress * 0.01).toFixed(2));
    const gelation = Math.max(0, Math.min(100, (newProgress - config.educationalParameters.gelationThreshold) * 3.33));
    const viscosity = PolymerizationEngine.calculateViscosity(polymerFrac, crosslink);

    let finalState: PolymerReactionState['finalState'] = "reacting";
    if (newProgress < 25) finalState = "reacting";
    else if (newProgress < 55) finalState = "oligomer-forming";
    else if (newProgress < 85) finalState = "polymer-forming";
    else if (gelation > 0 && gelation < 100) finalState = "gel-forming";
    else if (currentState.curingProgress >= 90 || gelation >= 100) finalState = "cured";

    return {
      ...currentState,
      temperatureConditionMet: true,
      reactionProgress: Number(newProgress.toFixed(1)),
      hydroxymethylationProgress: Number(hydroProgress.toFixed(1)),
      condensationProgress: Number(condProgress.toFixed(1)),
      oligomerFraction: oligomerFrac,
      polymerFraction: polymerFrac,
      crosslinkDensity: crosslink,
      waterByproductRelative: waterByproduct,
      viscosity,
      gelationProgress: Number(gelation.toFixed(1)),
      finalState,
    };
  }

  /**
   * Advance curing process (heat-driven thermoset crosslinking)
   */
  static stepCuring(
    currentState: PolymerReactionState,
    thermalState: ThermalState
  ): PolymerReactionState {
    if (currentState.reactionProgress < 50 || thermalState.currentTemperature < 70.0) {
      return currentState;
    }

    const newCuring = Math.min(100, currentState.curingProgress + 2.5);
    const newCrosslink = Math.min(1.0, currentState.crosslinkDensity + 0.02);
    const newViscosity = PolymerizationEngine.calculateViscosity(currentState.polymerFraction, newCrosslink, newCuring);

    return {
      ...currentState,
      curingProgress: Number(newCuring.toFixed(1)),
      crosslinkDensity: Number(newCrosslink.toFixed(2)),
      viscosity: newViscosity,
      finalState: newCuring >= 90 ? "cured" : "gel-forming",
    };
  }

  /**
   * Calculate viscosity in cP
   */
  static calculateViscosity(
    polymerFraction: number,
    crosslinkDensity: number,
    curingProgress: number = 0
  ): number {
    // Baseline water-like mixture ~ 1.5 cP
    // Polymerization increases viscosity exponentially: 1.5 cP -> 500 cP -> 3,000 cP -> 10,000+ cP
    const base = 1.5;
    const polyEffect = Math.pow(polymerFraction, 2.5) * 2500;
    const crossEffect = Math.pow(crosslinkDensity, 3.0) * 5000;
    const cureEffect = Math.pow(curingProgress / 100, 2.0) * 3000;

    const total = base + polyEffect + crossEffect + cureEffect;
    return Number(total.toFixed(0));
  }

  /**
   * Derive active Molecular Stage for 2D visualization
   */
  static getMolecularStage(state: PolymerReactionState): MolecularStage {
    if (state.reactionProgress < 15) return "monomers";
    if (state.reactionProgress < 40) return "intermediates";
    if (state.reactionProgress < 70) return "oligomers";
    if (state.reactionProgress < 90 && state.crosslinkDensity < 0.4) return "polymer-chains";
    return "crosslinked-network";
  }

  /**
   * Derive Stirring Resistance label
   */
  static getStirringResistanceLabel(viscosity: number): "LOW" | "MEDIUM" | "HIGH" | "SOLID" {
    if (viscosity < 100) return "LOW";
    if (viscosity < 1500) return "MEDIUM";
    if (viscosity < 6000) return "HIGH";
    return "SOLID";
  }

  /**
   * Derive PolymerMaterialVisualState from PolymerReactionState
   */
  static calculateMaterialVisualState(state: PolymerReactionState): {
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
  } {
    const pf = state.polymerFraction;
    const cd = state.crosslinkDensity;
    const vis = state.viscosity;

    let phase: "liquid" | "viscous-liquid" | "gel" | "cured-solid" = "liquid";
    let opacity = 0.5 + pf * 0.45;
    let surfaceMotion = Math.max(0, 1.0 - pf * 0.95);
    let flowSpeed = Math.max(0.05, 1.0 - pf * 0.9);
    let shapeRetention = Math.min(1.0, pf * 0.7 + cd * 0.3);
    let colorHex = "#fef08a"; // Clear pale yellow
    let label = "Clear Liquid Monomer Mixture";

    if (state.finalState === "cured" || state.curingProgress >= 90 || cd >= 0.85) {
      phase = "cured-solid";
      surfaceMotion = 0.0;
      flowSpeed = 0.0;
      shapeRetention = 1.0;
      opacity = 0.95;
      colorHex = "#7f1d1d"; // Deep reddish-brown thermoset resin
      label = "Cured Thermoset Resin Specimen";
    } else if (state.gelationProgress > 0 || pf >= 0.75) {
      phase = "gel";
      surfaceMotion = 0.05;
      flowSpeed = 0.1;
      shapeRetention = 0.85;
      colorHex = "#b45309"; // Amber gel
      label = "Gelled Polymer Matrix";
    } else if (pf >= 0.30) {
      phase = "viscous-liquid";
      surfaceMotion = 0.3;
      flowSpeed = 0.4;
      shapeRetention = 0.4;
      colorHex = "#d97706"; // Golden viscous resin
      label = "Viscous Polymer Resin";
    }

    return {
      phase,
      viscosity: vis,
      opacity: Number(opacity.toFixed(2)),
      surfaceMotion: Number(surfaceMotion.toFixed(2)),
      flowSpeed: Number(flowSpeed.toFixed(2)),
      shapeRetention: Number(shapeRetention.toFixed(2)),
      polymerFraction: pf,
      crosslinkDensity: cd,
      colorHex,
      label,
    };
  }
}
