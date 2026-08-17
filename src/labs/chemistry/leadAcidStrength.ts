import type { ExperimentConfig } from '../types';

export interface LeadAcidStrengthConfig {
  id: string; // "lead-acid-strength"
  title: string;
  subject: string;
  analyte: {
    name: 'Sulfuric Acid';
    formula: 'H2SO4';
    equivalentWeightGPerEq: number; // 49.04 g/eq
    hiddenNormality: number; // 0.500 N
    hiddenStrengthGPerL: number; // 24.52 g/L
  };
  sample: {
    volumeMl: number; // 20.00 mL
  };
  titrant: {
    name: 'Sodium Hydroxide Standard';
    formula: 'NaOH';
    normalityN: number; // 0.500 N
  };
  indicator: {
    name: 'Phenolphthalein Indicator';
    endpointDescription: 'Faint Pale Pink persisting 30 seconds';
    initialColour: 'Colorless';
    endpointColour: 'Faint Pale Pink';
  };
  titration: {
    initialBuretteReadingMl: number;
    dropVolumeMl: number;
    endpointToleranceMl: number;
  };
  tolerances: {
    concordantTitresMl: number;
    acceptableReadingErrorMl: number;
  };
}

export const leadAcidStrengthConfig: LeadAcidStrengthConfig & ExperimentConfig = {
  id: 'lead-acid-strength',
  title: 'Determination of Strength of Acid in a Lead-Acid Battery',
  subject: 'chemistry',
  objective:
    'Determine the normality and strength in g/L of sulfuric acid electrolyte from a lead-acid battery using volumetric acid-base neutralization titration with standard 0.500 N NaOH and phenolphthalein indicator.',
  analyte: {
    name: 'Sulfuric Acid',
    formula: 'H2SO4',
    equivalentWeightGPerEq: 49.04,
    hiddenNormality: 0.500, // 0.500 N
    hiddenStrengthGPerL: 24.52, // 24.52 g/L H2SO4
  },
  sample: {
    volumeMl: 20.00,
  },
  titrant: {
    name: 'Sodium Hydroxide Standard',
    formula: 'NaOH',
    normalityN: 0.500,
  },
  indicator: {
    name: 'Phenolphthalein Indicator',
    endpointDescription: 'Faint Pale Pink persisting 30 seconds',
    initialColour: 'Colorless',
    endpointColour: 'Faint Pale Pink',
  },
  titration: {
    initialBuretteReadingMl: 0.00,
    dropVolumeMl: 0.05,
    endpointToleranceMl: 0.10,
  },
  tolerances: {
    concordantTitresMl: 0.10,
    acceptableReadingErrorMl: 0.05,
  },
  apparatus: [
    {
      id: 'electrolyte_bottle',
      name: 'Prepared Lead-Acid Battery Electrolyte Sample Bottle',
      specs: 'Lab Prepared Battery H2SO4 Sample',
      instructions: 'Handle with care; contains corrosive sulfuric acid.',
    },
    {
      id: 'burette',
      name: '50.00 mL Volumetric Glass Burette',
      specs: 'Class A, 0.05 mL subdivisions',
      instructions: 'Rinse and fill with standard 0.500 N NaOH titrant.',
    },
    {
      id: 'pipette',
      name: '20.00 mL Volumetric Pipette',
      specs: 'Class A, ±0.03 mL',
      instructions: 'Transfer 20.00 mL battery acid sample to conical flask.',
    },
    {
      id: 'flask',
      name: '250 mL Erlenmeyer Conical Flask',
      specs: 'Borosilicate Glass',
      instructions: 'Position under burette tip on white ceramic tile.',
    },
    {
      id: 'tile',
      name: 'White Ceramic Tile Base',
      specs: '15cm x 15cm glazed tile',
      instructions: 'Position under flask for sharp pale-pink endpoint contrast.',
    },
  ],
  substances: [
    { id: 'battery_acid', name: 'Battery Electrolyte (H2SO4)', formula: 'H2SO4(aq)', initialColor: 'Colorless' },
    { id: 'naoh', name: 'Sodium Hydroxide Titrant (0.500 N)', formula: 'NaOH(aq)', concentrationMolar: 0.500, initialColor: 'Colorless' },
    { id: 'phenolphthalein', name: 'Phenolphthalein Indicator', formula: 'C20H14O4', initialColor: 'Colorless' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Review virtual lab safety precautions regarding corrosive battery acid handling.', expectedAction: 'Safety verified.' },
    { stepNumber: 2, instruction: 'Rinse burette with standard 0.500 N NaOH and fill to 0.00 mL mark.', expectedAction: 'Fill burette.' },
    { stepNumber: 3, instruction: 'Flick stopcock to remove air bubble trapped in burette tip.', expectedAction: 'Clear air from tip.' },
    { stepNumber: 4, instruction: 'Pipette 20.00 mL battery electrolyte sample into a clean 250 mL conical flask.', expectedAction: 'Transfer 20 mL acid.' },
    { stepNumber: 5, instruction: 'Add 2-3 drops phenolphthalein indicator; solution remains clear and colorless in acid.', expectedAction: 'Solution colorless.' },
    { stepNumber: 6, instruction: 'Titrate with standard 0.500 N NaOH until solution turns faint pale pink for 30s.', expectedAction: 'Record final burette reading.' },
    { stepNumber: 7, instruction: 'Repeat titration until 3 concordant readings within 0.10 mL are achieved.', expectedAction: 'Calculate mean titre volume.' },
    { stepNumber: 8, instruction: 'Calculate Acid Normality N_acid = (N_base * V_base) / V_acid and Strength = N_acid * 49.04 g/L.', expectedAction: 'Report strength in g/L.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const vNaohAdded = Number(inputs.vNaohAdded || 0);
      const vAcid = 20.00;
      const nBase = 0.500;
      const hiddenNormality = 0.500;

      // Equivalence Volume: N_acid * V_acid = N_base * V_base -> 0.500 * 20.00 = 0.500 * V_base -> V_eq = 20.00 mL
      const vEquivalence = (hiddenNormality * vAcid) / nBase; // 20.00 mL
      const neutralizedFraction = Math.min(1.5, vNaohAdded / vEquivalence);
      const hasIndicator = inputs.hasIndicator !== false;

      let colorLabel = 'Colorless Solution (Acidic)';
      let colorHex = 'rgba(255, 255, 255, 0.15)';

      if (!hasIndicator) {
        colorLabel = 'Colorless Solution (No Indicator Added)';
        colorHex = 'rgba(255, 255, 255, 0.15)';
      } else if (neutralizedFraction < 0.98) {
        colorLabel = 'Clear Colorless (Acidic pH < 8.2)';
        colorHex = 'rgba(255, 255, 255, 0.15)';
      } else if (neutralizedFraction <= 1.02) {
        colorLabel = 'Faint Pale Pink (True Neutralization Endpoint)';
        colorHex = '#f472b6';
      } else {
        colorLabel = 'Deep Pink / Magenta (Overshot Alkaline pH > 10)';
        colorHex = '#db2777';
      }

      const calculatedNormality = (nBase * vNaohAdded) / vAcid;
      const calculatedStrengthGPerL = calculatedNormality * 49.04;
      const isEndpoint = Math.abs(vNaohAdded - vEquivalence) <= 0.10;

      return {
        vNaohAdded: Number(vNaohAdded.toFixed(2)),
        vEquivalence: Number(vEquivalence.toFixed(2)),
        neutralizedFraction: Number(neutralizedFraction.toFixed(3)),
        colorLabel,
        colorHex,
        calculatedNormality: Number(calculatedNormality.toFixed(3)),
        calculatedStrengthGPerL: Number(calculatedStrengthGPerL.toFixed(2)),
        isEndpoint,
        isConcordant: Math.abs(vNaohAdded - vEquivalence) <= 0.10,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trial', label: 'Trial #', unit: '', precision: 0 },
      { key: 'vInitial', label: 'Initial Burette (mL)', unit: 'mL', precision: 2 },
      { key: 'vFinal', label: 'Final Burette (mL)', unit: 'mL', precision: 2 },
      { key: 'vTitre', label: 'NaOH Titre V (mL)', unit: 'mL', precision: 2 },
      { key: 'normality', label: 'Acid Normality N', unit: 'N', precision: 3 },
      { key: 'strengthGPerL', label: 'Acid Strength (g/L)', unit: 'g/L', precision: 2 },
      { key: 'isConcordant', label: 'Concordant?', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const trial = Number(inputs.trial || 1);
      const vInitial = Number(inputs.vInitial || 0.0);
      const vTitre = Number(inputs.vTitre || 20.00);
      const vFinal = vInitial + vTitre;
      const norm = (0.500 * vTitre) / 20.00;
      const strength = norm * 49.04;
      return {
        trial,
        vInitial: Number(vInitial.toFixed(2)),
        vFinal: Number(vFinal.toFixed(2)),
        vTitre: Number(vTitre.toFixed(2)),
        normality: Number(norm.toFixed(3)),
        strengthGPerL: Number(strength.toFixed(2)),
        isConcordant: Math.abs(vTitre - 20.00) <= 0.10 ? 'Yes' : 'No',
      };
    },
  },
  graph: {
    xAxis: { label: 'Volume NaOH Added', unit: 'mL', key: 'vNaohAdded' },
    yAxis: { label: 'pH / Neutralization Fraction', unit: '', key: 'neutralizedFraction' },
    expectedSlopeKey: 'Neutralization Inflection Point',
    expectedSlopeValue: 20.00,
    expectedFormula: 'N_{acid} = \\frac{N_{base} \\times V_{base}}{V_{acid}}, \\quad \\text{Strength (g/L)} = N_{acid} \\times 49.04',
  },
  mistakes: [
    {
      id: 'air-in-tip',
      name: 'Leaving Air Bubble in Burette Tip',
      triggerCondition: 'inputs.airInTip === true',
      consequence: 'Air bubble dislodges during titration, causing falsely high initial reading error.',
      aiExplanation: 'Always flick burette tip and open stopcock wide to expel trapped air bubbles before recording initial volume reading.',
    },
    {
      id: 'overshot-magenta',
      name: 'Overshooting Endpoint to Deep Magenta',
      triggerCondition: 'inputs.vNaohAdded > inputs.vEquivalence + 0.30',
      consequence: 'Excess NaOH turns solution deep magenta (pH > 10); calculated acid strength will be falsely high.',
      aiExplanation: 'The true equivalence point is marked by the FIRST permanent faint pale-pink color change lasting 30s.',
    },
  ],
  assessment: [
    { id: 'la1', description: 'Rinsed and filled burette with 0.500 N NaOH standard', points: 15, verifyCondition: 'buretteFilled === true' },
    { id: 'la2', description: 'Cleared air bubble from burette tip before recording initial reading', points: 15, verifyCondition: 'airInTip === false' },
    { id: 'la3', description: 'Titrated 20.00 mL acid sample to faint pale pink endpoint', points: 30, verifyCondition: 'isEndpoint === true' },
    { id: 'la4', description: 'Obtained 3 concordant titres within ±0.10 mL range', points: 25, verifyCondition: 'concordantCount >= 3' },
    { id: 'la5', description: 'Calculated Acid Strength = 24.52 g/L H2SO4 correctly', points: 15, verifyCondition: 'abs(calculatedStrengthGPerL - 24.52) < 0.5' },
  ],
  freeMode: {
    objective: 'Determine sulfuric acid concentration in car battery electrolyte samples at different states of charge.',
    availableApparatus: ['Burette', 'Pipette', 'Conical flasks', '0.500 N NaOH', 'Battery Acid Sample', 'Phenolphthalein'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Correlate battery acid normality and specific gravity with state of battery charge (100% vs 50% vs Discharged).',
    constraints: { timeMinutes: 25, budget: 60, safetyLevel: 'PPE Required' },
    requiredIdentifications: ['Independent: State of charge', 'Dependent: H2SO4 Normality N'],
  },
  smartboardTrigger: {
    detectedLaTeX: [
      'N_1 V_1 = N_2 V_2',
      '\\text{Strength (g/L)} = N_{acid} \\times 49.04',
      'H_2SO_4 + 2NaOH \\rightarrow Na_2SO_4 + 2H_2O',
    ],
    conceptKeywords: ['lead acid battery', 'battery acid', 'sulfuric acid', 'normality', 'acid strength', 'neutralization', 'phenolphthalein'],
  },
};
