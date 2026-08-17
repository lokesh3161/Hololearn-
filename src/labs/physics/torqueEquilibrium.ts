import type { ExperimentConfig } from '../types';

export interface TorqueEquilibriumConfig {
  id: string; // "torque-equilibrium"
  title: string;
  subject: string;
  defaultGravity: number; // 9.81 m/s²
  defaultBeamMass: number; // 0.20 kg
  defaultBeamLength: number; // 1.00 m
  tolerances: {
    equilibriumTorqueNm: number; // 0.005 N·m
  };
}

export const torqueEquilibriumConfig: TorqueEquilibriumConfig & ExperimentConfig = {
  id: 'torque-equilibrium',
  title: 'Torque and Rotational Equilibrium Laboratory',
  subject: 'physics',
  objective:
    'Investigate torque τ = r F sin(θ) and the condition for rotational equilibrium Στ = 0 on a pivot-supported horizontal meter scale balance beam with movable masses.',
  defaultGravity: 9.81,
  defaultBeamMass: 0.20,
  defaultBeamLength: 1.00,
  tolerances: {
    equilibriumTorqueNm: 0.005,
  },
  apparatus: [
    {
      id: 'balance_beam',
      name: '1.00 Meter Uniform Balance Beam with Scale',
      specs: 'Aluminium Beam, 1.00m length, 0.20kg mass',
      instructions: 'Position masses along the scale to generate clockwise and anticlockwise torques.',
    },
    {
      id: 'fulcrum',
      name: 'Central Wedge Fulcrum Pivot Support',
      specs: 'Low-friction Pivot Mount at 0.00m center',
      instructions: 'Serves as rotational pivot point for the balance beam.',
    },
    {
      id: 'mass_hangers',
      name: 'Adjustable Mass Hangers & Slotted Weights',
      specs: 'Brass Slotted Masses 0.05kg to 0.50kg',
      instructions: 'Attach to beam and drag along meter scale to alter lever arms.',
    },
  ],
  substances: [],
  procedure: [
    { stepNumber: 1, instruction: 'Mount 1.00m balance beam horizontally on central fulcrum pivot.', expectedAction: 'Beam mounted.' },
    { stepNumber: 2, instruction: 'Attach a 0.20 kg mass on left side at position r = -0.30 m from pivot.', expectedAction: 'Add left mass.' },
    { stepNumber: 3, instruction: 'Calculate anticlockwise torque τ_left = r * m * g = 0.30 * 0.20 * 9.81 = 0.588 N·m.', expectedAction: 'Compute left torque.' },
    { stepNumber: 4, instruction: 'Attach a 0.10 kg mass on right side and adjust distance r until beam reaches rotational equilibrium (Στ = 0).', expectedAction: 'Achieve equilibrium at r = +0.60 m.' },
    { stepNumber: 5, instruction: 'Vary force angle θ from 90° to 0° to observe τ = r F sin(θ) reduction.', expectedAction: 'Observe angle effect.' },
    { stepNumber: 6, instruction: 'Complete the "Balance Challenge" mode by finding matching counter-weights.', expectedAction: 'Complete challenge.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const g = Number(inputs.gravity || 9.81);
      const masses = (inputs.masses as Array<{ id: string; mass: number; position: number; angleDeg: number }>) || [
        { id: 'm1', mass: 0.20, position: -0.30, angleDeg: 90 },
        { id: 'm2', mass: 0.10, position: 0.60, angleDeg: 90 },
      ];

      let totalAntiTorque = 0;
      let totalClockTorque = 0;

      masses.forEach((m) => {
        const f = m.mass * g; // Force F = mg (N)
        const angleRad = (m.angleDeg * Math.PI) / 180;
        const torqueMagnitude = Math.abs(m.position) * f * Math.sin(angleRad);

        if (m.position < 0) {
          totalAntiTorque += torqueMagnitude; // Left side produces anticlockwise torque
        } else if (m.position > 0) {
          totalClockTorque += torqueMagnitude; // Right side produces clockwise torque
        }
      });

      const netTorque = totalAntiTorque - totalClockTorque;
      const isEquilibrium = Math.abs(netTorque) < 0.005;

      return {
        totalAntiTorque: Number(totalAntiTorque.toFixed(3)),
        totalClockTorque: Number(totalClockTorque.toFixed(3)),
        netTorque: Number(netTorque.toFixed(3)),
        isEquilibrium,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trial', label: 'Trial #', unit: '', precision: 0 },
      { key: 'massKg', label: 'Mass m (kg)', unit: 'kg', precision: 2 },
      { key: 'positionM', label: 'Distance r (m)', unit: 'm', precision: 2 },
      { key: 'forceN', label: 'Force F (N)', unit: 'N', precision: 2 },
      { key: 'torqueNm', label: 'Torque τ (N·m)', unit: 'N·m', precision: 3 },
      { key: 'direction', label: 'Direction', unit: '', precision: 0 },
      { key: 'isEquilibrium', label: 'Balanced?', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const trial = Number(inputs.trial || 1);
      const massKg = Number(inputs.massKg || 0.20);
      const positionM = Number(inputs.positionM || -0.30);
      const g = 9.81;
      const forceN = massKg * g;
      const torqueNm = Math.abs(positionM) * forceN;
      const direction = positionM < 0 ? 'Anticlockwise (Left)' : 'Clockwise (Right)';
      return {
        trial,
        massKg: Number(massKg.toFixed(2)),
        positionM: Number(positionM.toFixed(2)),
        forceN: Number(forceN.toFixed(2)),
        torqueNm: Number(torqueNm.toFixed(3)),
        direction,
        isEquilibrium: inputs.isEquilibrium ? 'Yes' : 'No',
      };
    },
  },
  graph: {
    xAxis: { label: 'Distance r from Pivot', unit: 'm', key: 'positionM' },
    yAxis: { label: 'Applied Torque τ', unit: 'N·m', key: 'torqueNm' },
    expectedSlopeKey: 'Torque Proportionality τ ∝ r',
    expectedSlopeValue: 1.962,
    expectedFormula: '\\tau = r F \\sin(\\theta) = r m g \\sin(\\theta), \\quad \\sum \\tau = 0',
  },
  mistakes: [
    {
      id: 'confusing-force-and-torque',
      name: 'Confusing Mass Force with Rotational Torque',
      triggerCondition: 'inputs.unbalancedMassSameDistance === true',
      consequence: 'A smaller mass at a larger lever arm can balance a larger mass at a smaller lever arm!',
      aiExplanation: 'Equilibrium depends on TORQUE τ = r * F, not force alone. Doubling the distance doubles the torque produced.',
    },
    {
      id: 'non-perpendicular-angle',
      name: 'Ignoring Force Angle Effect',
      triggerCondition: 'inputs.angleDeg !== 90',
      consequence: 'When force is applied at an angle θ ≠ 90°, effective torque is reduced by sin(θ). At 0°, torque is zero!',
      aiExplanation: 'Torque is maximum when the force acts perpendicular (90°) to the lever arm.',
    },
  ],
  assessment: [
    { id: 'tq1', description: 'Calculated torque τ = r * F * sin(θ) for hanging mass', points: 20, verifyCondition: 'torqueCalculated === true' },
    { id: 'tq2', description: 'Balanced balance beam to achieve rotational equilibrium (Στ = 0)', points: 30, verifyCondition: 'isEquilibrium === true' },
    { id: 'tq3', description: 'Investigated force angle effect from 90° down to 0°', points: 25, verifyCondition: 'angleTested === true' },
    { id: 'tq4', description: 'Completed "Balance Challenge" mode target setup', points: 25, verifyCondition: 'challengeCompleted === true' },
  ],
  freeMode: {
    objective: 'Explore rotational statics with multiple masses, variable beam angles, and custom gravity levels.',
    availableApparatus: ['Balance Beam', 'Fulcrum Pivot', 'Slotted Masses', 'Angle Adjustment Gimbals'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate moment of inertia contribution I = (1/12)ML² + Σ m_i r_i² on rotational oscillation frequency.',
    constraints: { timeMinutes: 20, budget: 50, safetyLevel: 'General Physics Safety' },
    requiredIdentifications: ['Independent: Mass positions r_i', 'Dependent: Angular acceleration α'],
  },
  smartboardTrigger: {
    detectedLaTeX: [
      '\\tau = r F \\sin(\\theta)',
      '\\sum \\tau = 0',
      '\\alpha = \\frac{\\tau_{net}}{I}',
      'I = \\frac{1}{12} M L^2 + \\sum m_i r_i^2',
    ],
    conceptKeywords: ['torque', 'rotational equilibrium', 'fulcrum', 'lever arm', 'moment of inertia', 'angular acceleration'],
  },
};
