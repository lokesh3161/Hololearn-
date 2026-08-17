import type { ExperimentConfig, MistakeRule, Checkpoint } from './types';
import { hookesLawConfig } from './physics/hookesLaw';
import { simplePendulumConfig } from './physics/simplePendulum';
import { ohmsLawConfig } from './physics/ohmsLaw';
import { freeFallConfig } from './physics/freeFall';
import { specificHeatConfig } from './physics/specificHeat';
import {
  momentumConfig,
  refractionConfig,
  convexLensConfig,
  newtonsLawConfig,
  frictionConfig,
  projectileConfig,
  energyConfig,
  torqueConfig,
  centripetalConfig,
} from './physics/physicsCatalogue';

import { titrationConfig } from './chemistry/titration';
import { reactionRatesConfig } from './chemistry/reactionRates';
import { calorimetryConfig } from './chemistry/calorimetry';
import { electrochemistryConfig } from './chemistry/electrochemistry';
import { phCurvesConfig } from './chemistry/phCurves';
import { chromatographyConfig, metalActivityConfig } from './chemistry/chemistryCatalogue';

export * from './types';
export * from './smartboardTriggers';

export const EXPERIMENT_REGISTRY: Record<string, ExperimentConfig> = {
  // 10 Physics Mechanics Labs
  'newtons-second-law': newtonsLawConfig,
  'newtons-law': newtonsLawConfig,
  'friction-lab': frictionConfig,
  'friction': frictionConfig,
  'projectile-motion': projectileConfig,
  'projectile': projectileConfig,
  'momentum-conservation': momentumConfig,
  'momentum-collisions': momentumConfig,
  'conservation-of-energy': energyConfig,
  'energy-conservation': energyConfig,
  'torque-equilibrium': torqueConfig,
  'torque': torqueConfig,
  'centripetal-force': centripetalConfig,
  'centripetal': centripetalConfig,
  'hookes-law': hookesLawConfig,
  'simple-pendulum': simplePendulumConfig,
  'pendulum-lab': simplePendulumConfig,
  'free-fall': freeFallConfig,
  'ohms-law': ohmsLawConfig,
  'specific-heat': specificHeatConfig,

  // Optics & Additional Physics
  'refraction-snell': refractionConfig,
  'convex-lens': convexLensConfig,

  // Main Chemistry Labs
  'acid-base-titration': titrationConfig,
  'reaction-rates': reactionRatesConfig,
  'enthalpy-calorimetry': calorimetryConfig,
  'copper-electrolysis': electrochemistryConfig,
  'ph-titration-curves': phCurvesConfig,
  'paper-chromatography': chromatographyConfig,
  'metal-activity-series': metalActivityConfig,
};

export function getExperimentConfig(id: string): ExperimentConfig | undefined {
  return EXPERIMENT_REGISTRY[id];
}

export function getAllExperiments(): ExperimentConfig[] {
  const seen = new Set<string>();
  const uniqueExperiments: ExperimentConfig[] = [];

  for (const exp of Object.values(EXPERIMENT_REGISTRY)) {
    if (!seen.has(exp.id)) {
      seen.add(exp.id);
      uniqueExperiments.push(exp);
    }
  }

  return uniqueExperiments;
}

export function getExperimentsBySubject(subject: 'physics' | 'chemistry'): ExperimentConfig[] {
  return getAllExperiments().filter((exp) => exp.subject === subject);
}

export function evaluateLabState(labId: string, inputs: Record<string, any>): Record<string, any> {
  const config = getExperimentConfig(labId);
  if (!config) {
    return { error: `Lab configuration '${labId}' not found.` };
  }
  return config.stateEngine.calculateState(inputs);
}

export function evaluateLabMistakes(labId: string, inputs: Record<string, any>): MistakeRule[] {
  const config = getExperimentConfig(labId);
  if (!config) return [];

  const triggeredMistakes: MistakeRule[] = [];
  for (const m of config.mistakes) {
    try {
      // Evaluate condition safely
      const evalFn = new Function('inputs', `return Boolean(${m.triggerCondition});`);
      if (evalFn(inputs)) {
        triggeredMistakes.push(m);
      }
    } catch {
      // Fallback String comparison if expression is simple property equality
      if (inputs && inputs[m.id]) {
        triggeredMistakes.push(m);
      }
    }
  }
  return triggeredMistakes;
}

export function evaluateLabAssessment(
  labId: string,
  dataLog: any[],
  userState: Record<string, any> = {}
): { score: number; maxScore: number; percentage: number; evaluatedCheckpoints: Array<Checkpoint & { passed: boolean }> } {
  const config = getExperimentConfig(labId);
  if (!config) {
    return { score: 0, maxScore: 0, percentage: 0, evaluatedCheckpoints: [] };
  }

  let earnedPoints = 0;
  let totalPossible = 0;

  const evaluatedCheckpoints = config.assessment.map((cp) => {
    totalPossible += cp.points;
    let passed = false;

    try {
      const evalContext = {
        data: dataLog,
        ...userState,
        abs: Math.abs,
      };
      const evalFn = new Function('ctx', `
        const data = ctx.data;
        const abs = ctx.abs;
        const isManualStopwatch = ctx.isManualStopwatch;
        const maxAngle = ctx.maxAngle;
        const measuredFromCenter = ctx.measuredFromCenter;
        const calculatedG = ctx.calculatedG;
        const calculatedK = ctx.calculatedK;
        const calculatedR = ctx.calculatedR;
        const calculatedC = ctx.calculatedC;
        const calculatedCAcid = ctx.calculatedCAcid;
        const calculatedDeltaH = ctx.calculatedDeltaH;
        const theoreticalMassG = ctx.theoreticalMassG;
        const pKaExtracted = ctx.pKaExtracted;
        const isCalibrated = ctx.isCalibrated;
        const isStirred = ctx.isStirred;
        const precisionCorrect = ctx.precisionCorrect;
        const color = ctx.color;
        const concordantCount = ctx.concordantCount;
        const sigFigsCorrect = ctx.sigFigsCorrect;
        const totalVolumeConstant = ctx.totalVolumeConstant;
        const orderCorrect = ctx.orderCorrect;
        const baselineEstablished = ctx.baselineEstablished;
        const extrapolationCorrect = ctx.extrapolationCorrect;
        const signCorrect = ctx.signCorrect;
        const preparedCorrectly = ctx.preparedCorrectly;
        const currentConstant = ctx.currentConstant;
        const chargeCalculated = ctx.chargeCalculated;
        const efficiencyCalculated = ctx.efficiencyCalculated;
        const equivIdentified = ctx.equivIdentified;
        const rfCalculatedCorrectly = ctx.rfCalculatedCorrectly;
        const seriesCorrect = ctx.seriesCorrect;
        const acknowledgedElasticLimit = ctx.acknowledgedElasticLimit;
        const massCalculatedCorrectly = ctx.massCalculatedCorrectly;
        const powerMonitored = ctx.powerMonitored;
        const calorimeterCorrectionApplied = ctx.calorimeterCorrectionApplied;
        const voltmeterParallel = ctx.voltmeterParallel;
        const ammeterSeries = ctx.ammeterSeries;
        const graphLinearityScore = ctx.graphLinearityScore || 0.99;
        const unitsCorrect = ctx.unitsCorrect !== false;
        return Boolean(${cp.verifyCondition});
      `);
      passed = evalFn(evalContext);
    } catch {
      passed = Boolean(userState[cp.id]);
    }

    if (passed) {
      earnedPoints += cp.points;
    }

    return {
      ...cp,
      passed,
    };
  });

  const percentage = totalPossible > 0 ? Math.round((earnedPoints / totalPossible) * 100) : 0;

  return {
    score: earnedPoints,
    maxScore: totalPossible,
    percentage,
    evaluatedCheckpoints,
  };
}
