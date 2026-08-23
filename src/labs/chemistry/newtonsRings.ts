/**
 * Experiment 07 Configuration: Determination of Radius of Curvature of a Given Plano-Convex Lens by Newton’s Rings
 * HoloLearn Virtual Physics Laboratory
 */

import type { ExperimentConfig } from '../types';

export const newtonsRingsConfig: ExperimentConfig = {
  id: 'newtons-rings',
  title: 'Determination of Radius of Curvature by Newton’s Rings',
  subject: 'physics',
  objective: 'Determine the radius of curvature (R) of a plano-convex lens by observing concentric interference rings produced in a thin air film and analyzing the linear relationship between dark ring diameter squared (D_n^2) and ring order (n).',
  apparatus: [
    {
      id: 'plano-convex-lens',
      name: 'Plano-Convex Glass Lens',
      specs: 'Radius of curvature R ≈ 100 cm, high-quality optical crown glass',
      instructions: 'Place convex surface in contact with the optically flat glass plate to form a thin air film.',
    },
    {
      id: 'flat-glass-plate',
      name: 'Optically Flat Glass Plate',
      specs: 'Flatness < λ/10, polished optical glass plate',
      instructions: 'Acts as the lower reflecting boundary for interference fringe generation.',
    },
    {
      id: 'sodium-lamp',
      name: 'Sodium Monochromatic Vapor Lamp',
      specs: 'Wavelength λ = 589.0 nm (D-line)',
      instructions: 'Provides monochromatic illumination for stable interference fringes.',
    },
    {
      id: 'beam-reflector',
      name: '45° Glass Reflector Plate',
      specs: 'Half-silvered/plain glass plate mounted at 45°',
      instructions: 'Directs collimated monochromatic light vertically onto the lens-plate assembly.',
    },
    {
      id: 'travelling-microscope',
      name: 'Travelling Microscope with Vernier Scale',
      specs: '0.01 mm least count, X-axis micrometer traverse with crosshair reticle',
      instructions: 'Focus on interference fringes and measure left & right positions of dark rings.',
    },
    {
      id: 'optical-bench-base',
      name: 'Heavy Anodized Optical Bench Base',
      specs: 'Vibration-isolated optical rail system',
      instructions: 'Supports light source, reflector, lens holder, and travelling microscope.',
    },
  ],
  substances: [
    {
      id: 'sodium-light',
      name: 'Sodium Monochromatic Light (589 nm)',
      formula: 'λ = 589 nm',
      initialTemp: 25.0,
      initialColor: '#eab308',
    },
    {
      id: 'red-laser-light',
      name: 'Red Laser Light (650 nm)',
      formula: 'λ = 650 nm',
      initialTemp: 25.0,
      initialColor: '#ef4444',
    },
    {
      id: 'green-laser-light',
      name: 'Green Laser Light (532 nm)',
      formula: 'λ = 532 nm',
      initialTemp: 25.0,
      initialColor: '#22c55e',
    },
  ],
  procedure: [
    {
      stepNumber: 1,
      instruction: 'Place the plano-convex lens with its curved spherical surface in contact with the optically flat glass plate.',
      expectedAction: 'Plano-convex lens positioned on glass plate.',
    },
    {
      stepNumber: 2,
      instruction: 'Switch on the Sodium monochromatic lamp (λ = 589 nm) to illuminate the optical arrangement.',
      expectedAction: 'Sodium lamp active.',
    },
    {
      stepNumber: 3,
      instruction: 'Adjust the 45° glass reflector plate to direct light vertically onto the lens-plate system.',
      expectedAction: 'Light directed vertically onto lens.',
    },
    {
      stepNumber: 4,
      instruction: 'Focus the travelling microscope until concentric circular Newton’s rings are sharp.',
      expectedAction: 'Microscope focused (blur = 0).',
    },
    {
      stepNumber: 5,
      instruction: 'Move the travelling microscope crosshair to align with the central dark spot (n = 0).',
      expectedAction: 'Microscope aligned at central spot.',
    },
    {
      stepNumber: 6,
      instruction: 'Traverse the microscope to the left side and record left micrometer readings (X_L) for dark rings (n = 2, 4, 6, 8, 10, 12, 14, 16).',
      expectedAction: 'Left readings recorded.',
    },
    {
      stepNumber: 7,
      instruction: 'Traverse the microscope to the right side and record right micrometer readings (X_R) for the corresponding dark rings.',
      expectedAction: 'Right readings recorded.',
    },
    {
      stepNumber: 8,
      instruction: 'Calculate ring diameters D_n = |X_R - X_L| and compute D_n^2 for each ring order n.',
      expectedAction: 'D_n^2 data table populated.',
    },
    {
      stepNumber: 9,
      instruction: 'Plot D_n^2 against ring order n on the real-time graph and determine linear slope m = Δ(D^2)/Δn.',
      expectedAction: 'Graph linear regression slope calculated.',
    },
    {
      stepNumber: 10,
      instruction: 'Calculate radius of curvature R = Slope / (4λ) and generate the formal laboratory report.',
      expectedAction: 'Radius of curvature R determined and report generated.',
    },
  ],
  stateEngine: {
    constants: {
      defaultRadiusCm: 100,
    },
    calculateState: (inputs: Record<string, any>) => {
      const lambdaNm = Number(inputs.wavelengthNm || 589);
      const radiusCm = Number(inputs.radiusCm || 100);
      const readingsCount = Number(inputs.readingsCount || 0);
      const slope = Number(inputs.slope || 0);

      return {
        lambdaNm,
        radiusCm,
        readingsCount,
        slope,
        isCompleted: readingsCount >= 5 && slope > 0,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'ringOrder', label: 'Ring Order (n)', unit: '', precision: 0 },
      { key: 'leftMm', label: 'Left Reading (X_L)', unit: 'mm', precision: 2 },
      { key: 'rightMm', label: 'Right Reading (X_R)', unit: 'mm', precision: 2 },
      { key: 'diameterMm', label: 'Diameter (D_n)', unit: 'mm', precision: 2 },
      { key: 'diameterCm', label: 'Diameter (D_n)', unit: 'cm', precision: 3 },
      { key: 'diameterSqCm2', label: 'D_n^2', unit: 'cm²', precision: 4 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const leftMm = Number(inputs.leftMm || 0);
      const rightMm = Number(inputs.rightMm || 0);
      const dMm = Math.abs(rightMm - leftMm);
      const dCm = dMm / 10.0;
      const dSq = dCm * dCm;

      return {
        ringOrder: Number(inputs.ringOrder || 0),
        leftMm,
        rightMm,
        diameterMm: Number(dMm.toFixed(2)),
        diameterCm: Number(dCm.toFixed(3)),
        diameterSqCm2: Number(dSq.toFixed(4)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Ring Order (n)', unit: '', key: 'ringOrder' },
    yAxis: { label: 'Diameter Squared (D_n^2)', unit: 'cm²', key: 'diameterSqCm2' },
    expectedFormula: 'D_n^2 = 4 \\lambda R n \\implies R = \\frac{\\text{Slope}}{4 \\lambda}',
  },
  mistakes: [
    {
      id: 'bright-ring-confusion',
      name: 'Measuring Bright Rings Instead of Dark Rings',
      triggerCondition: 'inputs.ringType === "bright"',
      consequence: 'Formula phase shift causes systematic offset in calculated radius.',
      aiExplanation: 'Newton’s rings in reflected light undergo a π phase change at the lower glass surface, so dark rings satisfy D_n^2 = 4nλR.',
    },
    {
      id: 'unfocused-microscope',
      name: 'Unfocused Microscope View',
      triggerCondition: 'inputs.isFocused === false',
      consequence: 'Blurred fringe boundary increases micrometer reading uncertainty.',
      aiExplanation: 'Always focus the travelling microscope fine adjustment knob until fringe edges are crisp before recording readings.',
    },
    {
      id: 'radius-not-diameter',
      name: 'Plotting Ring Radius (r) Instead of Diameter Squared (D^2)',
      triggerCondition: 'inputs.plottedKey === "radius"',
      consequence: 'Non-linear curve produced instead of a straight line.',
      aiExplanation: 'Plot Diameter Squared (D_n^2) against Ring Order (n) to get a straight line with slope m = 4λR.',
    },
  ],
  assessment: [
    {
      id: 'n1',
      description: 'Positioned plano-convex lens on flat glass plate',
      points: 10,
      verifyCondition: 'inputs.lensPlaced === true',
    },
    {
      id: 'n2',
      description: 'Activated monochromatic Sodium lamp illumination (589 nm)',
      points: 15,
      verifyCondition: 'inputs.lampActive === true',
    },
    {
      id: 'n3',
      description: 'Focused travelling microscope and located central dark spot',
      points: 15,
      verifyCondition: 'inputs.isFocused === true',
    },
    {
      id: 'n4',
      description: 'Recorded left and right micrometer readings for at least 5 ring orders',
      points: 25,
      verifyCondition: 'inputs.readingsCount >= 5',
    },
    {
      id: 'n5',
      description: 'Plotted D_n^2 vs n linear graph and calculated slope',
      points: 20,
      verifyCondition: 'inputs.slope > 0',
    },
    {
      id: 'n6',
      description: 'Determined lens radius of curvature R with percentage error calculation',
      points: 15,
      verifyCondition: 'inputs.isCompleted === true',
    },
  ],
  freeMode: {
    objective: 'Explore Newton’s rings interference patterns across varied monochromatic wavelengths (Sodium 589nm, Red 650nm, Green 532nm) and lens radii.',
    availableApparatus: ['Plano-Convex Lens', 'Flat Glass Plate', 'Sodium Lamp', 'Red Laser', 'Green Laser', 'Travelling Microscope'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate how air film thickness profile affects Newton’s ring spacing gradient across higher ring orders.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Low' },
    requiredIdentifications: ['Independent: Wavelength λ & Ring order n', 'Dependent: Ring diameter D_n & D_n^2 slope'],
  },
  smartboardTrigger: {
    detectedLaTeX: [
      'D_n^2 = 4 n \\lambda R',
      'R = \\frac{D_n^2}{4 n \\lambda}',
      'R = \\frac{\\text{Slope}}{4 \\lambda}',
    ],
    conceptKeywords: ["newton's rings", 'plano-convex lens', 'radius of curvature', 'thin film interference', 'travelling microscope', 'wavelength', 'sodium lamp'],
  },
};
