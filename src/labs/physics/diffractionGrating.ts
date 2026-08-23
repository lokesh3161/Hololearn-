import type { ExperimentConfig } from '../types';

export const diffractionGratingConfig: ExperimentConfig = {
  id: 'diffraction-grating-laser',
  title: 'Determination of Wavelength of Laser Light Using Diffraction Grating',
  subject: 'physics',
  objective:
    'Determine the wavelength of monochromatic laser light by measuring the angular positions of diffraction maxima produced by a diffraction grating of known line density N.',

  apparatus: [
    {
      id: 'laser-source',
      name: 'Monochromatic Laser Source',
      specs: 'Wavelength: 500 - 700 nm, Power: < 1 mW Class 2',
      instructions: 'Mount laser on optical rail and align along beam axis',
    },
    {
      id: 'diffraction-grating',
      name: 'Transmission Diffraction Grating',
      specs: 'Line densities: 300, 600, 1000, 1200 lines/mm',
      instructions: 'Mount grating vertically at normal incidence',
    },
    {
      id: 'optics-bench',
      name: 'Precision Optics Rail & Mounts',
      specs: 'Rail length: 2.0 m, Alignment accuracy: 0.1 mm',
      instructions: 'Supports sliding optical component holders',
    },
    {
      id: 'projection-screen',
      name: 'Diffraction Pattern Screen & Scale',
      specs: 'Screen width: 1.5 m, Scale least count: 1 mm',
      instructions: 'Project diffraction spots and measure displacement x',
    },
    {
      id: 'vernier-goniometer',
      name: 'Vernier Angular Goniometer',
      specs: 'Least count: 0.01°',
      instructions: 'Measure diffraction angle theta directly',
    },
  ],

  substances: [
    { id: 'red-650', name: 'Red Laser (650 nm)', formula: 'He-Ne 650nm', initialColor: '#ef4444' },
    { id: 'green-532', name: 'Green Laser (532 nm)', formula: 'DPSS 532nm', initialColor: '#22c55e' },
    { id: 'g-600', name: 'Grating (600 lines/mm)', formula: 'N=600/mm', initialColor: '#f59e0b' },
  ],

  procedure: [
    {
      stepNumber: 1,
      instruction: 'Place the monochromatic laser source and diffraction grating holder on the optical rail.',
      expectedAction: 'Mount laser and grating on optical rail',
    },
    {
      stepNumber: 2,
      instruction: 'Align the laser beam along the central optical axis so it strikes the grating at normal incidence.',
      expectedAction: 'Adjust laser alignment angle to 0.0°',
    },
    {
      stepNumber: 3,
      instruction: 'Set the distance L between the diffraction grating and the projection screen to 1.0 meter.',
      expectedAction: 'Adjust screen distance L to 1.0 m',
    },
    {
      stepNumber: 4,
      instruction: 'Select a 600 lines/mm transmission grating and calculate grating spacing d = 1 / (N * 1000).',
      expectedAction: 'Select 600 lines/mm grating',
    },
    {
      stepNumber: 5,
      instruction: 'Switch ON the laser source at 650 nm wavelength and observe the diffraction pattern on the screen.',
      expectedAction: 'Turn ON laser power',
    },
    {
      stepNumber: 6,
      instruction: 'Measure the distance x from the central maximum (n=0) to the first-order maximum (+1).',
      expectedAction: 'Position crosshair cursor at +1 spot',
    },
    {
      stepNumber: 7,
      instruction: 'Calculate the diffraction angle θ_1 = arctan(x_1 / L).',
      expectedAction: 'Compute angle theta_1',
    },
    {
      stepNumber: 8,
      instruction: 'Calculate experimental laser wavelength λ = (d * sin θ_1) / 1.',
      expectedAction: 'Compute experimental wavelength',
    },
    {
      stepNumber: 9,
      instruction: 'Repeat measurements for second-order maxima (n = +2, -2).',
      expectedAction: 'Record second order spot distance x_2',
    },
    {
      stepNumber: 10,
      instruction: 'Save readings into the Observation Table across multiple orders and grating densities.',
      expectedAction: 'Click + Record Trial for each order',
    },
    {
      stepNumber: 11,
      instruction: 'Open the Graph Tab and inspect the sin(θ) vs n linear regression fit.',
      expectedAction: 'View linear regression graph',
    },
    {
      stepNumber: 12,
      instruction: 'Generate the final automated scientific laboratory report.',
      expectedAction: 'Click Generate Lab Report',
    },
  ],

  stateEngine: {
    calculateState: (inputs: Record<string, any>) => inputs,
  },

  dataTable: {
    columns: [
      { key: 'trialNumber', label: 'Trial', unit: '#' },
      { key: 'laserName', label: 'Laser', unit: 'type' },
      { key: 'linesPerMm', label: 'Lines/mm', unit: 'N' },
      { key: 'orderN', label: 'Order n', unit: '#' },
      { key: 'screenDistanceL', label: 'Screen L', unit: 'm' },
      { key: 'measuredXM', label: 'Displacement x', unit: 'm' },
      { key: 'calculatedAngleDeg', label: 'Angle θ', unit: '°' },
      { key: 'experimentalWavelengthNm', label: 'Experimental λ', unit: 'nm' },
    ],
    calculateRow: (inputs: Record<string, any>) => inputs,
  },

  graph: {
    xAxis: { label: 'Diffraction Order n', unit: '#', key: 'orderN' },
    yAxis: { label: 'sin(θ)', unit: '#', key: 'sinTheta' },
    expectedSlopeKey: 'lambdaOverD',
    expectedSlopeValue: 0.00039,
    expectedFormula: 'sin(θ) = (λ / d) * n',
  },

  mistakes: [
    {
      id: 'laser-misaligned',
      name: 'Laser Beam Misalignment',
      triggerCondition: 'alignmentDeg > 2.0',
      consequence: 'Asymmetric diffraction spot positions on screen',
      aiExplanation: 'The grating equation d*sin(theta) = n*lambda assumes normal incidence. Beam misalignment introduces an angle offset error.',
    },
  ],

  assessment: [
    {
      id: 'q1',
      description: 'What happens to diffraction maxima spacing when grating line density N increases?',
      points: 10,
      verifyCondition: 'linesPerMm >= 600',
    },
    {
      id: 'q2',
      description: 'Why is the central maximum (n = 0) undeviated?',
      points: 10,
      verifyCondition: 'orderN === 0',
    },
    {
      id: 'q3',
      description: 'How does Green laser light (532 nm) compare to Red laser light (650 nm)?',
      points: 10,
      verifyCondition: 'laserWavelengthNm === 532',
    },
  ],

  freeMode: {
    objective: 'Explore laser diffraction with tunable wavelengths and grating line densities.',
    availableApparatus: ['laser-source', 'diffraction-grating', 'optics-bench', 'projection-screen', 'vernier-goniometer'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },

  researchMode: {
    scientificQuestion: 'Determine laser wavelength lambda from sin(theta) vs n slope and analyze grating density effects.',
    constraints: {
      timeMinutes: 30,
      budget: 500,
      safetyLevel: 'Standard',
    },
    requiredIdentifications: ['Slope m = lambda / d', 'Laser Wavelength lambda = m * d'],
  },

  smartboardTrigger: {
    detectedLaTeX: [
      'd \\sin \\theta = n \\lambda',
      '\\lambda = \\frac{d \\sin \\theta}{n}',
      'x = L \\tan \\theta',
    ],
    conceptKeywords: ['Laser Diffraction', 'Diffraction Grating', 'Laser Wavelength', 'Monochromatic Light', 'Constructive Interference'],
  },
};
