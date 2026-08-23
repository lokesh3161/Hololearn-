/**
 * Experiment 05 Configuration: Determination of pH of Water and Soil Samples
 * HoloLearn Virtual Laboratory
 */

import type { ExperimentConfig } from '../types';
import { DEFAULT_PH_EXPERIMENT_CONFIG } from '../engines/PHMeasurementEngine';

export const phWaterSoilConfig: ExperimentConfig = {
  id: 'ph-water-soil',
  title: 'Determination of pH of Water and Soil Samples',
  subject: 'chemistry',
  objective: 'Calibrate a digital benchtop pH meter using standard buffer solutions and measure the pH of a water sample and a prepared 1:5 soil extract suspension.',
  apparatus: [
    {
      id: 'ph-meter',
      name: 'Digital Benchtop pH Meter with Combination Glass Electrode',
      specs: '0.01 pH resolution, automatic temperature compensation (25.0 °C)',
      instructions: 'Power on and calibrate using pH 7.00 and pH 4.00 buffer standards before measuring unknown samples.',
    },
    {
      id: 'rinse-station',
      name: 'Distilled Water Rinse Station & Wash Bottle',
      specs: 'Deionized / Distilled H2O',
      instructions: 'Rinse electrode probe thoroughly between all solutions to prevent cross-contamination carryover.',
    },
    {
      id: 'analytical-balance',
      name: 'Precision Digital Analytical Balance',
      specs: '0.01 g precision, tare functionality',
      instructions: 'Place empty beaker, press TARE to zero, and weigh 10.00 g of soil sample.',
    },
    {
      id: 'soil-container',
      name: '250 mL Glass Extraction Beaker',
      specs: 'Pyrex borosilicate glass',
      instructions: 'Holds weighed soil and distilled water extraction liquid.',
    },
    {
      id: 'stirring-rod',
      name: 'Glass Stirring Rod & Mechanical Stirrer',
      specs: 'Chemical resistant glass',
      instructions: 'Mix soil-water suspension thoroughly to extract hydrogen ions into liquid phase.',
    },
  ],
  substances: [
    {
      id: 'water-sample',
      name: 'Environmental Water Sample A',
      formula: 'H2O(aq)',
      initialPh: DEFAULT_PH_EXPERIMENT_CONFIG.waterSample.hiddenPH,
      initialTemp: 25.0,
    },
    {
      id: 'soil-sample',
      name: 'Topsoil Sample (Garden Soil Extract)',
      formula: 'Soil Extract',
      initialPh: DEFAULT_PH_EXPERIMENT_CONFIG.soilSample.hiddenPH,
      initialTemp: 25.0,
    },
    {
      id: 'buffer-7',
      name: 'Standard pH 7.00 Reference Buffer',
      formula: 'Phosphate Buffer',
      initialPh: 7.00,
    },
    {
      id: 'buffer-4',
      name: 'Standard pH 4.00 Reference Buffer',
      formula: 'Phthalate Buffer',
      initialPh: 4.00,
    },
    {
      id: 'buffer-10',
      name: 'Standard pH 10.00 Reference Buffer',
      formula: 'Carbonate Buffer',
      initialPh: 10.00,
    },
  ],
  procedure: [
    {
      stepNumber: 1,
      instruction: 'Power on the digital pH meter and inspect electrode condition.',
      expectedAction: 'Ensure pH meter display is active.',
    },
    {
      stepNumber: 2,
      instruction: 'Rinse the electrode with distilled water in the rinse station.',
      expectedAction: 'Remove residual storage solution or contamination.',
    },
    {
      stepNumber: 3,
      instruction: 'Calibrate pH meter: submerge electrode in pH 7.00 buffer, wait for STABLE, and confirm point 1. Repeat with pH 4.00 buffer.',
      expectedAction: 'Meter calibration status becomes VALID.',
    },
    {
      stepNumber: 4,
      instruction: 'Rinse electrode, submerge into Water Sample A, wait for reading stabilization, and record stable water pH.',
      expectedAction: 'Record stable Water Sample pH (e.g. 6.86).',
    },
    {
      stepNumber: 5,
      instruction: 'Prepare soil extract: weigh 10.00 g soil on balance, add 50.0 mL distilled water (1:5 ratio), stir suspension for 30s, and allow particles to settle into clear supernatant.',
      expectedAction: 'Soil extract supernatant ready for measurement.',
    },
    {
      stepNumber: 6,
      instruction: 'Rinse electrode, submerge probe into soil extract supernatant, wait for STABLE, and record stable soil pH.',
      expectedAction: 'Record stable Soil Sample pH (e.g. 5.65).',
    },
    {
      stepNumber: 7,
      instruction: 'Compare Water pH vs Soil pH, compute ΔpH, check acidic/alkaline classification, and generate the final laboratory report.',
      expectedAction: 'Complete scientific report and assessment.',
    },
  ],
  stateEngine: {
    constants: {
      hiddenWaterPH: DEFAULT_PH_EXPERIMENT_CONFIG.waterSample.hiddenPH,
      hiddenSoilPH: DEFAULT_PH_EXPERIMENT_CONFIG.soilSample.hiddenPH,
    },
    calculateState: (inputs: Record<string, any>) => {
      const waterPH = Number(inputs.waterPH || 6.86);
      const soilPH = Number(inputs.soilPH || 5.65);
      const deltaPH = Number(Math.abs(waterPH - soilPH).toFixed(2));
      const isCalibrated = Boolean(inputs.isCalibrated);
      const waterHConc = Math.pow(10, -waterPH);
      const soilHConc = Math.pow(10, -soilPH);

      return {
        waterPH,
        soilPH,
        deltaPH,
        isCalibrated,
        waterHConcExp: waterHConc.toExponential(2),
        soilHConcExp: soilHConc.toExponential(2),
        waterAcidity: waterPH < 7.0 ? 'Acidic' : waterPH > 7.0 ? 'Alkaline' : 'Neutral',
        soilAcidity: soilPH < 7.0 ? 'Acidic' : soilPH > 7.0 ? 'Alkaline' : 'Neutral',
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'sampleType', label: 'Sample Type', unit: '' },
      { key: 'measuredPH', label: 'Measured pH', unit: '', precision: 2 },
      { key: 'tempC', label: 'Temp', unit: '°C', precision: 1 },
      { key: 'stability', label: 'Stability', unit: '' },
      { key: 'status', label: 'Status', unit: '' },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      return {
        sampleType: inputs.sampleType || 'Water Sample A',
        measuredPH: Number(inputs.measuredPH || 6.86),
        tempC: Number(inputs.tempC || 25.0),
        stability: 'Stable ✓',
        status: inputs.isCalibrated ? 'Valid ✓' : 'Invalid ⚠',
      };
    },
  },
  graph: {
    xAxis: { label: 'Sample Category', unit: '', key: 'sampleType' },
    yAxis: { label: 'pH Value', unit: '', key: 'measuredPH' },
    expectedFormula: 'pH = -\\log_{10}[H^+]',
  },
  mistakes: [
    {
      id: 'uncalibrated-meter',
      name: 'Measuring Without Calibration',
      triggerCondition: 'inputs.isCalibrated === false',
      consequence: 'Systematic zero offset errors skew sample pH readings.',
      aiExplanation: 'Always calibrate the pH meter using pH 7.00 and pH 4.00/10.00 buffer standards before measuring unknown samples.',
    },
    {
      id: 'dirty-electrode',
      name: 'Skipping Electrode Rinse',
      triggerCondition: 'inputs.electrodeRinsed === false',
      consequence: 'Cross-contamination from prior buffer solution alters sample pH.',
      aiExplanation: 'Rinse the probe tip with distilled water in the rinse station between solutions to prevent carryover errors.',
    },
    {
      id: 'unstable-reading',
      name: 'Recording Unstable Reading',
      triggerCondition: 'inputs.isStable === false',
      consequence: 'Reading is premature before electrochemical equilibrium.',
      aiExplanation: 'Wait for the meter display to show STABLE before recording measurements.',
    },
    {
      id: 'unmixed-soil',
      name: 'Measuring Unmixed Dry Soil',
      triggerCondition: 'inputs.soilMixed === false',
      consequence: 'Solid dry soil cannot make liquid junction potential with glass electrode.',
      aiExplanation: 'Soil must be extracted with distilled water (1:5 ratio) and stirred to release hydrogen ions into the supernatant.',
    },
  ],
  assessment: [
    {
      id: 'p1',
      description: 'Powered on digital pH meter and rinsed probe tip in rinse station',
      points: 10,
      verifyCondition: 'inputs.powerOn === true && inputs.electrodeRinsed === true',
    },
    {
      id: 'p2',
      description: 'Completed 2-point buffer calibration (pH 7.00 & pH 4.00) with VALID status',
      points: 25,
      verifyCondition: 'inputs.isCalibrated === true',
    },
    {
      id: 'p3',
      description: 'Measured and recorded stable pH for Water Sample A',
      points: 20,
      verifyCondition: 'inputs.waterMeasured === true',
    },
    {
      id: 'p4',
      description: 'Weighed 10.00 g soil, added 50.0 mL distilled water, mixed suspension, and settled supernatant',
      points: 20,
      verifyCondition: 'inputs.soilPrepared === true',
    },
    {
      id: 'p5',
      description: 'Measured and recorded stable pH for Soil Extract supernatant',
      points: 15,
      verifyCondition: 'inputs.soilMeasured === true',
    },
    {
      id: 'p6',
      description: 'Calculated ΔpH and generated complete laboratory report',
      points: 10,
      verifyCondition: 'inputs.reportGenerated === true',
    },
  ],
  freeMode: {
    objective: 'Explore pH measurement across agricultural soil samples, tap water, rain water, and industrial wastewater extracts.',
    availableApparatus: ['Digital pH Meter', 'Glass Electrode', 'Buffer Solutions', 'Rinse Station', 'Analytical Balance', 'Beakers'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate the effect of soil-to-water ratio (1:1 vs 1:2.5 vs 1:5) on measured soil pH and salt extraction effect.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Low' },
    requiredIdentifications: ['Independent: Soil-to-water ratio', 'Dependent: Measured pH & supernatant conductivity'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['pH = -\\log_{10}[H^+]', '[H^+] = 10^{-\\text{pH}}', '\\Delta\\text{pH} = |\\text{pH}_{water} - \\text{pH}_{soil}|'],
    conceptKeywords: ['ph measurement', 'ph meter', 'calibration', 'buffer solution', 'water ph', 'soil ph', 'soil extract', 'electrode rinse'],
  },
};
