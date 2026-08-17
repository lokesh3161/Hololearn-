import type { ExperimentConfig } from '../types';

export interface EDTAExperimentConfig {
  id: string; // "water-hardness-edta"
  title: string;
  subject: string;
  sample: {
    volumeMl: number; // e.g. 25.0
    hiddenHardnessMgLAsCaCO3: number; // ground truth e.g. 240 mg/L
  };
  titrant: {
    name: 'EDTA';
    molarityM: number; // e.g. 0.010 M
    caCO3EquivalenceFactorMgPerMmol: number; // 100.08 mg/mmol
  };
  buffer: {
    name: 'Ammonia-Ammonium Chloride Buffer';
    targetPH: number; // 10.0
  };
  indicator: {
    name: 'Eriochrome Black T (EBT)';
  };
  endpointRegions: {
    threshold: number; // 0..1+
    label: string;
    colorHex: string;
  }[];
  tolerances: {
    concordantTitresMl: number; // 0.10 mL
    dropVolumeMl: number; // 0.05 mL
  };
}

export const waterHardnessEdtaConfig: EDTAExperimentConfig & ExperimentConfig = {
  id: 'water-hardness-edta',
  title: 'Determination of Hardness of Water by EDTA Complexometric Titration',
  subject: 'chemistry',
  objective:
    'Determine total hardness of a hard water sample in ppm (mg/L as CaCO3) using standard 0.010 M EDTA solution with Eriochrome Black T indicator at pH 10.',
  sample: {
    volumeMl: 25.0,
    hiddenHardnessMgLAsCaCO3: 240.0, // 240 ppm CaCO3 equivalent
  },
  titrant: {
    name: 'EDTA',
    molarityM: 0.010,
    caCO3EquivalenceFactorMgPerMmol: 100.08,
  },
  buffer: {
    name: 'Ammonia-Ammonium Chloride Buffer',
    targetPH: 10.0,
  },
  indicator: {
    name: 'Eriochrome Black T (EBT)',
  },
  endpointRegions: [
    { threshold: 0.0, label: 'Wine-Red (Metal-EBT Complex)', colorHex: '#991b1b' },
    { threshold: 0.85, label: 'Reddish-Purple (Transition Region)', colorHex: '#7e22ce' },
    { threshold: 0.98, label: 'Steel Blue (True Endpoint - Free EBT)', colorHex: '#1d4ed8' },
    { threshold: 1.05, label: 'Deep Blue (Overshot Endpoint)', colorHex: '#1e3a8a' },
  ],
  tolerances: {
    concordantTitresMl: 0.10,
    dropVolumeMl: 0.05,
  },
  apparatus: [
    {
      id: 'burette',
      name: '50.00 mL Volumetric Glass Burette',
      specs: 'Class A, 0.05 mL subdivisions',
      instructions: 'Rinse with 0.01M EDTA titrant before filling.',
    },
    {
      id: 'pipette',
      name: '25.00 mL Volumetric Pipette',
      specs: 'Class A, ±0.03 mL',
      instructions: 'Transfer 25.00 mL hard water sample to conical flask.',
    },
    {
      id: 'flask',
      name: '250 mL Erlenmeyer Conical Flask',
      specs: 'Borosilicate Glass',
      instructions: 'Hold flask under burette tip on white tile.',
    },
    {
      id: 'buffer_bottle',
      name: 'Ammonia Buffer Solution (pH 10)',
      specs: 'NH3 / NH4Cl mixture',
      instructions: 'Add 5 mL buffer to ensure pH 10 for EDTA-Mg/Ca binding.',
    },
    {
      id: 'ebt_bottle',
      name: 'Eriochrome Black T Indicator',
      specs: '0.5% w/v in ethanol',
      instructions: 'Add 2-3 drops until wine-red color forms.',
    },
  ],
  substances: [
    { id: 'edta', name: 'Disodium EDTA Solution', formula: 'Na2H2EDTA(aq)', concentrationMolar: 0.010, initialColor: 'Colorless' },
    { id: 'water_sample', name: 'Hard Water Sample', formula: 'Ca2+/Mg2+(aq)', initialColor: 'Colorless' },
    { id: 'buffer', name: 'Ammonia Buffer (pH 10)', formula: 'NH3/NH4Cl', initialColor: 'Colorless' },
    { id: 'ebt', name: 'Eriochrome Black T', formula: 'EBT', initialColor: 'Dark Blue-Black' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Rinse burette with 5 mL EDTA solution and fill to 0.00 mL mark.', expectedAction: 'Check for air bubbles in stopcock.' },
    { stepNumber: 2, instruction: 'Pipette 25.00 mL hard water sample into a clean 250 mL conical flask.', expectedAction: 'Use safety filler bulb.' },
    { stepNumber: 3, instruction: 'Add 5.0 mL Ammonia Buffer (pH 10) to the flask.', expectedAction: 'Ensures optimal pH 10 for complex formation.' },
    { stepNumber: 4, instruction: 'Add 2-3 drops of Eriochrome Black T (EBT) indicator; observe wine-red color.', expectedAction: 'Solution turns wine-red.' },
    { stepNumber: 5, instruction: 'Titrate with 0.01M EDTA dropwise near endpoint until wine-red turns pure steel blue.', expectedAction: 'Record final burette reading.' },
    { stepNumber: 6, instruction: 'Repeat titration to achieve 3 concordant readings within 0.10 mL.', expectedAction: 'Calculate average titre volume.' },
    { stepNumber: 7, instruction: 'Calculate Total Hardness in ppm = (V_EDTA * M_EDTA * 100.08 * 1000) / V_sample.', expectedAction: 'Report in mg/L as CaCO3.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const vEdtaAdded = Number(inputs.vEdtaAdded || 0);
      const sampleVolMl = 25.0;
      const edtaMolar = 0.010;
      const targetHardnessPpm = 240.0;

      // Equivalence Volume calculation
      // Hardness (ppm) = (V_eq * 0.010 * 100.08 * 1000) / 25.0 = V_eq * 40.032
      // V_eq = 240 / 40.032 = 5.995 mL ~ 6.00 mL
      const vEquivalence = targetHardnessPpm / (edtaMolar * 100.08 * 40.0); // 5.995 mL

      const equivalenceFraction = vEdtaAdded / vEquivalence;
      const hasBuffer = inputs.hasBuffer !== false;
      const hasIndicator = inputs.hasIndicator !== false;

      let colorLabel = 'Colorless';
      let colorHex = '#ffffff';

      if (!hasIndicator) {
        colorLabel = 'Colorless Solution (No Indicator Added)';
        colorHex = '#ffffff';
      } else if (!hasBuffer) {
        colorLabel = 'Reddish-Brown (pH Not Sustained at 10)';
        colorHex = '#9a3412';
      } else if (equivalenceFraction < 0.85) {
        colorLabel = 'Wine-Red (Ca/Mg-EBT Complex)';
        colorHex = '#991b1b';
      } else if (equivalenceFraction < 0.98) {
        colorLabel = 'Reddish-Purple (Near Endpoint Transition)';
        colorHex = '#7e22ce';
      } else if (equivalenceFraction <= 1.04) {
        colorLabel = 'Steel Blue (True Endpoint - Free EBT at pH 10)';
        colorHex = '#1d4ed8';
      } else {
        colorLabel = 'Deep Blue (Overshot Titration)';
        colorHex = '#1e3a8a';
      }

      const calculatedHardnessPpm = (vEdtaAdded * edtaMolar * 100.08 * 1000) / sampleVolMl;
      const isConcordant = Math.abs(vEdtaAdded - vEquivalence) <= 0.10;

      return {
        vEdtaAdded: Number(vEdtaAdded.toFixed(2)),
        vEquivalence: Number(vEquivalence.toFixed(2)),
        equivalenceFraction: Number(equivalenceFraction.toFixed(3)),
        colorLabel,
        colorHex,
        calculatedHardnessPpm: Number(calculatedHardnessPpm.toFixed(1)),
        isEndpoint: Math.abs(vEdtaAdded - vEquivalence) <= 0.10,
        isConcordant,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trial', label: 'Trial #', unit: '', precision: 0 },
      { key: 'vInitial', label: 'Initial Burette (mL)', unit: 'mL', precision: 2 },
      { key: 'vFinal', label: 'Final Burette (mL)', unit: 'mL', precision: 2 },
      { key: 'vTitre', label: 'EDTA Titre V (mL)', unit: 'mL', precision: 2 },
      { key: 'hardnessPpm', label: 'Hardness (ppm CaCO3)', unit: 'ppm', precision: 1 },
      { key: 'isConcordant', label: 'Concordant?', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const trial = Number(inputs.trial || 1);
      const vInitial = Number(inputs.vInitial || 0.0);
      const vTitre = Number(inputs.vTitre || 6.0);
      const vFinal = vInitial + vTitre;
      const hardness = (vTitre * 0.010 * 100.08 * 1000) / 25.0;
      return {
        trial,
        vInitial: Number(vInitial.toFixed(2)),
        vFinal: Number(vFinal.toFixed(2)),
        vTitre: Number(vTitre.toFixed(2)),
        hardnessPpm: Number(hardness.toFixed(1)),
        isConcordant: Math.abs(vTitre - 6.0) <= 0.1 ? 'Yes' : 'No',
      };
    },
  },
  graph: {
    xAxis: { label: 'Volume of EDTA Added', unit: 'mL', key: 'vEdtaAdded' },
    yAxis: { label: 'Free Metal Concentration [Mg2+]', unit: 'mM', key: 'freeMetal' },
    expectedSlopeKey: 'Complexation Inflection',
    expectedSlopeValue: 6.0,
    expectedFormula: '\\text{Hardness (ppm)} = \\frac{V_{EDTA} \\times M_{EDTA} \\times 100.08 \\times 1000}{V_{sample}}',
  },
  mistakes: [
    {
      id: 'skipped-buffer',
      name: 'Skipping Ammonia Buffer Solution',
      triggerCondition: 'inputs.hasBuffer === false',
      consequence: 'pH remains acidic/neutral (pH ~ 6.5); Mg-EBT complex fails to form, resulting in incorrect color change.',
      aiExplanation: 'Ammonia buffer (pH 10) is essential because Mg-EBT complex is only stable at pH 10. Without buffer, endpoint cannot be observed.',
    },
    {
      id: 'buffer-after-indicator',
      name: 'Adding Buffer After Indicator',
      triggerCondition: 'inputs.bufferAfterIndicator === true',
      consequence: 'Indicator precipitates in acidic water sample before buffer stabilizes pH.',
      aiExplanation: 'Always add buffer solution BEFORE adding EBT indicator drops.',
    },
  ],
  assessment: [
    { id: 'w1', description: 'Rinsed and filled burette with 0.01M EDTA solution', points: 15, verifyCondition: 'buretteFilled === true' },
    { id: 'w2', description: 'Added 5 mL Ammonia buffer (pH 10) before indicator', points: 20, verifyCondition: 'hasBuffer === true' },
    { id: 'w3', description: 'Observed sharp Wine-Red to Steel Blue endpoint', points: 25, verifyCondition: 'isEndpoint === true' },
    { id: 'w4', description: 'Obtained 3 concordant EDTA titres within ±0.10 mL', points: 25, verifyCondition: 'concordantCount >= 3' },
    { id: 'w5', description: 'Calculated Hardness = 240 ppm CaCO3 correctly', points: 15, verifyCondition: 'abs(hardnessPpm - 240) < 5' },
  ],
  freeMode: {
    objective: 'Determine hardness of unknown tap water, well water, and mineral water samples.',
    availableApparatus: ['Burette', 'Pipette', 'Conical flasks', '0.01M EDTA', 'Ammonia buffer', 'EBT indicator', 'Water samples'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Differentiate between Permanent Hardness (CaSO4) and Temporary Hardness (Ca(HCO3)2) via boiling.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Fume Hood Required' },
    requiredIdentifications: ['Independent: Sample treatment (Boiled vs Raw)', 'Dependent: Total vs Permanent Hardness'],
  },
  smartboardTrigger: {
    detectedLaTeX: [
      'Ca^{2+} + H_2Y^{2-} \\rightarrow CaY^{2-} + 2H^+',
      '\\text{Hardness (ppm)} = \\frac{V_{EDTA} \\times M_{EDTA} \\times 100.08 \\times 1000}{V_{sample}}',
    ],
    conceptKeywords: ['edta', 'hardness of water', 'complexometric titration', 'eriochrome black t', 'ebt', 'ammonia buffer', 'camg'],
  },
};
