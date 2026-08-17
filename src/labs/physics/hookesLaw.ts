import type { ExperimentConfig } from '../types';

export const hookesLawConfig: ExperimentConfig = {
  id: 'hookes-law',
  title: "Hooke's Law & Spring Constant Determination",
  subject: 'physics',
  objective: "Verify Hooke's Law (F = kx) and determine the spring constant k of a helical spring.",
  apparatus: [
    { id: 'stand', name: 'Clamp Stand & Boss Head', specs: 'Heavy steel base, 60cm vertical rod', instructions: 'Mount securely on bench top.' },
    { id: 'spring', name: 'Steel Helical Spring', specs: 'k = 25.0 N/m, Elastic Limit = 350g (3.43N)', instructions: 'Suspend from clamp arm.' },
    { id: 'hanger', name: 'Mass Hanger', specs: '50g base hanger with pointer', instructions: 'Hook onto bottom of spring.' },
    { id: 'masses', name: 'Slotted Masses Set', specs: '5 x 50g lead weights (±0.1g)', instructions: 'Add sequentially to mass hanger.' },
    { id: 'ruler', name: 'Meter Scale', specs: '100cm length, 1mm graduation precision', instructions: 'Position vertically beside pointer.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Record the natural un-loaded length of the spring (L₀ = 15.0 cm).', expectedAction: 'Zero pointer against ruler.' },
    { stepNumber: 2, instruction: 'Attach 50g mass to the hanger and wait for oscillations to dampen (equilibrium).', expectedAction: 'Record new pointer position L.' },
    { stepNumber: 3, instruction: 'Calculate extension x = L - L₀ in meters.', expectedAction: 'Compute x in cm and convert to m.' },
    { stepNumber: 4, instruction: 'Repeat for loads 100g, 150g, 200g, 250g, and 300g.', expectedAction: 'Record total mass, force F = m*g, and length.' },
    { stepNumber: 5, instruction: 'Plot Force F (N) on y-axis vs Extension x (m) on x-axis.', expectedAction: 'Fit straight line through origin.' },
    { stepNumber: 6, instruction: 'Determine spring constant k from gradient of best-fit line.', expectedAction: 'k = ΔF / Δx.' },
  ],
  stateEngine: {
    constants: { g: 9.81, kNominal: 25.0, naturalLengthCm: 15.0, elasticLimitGrams: 350.0 },
    calculateState: (inputs: Record<string, any>) => {
      const massGrams = Number(inputs.massGrams || 0);
      const isEquilibrium = inputs.isEquilibrium !== false;
      const g = 9.81;
      const k = 25.0;
      const naturalLengthCm = 15.0;
      const forceN = (massGrams / 1000.0) * g;
      const isDeformed = massGrams > 350.0;

      let extensionCm = (forceN / k) * 100.0;
      if (isDeformed) {
        // Permanent plastic deformation model
        const overloadGrams = massGrams - 350.0;
        extensionCm += (overloadGrams / 10.0) * 1.5;
      }

      const lengthCm = naturalLengthCm + extensionCm;
      const noise = isEquilibrium ? 0.05 * (Math.random() - 0.5) : 0.4 * Math.sin(Date.now() / 150.0);

      return {
        massGrams,
        massKg: massGrams / 1000.0,
        forceN: Number(forceN.toFixed(3)),
        extensionCm: Number((extensionCm + noise).toFixed(2)),
        lengthCm: Number((lengthCm + noise).toFixed(2)),
        isDeformed,
        isEquilibrium,
      };
    },
    simulateNoise: (val: number, errorPct: number = 0.5) => {
      const factor = 1.0 + (Math.random() - 0.5) * (errorPct / 100.0);
      return val * factor;
    },
  },
  dataTable: {
    columns: [
      { key: 'massGrams', label: 'Mass', unit: 'g', precision: 0 },
      { key: 'massKg', label: 'Mass', unit: 'kg', precision: 3 },
      { key: 'forceN', label: 'Force F', unit: 'N', precision: 3 },
      { key: 'lengthCm', label: 'Length', unit: 'cm', precision: 2 },
      { key: 'extensionCm', label: 'Extension x', unit: 'cm', precision: 2 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const massGrams = Number(inputs.massGrams || 0);
      const forceN = (massGrams / 1000.0) * 9.81;
      const extensionCm = (forceN / 25.0) * 100.0;
      const lengthCm = 15.0 + extensionCm;
      return {
        massGrams,
        massKg: massGrams / 1000.0,
        forceN: Number(forceN.toFixed(3)),
        lengthCm: Number(lengthCm.toFixed(2)),
        extensionCm: Number(extensionCm.toFixed(2)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Extension x', unit: 'cm', key: 'extensionCm' },
    yAxis: { label: 'Restoring Force F', unit: 'N', key: 'forceN' },
    expectedSlopeKey: 'k',
    expectedSlopeValue: 25.0,
    expectedFormula: 'F = k * x',
  },
  mistakes: [
    {
      id: 'premature-reading',
      name: 'Reading Before Dampened Equilibrium',
      triggerCondition: 'inputs.isEquilibrium === false',
      consequence: 'Fluctuating pointer readings produce scattered non-linear data points.',
      aiExplanation: 'Always allow spring oscillations to settle under air damping before taking ruler readings.',
    },
    {
      id: 'elastic-limit-exceeded',
      name: 'Exceeding Elastic Limit (>350g)',
      triggerCondition: 'inputs.massGrams > 350',
      consequence: 'Spring undergoes permanent plastic deformation and no longer obeys Hooke’s Law.',
      aiExplanation: 'Beyond the elastic limit (3.5 N load), intermolecular bonds slip permanently causing irreversible elongation.',
    },
    {
      id: 'zero-offset-error',
      name: 'Un-zeroed Pointer Baseline',
      triggerCondition: 'inputs.zeroOffsetOffset !== 0',
      consequence: 'Constant systematic error shifts all extension measurements by a fixed offset.',
      aiExplanation: 'Ensure ruler zero mark aligns precisely with initial unloaded pointer position L₀.',
    },
  ],
  assessment: [
    { id: 'c1', description: 'Natural length L₀ recorded accurately at 0g load', points: 10, verifyCondition: 'data[0].massGrams === 0' },
    { id: 'c2', description: 'Collected at least 5 distinct mass increments (50g - 300g)', points: 25, verifyCondition: 'data.length >= 5' },
    { id: 'c3', description: 'Calculated Force F = m * 9.81 N correctly', points: 15, verifyCondition: 'verifyForceCalculations(data)' },
    { id: 'c4', description: 'Plotted straight line graph of F vs x through origin', points: 20, verifyCondition: 'checkLinearity(data)' },
    { id: 'c5', description: 'Calculated slope k = 25 N/m (within ±5% tolerance)', points: 20, verifyCondition: 'calculatedK >= 23.75 && calculatedK <= 26.25' },
    { id: 'c6', description: 'Identified elastic limit threshold at ~350g', points: 10, verifyCondition: 'acknowledgedElasticLimit === true' },
  ],
  freeMode: {
    objective: 'Determine the unknown spring constant of the provided spring using any combination of slotted masses.',
    availableApparatus: ['Clamp stand', 'Spring set (k=25, k=50)', 'Slotted masses (10g, 20g, 50g, 100g)', 'Meter ruler', 'Digital caliper'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate how spring constant k varies when two identical springs are connected in series versus parallel.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Low Risk' },
    requiredIdentifications: ['Independent variable: Spring configuration', 'Dependent variable: System extension', 'Control variable: Applied mass load'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['F = -kx', 'F = k x', '\\Delta F = k \\Delta x', 'k = \\frac{F}{x}'],
    conceptKeywords: ['hooke', 'spring constant', 'elasticity', 'restoring force', 'extension', 'elastic limit'],
  },
};
