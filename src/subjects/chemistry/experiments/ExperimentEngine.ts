export type SafetyClassification = 'SAFE_CONCEPTUAL' | 'CONTROLLED_EDUCATIONAL' | 'HIGH_RISK_CONCEPTUAL';

export interface ExperimentDefinition {
  id: string;
  subject: 'chemistry';
  category: string;
  title: string;
  objectives: string[];
  equipment: string[];
  chemicals: string[];
  safetyLevel: SafetyClassification;
  safetyNotice: string;
  simulationId: string;
  procedureSteps: string[];
}

export const chemistryExperimentRegistry: ExperimentDefinition[] = [
  {
    id: 'exp-titration',
    subject: 'chemistry',
    category: 'Acids & Bases',
    title: 'Standardization & Acid-Base Titration of HCl with NaOH',
    objectives: [
      'Determine unknown concentration of hydrochloric acid.',
      'Identify equivalence point using phenolphthalein indicator.',
      'Plot pH vs volume added titration curve.',
    ],
    equipment: ['50 mL Glass Burette', '250 mL Erlenmeyer Flask', 'Digital pH Meter', 'Magnetic Stirrer'],
    chemicals: ['0.1 M Hydrochloric Acid (HCl)', '0.1 M Sodium Hydroxide (NaOH)', 'Phenolphthalein Indicator'],
    safetyLevel: 'CONTROLLED_EDUCATIONAL',
    safetyNotice: 'Educational virtual simulation. Dilute acids and bases are corrosive; wear safety goggles and gloves in laboratory environments.',
    simulationId: 'titration',
    procedureSteps: [
      'Fill 50 mL burette with standardized NaOH titrant.',
      'Measure 25.0 mL of analyte HCl into the Erlenmeyer flask.',
      'Add 2-3 drops of phenolphthalein indicator to analyte.',
      'Slowly add titrant while recording volume and pH readings.',
      'Stop titrant addition when persistent light pink color appears at equivalence point (pH ~7.0).',
    ],
  },
  {
    id: 'exp-gas-law',
    subject: 'chemistry',
    category: 'Gases',
    title: 'Ideal Gas Compression & Temperature Scaling',
    objectives: [
      'Verify Boyle Law P ∝ 1/V at constant temperature.',
      'Verify Charles Law V ∝ T at constant pressure.',
      'Calculate Universal Gas Constant R from PV = nRT.',
    ],
    equipment: ['Gas Piston Cylinder', 'Digital Pressure Sensor', 'Digital Thermometer', 'Heating Element'],
    chemicals: ['Ideal Argon Gas (1.0 mol)'],
    safetyLevel: 'SAFE_CONCEPTUAL',
    safetyNotice: 'Purely conceptual physical model for ideal gas law behavior.',
    simulationId: 'gas',
    procedureSteps: [
      'Set initial temperature to 300 K and volume to 5.0 L.',
      'Compress piston volume from 15.0 L down to 1.0 L in steps.',
      'Record corresponding pressure in atmospheres (atm).',
      'Increase temperature to 500 K and plot P vs V isotherms.',
    ],
  },
];
