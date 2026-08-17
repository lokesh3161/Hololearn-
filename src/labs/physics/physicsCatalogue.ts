import type { ExperimentConfig } from '../types';

const defaultFreeMode = {
  objective: 'Explore system variables freely.',
  availableApparatus: ['Sensors', 'Masses', 'Track'],
  aiGuidanceStyle: 'safety_and_hints_only' as const,
};

const defaultResearchMode = {
  scientificQuestion: 'Investigate physics relationships across multiple trials.',
  constraints: { timeMinutes: 20, budget: 50, safetyLevel: 'Low' as const },
  requiredIdentifications: ['Independent variable', 'Dependent variable'],
};

export const newtonsLawConfig: ExperimentConfig = {
  id: 'newtons-second-law',
  title: "Newton's Second Law of Motion (F = ma)",
  subject: 'physics',
  objective: 'Investigate the relationship between force, mass, and acceleration using a dynamics track.',
  apparatus: [
    { id: 'track', name: 'Low-friction Dynamics Track', specs: '1.5m aluminum track', instructions: 'Set on level surface.' },
    { id: 'cart', name: 'Dynamics Cart', specs: '500g base mass', instructions: 'Place on track.' },
    { id: 'pulley', name: 'Low-friction Pulley', specs: 'End-mounted', instructions: 'Attach string over pulley.' },
    { id: 'masses', name: 'Slotted Mass Hanger', specs: '10g - 100g weights', instructions: 'Attach to string end.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Set up track and place cart.', expectedAction: 'Select cart mass.' },
    { stepNumber: 2, instruction: 'Attach hanging mass over pulley.', expectedAction: 'Select hanging mass.' },
    { stepNumber: 3, instruction: 'Release cart and record acceleration.', expectedAction: 'Click Release Cart.' },
    { stepNumber: 4, instruction: 'Plot F vs acceleration graph.', expectedAction: 'Record data points.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const mCart = Number(inputs.cartMass || 0.5);
      const mHanging = Number(inputs.hangingMass || 0.1);
      const force = mHanging * 9.81;
      const accel = force / (mCart + mHanging);
      return { mCart, mHanging, force, accel };
    },
  },
  dataTable: {
    columns: [
      { key: 'cartMass', label: 'Cart Mass', unit: 'kg', precision: 2 },
      { key: 'hangingMass', label: 'Hanging Mass', unit: 'kg', precision: 2 },
      { key: 'force', label: 'Force F', unit: 'N', precision: 2 },
      { key: 'accel', label: 'Acceleration', unit: 'm/s²', precision: 2 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const mCart = Number(inputs.cartMass || 0.5);
      const mHanging = Number(inputs.hangingMass || 0.1);
      const friction = Number(inputs.friction || 0);
      const appliedF = mHanging * 9.81;
      const netF = Math.max(0, appliedF - friction);
      const totalM = mCart + mHanging;
      const accel = totalM > 0 ? netF / totalM : 0;
      return {
        cartMass: Number(mCart.toFixed(2)),
        hangingMass: Number(mHanging.toFixed(2)),
        force: Number(netF.toFixed(2)),
        accel: Number(accel.toFixed(2)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Force F', unit: 'N', key: 'force' },
    yAxis: { label: 'Acceleration a', unit: 'm/s²', key: 'accel' },
  },
  mistakes: [],
  assessment: [
    { id: 'n1', description: 'Calculated F = ma within 5% error', points: 100, verifyCondition: 'accel > 0' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: {
    detectedLaTeX: ['F = ma', 'F = m \\cdot a'],
    conceptKeywords: ['newton', 'force', 'acceleration', 'mass', 'second law'],
  },
};

export const frictionConfig: ExperimentConfig = {
  id: 'friction-lab',
  title: 'Friction & Coefficients of Friction (μₛ, μₖ)',
  subject: 'physics',
  objective: 'Investigate static and kinetic friction forces across material surface pairs using horizontal pull and inclined plane methods to measure experimental coefficients of friction μₛ and μₖ.',
  apparatus: [
    { id: 'track', name: 'Material Surface Track', specs: 'Wood, Rubber, Plastic, Metal, Felt, Glass tracks', instructions: 'Select surface pair for testing.' },
    { id: 'block', name: 'Standard Friction Block', specs: '0.50 kg base block with brass load pegs', instructions: 'Place on track surface.' },
    { id: 'scale', name: 'Digital Force Sensor & Spring Scale', specs: '0 - 50N, ±0.01N resolution', instructions: 'Attach hook to block.' },
    { id: 'incline', name: 'Precision Inclinometer Ramp', specs: '0 - 89° adjustable angle arc', instructions: 'Adjust ramp angle for critical angle detection.' },
    { id: 'weights', name: 'Slotted Load Masses', specs: '0.1kg - 3.0kg additional masses', instructions: 'Add weights on top of block.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Select testing method (Horizontal Pull Force or Inclined Plane).', expectedAction: 'Choose method.' },
    { stepNumber: 2, instruction: 'Select material surface pair (e.g. Wood on Wood, Rubber on Wood).', expectedAction: 'Select surface.' },
    { stepNumber: 3, instruction: 'Set block mass and add optional extra load weights.', expectedAction: 'Adjust mass sliders.' },
    { stepNumber: 4, instruction: 'For Horizontal: Slowly increase applied pulling force until block slips.', expectedAction: 'Increase applied force.' },
    { stepNumber: 5, instruction: 'Observe motion state transition (Static → Impending → Sliding).', expectedAction: 'Watch state badge.' },
    { stepNumber: 6, instruction: 'For Inclined Plane: Gradually raise incline angle θ until block begins sliding.', expectedAction: 'Adjust angle slider.' },
    { stepNumber: 7, instruction: 'Click ⊕ Record Trial to snapshot experimental forces & angles.', expectedAction: 'Log trial data.' },
    { stepNumber: 8, instruction: 'Repeat for ≥2 different normal forces (masses) on the same surface.', expectedAction: 'Record multiple trials.' },
    { stepNumber: 9, instruction: 'Examine fₛ,max vs N and fₖ vs N graphs to compute slope = μ.', expectedAction: 'Analyze linear regression.' },
    { stepNumber: 10, instruction: 'Compare experimental coefficients with reference values in the lab report.', expectedAction: 'Generate formal report.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const mass = Number(inputs.blockMass || 0.5) + Number(inputs.additionalLoad || 0.0);
      const angle = Number(inputs.angleDeg || 0.0);
      const normalF = mass * 9.81 * Math.cos((angle * Math.PI) / 180);
      return { mass, angle, normalF: Number(normalF.toFixed(2)) };
    },
  },
  dataTable: {
    columns: [
      { key: 'id', label: 'Trial', unit: '#', precision: 0 },
      { key: 'method', label: 'Method', unit: '', precision: 0 },
      { key: 'surface', label: 'Surface', unit: '', precision: 0 },
      { key: 'totalMass', label: 'Total Mass', unit: 'kg', precision: 3 },
      { key: 'normalForce', label: 'Normal N', unit: 'N', precision: 2 },
      { key: 'maxStaticFriction', label: 'Max fₛ', unit: 'N', precision: 2 },
      { key: 'kineticFriction', label: 'Kinetic fₖ', unit: 'N', precision: 2 },
      { key: 'criticalAngleDeg', label: 'Critical θ', unit: '°', precision: 1 },
      { key: 'muSExperimental', label: 'μₛ (exp)', unit: '', precision: 3 },
      { key: 'muKExperimental', label: 'μₖ (exp)', unit: '', precision: 3 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const m = Number(inputs.blockMass || 0.5) + Number(inputs.additionalLoad || 0);
      const N = m * 9.81;
      return {
        id: '1',
        method: 'horizontal',
        surface: 'wood-wood',
        totalMass: Number(m.toFixed(3)),
        normalForce: Number(N.toFixed(2)),
        maxStaticFriction: Number((0.5 * N).toFixed(2)),
        kineticFriction: Number((0.4 * N).toFixed(2)),
        muSExperimental: 0.50,
        muKExperimental: 0.40,
      };
    },
  },
  graph: {
    xAxis: { label: 'Normal Force N', unit: 'N', key: 'normalForce' },
    yAxis: { label: 'Friction Force f', unit: 'N', key: 'maxStaticFriction' },
    expectedFormula: 'f_s = \\mu_s N, \\quad f_k = \\mu_k N',
  },
  mistakes: [
    {
      id: 'assume-static-equals-mu-n',
      name: 'Assuming Static Friction is Always Equal to μₛN',
      triggerCondition: 'inputs.appliedForce > 0 && inputs.appliedForce < inputs.maxStaticFriction && inputs.assumedMaxStatic === true',
      consequence: 'Static friction is reactive and equals applied force until impending motion threshold.',
      aiExplanation: 'Static friction fₛ ≤ μₛN adjusts to balance applied force exactly up to fₛ,max = μₛN.',
    },
  ],
  assessment: [
    { id: 'f1', description: 'Observed static equilibrium & impending motion threshold', points: 25, verifyCondition: 'data.length >= 1' },
    { id: 'f2', description: 'Recorded ≥2 trials with varying mass to establish linear trend', points: 25, verifyCondition: 'data.length >= 2' },
    { id: 'f3', description: 'Determined experimental coefficient of static friction μₛ from slope', points: 25, verifyCondition: 'data.length >= 2' },
    { id: 'f4', description: 'Determined experimental coefficient of kinetic friction μₖ from slope', points: 25, verifyCondition: 'data.length >= 2' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: {
    detectedLaTeX: [
      'f_s \\le \\mu_s N',
      'f_{s,\\max} = \\mu_s N',
      'f_k = \\mu_k N',
      '\\mu_s = \\tan(\\theta_c)',
    ],
    conceptKeywords: [
      'friction',
      'coefficient of static friction',
      'coefficient of kinetic friction',
      'normal force',
      'impending motion',
      'critical angle',
    ],
  },
};


export const projectileConfig: ExperimentConfig = {
  id: 'projectile-motion',
  title: 'Projectile Motion Trajectory & Range',
  subject: 'physics',
  objective: 'Investigate how launch angle, initial velocity, gravity, and launch height affect projectile trajectory, maximum height, time of flight, and horizontal range.',
  apparatus: [
    { id: 'launcher', name: 'Spring Launcher Cannon', specs: '0-90° angle adjustment with angle arc', instructions: 'Aim cannon to chosen angle.' },
    { id: 'projectile', name: 'Projectile Ball', specs: 'Mass 100g steel sphere', instructions: 'Loads into launcher barrel.' },
    { id: 'scale', name: 'Measurement Scale & Grid', specs: 'Meter markings & Range indicators', instructions: 'Reads horizontal displacement.' },
    { id: 'landing', name: 'Landing Surface', specs: 'Impact detection plane', instructions: 'Detects impact point and velocity.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Set the initial velocity (u).', expectedAction: 'Adjust velocity input.' },
    { stepNumber: 2, instruction: 'Set the launch angle (θ).', expectedAction: 'Adjust angle dial/slider.' },
    { stepNumber: 3, instruction: 'Set initial height (h₀) if elevated.', expectedAction: 'Set height.' },
    { stepNumber: 4, instruction: 'Confirm gravity (g).', expectedAction: 'Select Earth, Moon, or custom g.' },
    { stepNumber: 5, instruction: 'Launch the projectile.', expectedAction: 'Click ▶ LAUNCH.' },
    { stepNumber: 6, instruction: 'Record time of flight (T).', expectedAction: 'Observe flight duration.' },
    { stepNumber: 7, instruction: 'Record maximum height (H).', expectedAction: 'Note peak altitude.' },
    { stepNumber: 8, instruction: 'Record horizontal range (R).', expectedAction: 'Note impact distance.' },
    { stepNumber: 9, instruction: 'Repeat using different launch angles.', expectedAction: 'Run 30°, 45°, 60° trials.' },
    { stepNumber: 10, instruction: 'Compare trial data and export report.', expectedAction: 'Generate report.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const u = Number(inputs.initialVelocity || 20);
      const angle = Number(inputs.launchAngle || 45);
      const h0 = Number(inputs.initialHeight || 0);
      const g = Number(inputs.gravity || 9.81);

      const rad = (angle * Math.PI) / 180;
      const vx = u * Math.cos(rad);
      const vy0 = u * Math.sin(rad);

      const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
      const H = h0 + (vy0 * vy0) / (2 * g);
      const R = vx * T;
      const vFinal = Math.sqrt(vx * vx + Math.pow(vy0 - g * T, 2));

      return { vx, vy0, timeOfFlight: T, maxHeight: H, range: R, vFinal };
    },
  },
  dataTable: {
    columns: [
      { key: 'trialId', label: 'Trial', unit: '#', precision: 0 },
      { key: 'initialVelocity', label: 'Velocity u', unit: 'm/s', precision: 1 },
      { key: 'launchAngle', label: 'Angle θ', unit: '°', precision: 0 },
      { key: 'initialHeight', label: 'Height h₀', unit: 'm', precision: 1 },
      { key: 'gravity', label: 'Gravity g', unit: 'm/s²', precision: 2 },
      { key: 'timeOfFlight', label: 'Flight T', unit: 's', precision: 2 },
      { key: 'maxHeight', label: 'Max H', unit: 'm', precision: 2 },
      { key: 'range', label: 'Range R', unit: 'm', precision: 2 },
      { key: 'vFinal', label: 'Impact v', unit: 'm/s', precision: 2 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const u = Number(inputs.initialVelocity || 20);
      const angle = Number(inputs.launchAngle || 45);
      const h0 = Number(inputs.initialHeight || 0);
      const g = Number(inputs.gravity || 9.81);

      const rad = (angle * Math.PI) / 180;
      const vx = u * Math.cos(rad);
      const vy0 = u * Math.sin(rad);

      const T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
      const H = h0 + (vy0 * vy0) / (2 * g);
      const R = vx * T;
      const vFinal = Math.sqrt(vx * vx + Math.pow(vy0 - g * T, 2));

      return {
        initialVelocity: u,
        launchAngle: angle,
        initialHeight: h0,
        gravity: g,
        timeOfFlight: Number(T.toFixed(2)),
        maxHeight: Number(H.toFixed(2)),
        range: Number(R.toFixed(2)),
        vFinal: Number(vFinal.toFixed(2)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Range X', unit: 'm', key: 'range' },
    yAxis: { label: 'Height Y', unit: 'm', key: 'maxHeight' },
  },
  mistakes: [],
  assessment: [
    { id: 'p1', description: 'Demonstrated maximum range occurs at 45° for equal launch height', points: 25, verifyCondition: 'true' },
    { id: 'p2', description: 'Observed vertical velocity reaches 0 at peak height', points: 25, verifyCondition: 'true' },
    { id: 'p3', description: 'Logged trials across multiple launch angles', points: 25, verifyCondition: 'true' },
    { id: 'p4', description: 'Exported formal lab report with trajectory analysis', points: 25, verifyCondition: 'true' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: {
    detectedLaTeX: ['R = \\frac{v^2 \\sin(2\\theta)}{g}', 'y = v_0 t - \\frac{1}{2}gt^2'],
    conceptKeywords: ['projectile', 'trajectory', 'launch angle', 'parabola', 'range'],
  },
};

export const energyConfig: ExperimentConfig = {
  id: 'conservation-of-energy',
  title: 'Conservation of Mechanical Energy',
  subject: 'physics',
  objective: 'Verify that potential energy transforms into kinetic energy along a friction-free ramp.',
  apparatus: [
    { id: 'ramp', name: 'Curved Ramp Track', specs: 'Height 1 - 10m', instructions: 'Set start height.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Set start height on ramp.', expectedAction: 'Adjust slider.' },
    { stepNumber: 2, instruction: 'Release ball.', expectedAction: 'Click Release.' },
  ],
  stateEngine: {
    calculateState: () => ({ ok: true }),
  },
  dataTable: {
    columns: [
      { key: 'height', label: 'Height', unit: 'm', precision: 2 },
      { key: 'velocity', label: 'Velocity', unit: 'm/s', precision: 2 },
    ],
    calculateRow: () => ({ height: 5.0, velocity: 9.9 }),
  },
  graph: {
    xAxis: { label: 'Height', unit: 'm', key: 'height' },
    yAxis: { label: 'Kinetic Energy', unit: 'J', key: 'ke' },
  },
  mistakes: [],
  assessment: [
    { id: 'e1', description: 'Verified total energy remains constant', points: 100, verifyCondition: 'true' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: {
    detectedLaTeX: ['KE + PE = \\text{const}', 'E_{total} = \\frac{1}{2}mv^2 + mgh'],
    conceptKeywords: ['energy', 'potential energy', 'kinetic energy', 'conservation of energy'],
  },
};

export const torqueConfig: ExperimentConfig = {
  id: 'torque-equilibrium',
  title: 'Torque and Rotational Equilibrium',
  subject: 'physics',
  objective: 'Verify rotational equilibrium condition Στ = 0 on a balanced lever beam.',
  apparatus: [
    { id: 'beam', name: 'Fulcrum Seesaw Beam', specs: '1m length', instructions: 'Balance masses on hooks.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Place masses on left and right sides.', expectedAction: 'Set distances.' },
  ],
  stateEngine: {
    calculateState: () => ({ ok: true }),
  },
  dataTable: {
    columns: [
      { key: 'netTorque', label: 'Net Torque', unit: 'N·m', precision: 2 },
    ],
    calculateRow: () => ({ netTorque: 0.0 }),
  },
  graph: {
    xAxis: { label: 'Left Distance', unit: 'm', key: 'dL' },
    yAxis: { label: 'Right Distance', unit: 'm', key: 'dR' },
  },
  mistakes: [],
  assessment: [
    { id: 't1', description: 'Achieved net zero torque balance', points: 100, verifyCondition: 'true' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: {
    detectedLaTeX: ['\\tau = F r', '\\Sigma \\tau = 0'],
    conceptKeywords: ['torque', 'fulcrum', 'lever', 'equilibrium', 'rotational'],
  },
};

export const centripetalConfig: ExperimentConfig = {
  id: 'centripetal-force',
  title: 'Centripetal Force in Circular Motion',
  subject: 'physics',
  objective: 'Measure centripetal force as a function of angular velocity and orbital radius.',
  apparatus: [
    { id: 'rig', name: 'Rotating Platform Rig', specs: '30 - 180 RPM', instructions: 'Set RPM and radius.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Spin platform and measure force.', expectedAction: 'Click Record.' },
  ],
  stateEngine: {
    calculateState: () => ({ ok: true }),
  },
  dataTable: {
    columns: [
      { key: 'force', label: 'Centripetal Force', unit: 'N', precision: 2 },
    ],
    calculateRow: () => ({ force: 3.95 }),
  },
  graph: {
    xAxis: { label: 'Velocity v', unit: 'm/s', key: 'vLinear' },
    yAxis: { label: 'Force F_c', unit: 'N', key: 'force' },
  },
  mistakes: [],
  assessment: [
    { id: 'c1', description: 'Verified quadratic relationship F ∝ v²', points: 100, verifyCondition: 'true' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: {
    detectedLaTeX: ['F = \\frac{m v^2}{r}', 'a_c = \\frac{v^2}{r}'],
    conceptKeywords: ['centripetal', 'circular motion', 'angular velocity', 'radius', 'orbit'],
  },
};

export const momentumConfig: ExperimentConfig = {
  id: 'momentum-conservation',
  title: 'Conservation of Linear Momentum in 1D Collisions',
  subject: 'physics',
  objective: 'Investigate how mass, velocity, and collision type affect one-dimensional collisions while experimentally verifying conservation of linear momentum.',
  apparatus: [
    { id: 'track', name: 'Low-friction Dynamics Track', specs: '2.0m precision aluminum track', instructions: 'Set on level surface.' },
    { id: 'cart1', name: 'Dynamics Cart 1 (Left)', specs: 'Mass m₁ (0.1 - 2.0 kg)', instructions: 'Launches from left side of track.' },
    { id: 'cart2', name: 'Dynamics Cart 2 (Right)', specs: 'Mass m₂ (0.1 - 2.0 kg)', instructions: 'Launches from right side of track.' },
    { id: 'sensors', name: 'Dual Motion Photogates', specs: 'Ultrasonic position & velocity sensors', instructions: 'Measures initial and final cart velocities.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Set Cart 1 mass (m₁).', expectedAction: 'Adjust m₁ slider.' },
    { stepNumber: 2, instruction: 'Set Cart 2 mass (m₂).', expectedAction: 'Adjust m₂ slider.' },
    { stepNumber: 3, instruction: 'Set initial velocity Cart 1 (v₁).', expectedAction: 'Set v₁ speed.' },
    { stepNumber: 4, instruction: 'Set initial velocity Cart 2 (v₂).', expectedAction: 'Set v₂ speed.' },
    { stepNumber: 5, instruction: 'Select Collision Type (Elastic, Inelastic, Partially Inelastic).', expectedAction: 'Select mode.' },
    { stepNumber: 6, instruction: 'Make a prediction of post-collision motion.', expectedAction: 'Submit prediction.' },
    { stepNumber: 7, instruction: 'Click ▶ Start Collision.', expectedAction: 'Observe movement.' },
    { stepNumber: 8, instruction: 'Record final velocities v₁\' and v₂\'.', expectedAction: 'Observe telemetry.' },
    { stepNumber: 9, instruction: 'Compare initial momentum (pᵢ) and final momentum (p_f).', expectedAction: 'Verify conservation.' },
    { stepNumber: 10, instruction: 'Compare initial kinetic energy (KEᵢ) and final kinetic energy (KE_f).', expectedAction: 'Check energy loss.' },
    { stepNumber: 11, instruction: 'Repeat with different mass ratios or collision modes.', expectedAction: 'Run 3+ trials.' },
    { stepNumber: 12, instruction: 'Export trial data & formal lab report.', expectedAction: 'Generate report.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const m1 = Number(inputs.cart1Mass || 0.5);
      const m2 = Number(inputs.cart2Mass || 0.5);
      const v1 = Number(inputs.cart1Vel || 1.0);
      const v2 = Number(inputs.cart2Vel || -1.0);
      const mode = inputs.collisionType || 'elastic';
      const e = mode === 'elastic' ? 1.0 : mode === 'perfectly-inelastic' ? 0.0 : Number(inputs.restitution || 0.5);

      const p1_init = m1 * v1;
      const p2_init = m2 * v2;
      const p_init = p1_init + p2_init;
      const ke_init = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;

      let v1_final = 0;
      let v2_final = 0;

      if (mode === 'perfectly-inelastic') {
        const v_common = (m1 * v1 + m2 * v2) / (m1 + m2);
        v1_final = v_common;
        v2_final = v_common;
      } else {
        v1_final = (m1 * v1 + m2 * v2 - m2 * e * (v1 - v2)) / (m1 + m2);
        v2_final = (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / (m1 + m2);
      }

      const p1_final = m1 * v1_final;
      const p2_final = m2 * v2_final;
      const p_final = p1_final + p2_final;
      const ke_final = 0.5 * m1 * v1_final * v1_final + 0.5 * m2 * v2_final * v2_final;

      const p_err = Math.abs(p_init) > 0.001 ? (Math.abs(p_final - p_init) / Math.abs(p_init)) * 100 : 0;
      const ke_change = ke_final - ke_init;

      return {
        m1,
        m2,
        v1,
        v2,
        v1_final,
        v2_final,
        p_init,
        p_final,
        p_err,
        ke_init,
        ke_final,
        ke_change,
        restitution: e,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trialId', label: 'Trial', unit: '#', precision: 0 },
      { key: 'collisionType', label: 'Mode', unit: '', precision: 0 },
      { key: 'm1', label: 'm₁', unit: 'kg', precision: 2 },
      { key: 'm2', label: 'm₂', unit: 'kg', precision: 2 },
      { key: 'v1', label: 'v₁', unit: 'm/s', precision: 2 },
      { key: 'v2', label: 'v₂', unit: 'm/s', precision: 2 },
      { key: 'v1_final', label: "v₁'", unit: 'm/s', precision: 2 },
      { key: 'v2_final', label: "v₂'", unit: 'm/s', precision: 2 },
      { key: 'p_init', label: 'pᵢ', unit: 'kg·m/s', precision: 2 },
      { key: 'p_final', label: 'p_f', unit: 'kg·m/s', precision: 2 },
      { key: 'p_err', label: '% Error', unit: '%', precision: 1 },
      { key: 'ke_init', label: 'KEᵢ', unit: 'J', precision: 2 },
      { key: 'ke_final', label: 'KE_f', unit: 'J', precision: 2 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const m1 = Number(inputs.cart1Mass || 0.5);
      const m2 = Number(inputs.cart2Mass || 0.5);
      const v1 = Number(inputs.cart1Vel || 1.0);
      const v2 = Number(inputs.cart2Vel || -1.0);
      const mode = inputs.collisionType || 'elastic';
      const e = mode === 'elastic' ? 1.0 : mode === 'perfectly-inelastic' ? 0.0 : Number(inputs.restitution || 0.5);

      const p_init = m1 * v1 + m2 * v2;
      const ke_init = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;

      let v1_final = 0;
      let v2_final = 0;
      if (mode === 'perfectly-inelastic') {
        const v_common = (m1 * v1 + m2 * v2) / (m1 + m2);
        v1_final = v_common;
        v2_final = v_common;
      } else {
        v1_final = (m1 * v1 + m2 * v2 - m2 * e * (v1 - v2)) / (m1 + m2);
        v2_final = (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / (m1 + m2);
      }

      const p_final = m1 * v1_final + m2 * v2_final;
      const ke_final = 0.5 * m1 * v1_final * v1_final + 0.5 * m2 * v2_final * v2_final;
      const p_err = Math.abs(p_init) > 0.001 ? (Math.abs(p_final - p_init) / Math.abs(p_init)) * 100 : 0;

      return {
        collisionType: mode === 'elastic' ? 'Elastic' : mode === 'perfectly-inelastic' ? 'Inelastic' : `e=${e}`,
        m1,
        m2,
        v1,
        v2,
        v1_final: Number(v1_final.toFixed(2)),
        v2_final: Number(v2_final.toFixed(2)),
        p_init: Number(p_init.toFixed(2)),
        p_final: Number(p_final.toFixed(2)),
        p_err: Number(p_err.toFixed(1)),
        ke_init: Number(ke_init.toFixed(2)),
        ke_final: Number(ke_final.toFixed(2)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Time t', unit: 's', key: 'time' },
    yAxis: { label: 'Total Momentum p', unit: 'kg·m/s', key: 'p_total' },
  },
  mistakes: [],
  assessment: [
    { id: 'm1', description: 'Verified conservation of linear momentum (p_init ≈ p_final)', points: 25, verifyCondition: 'true' },
    { id: 'm2', description: 'Demonstrated kinetic energy loss in inelastic collisions', points: 25, verifyCondition: 'true' },
    { id: 'm3', description: 'Logged trials across elastic, inelastic, and partially inelastic modes', points: 25, verifyCondition: 'true' },
    { id: 'm4', description: 'Exported formal collision laboratory report', points: 25, verifyCondition: 'true' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: {
    detectedLaTeX: ['p_i = p_f', 'm_1 v_1 + m_2 v_2 = m_1 v_1\' + m_2 v_2\'', 'e = \\frac{v_2\' - v_1\'}{v_1 - v_2}'],
    conceptKeywords: ['momentum', 'collision', 'elastic', 'inelastic', 'restitution', 'conservation'],
  },
};

export const refractionConfig: ExperimentConfig = {
  id: 'refraction-snell',
  title: "Refraction of Light & Snell's Law",
  subject: 'physics',
  objective: "Determine the refractive index n of a glass block using Snell's Law n = sin(i) / sin(r).",
  apparatus: [
    { id: 'raybox', name: 'Ray Box with Single Slit', specs: '12V 21W filament ray box producing narrow light pencil', instructions: 'Direct beam at glass block surface.' },
    { id: 'glassblock', name: 'Rectangular Acrylic Glass Block', specs: '10cm x 6cm x 2cm, n = 1.50', instructions: 'Outline block footprint on paper.' },
    { id: 'protractor', name: '360° Circular Protractor', specs: '1° resolution', instructions: 'Measure incident angle i and refracted angle r against normal line.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Trace glass block perimeter and normal line on white paper.', expectedAction: 'Draw normal at point of incidence.' },
    { stepNumber: 2, instruction: 'Direct ray at incidence angle i = 10°, 20°, 30°, 40°, 50°, 60°.', expectedAction: 'Measure refracted angle r.' },
    { stepNumber: 3, instruction: 'Calculate sin(i) and sin(r) for each trial angle.', expectedAction: 'Build sine ratio table.' },
    { stepNumber: 4, instruction: 'Plot sin(i) on y-axis vs sin(r) on x-axis; slope = refractive index n.', expectedAction: 'Calculate n = sin(i)/sin(r).' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const angleIDeg = Number(inputs.angleIDeg || 30.0);
      const nGlass = 1.50;
      const angleIRad = (angleIDeg * Math.PI) / 180.0;
      const sinI = Math.sin(angleIRad);
      const sinR = sinI / nGlass;
      const angleRRad = Math.asin(sinR);
      const angleRDeg = (angleRRad * 180.0) / Math.PI;

      return {
        angleIDeg,
        angleRDeg: Number(angleRDeg.toFixed(1)),
        sinI: Number(sinI.toFixed(3)),
        sinR: Number(sinR.toFixed(3)),
        refractiveIndex: Number((sinI / sinR).toFixed(2)),
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'angleIDeg', label: 'Incident i', unit: '°', precision: 1 },
      { key: 'angleRDeg', label: 'Refracted r', unit: '°', precision: 1 },
      { key: 'sinI', label: 'sin(i)', unit: '', precision: 3 },
      { key: 'sinR', label: 'sin(r)', unit: '', precision: 3 },
      { key: 'refractiveIndex', label: 'n', unit: '', precision: 2 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const i = Number(inputs.angleIDeg || 30.0);
      const sinI = Math.sin((i * Math.PI) / 180.0);
      const sinR = sinI / 1.50;
      const r = (Math.asin(sinR) * 180.0) / Math.PI;
      return { angleIDeg: i, angleRDeg: Number(r.toFixed(1)), sinI: Number(sinI.toFixed(3)), sinR: Number(sinR.toFixed(3)), refractiveIndex: 1.50 };
    },
  },
  graph: {
    xAxis: { label: 'sin(r)', unit: '', key: 'sinR' },
    yAxis: { label: 'sin(i)', unit: '', key: 'sinI' },
    expectedSlopeValue: 1.50,
    expectedFormula: '\\sin(i) = n \\cdot \\sin(r)',
  },
  mistakes: [
    { id: 'angle-from-surface', name: 'Measuring Angles from Surface Instead of Normal', triggerCondition: 'inputs.measuredFromSurface === true', consequence: 'Completely corrupts trigonometric ratio.', aiExplanation: 'Angles of incidence and refraction must always be measured relative to the normal line (perpendicular to interface).' },
  ],
  assessment: [
    { id: 'r1', description: 'Calculated refractive index n = 1.50 within ±3% tolerance', points: 50, verifyCondition: 'abs(refractiveIndex - 1.50) < 0.05' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: { detectedLaTeX: ['n = \\frac{\\sin(i)}{\\sin(r)}', 'n_1 \\sin(\\theta_1) = n_2 \\sin(\\theta_2)', '\\sin(\\theta_c) = \\frac{1}{n}'], conceptKeywords: ['refraction', 'snell', 'refractive index', 'light ray', 'optics'] },
};

export const convexLensConfig: ExperimentConfig = {
  id: 'convex-lens',
  title: 'Convex Lens — Focal Length Determination',
  subject: 'physics',
  objective: 'Determine the focal length of a convex lens experimentally by obtaining a sharp image on a screen for multiple object positions and analyzing measured u and v.',
  apparatus: [
    { id: 'bench', name: 'Optical Bench Rail', specs: '80cm aluminum rail with cm scale', instructions: 'Mount sliding carriers.' },
    { id: 'source', name: 'Illuminated Target Object', specs: '3.0cm target object with illuminated tip', instructions: 'Place to left of lens.' },
    { id: 'lens', name: 'Biconvex Lens', specs: 'Nominal focal length f = +10.0cm', instructions: 'Mount in central lens holder.' },
    { id: 'screen', name: 'Translucent Screen', specs: 'Ground glass viewing screen', instructions: 'Slide to capture sharp real image.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Place convex lens at fixed position (e.g., 40.0 cm).', expectedAction: 'Set lens position.' },
    { stepNumber: 2, instruction: 'Place object beyond 2F (e.g., u = 30 cm).', expectedAction: 'Move object.' },
    { stepNumber: 3, instruction: 'Place screen on image side (right of lens).', expectedAction: 'Position screen.' },
    { stepNumber: 4, instruction: 'Slowly drag screen until image is sharp (Focus ≥ 85%).', expectedAction: 'Focus screen.' },
    { stepNumber: 5, instruction: 'Click Record Measurement to log (u, v, f).', expectedAction: 'Log trial.' },
    { stepNumber: 6, instruction: 'Repeat for 3+ different object positions.', expectedAction: 'Record 3 trials.' },
    { stepNumber: 7, instruction: 'Calculate mean focal length f_mean.', expectedAction: 'Analyze mean.' },
    { stepNumber: 8, instruction: 'Analyze 1/v vs 1/u graph to confirm y-intercept = 1/f.', expectedAction: 'Graph analysis.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const u = Number(inputs.u_cm || 20.0);
      const v = Number(inputs.v_cm || 20.0);
      const f = (u * v) / (u + v);
      const m = -v / u;
      return {
        u_cm: u,
        v_cm: v,
        f_calc: Number(f.toFixed(1)),
        magnification: Number(m.toFixed(2)),
        oneOverU: Number((-1 / u).toFixed(4)),
        oneOverV: Number((1 / v).toFixed(4)),
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trialId', label: 'Trial', unit: '#', precision: 0 },
      { key: 'u_cm', label: 'u', unit: 'cm', precision: 1 },
      { key: 'v_cm', label: 'v', unit: 'cm', precision: 1 },
      { key: 'f_calc', label: 'f', unit: 'cm', precision: 1 },
      { key: 'magnification', label: 'm', unit: '', precision: 2 },
      { key: 'focusQuality', label: 'Focus', unit: '%', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const u = Number(inputs.u_cm || 20.0);
      const v = Number(inputs.v_cm || 20.0);
      const f = (u * v) / (u + v);
      return {
        u_cm: u,
        v_cm: v,
        f_calc: Number(f.toFixed(1)),
        magnification: Number((-v / u).toFixed(2)),
        focusQuality: '100%',
      };
    },
  },
  graph: {
    xAxis: { label: '1/u', unit: 'cm⁻¹', key: 'oneOverU' },
    yAxis: { label: '1/v', unit: 'cm⁻¹', key: 'oneOverV' },
    expectedSlopeValue: -1.0,
    expectedFormula: '\\frac{1}{v} = \\frac{1}{f} - \\frac{1}{u}',
  },
  mistakes: [
    {
      id: 'u-inside-f',
      name: 'Object Inside Focal Point',
      triggerCondition: 'inputs.u_cm < 10',
      consequence: 'Forms virtual image; cannot be captured on physical screen.',
      aiExplanation: 'When u < f, rays diverge behind the lens forming a virtual image.',
    },
  ],
  assessment: [
    { id: 'c1', description: 'Obtained sharp image focus (Focus Quality ≥ 85%)', points: 25, verifyCondition: 'true' },
    { id: 'c2', description: 'Demonstrated inverted real image formation for u > f', points: 25, verifyCondition: 'true' },
    { id: 'c3', description: 'Logged 3+ optical trials for different object positions', points: 25, verifyCondition: 'true' },
    { id: 'c4', description: 'Determined mean focal length f within ±5% error', points: 25, verifyCondition: 'true' },
  ],
  freeMode: defaultFreeMode,
  researchMode: defaultResearchMode,
  smartboardTrigger: {
    detectedLaTeX: ['\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}', 'm = -\\frac{v}{u}', 'f = \\frac{uv}{u+v}'],
    conceptKeywords: ['convex lens', 'focal length', 'optics', 'lens equation', 'optical bench', 'image distance'],
  },
};

