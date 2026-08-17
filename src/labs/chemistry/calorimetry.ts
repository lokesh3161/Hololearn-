import type { ExperimentConfig } from '../types';

export const calorimetryConfig: ExperimentConfig = {
  id: 'enthalpy-calorimetry',
  title: 'Enthalpy of Neutralization Calorimetry',
  subject: 'chemistry',
  objective: 'Determine standard molar enthalpy of neutralization ΔH_neut for HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l).',
  apparatus: [
    { id: 'cup', name: 'Expanded Polystyrene Coffee Cup Calorimeter', specs: 'Double-walled styrofoam vessel with lid (negligible heat capacity)', instructions: 'Minimizes heat exchange with ambient surroundings.' },
    { id: 'thermometer', name: 'Precision Digital Temperature Probe', specs: '0.05°C resolution probe', instructions: 'Insert through lid aperture into solution.' },
    { id: 'cylinders', name: '50 mL Measuring Cylinders', specs: '50 mL graduated cylinders (±0.2 mL)', instructions: 'Measure 25.0 mL acid and 25.0 mL base.' },
    { id: 'stirrer', name: 'Glass Stirring Rod', specs: 'Manual stirrer', instructions: 'Stir solution gently immediately upon mixing.' },
  ],
  substances: [
    { id: 'hcl', name: 'Hydrochloric Acid Solution', formula: 'HCl(aq)', concentrationMolar: 1.000, volumeMl: 25.0, initialTemp: 21.0 },
    { id: 'naoh', name: 'Sodium Hydroxide Solution', formula: 'NaOH(aq)', concentrationMolar: 1.000, volumeMl: 25.0, initialTemp: 21.0 },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Measure 25.0 mL 1.0M HCl into polystyrene cup calorimeter; record baseline temp every 30s for 3 minutes.', expectedAction: 'Establish steady initial temperature T_initial.' },
    { stepNumber: 2, instruction: 'Measure 25.0 mL 1.0M NaOH in separate cylinder; ensure same initial temperature.', expectedAction: 'Verify baseline thermal equilibrium.' },
    { stepNumber: 3, instruction: 'At t = 3.0 min, quickly add NaOH to HCl in calorimeter cup, replace lid, and stir.', expectedAction: 'Mix reagents rapidly without splashing.' },
    { stepNumber: 4, instruction: 'Record temperature every 30 seconds for 5 additional minutes while continuing gentle stirring.', expectedAction: 'Capture peak temperature T_max and cooling curve.' },
    { stepNumber: 5, instruction: 'Extrapolate cooling curve back to t = 3.0 min to find true corrected temperature rise ΔT.', expectedAction: 'Account for heat loss during reaction.' },
    { stepNumber: 6, instruction: 'Calculate heat evolved q = m * c * ΔT (assume m = 50g, c = 4.18 J/g°C) and ΔH_neut = -q / moles_H2O.', expectedAction: 'Report ΔH in kJ/mol.' },
  ],
  stateEngine: {
    constants: { deltaHNominal: -57.1, cSolution: 4.184, densitySolution: 1.0 },
    calculateState: (inputs: Record<string, any>) => {
      const timeSec = Number(inputs.timeSec || 0);
      const vAcid = 25.0;
      const vBase = 25.0;
      const cAcid = 1.0;
      const initialTemp = 21.0;
      const deltaHNeut = -57.1; // kJ/mol

      const molesWater = (cAcid * vAcid) / 1000.0; // 0.025 mol
      const heatReleasedJ = molesWater * 57100.0; // 1427.5 J
      const totalMassG = (vAcid + vBase) * 1.0; // 50 g
      const totalCapacity = totalMassG * 4.184; // 209.2 J/°C

      const idealDeltaT = heatReleasedJ / totalCapacity; // 6.82 °C
      const maxTemp = initialTemp + idealDeltaT; // 27.82 °C

      let currentTemp = initialTemp;
      const mixTimeSec = 180; // t = 3 min

      if (timeSec < mixTimeSec) {
        currentTemp = initialTemp + (Math.random() - 0.5) * 0.1;
      } else {
        const dt = timeSec - mixTimeSec;
        // Fast exothermic temperature rise followed by slow Newton cooling
        const rise = idealDeltaT * (1.0 - Math.exp(-dt / 25.0));
        const cooling = 0.0003 * dt;
        currentTemp = initialTemp + rise - cooling;
      }

      return {
        timeSec,
        currentTemp: Number(currentTemp.toFixed(2)),
        initialTemp,
        maxTemp: Number(maxTemp.toFixed(2)),
        deltaTCalculated: Number((maxTemp - initialTemp).toFixed(2)),
        heatReleasedJ: Number(heatReleasedJ.toFixed(1)),
        enthalpyKjPerMol: Number(deltaHNeut.toFixed(1)),
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'timeSec', label: 'Time t', unit: 's', precision: 0 },
      { key: 'currentTemp', label: 'Temperature T', unit: '°C', precision: 2 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const timeSec = Number(inputs.timeSec || 0);
      const initialTemp = 21.0;
      const maxTemp = 27.82;
      let temp = initialTemp;
      if (timeSec >= 180) {
        const dt = timeSec - 180;
        temp = initialTemp + (maxTemp - initialTemp) * (1 - Math.exp(-dt / 25)) - 0.0003 * dt;
      }
      return { timeSec, currentTemp: Number(temp.toFixed(2)) };
    },
  },
  graph: {
    xAxis: { label: 'Time t', unit: 's', key: 'timeSec' },
    yAxis: { label: 'Temperature T', unit: '°C', key: 'currentTemp' },
    expectedSlopeKey: 'Cooling Rate',
    expectedSlopeValue: -0.0003,
    expectedFormula: 'T(t) = T_{max} e^{-k t}',
  },
  mistakes: [
    {
      id: 'slow-addition',
      name: 'Slow Addition of Reagents',
      triggerCondition: 'inputs.isSlowAddition === true',
      consequence: 'Heat escapes to surroundings during prolonged pouring; peak temperature T_max under-recorded.',
      aiExplanation: 'Pour NaOH solution rapidly into HCl in one continuous motion to minimize heat loss during mixing.',
    },
  ],
  assessment: [
    { id: 'c1', description: 'Established steady baseline temperature prior to mixing', points: 15, verifyCondition: 'baselineEstablished === true' },
    { id: 'c2', description: 'Extrapolated cooling curve back to mixing time t=3min', points: 25, verifyCondition: 'extrapolationCorrect === true' },
    { id: 'c3', description: 'Calculated ΔH_neut = -57.1 kJ/mol within ±4% accuracy', points: 35, verifyCondition: 'abs(calculatedDeltaH - (-57.1)) < 2.5' },
    { id: 'c4', description: 'Correctly identified reaction as exothermic (negative ΔH)', points: 25, verifyCondition: 'signCorrect === true' },
  ],
  freeMode: {
    objective: 'Determine enthalpy of neutralization for weak acid CH3COOH vs NaOH and compare to strong acid.',
    availableApparatus: ['Coffee cup calorimeter', 'Thermometer probe', 'HCl, CH3COOH, NaOH solutions'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate how heat of solution ΔH_sol varies when dissolving anhydrous CuSO4 vs hydrated CuSO4.5H2O.',
    constraints: { timeMinutes: 25, budget: 90, safetyLevel: 'Eye Protection Required' },
    requiredIdentifications: ['Independent: Anhydrous vs Hydrated salt', 'Dependent: Temperature change ΔT'] },
  smartboardTrigger: {
    detectedLaTeX: ['q = m c \\Delta T', '\\Delta H = -\\frac{q}{n}', 'H^+ + OH^- \\rightarrow H_2O'],
    conceptKeywords: ['calorimetry', 'enthalpy of neutralization', 'exothermic', 'heat capacity', 'thermochemistry'],
  },
};
