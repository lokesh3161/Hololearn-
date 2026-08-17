import type { ExperimentConfig } from '../types';

export const simplePendulumConfig: ExperimentConfig = {
  id: 'simple-pendulum',
  title: 'Simple Pendulum & Acceleration due to Gravity g',
  subject: 'physics',
  objective: 'Investigate period dependency on length T = 2π√(L/g) and determine local gravitational acceleration g.',
  apparatus: [
    { id: 'stand', name: 'Retort Stand & Split Cork Clamp', specs: 'Rigid clamp preventing pivot friction', instructions: 'Secure top of string firmly.' },
    { id: 'string', name: 'Inextensible Light String', specs: 'Massless thread adjustable from 20cm to 100cm', instructions: 'Measure length from pivot to center of bob.' },
    { id: 'bob', name: 'Brass Spherical Bob', specs: 'Mass m = 50g, diameter = 2.0cm', instructions: 'Attach to bottom of string.' },
    { id: 'stopwatch', name: 'Digital Precision Stopwatch', specs: '0.01s precision', instructions: 'Time 10 complete oscillations.' },
    { id: 'protractor', name: 'Angular Protractor', specs: '1° resolution', instructions: 'Ensure initial displacement angle < 10°.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Adjust string length L to 20cm measured from pivot to bob center.', expectedAction: 'Record L = 0.20m.' },
    { stepNumber: 2, instruction: 'Displace bob to a small angle (<10°) and release smoothly from rest.', expectedAction: 'Release without imparting sideways motion.' },
    { stepNumber: 3, instruction: 'Start stopwatch as bob passes equilibrium marker; count 10 full oscillations.', expectedAction: 'Record total time t₁₀.' },
    { stepNumber: 4, instruction: 'Calculate period T = t₁₀ / 10 and square of period T².', expectedAction: 'Compute T and T² in s².' },
    { stepNumber: 5, instruction: 'Repeat procedure for L = 30, 40, 50, 60, 70, and 80 cm.', expectedAction: 'Build data table across 7 lengths.' },
    { stepNumber: 6, instruction: 'Plot T² (s²) on y-axis versus L (m) on x-axis.', expectedAction: 'Draw line of best fit.' },
    { stepNumber: 7, instruction: 'Calculate g = 4π² / slope.', expectedAction: 'Compare measured g to 9.81 m/s².' },
  ],
  stateEngine: {
    constants: { gNominal: 9.81, pi: Math.PI },
    calculateState: (inputs: Record<string, any>) => {
      const lengthM = Number(inputs.lengthM || 0.5);
      const angleDeg = Number(inputs.angleDeg || 5);
      const g = 9.81;

      // Small angle correction: T = T0 * (1 + (θ^2)/16)
      const angleRad = (angleDeg * Math.PI) / 180.0;
      const smallAngleFactor = 1.0 + (angleRad * angleRad) / 16.0;
      const idealT0 = 2.0 * Math.PI * Math.sqrt(lengthM / g);
      const period = idealT0 * smallAngleFactor;

      const time10Osc = period * 10.0;
      const noise = 0.08 * (Math.random() - 0.5); // timing human reaction scatter
      const measuredTime10 = time10Osc + noise;
      const measuredT = measuredTime10 / 10.0;
      const tSquared = measuredT * measuredT;

      return {
        lengthM,
        angleDeg,
        isSmallAngle: angleDeg <= 15,
        periodTheoretical: Number(idealT0.toFixed(3)),
        time10Osc: Number(measuredTime10.toFixed(2)),
        periodMeasured: Number(measuredT.toFixed(3)),
        tSquared: Number(tSquared.toFixed(3)),
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'lengthCm', label: 'Length L', unit: 'cm', precision: 1 },
      { key: 'lengthM', label: 'Length L', unit: 'm', precision: 2 },
      { key: 'time10Osc', label: 'Time (10 osc)', unit: 's', precision: 2 },
      { key: 'periodMeasured', label: 'Period T', unit: 's', precision: 3 },
      { key: 'tSquared', label: 'T²', unit: 's²', precision: 3 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const lengthM = Number(inputs.lengthM || 0.5);
      const g = 9.81;
      const period = 2.0 * Math.PI * Math.sqrt(lengthM / g);
      const time10 = period * 10.0;
      return {
        lengthCm: lengthM * 100.0,
        lengthM,
        time10Osc: Number(time10.toFixed(2)),
        periodMeasured: Number(period.toFixed(3)),
        tSquared: Number((period * period).toFixed(3)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Length L', unit: 'm', key: 'lengthM' },
    yAxis: { label: 'Period Squared T²', unit: 's²', key: 'tSquared' },
    expectedSlopeKey: '4pi^2/g',
    expectedSlopeValue: (4.0 * Math.PI * Math.PI) / 9.81,
    expectedFormula: 'T^2 = (4\\pi^2 / g) * L',
  },
  mistakes: [
    {
      id: 'large-amplitude',
      name: 'Large Release Angle (>15°)',
      triggerCondition: 'inputs.angleDeg > 15',
      consequence: 'Period increases beyond SHM prediction due to breakdown of sin(θ) ≈ θ approximation.',
      aiExplanation: 'The simple pendulum equation T = 2π√(L/g) is derived assuming sin(θ) ≈ θ in radians, valid only for small angles (<15°).',
    },
    {
      id: 'counting-error',
      name: 'Counting Release Point as Oscillation 1',
      triggerCondition: 'inputs.startedCountAtRelease === true',
      consequence: 'Systematic timing offset: only 9 oscillations counted instead of 10, overestimating period by ~10%.',
      aiExplanation: 'Count "ZERO" at the release moment and count "ONE" when the bob returns to the release position for the first complete cycle.',
    },
    {
      id: 'too-few-cycles',
      name: 'Timing Only 3-5 Oscillations',
      triggerCondition: 'inputs.oscCount < 10',
      consequence: 'Human reaction time uncertainty (±0.2s) introduces large percentage error in computed period T.',
      aiExplanation: 'Timing 10 to 20 oscillations divides human reaction timer uncertainty by N, significantly improving measurement precision.',
    },
  ],
  assessment: [
    { id: 'p1', description: 'String length measured to center of bob mass', points: 15, verifyCondition: 'measuredFromCenter === true' },
    { id: 'p2', description: 'Kept amplitude angle < 10° throughout trials', points: 15, verifyCondition: 'maxAngle <= 10' },
    { id: 'p3', description: 'Recorded data across at least 6 different lengths', points: 20, verifyCondition: 'data.length >= 6' },
    { id: 'p4', description: 'Calculated T and T² accurately for all trials', points: 15, verifyCondition: 'verifyTCalculations(data)' },
    { id: 'p5', description: 'Plotted T² vs L graph with straight best-fit line', points: 15, verifyCondition: 'graphLinearityScore > 0.98' },
    { id: 'p6', description: 'Extracted g = 9.81 m/s² (within 3% error margin)', points: 20, verifyCondition: 'abs(calculatedG - 9.81) < 0.3' },
  ],
  freeMode: {
    objective: 'Determine local gravity g on an unidentified planetary station using pendulum apparatus.',
    availableApparatus: ['Retort stand', 'String lengths (10cm - 150cm)', 'Bobs (brass, aluminum, wood)', 'Stopwatch', 'Protractor', 'Laser gate timer'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Determine whether bob mass or bob density alters the oscillation period T.',
    constraints: { timeMinutes: 25, budget: 80, safetyLevel: 'Low Risk' },
    requiredIdentifications: ['Independent variable: Bob mass', 'Dependent variable: Period T', 'Control variables: Length L, release angle θ'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['T = 2\\pi \\sqrt{\\frac{L}{g}}', 'T^2 = \\frac{4\\pi^2}{g}L', 'g = \\frac{4\\pi^2 L}{T^2}'],
    conceptKeywords: ['pendulum', 'simple harmonic motion', 'shm', 'gravity', 'period', 'oscillation'],
  },
};
