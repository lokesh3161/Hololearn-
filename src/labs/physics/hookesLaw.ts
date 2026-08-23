import type { ExperimentConfig } from '../types';

export const hookesLawConfig: ExperimentConfig = {
  id: 'hookes-law',
  title: "Hooke's Law & Spring Constant Determination",
  subject: 'physics',
  objective: "Verify Hooke's Law (F = kx) and experimentally determine the spring constant k within the elastic limit.",
  apparatus: [
    { id: 'stand', name: 'Heavy Laboratory Stand', specs: 'Rigid cast-iron base with 80cm vertical support rod', instructions: 'Position securely on horizontal workbench.' },
    { id: 'spring', name: 'Helical Steel Spring Set', specs: 'Standard (25 N/m), Soft (15 N/m), Stiff (50 N/m), Unknown', instructions: 'Suspend from upper support clamp.' },
    { id: 'hanger', name: 'Mass Hanger & Pointer', specs: '50g base hanger with precision alignment pointer', instructions: 'Hook onto lower spring loop.' },
    { id: 'masses', name: 'Precision Slotted Mass Set', specs: 'Slotted weights (10g, 20g, 50g, 100g) ±0.05g accuracy', instructions: 'Place weights onto hanger stem.' },
    { id: 'ruler', name: 'Vertical Millimeter Scale', specs: '60cm scale with 1mm graduations and zero baseline marker', instructions: 'Align scale parallel to spring and pointer.' },
    { id: 'sensor', name: 'Digital Force Sensor', specs: '0–20 N strain-gauge sensor (±0.001 N)', instructions: 'Mounted at upper clamp arm.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Measure natural un-loaded spring length L₀ with 0g additional load.', expectedAction: 'Record baseline pointer position.' },
    { stepNumber: 2, instruction: 'Attach mass hanger (50g base mass) to bottom spring hook.', expectedAction: 'Observe initial equilibrium stretch.' },
    { stepNumber: 3, instruction: 'Add a known slotted mass (e.g. 50g) to the hanger.', expectedAction: 'Load weight onto hanger.' },
    { stepNumber: 4, instruction: 'Allow spring oscillations to dampen completely until equilibrium is reached.', expectedAction: 'Wait for status to show EQUILIBRIUM.' },
    { stepNumber: 5, instruction: 'Measure extended spring length L on the vertical millimeter ruler scale.', expectedAction: 'Read ruler position at pointer tip.' },
    { stepNumber: 6, instruction: 'Calculate extension x = L - L₀ in meters.', expectedAction: 'Compute extension in meters.' },
    { stepNumber: 7, instruction: 'Calculate total applied force F = m · g (where g = 9.81 m/s²).', expectedAction: 'Compute force in Newtons.' },
    { stepNumber: 8, instruction: 'Record data point into observation table.', expectedAction: 'Click Record Trial button.' },
    { stepNumber: 9, instruction: 'Repeat measurement steps for at least 5 different mass loads.', expectedAction: 'Collect multi-point trial dataset.' },
    { stepNumber: 10, instruction: 'Plot Force F (N) on y-axis against Extension x (m) on x-axis.', expectedAction: 'Open Force vs Extension Graph tab.' },
    { stepNumber: 11, instruction: 'Fit linear regression line through elastic region data points.', expectedAction: 'Analyze slope of best-fit line.' },
    { stepNumber: 12, instruction: 'Determine spring constant k from slope (k = ΔF / Δx).', expectedAction: 'Record calculated spring constant k.' },
    { stepNumber: 13, instruction: 'Gradually increase mass beyond elastic limit to observe non-linear deformation.', expectedAction: 'Observe elastic limit warning.' },
    { stepNumber: 14, instruction: 'Formulate conclusion comparing experimental k to theoretical values.', expectedAction: 'Generate and review Lab Report.' },
  ],
  stateEngine: {
    constants: { g: 9.81, kNominal: 25.0, naturalLengthCm: 20.0, elasticLimitGrams: 350.0 },
    calculateState: (inputs: Record<string, any>) => {
      const massGrams = Number(inputs.massGrams || 0);
      const k = Number(inputs.springK || 25.0);
      const naturalLengthCm = Number(inputs.naturalLengthCm || 20.0);
      const elasticLimitGrams = Number(inputs.elasticLimitGrams || 350.0);
      const isEquilibrium = inputs.isEquilibrium !== false;
      const g = 9.81;

      const forceN = (massGrams / 1000.0) * g;
      const elasticLimitForceN = (elasticLimitGrams / 1000.0) * g;
      const isDeformed = forceN > elasticLimitForceN;

      let extensionM = forceN / k;
      if (isDeformed) {
        const overloadN = forceN - elasticLimitForceN;
        extensionM += overloadN / (k * 0.55) + 0.0008 * Math.pow(overloadN, 2);
      }

      const extensionCm = extensionM * 100.0;
      const lengthCm = naturalLengthCm + extensionCm;
      const lengthM = lengthCm / 100.0;

      return {
        massGrams,
        massKg: massGrams / 1000.0,
        forceN: Number(forceN.toFixed(3)),
        extensionM: Number(extensionM.toFixed(4)),
        extensionCm: Number(extensionCm.toFixed(2)),
        lengthCm: Number(lengthCm.toFixed(2)),
        lengthM: Number(lengthM.toFixed(4)),
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
      { key: 'trialNum', label: 'Trial', unit: '#', precision: 0 },
      { key: 'massGrams', label: 'Mass', unit: 'g', precision: 0 },
      { key: 'massKg', label: 'Mass', unit: 'kg', precision: 3 },
      { key: 'forceN', label: 'Force F', unit: 'N', precision: 3 },
      { key: 'lengthCm', label: 'Length L', unit: 'cm', precision: 2 },
      { key: 'extensionCm', label: 'Extension x', unit: 'cm', precision: 2 },
      { key: 'extensionM', label: 'Extension x', unit: 'm', precision: 4 },
      { key: 'calculatedK', label: 'k (F/x)', unit: 'N/m', precision: 2 },
      { key: 'isElastic', label: 'Region', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const massGrams = Number(inputs.massGrams || 0);
      const k = Number(inputs.springK || 25.0);
      const naturalLengthCm = Number(inputs.naturalLengthCm || 20.0);
      const forceN = (massGrams / 1000.0) * 9.81;
      const extensionM = forceN / k;
      const extensionCm = extensionM * 100.0;
      const lengthCm = naturalLengthCm + extensionCm;
      const calculatedK = extensionM > 0 ? forceN / extensionM : k;

      return {
        massGrams,
        massKg: massGrams / 1000.0,
        forceN: Number(forceN.toFixed(3)),
        lengthCm: Number(lengthCm.toFixed(2)),
        extensionCm: Number(extensionCm.toFixed(2)),
        extensionM: Number(extensionM.toFixed(4)),
        calculatedK: Number(calculatedK.toFixed(2)),
        isElastic: massGrams <= 350,
      };
    },
  },
  graph: {
    xAxis: { label: 'Extension x', unit: 'm', key: 'extensionM' },
    yAxis: { label: 'Applied Force F', unit: 'N', key: 'forceN' },
    expectedSlopeKey: 'k',
    expectedSlopeValue: 25.0,
    expectedFormula: 'F = k · x',
  },
  mistakes: [
    {
      id: 'premature-reading',
      name: 'Reading Scale Before Equilibrium',
      triggerCondition: 'inputs.isEquilibrium === false',
      consequence: 'Dynamic oscillations introduce transient measurement errors.',
      aiExplanation: 'Always allow spring oscillations to dampen completely under air resistance before reading the ruler pointer.',
    },
    {
      id: 'elastic-limit-exceeded',
      name: 'Exceeding Spring Elastic Limit',
      triggerCondition: 'inputs.isDeformed === true',
      consequence: 'Spring undergoes permanent plastic deformation; Hooke’s Law (F ∝ x) is violated.',
      aiExplanation: 'Beyond the elastic limit, atomic bonds slide irreversibly. Non-linear stretch occurs and the spring will not return to L₀.',
    },
    {
      id: 'zero-offset-error',
      name: 'Incorrect Baseline Baseline Zeroing',
      triggerCondition: 'inputs.zeroOffsetOffset !== 0',
      consequence: 'Introduces a systematic zero-shift error across all measured extension values.',
      aiExplanation: 'Ensure ruler scale zero baseline is aligned with the natural un-loaded pointer position L₀.',
    },
  ],
  assessment: [
    { id: 'c1', description: 'Recorded natural un-loaded spring length L₀', points: 10, verifyCondition: 'data[0].massGrams === 0' },
    { id: 'c2', description: 'Recorded at least 5 valid mass load trials', points: 20, verifyCondition: 'data.length >= 5' },
    { id: 'c3', description: 'Accurately calculated force F = m · g in SI units', points: 15, verifyCondition: 'verifyForceCalculations(data)' },
    { id: 'c4', description: 'Constructed linear Force F vs Extension x scatter plot', points: 20, verifyCondition: 'checkLinearity(data)' },
    { id: 'c5', description: 'Determined spring constant k from regression slope within ±5% error', points: 25, verifyCondition: 'calculatedK >= 23.75 && calculatedK <= 26.25' },
    { id: 'c6', description: 'Identified transition to non-linear region at elastic limit', points: 10, verifyCondition: 'acknowledgedElasticLimit === true' },
  ],
  freeMode: {
    objective: 'Investigate various helical spring materials and determine their spring constants and elastic thresholds.',
    availableApparatus: ['Laboratory Stand', 'Standard / Soft / Stiff Spring Set', 'Slotted Mass Set (10g–500g)', 'Digital Force Sensor', 'Millimeter Scale'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'How does combining identical springs in series versus parallel affect the effective spring constant k_eff?',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Low Risk' },
    requiredIdentifications: ['Independent variable: Spring configuration (Series/Parallel)', 'Dependent variable: System extension x', 'Control variable: Total mass load m'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['F = -kx', 'F = k x', '\\Delta F = k \\Delta x', 'k = \\frac{F}{x}', 'U = \\frac{1}{2} k x^2'],
    conceptKeywords: ['hooke', 'spring constant', 'elasticity', 'restoring force', 'extension', 'elastic limit', 'stiffness'],
  },
};

