import type { ExperimentConfig } from '../types';

export const reactionRatesConfig: ExperimentConfig = {
  id: 'reaction-rates',
  title: 'Chemical Kinetics & Rate Law (Disappearing Cross Test)',
  subject: 'chemistry',
  objective: 'Investigate the effect of concentration on reaction rate between sodium thiosulfate and hydrochloric acid.',
  apparatus: [
    { id: 'flasks', name: 'Conical Flasks (100 mL)', specs: 'Clean borosilicate glass flasks', instructions: 'Place directly over printed cross mark on white paper.' },
    { id: 'cylinders', name: 'Graduated Measuring Cylinders', specs: '50 mL and 10 mL cylinders (0.5 mL resolution)', instructions: 'Use separate cylinders for thiosulfate and acid.' },
    { id: 'paper', name: 'White Paper with Black Cross (X)', specs: 'Standard printed cross card', instructions: 'Observe vertically downward through flask solution.' },
    { id: 'stopwatch', name: 'Digital Stopwatch', specs: '0.01s precision', instructions: 'Start timer immediately upon adding acid.' },
    { id: 'thermometer', name: 'Glass Thermometer', specs: '0 - 100°C range', instructions: 'Verify constant ambient temperature (20.0°C).' },
  ],
  substances: [
    { id: 'thiosulfate', name: 'Sodium Thiosulfate Solution', formula: 'Na2S2O3(aq)', concentrationMolar: 0.150, initialColor: 'Clear / Colorless' },
    { id: 'acid', name: 'Hydrochloric Acid Solution', formula: 'HCl(aq)', concentrationMolar: 1.000, initialColor: 'Clear / Colorless' },
    { id: 'water', name: 'Distilled Water', formula: 'H2O(l)', initialColor: 'Clear / Colorless' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Place white paper card with black cross X on lab bench.', expectedAction: 'Position conical flask over X.' },
    { stepNumber: 2, instruction: 'Measure 50 mL 0.15M Na₂S₂O₃ into flask (Run 1: 50 mL thiosulfate + 0 mL water).', expectedAction: 'Record initial volume and concentration.' },
    { stepNumber: 3, instruction: 'Add 5.0 mL 1.0M HCl, swirl once, place over X, and start timer immediately.', expectedAction: 'Look down from above.' },
    { stepNumber: 4, instruction: 'Stop timer the instant colloidal sulfur precipitate obscures black cross X completely.', expectedAction: 'Record time t in seconds.' },
    { stepNumber: 5, instruction: 'Repeat for Runs 2-5: dilute thiosulfate with water maintaining total volume at 50 mL (40+10, 30+20, 20+30, 10+40 mL).', expectedAction: 'Maintain constant 5.0 mL HCl addition.' },
    { stepNumber: 6, instruction: 'Calculate 1/t (s⁻¹) as rate proxy and plot 1/t on y-axis vs Na₂S₂O₃ concentration on x-axis.', expectedAction: 'Determine order of reaction.' },
  ],
  stateEngine: {
    constants: { kRate: 0.008, thresholdTurbidity: 1.0 },
    calculateState: (inputs: Record<string, any>) => {
      const volThio = Number(inputs.volThio || 50.0);
      const volWater = 50.0 - volThio;
      const volAcid = 5.0;
      const totalVol = 55.0;
      const concThioM = (0.150 * volThio) / 50.0;
      const tempC = Number(inputs.tempC || 20.0);

      // Rate law: Rate = k * [Na2S2O3]^1 * exp(-Ea/RT)
      const tempK = tempC + 273.15;
      const arrheniusFactor = Math.exp((-40000.0 / 8.314) * (1.0 / tempK - 1.0 / 293.15));
      const rate = 0.008 * concThioM * arrheniusFactor;

      const timeSec = 1.0 / Math.max(0.0001, rate);
      const noise = (Math.random() - 0.5) * 1.5; // human visual perception scatter
      const measuredTime = Math.max(1.0, timeSec + noise);
      const rateProxy = 1.0 / measuredTime;

      return {
        volThio,
        volWater,
        concThioM: Number(concThioM.toFixed(3)),
        timeSec: Number(measuredTime.toFixed(1)),
        rateProxy: Number(rateProxy.toFixed(4)),
        tempC,
        isXVisible: inputs.elapsedTimeSec < measuredTime,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'volThio', label: 'Vol Na₂S₂O₃', unit: 'mL', precision: 0 },
      { key: 'volWater', label: 'Vol Water', unit: 'mL', precision: 0 },
      { key: 'concThioM', label: '[Na₂S₂O₃]', unit: 'M', precision: 3 },
      { key: 'timeSec', label: 'Time t', unit: 's', precision: 1 },
      { key: 'rateProxy', label: 'Rate (1/t)', unit: 's⁻¹', precision: 4 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const volThio = Number(inputs.volThio || 50.0);
      const concThioM = (0.150 * volThio) / 50.0;
      const timeSec = 1.0 / (0.008 * concThioM);
      return {
        volThio,
        volWater: 50.0 - volThio,
        concThioM: Number(concThioM.toFixed(3)),
        timeSec: Number(timeSec.toFixed(1)),
        rateProxy: Number((1.0 / timeSec).toFixed(4)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Concentration [Na₂S₂O₃]', unit: 'M', key: 'concThioM' },
    yAxis: { label: 'Initial Rate (1/t)', unit: 's⁻¹', key: 'rateProxy' },
    expectedSlopeKey: 'k',
    expectedSlopeValue: 0.008,
    expectedFormula: 'Rate = k \\cdot [Na_2S_2O_3]',
  },
  mistakes: [
    {
      id: 'timer-delay',
      name: 'Delay in Starting Stopwatch Upon Reagent Addition',
      triggerCondition: 'inputs.timerDelaySec > 2.0',
      consequence: 'Systematic over-recording of reaction duration leads to underestimation of initial rate.',
      aiExplanation: 'Start the stopwatch at the exact instant hydrochloric acid makes contact with the thiosulfate solution.',
    },
    {
      id: 'temp-variation',
      name: 'Failing to Control Solution Temperature Across Runs',
      triggerCondition: 'inputs.tempFluctuation > 2.0',
      consequence: 'Arrhenius thermal rate multiplier introduces confounding variable; non-linear rate plot results.',
      aiExplanation: 'Reaction rate doubles roughly every 10°C rise. Maintain all reaction mixtures at constant ambient temperature.',
    },
  ],
  assessment: [
    { id: 'r1', description: 'Maintained constant total volume (55 mL) for all runs', points: 15, verifyCondition: 'totalVolumeConstant === true' },
    { id: 'r2', description: 'Collected 5 distinct concentration data points', points: 20, verifyCondition: 'data.length >= 5' },
    { id: 'r3', description: 'Calculated 1/t rate proxy accurately', points: 20, verifyCondition: 'verifyRateProxy(data)' },
    { id: 'r4', description: 'Plotted linear rate vs concentration graph passing through origin', points: 25, verifyCondition: 'graphLinearityScore > 0.98' },
    { id: 'r5', description: 'Deduced 1st-order kinetics with respect to sodium thiosulfate', points: 20, verifyCondition: 'orderCorrect === 1' },
  ],
  freeMode: {
    objective: 'Determine activation energy Ea for thiosulfate-acid reaction by measuring rates across 20°C to 50°C.',
    availableApparatus: ['Water bath', 'Thermometer', 'Conical flasks', 'Stopwatch', 'Reagents'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate order of reaction with respect to HCl concentration.',
    constraints: { timeMinutes: 30, budget: 80, safetyLevel: 'Fume Hood Recommended (SO₂ gas evolution)' },
    requiredIdentifications: ['Independent: [HCl]', 'Dependent: Rate (1/t)', 'Control: [Na2S2O3] and temperature'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['Rate = k[A]^n [B]^m', 'Na_2S_2O_3 + 2HCl \\rightarrow 2NaCl + H_2O + SO_2 + S', '\\text{Rate} = \\frac{1}{t}'],
    conceptKeywords: ['reaction rate', 'kinetics', 'thiosulfate', 'disappearing cross', 'rate law', 'activation energy'],
  },
};
