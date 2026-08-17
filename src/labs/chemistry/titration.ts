import type { ExperimentConfig } from '../types';

export const titrationConfig: ExperimentConfig = {
  id: 'acid-base-titration',
  title: 'Standard Acid-Base Volumetric Titration',
  subject: 'chemistry',
  objective: 'Determine unknown molar concentration of HCl solution using standard NaOH (0.100 M) with phenolphthalein indicator.',
  apparatus: [
    { id: 'burette', name: 'Volumetric Burette', specs: '50.00 mL volume, 0.05 mL subdivision graduations', instructions: 'Rinse with titrant (NaOH) before filling to 0.00 mL mark.' },
    { id: 'pipette', name: 'Volumetric Pipette', specs: '25.00 mL volumetric pipette (Class A, ±0.03 mL)', instructions: 'Use safety filler bulb to transfer 25.00 mL analyte HCl.' },
    { id: 'flask', name: 'Erlenmeyer Conical Flask', specs: '250 mL wide-neck glass flask', instructions: 'Place on white ceramic tile under burette tip.' },
    { id: 'tile', name: 'White Ceramic Tile', specs: '15cm x 15cm glazed tile', instructions: 'Position under flask for sharp pale-pink endpoint contrast.' },
    { id: 'washbottle', name: 'Deionized Water Wash Bottle', specs: '500 mL PE squeeze bottle', instructions: 'Rinse inner flask walls near endpoint.' },
  ],
  substances: [
    { id: 'naoh', name: 'Sodium Hydroxide Standard Solution', formula: 'NaOH(aq)', concentrationMolar: 0.100, initialColor: 'Colorless', initialPh: 13.0 },
    { id: 'hcl', name: 'Hydrochloric Acid Solution (Unknown)', formula: 'HCl(aq)', concentrationMolar: 0.095, initialColor: 'Colorless', initialPh: 1.02 },
    { id: 'indicator', name: 'Phenolphthalein Indicator Solution', formula: 'C20H14O4', initialColor: 'Colorless', initialPh: 7.0 },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Rinse burette with 5 mL standard NaOH titrant; discard washings and fill burette to 0.00 mL mark.', expectedAction: 'Ensure no air bubbles in stopcock tip.' },
    { stepNumber: 2, instruction: 'Pipette 25.00 mL unknown HCl into clean conical flask using volumetric pipette.', expectedAction: 'Touch pipette tip against flask wall.' },
    { stepNumber: 3, instruction: 'Add 3 drops phenolphthalein indicator to HCl solution in flask.', expectedAction: 'Solution remains clear and colorless.' },
    { stepNumber: 4, instruction: 'Perform rough titration: run NaOH in 1 mL increments with continuous swirling until solution flashes pink.', expectedAction: 'Note approximate endpoint volume.' },
    { stepNumber: 5, instruction: 'Refill burette and perform accurate titrations: add NaOH dropwise near endpoint until faint pale-pink color persists for 30s.', expectedAction: 'Record final burette volume to 0.05 mL.' },
    { stepNumber: 6, instruction: 'Repeat titrations until 3 concordant readings within 0.10 mL are achieved.', expectedAction: 'Calculate mean concordant volume.' },
    { stepNumber: 7, instruction: 'Calculate HCl molarity: C_acid = (C_base * V_base) / V_acid.', expectedAction: 'Report concentration in mol/L.' },
  ],
  stateEngine: {
    constants: { cBase: 0.100, vAcid: 25.0, cAcidTrue: 0.095 },
    calculateState: (inputs: Record<string, any>) => {
      const vBaseAdded = Number(inputs.vBaseAdded || 0);
      const cBase = 0.100;
      const vAcid = 25.0;
      const cAcid = Number(inputs.cAcidUnk || 0.095);

      const molesAcid = (cAcid * vAcid) / 1000.0;
      const molesBase = (cBase * vBaseAdded) / 1000.0;
      const equivalenceVBase = (cAcid * vAcid) / cBase; // 23.75 mL

      let pH = 1.0;
      let color = 'Colorless';
      let pinkIntensity = 0;

      if (vBaseAdded < equivalenceVBase) {
        const excessMolesAcid = molesAcid - molesBase;
        const totalVolL = (vAcid + vBaseAdded) / 1000.0;
        const hConc = excessMolesAcid / totalVolL;
        pH = -Math.log10(Math.max(1e-14, hConc));
        color = 'Colorless';
      } else if (Math.abs(vBaseAdded - equivalenceVBase) < 0.05) {
        pH = 7.0;
        color = 'Faint Pale Pink (Endpoint)';
        pinkIntensity = 0.3;
      } else {
        const excessMolesBase = molesBase - molesAcid;
        const totalVolL = (vAcid + vBaseAdded) / 1000.0;
        const ohConc = excessMolesBase / totalVolL;
        const pOH = -Math.log10(Math.max(1e-14, ohConc));
        pH = 14.0 - pOH;
        if (pH >= 10.0) {
          color = 'Deep Pink / Magenta (Overshot)';
          pinkIntensity = Math.min(1.0, 0.3 + (vBaseAdded - equivalenceVBase) * 0.2);
        } else {
          color = 'Pale Pink';
          pinkIntensity = 0.5;
        }
      }

      return {
        vBaseAdded: Number(vBaseAdded.toFixed(2)),
        equivalenceVBase: Number(equivalenceVBase.toFixed(2)),
        pH: Number(pH.toFixed(2)),
        color,
        pinkIntensity: Number(pinkIntensity.toFixed(2)),
        calculatedCAcid: Number(((cBase * vBaseAdded) / vAcid).toFixed(4)),
        isConcordant: Math.abs(vBaseAdded - equivalenceVBase) <= 0.10,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'trial', label: 'Trial', unit: '', precision: 0 },
      { key: 'vInitial', label: 'Initial V', unit: 'mL', precision: 2 },
      { key: 'vFinal', label: 'Final V', unit: 'mL', precision: 2 },
      { key: 'vTitre', label: 'Titre V', unit: 'mL', precision: 2 },
      { key: 'isConcordant', label: 'Concordant?', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const trial = Number(inputs.trial || 1);
      const vInitial = Number(inputs.vInitial || 0.0);
      const vTitre = 23.75 + (Math.random() - 0.5) * 0.06;
      const vFinal = vInitial + vTitre;
      return {
        trial,
        vInitial: Number(vInitial.toFixed(2)),
        vFinal: Number(vFinal.toFixed(2)),
        vTitre: Number(vTitre.toFixed(2)),
        isConcordant: 'Yes (within ±0.10 mL)',
      };
    },
  },
  graph: {
    xAxis: { label: 'Volume NaOH Added', unit: 'mL', key: 'vBaseAdded' },
    yAxis: { label: 'pH', unit: '', key: 'pH' },
    expectedSlopeKey: 'Inflection Point',
    expectedSlopeValue: 23.75,
    expectedFormula: 'pH = f(V_{NaOH})',
  },
  mistakes: [
    {
      id: 'no-burette-rinse',
      name: 'Filling Burette Without Rinsing with NaOH Titrant',
      triggerCondition: 'inputs.rinsedBurette === false',
      consequence: 'Residual water inside burette dilutes standard NaOH, causing systematic over-reading of titre volume.',
      aiExplanation: 'Always rinse volumetric glassware with a small portion of the solution it will contain to avoid dilution errors.',
    },
    {
      id: 'overshot-endpoint',
      name: 'Overshooting Endpoint to Magenta',
      triggerCondition: 'inputs.vBaseAdded > inputs.equivalenceVBase + 0.30',
      consequence: 'Excess NaOH causes solution to turn deep magenta (pH > 10.5); calculated acid concentration will be falsely high.',
      aiExplanation: 'The true equivalence endpoint is marked by the FIRST permanent pale-pink color change lasting 30s. If overshot, discard and repeat.',
    },
    {
      id: 'air-bubble-tip',
      name: 'Air Bubble Trapped in Burette Tip',
      triggerCondition: 'inputs.hasAirBubble === true',
      consequence: 'Air bubble dislodges during titration, causing volume reading error of 0.2 - 0.5 mL.',
      aiExplanation: 'Flick burette tip while opening stopcock wide to expel trapped air bubbles before recording initial volume reading.',
    },
  ],
  assessment: [
    { id: 't1', description: 'Burette read to 0.05 mL precision', points: 15, verifyCondition: 'precisionCorrect === true' },
    { id: 't2', description: 'Endpoint color pale pink, not overshot magenta', points: 20, verifyCondition: 'color === "Faint Pale Pink (Endpoint)"' },
    { id: 't3', description: 'Obtained 3 concordant titres within 0.10 mL range', points: 25, verifyCondition: 'concordantCount >= 3' },
    { id: 't4', description: 'Calculated C(HCl) = 0.0950 M correctly using stoichiometric relation', points: 25, verifyCondition: 'abs(calculatedCAcid - 0.095) < 0.002' },
    { id: 't5', description: 'Stated correct units (M or mol/L) and appropriate sig figs', points: 15, verifyCondition: 'sigFigsCorrect === true' },
  ],
  freeMode: {
    objective: 'Determine unknown acetic acid concentration in commercial vinegar sample by volumetric titration.',
    availableApparatus: ['Burette', 'Pipette', 'Conical flasks', 'Standard 0.100 M NaOH', 'Vinegar sample', 'Phenolphthalein', 'Methyl orange'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Compare indicator sharpness and suitability for weak acid vs strong acid titrations.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Chemical Safety Gloves Required' },
    requiredIdentifications: ['Independent: Acid strength (HCl vs CH3COOH)', 'Dependent: Endpoint pH inflection jumper', 'Control: Titrant NaOH concentration'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['C_A V_A = C_B V_B', 'n_{HCl} = n_{NaOH}', 'HCl + NaOH \\rightarrow NaCl + H_2O', 'pH = -\\log[H^+]'],
    conceptKeywords: ['titration', 'acid base', 'burette', 'pipette', 'endpoint', 'phenolphthalein', 'neutralization'],
  },
};
