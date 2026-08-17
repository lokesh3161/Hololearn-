import type { ExperimentConfig } from '../types';

export const freeFallConfig: ExperimentConfig = {
  id: 'free-fall',
  title: 'Free Fall Motion & Gravitational Acceleration g',
  subject: 'physics',
  objective: 'Measure time of fall across varying drop heights h = ½gt² to determine acceleration due to gravity g.',
  apparatus: [
    { id: 'electromagnet', name: 'Electromagnet Ball Release', specs: '12V solenoid hold-and-release mechanism', instructions: 'Align release pin at height h mark.' },
    { id: 'ball', name: 'Precision Steel Sphere', specs: 'Mass = 28.0g, diameter = 18.0mm', instructions: 'Attach to electromagnet tip.' },
    { id: 'trapdoor', name: 'Electronic Sensor Trapdoor', specs: 'Micro-switch landing plate', instructions: 'Position directly below release solenoid.' },
    { id: 'timer', name: 'Millisecond Electronic Timer', specs: '0.001s resolution (1ms accuracy)', instructions: 'Timer starts automatically on release and stops on trapdoor impact.' },
    { id: 'ruler', name: 'Vertical Plumb Rule', specs: '2.0m height scale, 1mm markings', instructions: 'Measure distance from bottom of ball to trapdoor.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Set release electromagnet height h to 0.40 m above trapdoor.', expectedAction: 'Align height scale accurately.' },
    { stepNumber: 2, instruction: 'Attach steel sphere to electromagnet and reset electronic timer to 0.000 s.', expectedAction: 'Zero timer display.' },
    { stepNumber: 3, instruction: 'Trigger solenoid release; record fall time t from timer display.', expectedAction: 'Record t in seconds.' },
    { stepNumber: 4, instruction: 'Perform 3 trial drops for h = 0.40m and compute mean time t_mean.', expectedAction: 'Average t1, t2, t3.' },
    { stepNumber: 5, instruction: 'Repeat measurement for drop heights h = 0.60m, 0.80m, 1.00m, 1.20m, and 1.40m.', expectedAction: 'Build data table.' },
    { stepNumber: 6, instruction: 'Calculate t² in s² for each mean fall time.', expectedAction: 'Square average fall time.' },
    { stepNumber: 7, instruction: 'Plot height h (m) on y-axis vs t² (s²) on x-axis.', expectedAction: 'Fit straight line through origin.' },
    { stepNumber: 8, instruction: 'Determine g = 2 × slope.', expectedAction: 'Compute g in m/s².' },
  ],
  stateEngine: {
    constants: { gNominal: 9.81 },
    calculateState: (inputs: Record<string, any>) => {
      const heightM = Number(inputs.heightM || 1.0);
      const initialVelocity = Number(inputs.initialVelocity || 0);
      const isManualStopwatch = inputs.isManualStopwatch === true;
      const g = 9.81;

      // Quadratic kinematic: h = v0*t + 0.5*g*t^2 => 0.5*g*t^2 + v0*t - h = 0
      const a = 0.5 * g;
      const b = initialVelocity;
      const c = -heightM;
      const idealT = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);

      const electronicNoise = (Math.random() - 0.5) * 0.002; // ±1ms timing precision
      const humanReactionNoise = (Math.random() - 0.5) * 0.25; // ±125ms human stopwatch scatter

      const noise = isManualStopwatch ? humanReactionNoise : electronicNoise;
      const measuredT = Math.max(0.01, idealT + noise);
      const tSquared = measuredT * measuredT;

      return {
        heightM,
        initialVelocity,
        isManualStopwatch,
        timeSeconds: Number(measuredT.toFixed(3)),
        tSquared: Number(tSquared.toFixed(3)),
        theoreticalT: Number(idealT.toFixed(3)),
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'heightM', label: 'Height h', unit: 'm', precision: 2 },
      { key: 't1', label: 't₁', unit: 's', precision: 3 },
      { key: 't2', label: 't₂', unit: 's', precision: 3 },
      { key: 't3', label: 't₃', unit: 's', precision: 3 },
      { key: 'tMean', label: 'Mean t', unit: 's', precision: 3 },
      { key: 'tSquared', label: 't²', unit: 's²', precision: 3 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const heightM = Number(inputs.heightM || 1.0);
      const g = 9.81;
      const t = Math.sqrt((2.0 * heightM) / g);
      return {
        heightM,
        t1: Number((t + (Math.random() - 0.5) * 0.002).toFixed(3)),
        t2: Number((t + (Math.random() - 0.5) * 0.002).toFixed(3)),
        t3: Number((t + (Math.random() - 0.5) * 0.002).toFixed(3)),
        tMean: Number(t.toFixed(3)),
        tSquared: Number((t * t).toFixed(3)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Time Squared t²', unit: 's²', key: 'tSquared' },
    yAxis: { label: 'Height h', unit: 'm', key: 'heightM' },
    expectedSlopeKey: 'g/2',
    expectedSlopeValue: 9.81 / 2.0,
    expectedFormula: 'h = (g / 2) * t^2',
  },
  mistakes: [
    {
      id: 'initial-push',
      name: 'Imparting Initial Downward Velocity (v₀ > 0)',
      triggerCondition: 'inputs.initialVelocity > 0',
      consequence: 'Ball travels faster than free fall under gravity alone; measured fall times systematically short.',
      aiExplanation: 'Ball must be released smoothly from rest (v₀ = 0) by solenoid de-energization to measure pure gravitational acceleration.',
    },
    {
      id: 'manual-reaction-error',
      name: 'Using Hand-operated Stopwatch instead of Electronic Timer',
      triggerCondition: 'inputs.isManualStopwatch === true',
      consequence: 'Human reaction time error (±0.15s) severely corrupts small millisecond fall intervals.',
      aiExplanation: 'Fall times under 1 second require millisecond electronic gate timers because human reaction delay (~200ms) introduces excessive scatter.',
    },
    {
      id: 'parallax-height-error',
      name: 'Parallax Height Measurement Error',
      triggerCondition: 'inputs.parallaxOffset !== 0',
      consequence: 'Height scale misread by 1-2cm due to off-axis viewing angle.',
      aiExplanation: 'Align eye level perpendicular to vertical scale when taking height readings from release pin to trapdoor surface.',
    },
  ],
  assessment: [
    { id: 'f1', description: 'Used electronic gate timer for sub-millisecond precision', points: 15, verifyCondition: 'isManualStopwatch === false' },
    { id: 'f2', description: 'Recorded 3 trial drops per height to calculate mean fall time', points: 20, verifyCondition: 'hasThreeTrials === true' },
    { id: 'f3', description: 'Tested across minimum of 5 distinct drop heights', points: 20, verifyCondition: 'data.length >= 5' },
    { id: 'f4', description: 'Calculated t² accurately for all heights', points: 15, verifyCondition: 'verifyTSquared(data)' },
    { id: 'f5', description: 'Plotted h vs t² graph and calculated slope', points: 15, verifyCondition: 'graphPlotted === true' },
    { id: 'f6', description: 'Calculated g = 9.81 m/s² within ±3% experimental uncertainty', points: 15, verifyCondition: 'abs(calculatedG - 9.81) < 0.3' },
  ],
  freeMode: {
    objective: 'Determine gravitational acceleration g using stroboscopic photograph analysis or photogate drop tower.',
    availableApparatus: ['Drop tower', 'Photogates A & B', 'Steel/aluminum balls', 'Stroboscopic camera', 'Precision ruler'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate whether air drag affects terminal velocity of falling spheres of varying diameters.',
    constraints: { timeMinutes: 25, budget: 90, safetyLevel: 'Low Risk' },
    requiredIdentifications: ['Independent variable: Sphere diameter / cross-section', 'Dependent variable: Fall time / Acceleration', 'Control variable: Sphere density / Drop height'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['h = \\frac{1}{2}gt^2', 't = \\sqrt{\\frac{2h}{g}}', 'g = \\frac{2h}{t^2}', 'v^2 = 2gh'],
    conceptKeywords: ['free fall', 'gravity', 'acceleration due to gravity', 'falling body', 'kinematics'],
  },
};
