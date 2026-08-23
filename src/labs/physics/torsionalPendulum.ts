import type { ExperimentConfig } from '../types';

export const torsionalPendulumConfig: ExperimentConfig = {
  id: 'torsional-pendulum-rigidity',
  title: 'Determination of Rigidity Modulus of a Wire Using Torsional Pendulum',
  subject: 'physics',
  objective:
    'Experimentally determine the rigidity modulus (shear modulus G) of the material of a given wire using torsional oscillations and linear regression of T² vs moment of inertia I.',

  apparatus: [
    { id: 'torsion-wire-assembly', name: 'Torsion Wire & Top Clamp', specs: 'Steel, Brass, Copper, Aluminum, or Iron wire (L = 0.5 - 2.0 m)', instructions: 'Secure top clamp to rigid stand' },
    { id: 'torsional-disc', name: 'Circular Heavy Metal Disc', specs: 'Mass M = 0.1 - 2.0 kg, Radius R = 5 - 15 cm with central spindle', instructions: 'Supports torsional oscillations' },
    { id: 'slotted-masses', name: 'Symmetrical Slotted Mass Set', specs: 'Pair of 100 g - 500 g masses placed at radial distance r', instructions: 'Vary total moment of inertia I' },
    { id: 'screw-gauge', name: 'Virtual Screw Gauge (Micrometer)', specs: 'Pitch = 0.5 mm, 50 circular divisions, Least Count = 0.01 mm', instructions: 'Measure wire diameter d at top, middle, bottom' },
    { id: 'meter-scale', name: 'Precision Meter Scale', specs: '1 mm least count meter rod', instructions: 'Measure length L of torsion wire' },
    { id: 'stopwatch', name: 'Digital Precision Stopwatch', specs: '0.01 s least count timer', instructions: 'Measure time for N oscillations' },
    { id: 'angular-protractor', name: 'Circular Angular Scale & Pointer', specs: '360° protractor scale with needle pointer', instructions: 'Set small initial displacement (θ <= 10°)' },
  ],

  substances: [
    { id: 'steel-wire', name: 'Steel Wire (G = 79.3 GPa)', formula: 'Fe-C', initialColor: '#94a3b8' },
    { id: 'brass-wire', name: 'Brass Wire (G = 37.0 GPa)', formula: 'Cu-Zn', initialColor: '#facc15' },
    { id: 'copper-wire', name: 'Copper Wire (G = 45.0 GPa)', formula: 'Cu', initialColor: '#fb923c' },
    { id: 'aluminum-wire', name: 'Aluminum Wire (G = 26.0 GPa)', formula: 'Al', initialColor: '#cbd5e1' },
    { id: 'iron-wire', name: 'Iron Wire (G = 52.0 GPa)', formula: 'Fe', initialColor: '#64748b' },
  ],

  procedure: [
    { stepNumber: 1, instruction: 'Inspect the torsional pendulum assembly, wire material, and measurement tools shelf.', expectedAction: 'Inspect Apparatus' },
    { stepNumber: 2, instruction: 'Use the Meter Scale to measure the length L of the torsion wire between clamps (e.g. 1.0 m).', expectedAction: 'Measure Wire Length L' },
    { stepNumber: 3, instruction: 'Open the Virtual Screw Gauge tool to measure the wire diameter d at top, middle, and bottom positions.', expectedAction: 'Measure Diameter with Screw Gauge' },
    { stepNumber: 4, instruction: 'Calculate the mean wire diameter d (mm) and convert to meters.', expectedAction: 'Calculate Mean Diameter' },
    { stepNumber: 5, instruction: 'Record the mass M and radius R of the central metal disc to find baseline I_disc = 0.5 * M * R².', expectedAction: 'Record Disc Dimensions' },
    { stepNumber: 6, instruction: 'Place the baseline disc without additional masses on the spindle (Mass = 0 g).', expectedAction: 'Set Baseline Mass' },
    { stepNumber: 7, instruction: 'Twist the disc through a small initial angular displacement θ0 (5° - 10°).', expectedAction: 'Apply Angular Displacement' },
    { stepNumber: 8, instruction: 'Release the disc to initiate torsional oscillation and activate the digital stopwatch.', expectedAction: 'Release Disc & Start Timer' },
    { stepNumber: 9, instruction: 'Count N = 10 oscillations as the pointer crosses the central zero mark.', expectedAction: 'Count 10 Oscillations' },
    { stepNumber: 10, instruction: 'Record total time t, calculate period T = t / N, and T².', expectedAction: 'Record Trial 1' },
    { stepNumber: 11, instruction: 'Add a pair of symmetrical slotted masses (e.g. 200 g each) at radial distance r on the disc.', expectedAction: 'Add Slotted Masses' },
    { stepNumber: 12, instruction: 'Repeat the torsional oscillation release and count N = 10 oscillations for the new moment of inertia.', expectedAction: 'Record Trial 2' },
    { stepNumber: 13, instruction: 'Repeat for 3 or more mass configurations to populate the observation table.', expectedAction: 'Complete Multiple Trials' },
    { stepNumber: 14, instruction: 'Switch to the GRAPH tab to view the T² vs I linear regression line and determine slope m.', expectedAction: 'Analyze T² vs I Graph' },
    { stepNumber: 15, instruction: 'Calculate experimental Rigidity Modulus G = (128 * pi * L) / (d⁴ * slope) in GPa.', expectedAction: 'Calculate G' },
    { stepNumber: 16, instruction: 'Compare experimental G vs reference value and evaluate percentage error.', expectedAction: 'Calculate Error' },
    { stepNumber: 17, instruction: 'Generate and print formal scientific laboratory report.', expectedAction: 'Generate Lab Report' },
  ],

  stateEngine: {
    calculateState: (inputs: Record<string, any>) => inputs,
  },

  dataTable: {
    columns: [
      { key: 'trialNumber', label: 'Trial', unit: '#' },
      { key: 'addedMassKg', label: 'Added Mass', unit: 'kg' },
      { key: 'totalMassKg', label: 'Total Mass', unit: 'kg' },
      { key: 'inertiaI', label: 'Moment of Inertia I', unit: 'kg·m²' },
      { key: 'oscillationsN', label: 'Oscillations N', unit: 'count' },
      { key: 'totalTimeS', label: 'Total Time t', unit: 's' },
      { key: 'periodT', label: 'Period T', unit: 's' },
      { key: 'periodSquaredT2', label: 'T²', unit: 's²' },
    ],
    calculateRow: (inputs: Record<string, any>) => inputs,
  },

  graph: {
    xAxis: { label: 'Moment of Inertia I', unit: 'kg·m²', key: 'totalMomentOfInertiaKgM2' },
    yAxis: { label: 'Time Period Squared T²', unit: 's²', key: 'periodSquaredT2' },
  },

  mistakes: [
    {
      id: 'large-angle',
      name: 'Large Angle Distortion',
      triggerCondition: 'Initial angle > 15 deg',
      consequence: 'Non-linear restoring torque causes inaccurate period calculation',
      aiExplanation: 'Keep initial twist angle small (θ <= 10°) to satisfy simple harmonic torsional oscillation assumptions.',
    },
  ],

  assessment: [
    {
      id: 'q1',
      description: 'Why does rigidity modulus depend so strongly on wire diameter d?',
      points: 10,
      verifyCondition: 'understands_d4_sensitivity',
    },
  ],

  freeMode: {
    objective: 'Explore torsional oscillations and measure rigidity modulus for different wire materials and geometries.',
    availableApparatus: [
      'torsion-wire-assembly',
      'torsional-disc',
      'slotted-masses',
      'screw-gauge',
      'meter-scale',
      'stopwatch',
      'angular-protractor',
    ],
    aiGuidanceStyle: 'safety_and_hints_only',
  },

  researchMode: {
    scientificQuestion: 'Determine rigidity modulus G from T² vs I slope and analyze d⁴ sensitivity.',
    constraints: {
      timeMinutes: 30,
      budget: 500,
      safetyLevel: 'Standard',
    },
    requiredIdentifications: ['Slope m = T²/I', 'Rigidity Modulus G = (128*pi*L)/(d⁴*m)'],
  },

  smartboardTrigger: {
    detectedLaTeX: [
      'T = 2\\pi \\sqrt{\\frac{I}{C}}',
      'C = \\frac{\\pi G d^4}{32 L}',
      'T^2 = \\frac{128 \\pi L}{G d^4} \\cdot I',
      'G = \\frac{128 \\pi L}{d^4 \\cdot m}',
    ],
    conceptKeywords: ['Torsional Pendulum', 'Rigidity Modulus', 'Shear Modulus', 'Torsional Rigidity', 'Polar Moment of Area'],
  },
};
