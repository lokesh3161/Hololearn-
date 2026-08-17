import type { ExperimentConfig } from '../types';

export const electrochemistryConfig: ExperimentConfig = {
  id: 'copper-electrolysis',
  title: "Copper Electrolysis & Faraday's Laws of Electrolysis",
  subject: 'chemistry',
  objective: "Verify Faraday's First Law (m = z * I * t) during electrolysis of aqueous CuSO₄ with copper electrodes.",
  apparatus: [
    { id: 'power', name: 'DC Regulated Power Supply', specs: '0 - 3A constant current source', instructions: 'Set current output to 0.50 A.' },
    { id: 'electrodes', name: 'Matched Copper Strips (Anode & Cathode)', specs: 'High-purity Cu foil (99.9%), 5cm x 2cm', instructions: 'Scour with emery paper, rinse with propanone, dry and weigh.' },
    { id: 'beaker', name: 'Glass Electrolysis Cell Beaker', specs: '250 mL Pyrex beaker with electrode clip holder', instructions: 'Fill with 0.5 M CuSO₄ solution.' },
    { id: 'ammeter', name: 'Digital Ammeter', specs: '0 - 2.00 A range', instructions: 'Connect in series to monitor constant current.' },
    { id: 'balance', name: 'Analytical Balance', specs: '0.001 g (1 mg) resolution', instructions: 'Weigh cathode before and after electrolysis.' },
  ],
  substances: [
    { id: 'cuso4', name: 'Copper(II) Sulfate Electrolyte Solution', formula: 'CuSO4(aq)', concentrationMolar: 0.500, initialColor: 'Deep Blue' },
    { id: 'propanone', name: 'Propanone Washing Solvent', formula: 'CH3COCH3(l)', initialColor: 'Clear' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Clean copper cathode strip with emery paper, rinse with propanone to dry rapidly, and weigh on analytical balance (m_initial).', expectedAction: 'Record initial cathode mass m_i in grams.' },
    { stepNumber: 2, instruction: 'Set up electrolysis cell: submerge Cu cathode (-) and Cu anode (+) into 0.5M CuSO4 solution.', expectedAction: 'Verify electrodes do not touch.' },
    { stepNumber: 3, instruction: 'Switch on power supply, start stopwatch, and adjust rheostat to maintain constant 0.50 A current.', expectedAction: 'Monitor current continually.' },
    { stepNumber: 4, instruction: 'Run electrolysis for 20.0 minutes (1200 seconds).', expectedAction: 'Calculate total charge Q = I * t.' },
    { stepNumber: 5, instruction: 'Switch off power, remove cathode, gently rinse with deionized water, wash with propanone, dry in warm air, and reweigh (m_final).', expectedAction: 'Determine mass gained Δm = m_final - m_initial.' },
    { stepNumber: 6, instruction: 'Compare experimental mass of copper deposited with theoretical mass m_theo = (I * t * M) / (z * F).', expectedAction: 'Calculate current efficiency.' },
  ],
  stateEngine: {
    constants: { faraday: 96485.0, molarMassCu: 63.55, valency: 2 },
    calculateState: (inputs: Record<string, any>) => {
      const currentAmps = Number(inputs.currentAmps || 0.50);
      const timeMinutes = Number(inputs.timeMinutes || 20.0);
      const timeSec = timeMinutes * 60.0;
      const initialCathodeMassG = Number(inputs.initialCathodeMassG || 12.500);

      const faraday = 96485.0;
      const molarMassCu = 63.55;
      const chargeCoulombs = currentAmps * timeSec;

      // m = (Q * M) / (z * F)
      const theoreticalMassDepositedG = (chargeCoulombs * molarMassCu) / (2.0 * faraday);
      const efficiencyPct = 98.2; // slight loss due to drag / imperfect washing
      const actualMassDepositedG = theoreticalMassDepositedG * (efficiencyPct / 100.0);

      const finalCathodeMassG = initialCathodeMassG + actualMassDepositedG;
      const initialAnodeMassG = 12.500;
      const finalAnodeMassG = initialAnodeMassG - theoreticalMassDepositedG;

      return {
        currentAmps,
        timeMinutes,
        timeSec,
        chargeCoulombs: Number(chargeCoulombs.toFixed(1)),
        theoreticalMassG: Number(theoreticalMassDepositedG.toFixed(4)),
        actualMassG: Number(actualMassDepositedG.toFixed(4)),
        initialCathodeMassG: Number(initialCathodeMassG.toFixed(3)),
        finalCathodeMassG: Number(finalCathodeMassG.toFixed(3)),
        finalAnodeMassG: Number(finalAnodeMassG.toFixed(3)),
        currentEfficiencyPct: Number(efficiencyPct.toFixed(1)),
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'currentAmps', label: 'Current I', unit: 'A', precision: 2 },
      { key: 'timeMinutes', label: 'Time t', unit: 'min', precision: 1 },
      { key: 'chargeCoulombs', label: 'Charge Q', unit: 'C', precision: 1 },
      { key: 'theoreticalMassG', label: 'Theo Mass', unit: 'g', precision: 4 },
      { key: 'actualMassG', label: 'Actual Mass', unit: 'g', precision: 4 },
      { key: 'currentEfficiencyPct', label: 'Efficiency', unit: '%', precision: 1 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const current = Number(inputs.currentAmps || 0.5);
      const timeMin = Number(inputs.timeMinutes || 20.0);
      const charge = current * timeMin * 60.0;
      const mTheo = (charge * 63.55) / (2 * 96485);
      return {
        currentAmps: current,
        timeMinutes: timeMin,
        chargeCoulombs: Number(charge.toFixed(1)),
        theoreticalMassG: Number(mTheo.toFixed(4)),
        actualMassG: Number((mTheo * 0.982).toFixed(4)),
        currentEfficiencyPct: 98.2,
      };
    },
  },
  graph: {
    xAxis: { label: 'Charge Q (I × t)', unit: 'C', key: 'chargeCoulombs' },
    yAxis: { label: 'Copper Deposited m', unit: 'g', key: 'actualMassG' },
    expectedSlopeKey: 'M / (z*F)',
    expectedSlopeValue: 63.55 / (2.0 * 96485.0),
    expectedFormula: 'm = \\frac{M}{z F} Q',
  },
  mistakes: [
    {
      id: 'touching-electrodes',
      name: 'Electrodes Touching in Electrolyte',
      triggerCondition: 'inputs.isShortCircuit === true',
      consequence: 'Direct metallic short circuit bypasses ionic electrolysis; ammeter maxes out and zero metal deposits.',
      aiExplanation: 'Maintain physical clearance between positive anode and negative cathode to force current flow via Cu²⁺ ion migration.',
    },
    {
      id: 'wet-cathode-weighing',
      name: 'Weighing Cathode While Wet with Water',
      triggerCondition: 'inputs.isWetWhenWeighed === true',
      consequence: 'Adhering liquid water droplets add artificial mass, leading to falsely high mass gain (>110% efficiency).',
      aiExplanation: 'Rinse washed cathode with volatile propanone and air dry thoroughly before recording final analytical mass.',
    },
  ],
  assessment: [
    { id: 'e1', description: 'Cleaned and dried cathode properly before weighing', points: 15, verifyCondition: 'preparedCorrectly === true' },
    { id: 'e2', description: 'Maintained constant 0.50 A current for 20 minutes', points: 20, verifyCondition: 'currentConstant === true' },
    { id: 'e3', description: 'Calculated charge Q = I * t = 600 C accurately', points: 20, verifyCondition: 'chargeCalculated === true' },
    { id: 'e4', description: 'Calculated theoretical copper mass (0.1976 g) using Faraday formula', points: 25, verifyCondition: 'abs(theoreticalMassG - 0.1976) < 0.005' },
    { id: 'e5', description: 'Determined current efficiency (~98%) correctly', points: 20, verifyCondition: 'efficiencyCalculated === true' },
  ],
  freeMode: {
    objective: 'Determine Faraday constant F experimentally using copper electroplating cell.',
    availableApparatus: ['Power supply', 'Copper strips', 'CuSO4 solution', 'Analytical balance', 'Digital timer'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate how electrolyte concentration affects current density and cathode deposit morphology.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Chemical Gloves & Goggles Required' },
    requiredIdentifications: ['Independent: [CuSO4]', 'Dependent: Mass deposition rate / Deposit adherence'] },
  smartboardTrigger: {
    detectedLaTeX: ['m = \\frac{I t M}{z F}', 'm = z I t', 'Q = I t', 'Cu^{2+} + 2e^- \\rightarrow Cu(s)'],
    conceptKeywords: ['electrolysis', 'faraday law', 'electrochemistry', 'copper plating', 'cathode', 'anode'],
  },
};
