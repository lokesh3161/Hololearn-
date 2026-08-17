import type { ExperimentConfig } from '../types';

export interface FerrousDichromateConfig {
  id: string; // "ferrous-iron-dichromate"
  title: string;
  subject: string;
  sample: {
    volumeMl: number; // 20.00 mL
    hiddenFe2ConcentrationMolL: number; // 0.100 M Fe2+
    hiddenFe2StrengthGPerL: number; // 5.585 g/L Fe
  };
  titrant: {
    name: 'Potassium Dichromate Standard';
    formula: 'K2Cr2O7';
    molarityM: number; // 0.01667 M (equivalent to 0.100 N)
    normalityN: number; // 0.100 N
  };
  medium: {
    acidName: 'Acid Mixture (Dilute H2SO4 + H3PO4)';
    requiredAcidCondition: 'Acidic medium with Phosphoric acid to complex Fe3+';
  };
  indicator: {
    name: 'Sodium Diphenylamine Sulfonate Indicator';
    initialColour: 'Pale Light Green';
    endpointColour: 'Intense Blue-Violet / Purple';
    endpointDescription: 'Permanent sharp transition to intense blue-violet/purple';
  };
  stoichiometry: {
    dichromateToFe2Ratio: number; // 6.0 (1 mol Cr2O72- : 6 mol Fe2+)
    atomicWeightFe: number; // 55.85 g/mol
  };
  titration: {
    initialBuretteReadingMl: number;
    dropVolumeMl: number;
    endpointToleranceMl: number;
  };
  tolerances: {
    concordantTitresMl: number;
  };
}

export const ferrousDichromateConfig: FerrousDichromateConfig & ExperimentConfig = {
  id: 'ferrous-iron-dichromate',
  title: 'Estimation of Ferrous Iron by Dichromate Titration',
  subject: 'chemistry',
  objective:
    'Determine the molar concentration and strength in g/L of ferrous iron (Fe2+) using standard potassium dichromate (K2Cr2O7) redox titration in acidic medium with sodium diphenylamine sulfonate indicator.',
  sample: {
    volumeMl: 20.00,
    hiddenFe2ConcentrationMolL: 0.100, // 0.100 M Fe2+
    hiddenFe2StrengthGPerL: 5.585, // 5.585 g/L Fe
  },
  titrant: {
    name: 'Potassium Dichromate Standard',
    formula: 'K2Cr2O7',
    molarityM: 0.01667,
    normalityN: 0.100,
  },
  medium: {
    acidName: 'Acid Mixture (Dilute H2SO4 + H3PO4)',
    requiredAcidCondition: 'Acidic medium with Phosphoric acid to complex Fe3+',
  },
  indicator: {
    name: 'Sodium Diphenylamine Sulfonate Indicator',
    initialColour: 'Pale Light Green',
    endpointColour: 'Intense Blue-Violet / Purple',
    endpointDescription: 'Permanent sharp transition to intense blue-violet/purple',
  },
  stoichiometry: {
    dichromateToFe2Ratio: 6.0,
    atomicWeightFe: 55.85,
  },
  titration: {
    initialBuretteReadingMl: 0.00,
    dropVolumeMl: 0.05,
    endpointToleranceMl: 0.10,
  },
  tolerances: {
    concordantTitresMl: 0.10,
  },
  apparatus: [
    {
      id: 'ferrous_bottle',
      name: 'Unknown Ferrous Iron Sample Bottle',
      specs: 'Lab Prepared FeSO4 Sample Solution',
      instructions: 'Contains unknown concentration of Fe2+ ions.',
    },
    {
      id: 'burette',
      name: '50.00 mL Volumetric Glass Burette',
      specs: 'Class A, 0.05 mL subdivisions',
      instructions: 'Fill with standard 0.01667 M (0.100 N) K2Cr2O7 titrant.',
    },
    {
      id: 'pipette',
      name: '20.00 mL Volumetric Pipette',
      specs: 'Class A Glass Pipette',
      instructions: 'Transfer 20.00 mL Fe2+ sample into conical flask.',
    },
    {
      id: 'flask',
      name: '250 mL Erlenmeyer Conical Flask',
      specs: 'Borosilicate Glass',
      instructions: 'Position under burette tip on white ceramic tile base.',
    },
    {
      id: 'tile',
      name: 'White Ceramic Tile Base',
      specs: '15cm x 15cm glazed tile',
      instructions: 'Position under flask for sharp violet-blue endpoint detection.',
    },
  ],
  substances: [
    { id: 'fe2_sample', name: 'Ferrous Iron Sample', formula: 'Fe2+(aq)', initialColor: 'Pale Green' },
    { id: 'k2cr2o7', name: 'Potassium Dichromate Standard', formula: 'K2Cr2O7(aq)', concentrationMolar: 0.01667, initialColor: 'Orange' },
    { id: 'acid_mix', name: 'H2SO4 + H3PO4 Acid Mixture', formula: 'H2SO4 + H3PO4', initialColor: 'Colorless' },
    { id: 'diphenylamine', name: 'Sodium Diphenylamine Sulfonate', formula: 'C12H10NNaO3S', initialColor: 'Colorless' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Review safety guidelines regarding potassium dichromate handling.', expectedAction: 'Safety verified.' },
    { stepNumber: 2, instruction: 'Rinse and fill burette with standard 0.01667 M (0.100 N) K2Cr2O7 titrant.', expectedAction: 'Fill burette.' },
    { stepNumber: 3, instruction: 'Clear air bubble trapped in burette tip by opening stopcock.', expectedAction: 'Clear air tip.' },
    { stepNumber: 4, instruction: 'Pipette 20.00 mL unknown Fe2+ sample into a clean 250 mL conical flask.', expectedAction: 'Transfer 20 mL sample.' },
    { stepNumber: 5, instruction: 'Add 10 mL H2SO4 + H3PO4 acid mixture to establish required acidic medium.', expectedAction: 'Acidify sample.' },
    { stepNumber: 6, instruction: 'Add 3-4 drops sodium diphenylamine sulfonate indicator (solution turns pale light green).', expectedAction: 'Add indicator.' },
    { stepNumber: 7, instruction: 'Titrate with standard K2Cr2O7 until solution turns intense blue-violet/purple.', expectedAction: 'Record final burette reading.' },
    { stepNumber: 8, instruction: 'Calculate Molarity M_Fe = (6 * M_dichromate * V_dichromate) / V_Fe and Strength = M_Fe * 55.85 g/L.', expectedAction: 'Report strength in g/L.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const vDichromateAdded = Number(inputs.vDichromateAdded || 0);
      const vSampleMl = 20.00;
      const mDichromate = 0.01667; // 0.01667 M
      const hiddenFe2Molar = 0.100; // 0.100 M Fe2+

      // Equivalence Volume: M_Fe * V_Fe = 6 * M_dichromate * V_dichromate
      // V_eq = (0.100 * 20.00) / (6 * 0.01667) = 2.00 / 0.10002 = 20.00 mL
      const vEquivalence = (hiddenFe2Molar * vSampleMl) / (6.0 * mDichromate); // 20.00 mL
      const redoxFraction = Math.min(1.5, vDichromateAdded / vEquivalence);
      const acidConditionMet = inputs.acidConditionMet !== false;
      const hasIndicator = inputs.hasIndicator !== false;

      let colorLabel = 'Pale Light Green Solution (Fe2+ Present)';
      let colorHex = '#a7f3d0';

      if (!acidConditionMet) {
        colorLabel = 'Cloudy Solution (Missing Acidic Medium)';
        colorHex = '#d1d5db';
      } else if (!hasIndicator) {
        colorLabel = 'Light Green Solution (No Indicator Added)';
        colorHex = '#86efac';
      } else if (redoxFraction < 0.95) {
        colorLabel = 'Pale Light Green Solution (Fe2+ / Cr3+ Mixture)';
        colorHex = '#a7f3d0';
      } else if (redoxFraction < 0.99) {
        colorLabel = 'Grayish Violet Transition Region (Near Endpoint)';
        colorHex = '#a855f7';
      } else if (redoxFraction <= 1.02) {
        colorLabel = 'Intense Blue-Violet / Purple (True Redox Endpoint)';
        colorHex = '#7e22ce';
      } else {
        colorLabel = 'Deep Royal Violet (Overshot Dichromate Titration)';
        colorHex = '#4c1d95';
      }

      const calculatedMolarity = (6.0 * mDichromate * vDichromateAdded) / vSampleMl;
      const calculatedStrengthGPerL = calculatedMolarity * 55.85;
      const isEndpoint = Math.abs(vDichromateAdded - vEquivalence) <= 0.10;

      return {
        vDichromateAdded: Number(vDichromateAdded.toFixed(2)),
        vEquivalence: Number(vEquivalence.toFixed(2)),
        redoxFraction: Number(redoxFraction.toFixed(3)),
        colorLabel,
        colorHex,
        calculatedMolarity: Number(calculatedMolarity.toFixed(3)),
        calculatedStrengthGPerL: Number(calculatedStrengthGPerL.toFixed(2)),
        isEndpoint,
        isConcordant: Math.abs(vDichromateAdded - vEquivalence) <= 0.10,
        acidConditionMet,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trial', label: 'Trial #', unit: '', precision: 0 },
      { key: 'vInitial', label: 'Initial Burette (mL)', unit: 'mL', precision: 2 },
      { key: 'vFinal', label: 'Final Burette (mL)', unit: 'mL', precision: 2 },
      { key: 'vTitre', label: 'Dichromate Titre V (mL)', unit: 'mL', precision: 2 },
      { key: 'molarity', label: 'Fe2+ Molarity M', unit: 'M', precision: 3 },
      { key: 'strengthGPerL', label: 'Fe2+ Strength (g/L)', unit: 'g/L', precision: 2 },
      { key: 'isConcordant', label: 'Concordant?', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const trial = Number(inputs.trial || 1);
      const vInitial = Number(inputs.vInitial || 0.0);
      const vTitre = Number(inputs.vTitre || 20.00);
      const vFinal = vInitial + vTitre;
      const molarity = (6.0 * 0.01667 * vTitre) / 20.00;
      const strength = molarity * 55.85;
      return {
        trial,
        vInitial: Number(vInitial.toFixed(2)),
        vFinal: Number(vFinal.toFixed(2)),
        vTitre: Number(vTitre.toFixed(2)),
        molarity: Number(molarity.toFixed(3)),
        strengthGPerL: Number(strength.toFixed(2)),
        isConcordant: Math.abs(vTitre - 20.00) <= 0.10 ? 'Yes' : 'No',
      };
    },
  },
  graph: {
    xAxis: { label: 'Volume K2Cr2O7 Added', unit: 'mL', key: 'vDichromateAdded' },
    yAxis: { label: 'Fe2+ Oxidation Fraction', unit: '', key: 'redoxFraction' },
    expectedSlopeKey: 'Redox Equivalence Point',
    expectedSlopeValue: 20.00,
    expectedFormula: 'M_{Fe} = \\frac{6 \\times M_{dichromate} \\times V_{dichromate}}{V_{Fe}}, \\quad \\text{Strength (g/L)} = M_{Fe} \\times 55.85',
  },
  mistakes: [
    {
      id: 'omitting-phosphoric-acid',
      name: 'Omitting Acid Mixture (H2SO4 + H3PO4)',
      triggerCondition: 'inputs.acidConditionMet === false',
      consequence: 'Without H3PO4, ferric ions (Fe3+) yellow color masks diphenylamine sulfonate violet endpoint.',
      aiExplanation: 'Phosphoric acid H3PO4 complexes Fe3+ into colorless [Fe(HPO4)]+, lowering Fe3+/Fe2+ potential for a sharp violet endpoint!',
    },
    {
      id: 'overshot-dichromate',
      name: 'Overshooting Endpoint to Deep Royal Violet',
      triggerCondition: 'inputs.vDichromateAdded > inputs.vEquivalence + 0.30',
      consequence: 'Excess dichromate over-oxidizes indicator, yielding falsely high calculated Fe2+ concentration.',
      aiExplanation: 'Stop titration at the FIRST permanent transition to intense blue-violet / purple.',
    },
  ],
  assessment: [
    { id: 'fe1', description: 'Rinsed and filled burette with standard K2Cr2O7 solution', points: 15, verifyCondition: 'buretteFilled === true' },
    { id: 'fe2', description: 'Acidified Fe2+ sample with H2SO4 + H3PO4 acid mixture', points: 20, verifyCondition: 'acidConditionMet === true' },
    { id: 'fe3', description: 'Titrated to intense blue-violet/purple redox endpoint', points: 30, verifyCondition: 'isEndpoint === true' },
    { id: 'fe4', description: 'Obtained 3 concordant titres within ±0.10 mL range', points: 20, verifyCondition: 'concordantCount >= 3' },
    { id: 'fe5', description: 'Calculated Fe2+ Strength = 5.59 g/L Fe correctly', points: 15, verifyCondition: 'abs(calculatedStrengthGPerL - 5.585) < 0.2' },
  ],
  freeMode: {
    objective: 'Determine ferrous iron content in iron ore, steel alloy dissolved samples, and water samples.',
    availableApparatus: ['Burette', 'Pipette', 'Conical flasks', '0.01667 M K2Cr2O7', 'H2SO4+H3PO4 Acid', 'Sodium Diphenylamine Sulfonate'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Evaluate formal reduction potential of Fe3+/Fe2+ in H2SO4 vs H3PO4 media.',
    constraints: { timeMinutes: 25, budget: 70, safetyLevel: 'Chemical Safety Required' },
    requiredIdentifications: ['Independent: H3PO4 Concentration', 'Dependent: Endpoint sharpness & potential E°'],
  },
  smartboardTrigger: {
    detectedLaTeX: [
      'Cr_2O_7^{2-} + 14H^+ + 6Fe^{2+} \\rightarrow 2Cr^{3+} + 7H_2O + 6Fe^{3+}',
      'M_{Fe} = \\frac{6 \\times M_{dichromate} \\times V_{dichromate}}{V_{Fe}}',
      '\\text{Strength (g/L)} = M_{Fe} \\times 55.85',
    ],
    conceptKeywords: ['ferrous iron', 'potassium dichromate', 'redox titration', 'diphenylamine sulfonate', 'phosphoric acid', 'iron estimation'],
  },
};
