import type { ExperimentConfig } from '../types';

export const freeFallConfig: ExperimentConfig = {
  id: 'free-fall',
  title: 'Free Fall Motion & Gravitational Acceleration g',
  subject: 'physics',
  objective: 'Investigate vertical free-fall motion, measure fall time t across release heights h = ½gt², and experimentally determine gravitational acceleration g via mathematical formula and linear regression slope analysis.',
  apparatus: [
    { id: 'electromagnet', name: 'Electromagnetic Release Mechanism', specs: '12V solenoid hold-and-release with microsecond pulse trigger', instructions: 'Secure release pin at desired height h mark on vertical scale.' },
    { id: 'ball', name: 'Precision Spherical Test Objects', specs: 'Steel (28g, 18mm), Aluminum (10g, 18mm), Heavy Alloy (100g, 18mm)', instructions: 'Attach chosen object to electromagnet tip.' },
    { id: 'photogates', name: 'Dual Photogate / Motion Sensors', specs: 'Infrared light-beam sensors with 0.0001s timing accuracy', instructions: 'Position upper sensor at release point and lower sensor at drop height h.' },
    { id: 'timer', name: 'Digital Photogate & Trapdoor Timer', specs: '0.001s resolution (1ms precision) with dual memory buffer', instructions: 'Records t₁ on photogate A trigger and t₂ on photogate B / impact pad trigger.' },
    { id: 'ruler', name: 'Vertical Measurement Column', specs: '2.00m to 20.00m modular height scale with 1mm laser markings', instructions: 'Align height scale vertically using plumb line.' },
    { id: 'impact', name: 'Cushioned Electronic Impact Pad', specs: 'Piezo-electric pressure plate landing sensor', instructions: 'Place directly beneath vertical axis of release solenoid.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Select release height h (e.g. 10.00 m) on the vertical column.', expectedAction: 'Set release height.' },
    { stepNumber: 2, instruction: 'Verify initial velocity v₀ is set to 0.00 m/s for ideal free fall.', expectedAction: 'Set v₀ = 0.' },
    { stepNumber: 3, instruction: 'Click ARM SENSOR to energize electromagnet and ready photogate timer.', expectedAction: 'Arm solenoid.' },
    { stepNumber: 4, instruction: 'Click RELEASE to de-energize solenoid and release object from rest.', expectedAction: 'Release object.' },
    { stepNumber: 5, instruction: 'Observe vertical motion and record measured fall time t from digital display.', expectedAction: 'Note fall time t.' },
    { stepNumber: 6, instruction: 'Click RECORD TRIAL to store height h, fall time t, t², and experimental g.', expectedAction: 'Log data row.' },
    { stepNumber: 7, instruction: 'Repeat measurement across at least 5 different release heights (e.g. 2.0m, 5.0m, 10.0m, 15.0m, 20.0m).', expectedAction: 'Collect 5 trial rows.' },
    { stepNumber: 8, instruction: 'Navigate to GRAPH tab, plot Height h vs Time Squared t², and find best-fit slope.', expectedAction: 'Analyze slope.' },
    { stepNumber: 9, instruction: 'Calculate experimental g = 2 × slope and evaluate percentage error relative to 9.80665 m/s².', expectedAction: 'Calculate g and % error.' },
    { stepNumber: 10, instruction: 'Complete conceptual assessment questions and generate lab report.', expectedAction: 'Finalize experiment.' },
  ],
  stateEngine: {
    constants: { gNominal: 9.80665 },
    calculateState: (inputs: Record<string, any>) => {
      const heightM = Number(inputs.heightM || 10.0);
      const initialVelocity = Number(inputs.initialVelocity || 0.0);
      const g = Number(inputs.g || 9.80665);
      const sensorNoise = inputs.sensorNoise === true;
      const airResistance = inputs.airResistance === true;
      const massKg = Number(inputs.massKg || 0.028);

      // Quadratic kinematic: 0.5*g*t^2 + v0*t - h = 0
      const a = 0.5 * g;
      const b = initialVelocity;
      const c = -heightM;
      let idealT = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);

      if (airResistance) {
        // Simple drag approximation factor
        const dragFactor = 1.0 + 0.08 / massKg;
        idealT *= Math.sqrt(dragFactor);
      }

      const noise = sensorNoise ? (Math.random() - 0.5) * 0.008 : 0;
      const measuredT = Math.max(0.001, idealT + noise);
      const tSquared = measuredT * measuredT;
      const expG = (2 * heightM) / tSquared;

      return {
        heightM,
        initialVelocity,
        g,
        massKg,
        timeSeconds: Number(measuredT.toFixed(3)),
        tSquared: Number(tSquared.toFixed(3)),
        theoreticalT: Number(idealT.toFixed(3)),
        experimentalG: Number(expG.toFixed(3)),
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trialNum', label: 'Trial', unit: '', precision: 0 },
      { key: 'heightM', label: 'Height h', unit: 'm', precision: 2 },
      { key: 'fallTime', label: 'Time t', unit: 's', precision: 3 },
      { key: 'tSquared', label: 't²', unit: 's²', precision: 3 },
      { key: 'expG', label: 'Experimental g', unit: 'm/s²', precision: 3 },
      { key: 'errorPercent', label: 'Error', unit: '%', precision: 2 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const heightM = Number(inputs.heightM || 10.0);
      const gRef = Number(inputs.g || 9.80665);
      const noise = inputs.sensorNoise === true ? (Math.random() - 0.5) * 0.008 : 0;
      const t = Math.sqrt((2.0 * heightM) / gRef) + noise;
      const tSq = t * t;
      const expG = (2.0 * heightM) / tSq;
      const err = (Math.abs(expG - gRef) / gRef) * 100;

      return {
        heightM,
        fallTime: Number(t.toFixed(3)),
        tSquared: Number(tSq.toFixed(3)),
        expG: Number(expG.toFixed(3)),
        errorPercent: Number(err.toFixed(2)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Time Squared t²', unit: 's²', key: 'tSquared' },
    yAxis: { label: 'Height h', unit: 'm', key: 'heightM' },
    expectedSlopeKey: 'g/2',
    expectedSlopeValue: 9.80665 / 2.0,
    expectedFormula: 'h = (g / 2) * t^2',
  },
  mistakes: [
    {
      id: 'initial-push',
      name: 'Imparting Initial Downward Velocity (v₀ > 0)',
      triggerCondition: 'inputs.initialVelocity > 0',
      consequence: 'Object reaches sensors faster than pure free fall; measured fall time is artificially short.',
      aiExplanation: 'Ball must be released smoothly from rest (v₀ = 0 m/s) to isolate gravitational acceleration.',
    },
    {
      id: 'manual-reaction-error',
      name: 'Using Manual Timing with Human Delay',
      triggerCondition: 'inputs.isManualStopwatch === true',
      consequence: 'Human reaction time (±0.15s) severely corrupts small fall time measurements.',
      aiExplanation: 'Sub-second free fall intervals require electronic photogates with sub-millisecond precision.',
    },
    {
      id: 'air-resistance-assumption',
      name: 'Ignoring Drag in High Air Density',
      triggerCondition: 'inputs.airResistance === true',
      consequence: 'Air drag opposes gravity, reducing acceleration and causing non-ideal quadratic scaling.',
      aiExplanation: 'Ideal free fall assumes vacuum conditions where gravity is the sole acting force.',
    },
  ],
  assessment: [
    { id: 'f1', description: 'Armed and released object cleanly from rest (v₀ = 0 m/s)', points: 15, verifyCondition: 'initialVelocity === 0' },
    { id: 'f2', description: 'Recorded trial data across at least 5 distinct release heights', points: 20, verifyCondition: 'data.length >= 5' },
    { id: 'f3', description: 'Calculated t² accurately for all trials', points: 15, verifyCondition: 'verifyTSquared(data)' },
    { id: 'f4', description: 'Plotted Height h vs t² graph and identified best-fit slope', points: 20, verifyCondition: 'graphPlotted === true' },
    { id: 'f5', description: 'Determined experimental g from slope (g = 2 × slope) within ±3% uncertainty', points: 15, verifyCondition: 'abs(calculatedG - 9.80665) < 0.3' },
    { id: 'f6', description: 'Tested planet comparison or mass independence principle', points: 15, verifyCondition: 'planetTested === true' },
  ],
  freeMode: {
    objective: 'Explore free-fall behavior under custom gravity environments (Moon, Mars, Jupiter), vary mass, and test air resistance.',
    availableApparatus: ['Vertical Drop Column', 'Photogate Sensors', 'Steel, Aluminum & Alloy Spheres', 'Vacuum Chamber Toggle', 'Digital Timer'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'How does air resistance modify the linear relationship between drop height h and fall time squared t²?',
    constraints: { timeMinutes: 25, budget: 100, safetyLevel: 'Low Risk' },
    requiredIdentifications: ['Independent variable: Height h / Air density', 'Dependent variable: Fall time t', 'Control variable: Sphere diameter / Solenoid trigger'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['h = \\frac{1}{2}gt^2', 't = \\sqrt{\\frac{2h}{g}}', 'g = \\frac{2h}{t^2}', 'v = -gt', 'v^2 = 2gh'],
    conceptKeywords: ['free fall', 'gravity', 'gravitational acceleration', 'falling body', 'kinematics', 'photogate'],
  },
};

