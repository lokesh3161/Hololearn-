import type { ExperimentConfig } from '../types';

export const chromatographyConfig: ExperimentConfig = {
  id: 'paper-chromatography',
  title: 'Paper Chromatography & Retention Factor Rf Analysis',
  subject: 'chemistry',
  objective: 'Separate ink/dye pigments using paper chromatography and calculate Rf = distance spot / distance solvent front.',
  apparatus: [
    { id: 'chamber', name: 'Chromatography Tank / Beaker with Lid', specs: '500 mL glass beaker with watch glass cover', instructions: 'Saturate chamber with solvent vapor.' },
    { id: 'paper', name: 'Whatman No.1 Chromatography Paper Strip', specs: '20cm x 3cm strip', instructions: 'Draw pencil origin baseline 2.0 cm from bottom edge.' },
    { id: 'capillary', name: 'Micro-capillary Spotter', specs: '0.5mm glass capillary', instructions: 'Spot food dye mixtures on pencil line.' },
  ],
  substances: [
    { id: 'dye', name: 'Unknown Mixture Food Color Dye', formula: 'Dye-Mix', initialColor: 'Dark Green / Brown' },
    { id: 'solvent', name: 'Mobile Phase Solvent (Ethanol : Water 4:1)', formula: 'C2H5OH / H2O', initialColor: 'Clear' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Draw pencil baseline 2.0 cm from bottom of chromatography paper strip.', expectedAction: 'Do not use ink pen for baseline.' },
    { stepNumber: 2, instruction: 'Spot concentrated dye sample onto pencil baseline using capillary tube and allow to dry.', expectedAction: 'Keep spot diameter < 3mm.' },
    { stepNumber: 3, instruction: 'Suspend paper strip in solvent tank with bottom 1.0 cm submerged, ensuring solvent level is below baseline.', expectedAction: 'Cover chamber with lid.' },
    { stepNumber: 4, instruction: 'Allow solvent front to travel 15 cm up paper; remove paper and mark solvent front line immediately.', expectedAction: 'Record solvent distance d_solvent.' },
    { stepNumber: 5, instruction: 'Measure distance traveled by center of each separated color spot d_spot.', expectedAction: 'Calculate Rf = d_spot / d_solvent.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const dSolventCm = Number(inputs.dSolventCm || 15.0);
      const rfBlue = 0.40;
      const rfYellow = 0.75;
      const dBlueCm = dSolventCm * rfBlue;
      const dYellowCm = dSolventCm * rfYellow;

      return {
        dSolventCm,
        dBlueCm: Number(dBlueCm.toFixed(1)),
        dYellowCm: Number(dYellowCm.toFixed(1)),
        rfBlue,
        rfYellow,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'spotColor', label: 'Pigment Spot', unit: '', precision: 0 },
      { key: 'dSpotCm', label: 'Distance d_spot', unit: 'cm', precision: 1 },
      { key: 'dSolventCm', label: 'Distance d_front', unit: 'cm', precision: 1 },
      { key: 'rfValue', label: 'Retention Factor R_f', unit: '', precision: 2 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const color = inputs.color || 'Blue';
      const rf = color === 'Blue' ? 0.40 : 0.75;
      return { spotColor: color, dSpotCm: 15.0 * rf, dSolventCm: 15.0, rfValue: rf };
    },
  },
  graph: {
    xAxis: { label: 'Distance Solvent Front', unit: 'cm', key: 'dSolventCm' },
    yAxis: { label: 'Distance Spot Center', unit: 'cm', key: 'dSpotCm' },
    expectedSlopeValue: 0.75,
    expectedFormula: 'R_f = \\frac{d_{spot}}{d_{front}}',
  },
  mistakes: [
    { id: 'baseline-submerged', name: 'Baseline Submerged in Mobile Solvent', triggerCondition: 'inputs.solventAboveBaseline === true', consequence: 'Sample spots dissolve directly into bulk solvent bath instead of migrating up paper.', aiExplanation: 'Solvent level in reservoir must always remain below the pencil origin line.' },
    { id: 'ink-baseline', name: 'Drawing Baseline with Ballpoint Ink Pen', triggerCondition: 'inputs.inkBaseline === true', consequence: 'Ink components dissolve and chromatograph up paper alongside sample spots.', aiExplanation: 'Use graphite pencil only; graphite is insoluble in chromatography solvents.' },
  ],
  assessment: [
    { id: 'ch1', description: 'Calculated Rf values correctly for all separated pigments', points: 50, verifyCondition: 'rfCalculatedCorrectly === true' },
  ],
  freeMode: { objective: 'Identify plant pigments (chlorophyll a, b, xanthophyll, carotene) in spinach leaf extract.', availableApparatus: ['Chromatography paper', 'Acetone solvent', 'Spinach extract', 'Mortar and pestle'], aiGuidanceStyle: 'safety_and_hints_only' },
  researchMode: { scientificQuestion: 'How does mobile phase polarity affect Rf values of polar vs non-polar dyes?', constraints: { timeMinutes: 20, budget: 50, safetyLevel: 'Fume Hood Required' }, requiredIdentifications: ['Independent: Solvent mixture ratio', 'Dependent: Component Rf values'] },
  smartboardTrigger: { detectedLaTeX: ['R_f = \\frac{d_{component}}{d_{solvent}}'], conceptKeywords: ['chromatography', 'rf value', 'retention factor', 'separation', 'stationary phase'] },
};

export const metalActivityConfig: ExperimentConfig = {
  id: 'metal-activity-series',
  title: 'Metal Reactivity & Redox Displacement Series',
  subject: 'chemistry',
  objective: 'Determine relative reactivity ranking of metals (Zn, Fe, Cu, Mg) via single displacement reactions.',
  apparatus: [
    { id: 'rack', name: 'Test Tube Rack & 8 Clean Test Tubes', specs: '16mm x 150mm borosilicate tubes', instructions: 'Set up 4 reagent series.' },
    { id: 'strips', name: 'Metal Strips (Mg, Zn, Fe, Cu)', specs: 'Cleaned with emery paper', instructions: 'Place single metal strip into each salt solution.' },
  ],
  substances: [
    { id: 'cuso4', name: 'Copper(II) Sulfate 0.5M', formula: 'CuSO4(aq)', initialColor: 'Blue' },
    { id: 'znso4', name: 'Zinc Sulfate 0.5M', formula: 'ZnSO4(aq)', initialColor: 'Colorless' },
    { id: 'feso4', name: 'Iron(II) Sulfate 0.5M', formula: 'FeSO4(aq)', initialColor: 'Pale Green' },
    { id: 'mgso4', name: 'Magnesium Sulfate 0.5M', formula: 'MgSO4(aq)', initialColor: 'Colorless' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Place Zn strip into CuSO4 solution; observe reddish copper coating and solution fading.', expectedAction: 'Zn + CuSO4 -> ZnSO4 + Cu.' },
    { stepNumber: 2, instruction: 'Place Cu strip into ZnSO4 solution; observe no reaction.', expectedAction: 'Record no reaction.' },
    { stepNumber: 3, instruction: 'Test all 12 metal-salt pairings to rank reactivity: Mg > Zn > Fe > Cu.', expectedAction: 'Build reactivity matrix.' },
  ],
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => {
      const metal = inputs.metal || 'Zn';
      const solution = inputs.solution || 'CuSO4';

      const reactivityRank: Record<string, number> = { Mg: 4, Zn: 3, Fe: 2, Cu: 1 };
      const solutionMetalRank: Record<string, number> = { MgSO4: 4, ZnSO4: 3, FeSO4: 2, CuSO4: 1 };

      const isDisplacement = reactivityRank[metal] > solutionMetalRank[solution];

      return {
        metal,
        solution,
        isDisplacement,
        observation: isDisplacement ? `Reaction occurs! ${metal} displaces metal from ${solution}.` : 'No visible chemical reaction.',
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'metal', label: 'Solid Metal', unit: '', precision: 0 },
      { key: 'solution', label: 'Salt Solution', unit: '', precision: 0 },
      { key: 'reactionOccurred', label: 'Reaction?', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const metal = inputs.metal || 'Zn';
      const solution = inputs.solution || 'CuSO4';
      return { metal, solution, reactionOccurred: metal === 'Zn' && solution === 'CuSO4' ? 'Yes (Copper deposited)' : 'No' };
    },
  },
  graph: {
    xAxis: { label: 'Metal Species', unit: '', key: 'metal' },
    yAxis: { label: 'Reactivity Rank (E° Volts)', unit: 'V', key: 'eStandard' },
    expectedSlopeValue: 1.0,
    expectedFormula: 'E^0_{cell} = E^0_{cat} - E^0_{an} > 0',
  },
  mistakes: [
    { id: 'oxide-layer', name: 'Failing to Sand Off Metal Oxide Coating', triggerCondition: 'inputs.isSanded === false', consequence: 'Passivating MgO/ZnO coating prevents direct metal-solution contact.', aiExplanation: 'Scour metal surfaces thoroughly with emery paper before testing displacement.' },
  ],
  assessment: [
    { id: 'm1', description: 'Established correct activity series order: Mg > Zn > Fe > Cu', points: 50, verifyCondition: 'seriesCorrect === true' },
  ],
  freeMode: { objective: 'Predict and test whether aluminum can displace iron from thermite reaction precursor.', availableApparatus: ['Test tubes', 'Metal strips', 'Metal salt solutions'], aiGuidanceStyle: 'safety_and_hints_only' },
  researchMode: { scientificQuestion: 'Correlate single displacement reactivity with standard reduction potentials E°.', constraints: { timeMinutes: 20, budget: 40, safetyLevel: 'Low' }, requiredIdentifications: ['Independent: Metal choice', 'Dependent: Cell potential E°'] },
  smartboardTrigger: { detectedLaTeX: ['Zn + CuSO_4 \\rightarrow ZnSO_4 + Cu', 'E^0_{cell} = E^0_{red} - E^0_{ox}'], conceptKeywords: ['reactivity series', 'displacement reaction', 'redox', 'oxidation', 'reduction'] },
};
