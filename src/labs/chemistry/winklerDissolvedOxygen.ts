import type { ExperimentConfig } from '../types';

export interface WinklerExperimentConfig {
  id: string; // "dissolved-oxygen-winkler"
  title: string;
  subject: string;
  sample: {
    bottleVolumeMl: number; // 300 mL BOD bottle
    sampleVolumeMl: number; // 200 mL titrated aliquot
    hiddenDissolvedOxygenMgL: number; // ground truth e.g. 7.50 mg/L O2
    temperatureC: number;
  };
  reagents: {
    manganousReagent: { name: string; volumeMl: number }; // 2.0 mL MnSO4
    alkalineIodideAzide: { name: string; volumeMl: number }; // 2.0 mL NaOH-KI-NaN3
    sulfuricAcid: { name: string; volumeMl: number }; // 2.0 mL conc. H2SO4
    sodiumThiosulfate: { name: string; molarityM: number }; // 0.025 M Na2S2O3
    starchIndicator: { name: string; volumeMl: number }; // 2.0 mL 1% starch
  };
  titration: {
    dropVolumeMl: number;
    endpointToleranceMl: number;
  };
  tolerances: {
    concordantTitresMl: number;
  };
}

export const winklerDissolvedOxygenConfig: WinklerExperimentConfig & ExperimentConfig = {
  id: 'dissolved-oxygen-winkler',
  title: "Estimation of Dissolved Oxygen by Winkler's Iodometric Method",
  subject: 'chemistry',
  objective:
    'Determine the concentration of dissolved oxygen (DO) in mg/L present in a water sample using Winkler iodometric titration with standard 0.025 M sodium thiosulfate and starch indicator.',
  sample: {
    bottleVolumeMl: 300.0,
    sampleVolumeMl: 200.0,
    hiddenDissolvedOxygenMgL: 7.50, // 7.50 mg/L O2 ground truth
    temperatureC: 22.0,
  },
  reagents: {
    manganousReagent: { name: 'Manganous Sulfate Solution (MnSO4)', volumeMl: 2.0 },
    alkalineIodideAzide: { name: 'Alkaline Iodide-Azide Reagent (NaOH-KI-NaN3)', volumeMl: 2.0 },
    sulfuricAcid: { name: 'Concentrated Sulfuric Acid (H2SO4)', volumeMl: 2.0 },
    sodiumThiosulfate: { name: 'Standard Sodium Thiosulfate Solution (Na2S2O3)', molarityM: 0.025 },
    starchIndicator: { name: 'Starch Indicator Solution (1% w/v)', volumeMl: 2.0 },
  },
  titration: {
    dropVolumeMl: 0.05,
    endpointToleranceMl: 0.10,
  },
  tolerances: {
    concordantTitresMl: 0.10,
  },
  apparatus: [
    {
      id: 'bod_bottle',
      name: '300 mL Glass BOD Bottle with Ground Glass Stopper',
      specs: 'Borosilicate Glass BOD Bottle',
      instructions: 'Fill completely without trapping air bubbles.',
    },
    {
      id: 'pipette_reagent',
      name: '2.0 mL Safety Measuring Pipette',
      specs: 'Class A Glass Pipette',
      instructions: 'Dispense MnSO4 and Alk-Iodide-Azide reagents below liquid surface.',
    },
    {
      id: 'burette',
      name: '50.00 mL Volumetric Glass Burette',
      specs: 'Class A, 0.05 mL subdivisions',
      instructions: 'Fill with standard 0.025 M Na2S2O3 solution.',
    },
    {
      id: 'flask',
      name: '250 mL Erlenmeyer Conical Flask',
      specs: 'Borosilicate Glass',
      instructions: 'Transfer 200 mL of acidified iodine solution for titration.',
    },
    {
      id: 'tile',
      name: 'White Ceramic Tile',
      specs: 'Glazed 15cm x 15cm Tile',
      instructions: 'Place under flask for sharp blue-to-colourless endpoint detection.',
    },
  ],
  substances: [
    { id: 'water_sample', name: 'Water Sample', formula: 'H2O + O2(aq)', initialColor: 'Clear' },
    { id: 'mnso4', name: 'Manganous Sulfate Solution', formula: 'MnSO4(aq)', initialColor: 'Colorless' },
    { id: 'alk_iodide', name: 'Alkaline Iodide-Azide', formula: 'NaOH + KI + NaN3', initialColor: 'Clear' },
    { id: 'h2so4', name: 'Sulfuric Acid', formula: 'H2SO4(aq)', initialColor: 'Colorless' },
    { id: 'thiosulfate', name: 'Sodium Thiosulfate Standard', formula: 'Na2S2O3(aq)', concentrationMolar: 0.025, initialColor: 'Colorless' },
    { id: 'starch', name: 'Starch Indicator', formula: '(C6H10O5)n', initialColor: 'Opal White' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Fill 300 mL BOD bottle completely with water sample; ensure zero trapped air bubbles and stopper tightly.', expectedAction: 'Zero air bubbles.' },
    { stepNumber: 2, instruction: 'Add 2.0 mL Manganous Sulfate (MnSO4) and 2.0 mL Alkaline Iodide-Azide reagent below liquid surface.', expectedAction: 'Dip pipette tip below surface.' },
    { stepNumber: 3, instruction: 'Stopper bottle and invert 8-10 times; allow brownish-yellow MnO(OH)2 precipitate to settle.', expectedAction: 'Fixation complete.' },
    { stepNumber: 4, instruction: 'Add 2.0 mL concentrated H2SO4; stopper and invert until precipitate dissolves, liberating golden iodine (I2).', expectedAction: 'Iodine liberated.' },
    { stepNumber: 5, instruction: 'Transfer 200.0 mL of golden iodine solution into a 250 mL conical flask.', expectedAction: 'Measure 200 mL aliquot.' },
    { stepNumber: 6, instruction: 'Fill burette with 0.025 M Na2S2O3 and titrate golden solution until it turns pale straw yellow.', expectedAction: 'Titrate to pale yellow.' },
    { stepNumber: 7, instruction: 'Add 2.0 mL 1% starch indicator; solution immediately turns intense dark blue.', expectedAction: 'Dark blue complex forms.' },
    { stepNumber: 8, instruction: 'Continue dropwise titration of Na2S2O3 until dark blue color turns completely colourless.', expectedAction: 'Record final burette reading.' },
    { stepNumber: 9, instruction: 'Calculate Dissolved Oxygen (mg/L O2) = (V_thiosulfate * M_thiosulfate * 8000) / V_sample.', expectedAction: 'Report DO in mg/L.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const vThioAdded = Number(inputs.vThioAdded || 0);
      const sampleVolMl = 200.0; // mL
      const thioMolar = 0.025; // M
      const hiddenDoMgL = 7.50; // mg/L O2

      // Theoretical equivalence volume
      // DO (mg/L) = (V_eq * 0.025 * 8000) / 200.0 = V_eq * 1.00
      // V_eq = 7.50 mL
      const vEquivalence = hiddenDoMgL; // 7.50 mL

      const iodineConsumedFraction = Math.min(1.0, vThioAdded / vEquivalence);
      const starchAdded = inputs.starchAdded === true;
      const airBubble = inputs.airBubblePresent === true;

      let colorLabel = 'Clear Water Sample';
      let colorHex = 'rgba(255, 255, 255, 0.15)';

      if (!inputs.sampleCollected) {
        colorLabel = 'Empty BOD Bottle';
        colorHex = 'rgba(255, 255, 255, 0.05)';
      } else if (!inputs.fixed) {
        colorLabel = 'Clear Water Sample (Unfixed)';
        colorHex = 'rgba(255, 255, 255, 0.15)';
      } else if (!inputs.acidified) {
        colorLabel = 'Brownish-Yellow Flocculent Precipitate [MnO(OH)2]';
        colorHex = '#b45309';
      } else if (!starchAdded) {
        if (iodineConsumedFraction < 0.70) {
          colorLabel = 'Golden-Brown Iodine Solution (I2 Liberated)';
          colorHex = '#92400e';
        } else {
          colorLabel = 'Pale Straw Yellow (Near Starch Addition Point)';
          colorHex = '#fde047';
        }
      } else {
        // Starch Added
        if (iodineConsumedFraction < 0.98) {
          colorLabel = 'Intense Dark Blue (Iodine-Starch Complex)';
          colorHex = '#1e1b4b';
        } else if (iodineConsumedFraction <= 1.04) {
          colorLabel = 'Crystal Clear / Colourless (True Endpoint)';
          colorHex = 'rgba(255, 255, 255, 0.15)';
        } else {
          colorLabel = 'Colourless Solution (Overshot Titration)';
          colorHex = 'rgba(255, 255, 255, 0.10)';
        }
      }

      // Calculation of DO from actual thiosulfate volume
      const calculatedDoMgL = (vThioAdded * thioMolar * 8000.0) / sampleVolMl;
      const isEndpoint = Math.abs(vThioAdded - vEquivalence) <= 0.10;

      return {
        vThioAdded: Number(vThioAdded.toFixed(2)),
        vEquivalence: Number(vEquivalence.toFixed(2)),
        iodineConsumedFraction: Number(iodineConsumedFraction.toFixed(3)),
        colorLabel,
        colorHex,
        calculatedDoMgL: Number(calculatedDoMgL.toFixed(2)),
        isEndpoint,
        isConcordant: Math.abs(vThioAdded - vEquivalence) <= 0.10,
        airBubble,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trial', label: 'Trial #', unit: '', precision: 0 },
      { key: 'vInitial', label: 'Initial Burette (mL)', unit: 'mL', precision: 2 },
      { key: 'vFinal', label: 'Final Burette (mL)', unit: 'mL', precision: 2 },
      { key: 'vTitre', label: 'Thiosulfate Titre V (mL)', unit: 'mL', precision: 2 },
      { key: 'dissolvedOxygenMgL', label: 'Dissolved Oxygen (mg/L O2)', unit: 'mg/L', precision: 2 },
      { key: 'isConcordant', label: 'Concordant?', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const trial = Number(inputs.trial || 1);
      const vInitial = Number(inputs.vInitial || 0.0);
      const vTitre = Number(inputs.vTitre || 7.50);
      const vFinal = vInitial + vTitre;
      const doValue = (vTitre * 0.025 * 8000.0) / 200.0;
      return {
        trial,
        vInitial: Number(vInitial.toFixed(2)),
        vFinal: Number(vFinal.toFixed(2)),
        vTitre: Number(vTitre.toFixed(2)),
        dissolvedOxygenMgL: Number(doValue.toFixed(2)),
        isConcordant: Math.abs(vTitre - 7.50) <= 0.10 ? 'Yes' : 'No',
      };
    },
  },
  graph: {
    xAxis: { label: 'Volume Sodium Thiosulfate Added', unit: 'mL', key: 'vThioAdded' },
    yAxis: { label: 'Liberated Iodine [I2]', unit: 'mM', key: 'freeIodine' },
    expectedSlopeKey: 'Redox Equivalence Inflection',
    expectedSlopeValue: 7.50,
    expectedFormula: '\\text{DO (mg/L)} = \\frac{V_{thiosulfate} \\times M_{thiosulfate} \\times 8000}{V_{sample}}',
  },
  mistakes: [
    {
      id: 'air-bubble-sampling',
      name: 'Trapping Air Bubble During BOD Sampling',
      triggerCondition: 'inputs.airBubblePresent === true',
      consequence: 'Trapped atmospheric oxygen dissolves into water sample, causing systematic high DO measurement error.',
      aiExplanation: 'Always fill BOD bottle completely to the brim and insert stopper firmly so zero air bubbles remain trapped inside.',
    },
    {
      id: 'starch-added-early',
      name: 'Adding Starch Indicator at Beginning of Titration',
      triggerCondition: 'inputs.starchAddedEarly === true',
      consequence: 'Starch forms insoluble complex with high concentration of iodine, preventing quantitative titration.',
      aiExplanation: 'Add starch indicator ONLY when the golden iodine solution has faded to pale straw yellow (near endpoint).',
    },
  ],
  assessment: [
    { id: 'do1', description: 'Collected water sample with zero trapped air bubbles', points: 15, verifyCondition: 'airBubblePresent === false' },
    { id: 'do2', description: 'Fixed oxygen with MnSO4 and Alkaline Iodide-Azide reagents', points: 20, verifyCondition: 'fixed === true' },
    { id: 'do3', description: 'Acidified with conc. H2SO4 to liberate iodine quantitatively', points: 20, verifyCondition: 'acidified === true' },
    { id: 'do4', description: 'Added starch near endpoint and titrated blue to colourless', points: 25, verifyCondition: 'isEndpoint === true' },
    { id: 'do5', description: 'Calculated Dissolved Oxygen = 7.50 mg/L O2 correctly', points: 20, verifyCondition: 'abs(calculatedDoMgL - 7.50) < 0.2' },
  ],
  freeMode: {
    objective: 'Determine dissolved oxygen content in stream water, lake water, tap water, and boiled water.',
    availableApparatus: ['BOD Bottle', 'Burette', 'Pipette', 'MnSO4', 'Alk-Iodide-Azide', 'H2SO4', '0.025M Na2S2O3', 'Starch'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate effect of water temperature and salinity on equilibrium dissolved oxygen solubility.',
    constraints: { timeMinutes: 30, budget: 80, safetyLevel: 'Chemical Safety Gloves Required' },
    requiredIdentifications: ['Independent: Temperature (10°C to 40°C)', 'Dependent: DO concentration mg/L'],
  },
  smartboardTrigger: {
    detectedLaTeX: [
      '2Mn(OH)_2 + O_2 \\rightarrow 2MnO(OH)_2',
      'I_2 + 2S_2O_3^{2-} \\rightarrow 2I^- + S_4O_6^{2-}',
      '\\text{DO (mg/L)} = \\frac{V_{S_2O_3} \\times M \\times 8000}{V_{sample}}',
    ],
    conceptKeywords: ['winkler method', 'dissolved oxygen', 'do', 'bod bottle', 'manganous sulfate', 'thiosulfate', 'starch indicator', 'iodometry'],
  },
};
