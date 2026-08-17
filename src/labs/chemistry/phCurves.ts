import type { ExperimentConfig } from '../types';

export const phCurvesConfig: ExperimentConfig = {
  id: 'ph-titration-curves',
  title: 'pH Curves & Acid-Base Equilibrium Buffer Regions',
  subject: 'chemistry',
  objective: 'Plot and compare potentiometric pH titration curves for Strong Acid/Strong Base vs Weak Acid/Strong Base to identify equivalence points and pKa.',
  apparatus: [
    { id: 'meter', name: 'Digital Benchtop pH Meter with Combination Glass Electrode', specs: '0.01 pH resolution, automatic temperature compensation', instructions: 'Calibrate using pH 4.00, 7.00, and 10.00 buffer standards.' },
    { id: 'stirrer', name: 'Magnetic Stirrer & Teflon Stir Bar', specs: 'Variable speed 100 - 1500 RPM', instructions: 'Place stir bar in beaker; adjust speed to smooth vortex.' },
    { id: 'burette', name: '50 mL Precision Glass Burette', specs: '0.05 mL graduations', instructions: 'Fill with 0.100 M NaOH standard.' },
    { id: 'beaker', name: '250 mL Glass Beaker', specs: 'Tall-form beaker', instructions: 'Contains 25.00 mL 0.100 M acid analyte.' },
  ],
  substances: [
    { id: 'naoh', name: 'Sodium Hydroxide Titrant', formula: 'NaOH(aq)', concentrationMolar: 0.100 },
    { id: 'hcl', name: 'Hydrochloric Acid (Strong Acid)', formula: 'HCl(aq)', concentrationMolar: 0.100 },
    { id: 'ch3cooh', name: 'Acetic Acid (Weak Acid, Ka = 1.75×10⁻⁵)', formula: 'CH3COOH(aq)', concentrationMolar: 0.100 },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Calibrate pH meter with standard pH 4.00 and 7.00 buffer solutions.', expectedAction: 'Ensure pH meter reads 7.00 ± 0.02.' },
    { stepNumber: 2, instruction: 'Pipette 25.00 mL 0.100M CH₃COOH into beaker; submerge pH electrode and start magnetic stirrer.', expectedAction: 'Record initial pH at V = 0.00 mL (pH ≈ 2.88).' },
    { stepNumber: 3, instruction: 'Add 0.100M NaOH from burette in 2.0 mL increments from 0 to 20 mL; record pH after each addition.', expectedAction: 'Observe buffer region plateau.' },
    { stepNumber: 4, instruction: 'Near expected equivalence (22.0 to 28.0 mL), add NaOH in small 0.20 mL steps.', expectedAction: 'Capture sharp steep pH jump.' },
    { stepNumber: 5, instruction: 'Continue adding NaOH in 2.0 mL increments up to 40.0 mL to record post-equivalence alkaline region.', expectedAction: 'Complete curve data table.' },
    { stepNumber: 6, instruction: 'Plot pH on y-axis vs Volume NaOH added on x-axis; determine equivalence pH and half-equivalence point where pH = pKa.', expectedAction: 'Extract pKa = 4.76.' },
  ],
  stateEngine: {
    constants: { pKaAcetic: 4.76, cAcid: 0.100, cBase: 0.100, vAcid: 25.0 },
    calculateState: (inputs: Record<string, any>) => {
      const vBaseAdded = Number(inputs.vBaseAdded || 0);
      const acidType = inputs.acidType || 'weak-strong'; // 'strong-strong' | 'weak-strong'
      const vAcid = 25.0;
      const cAcid = 0.100;
      const cBase = 0.100;
      const pKa = 4.76;
      const Ka = Math.pow(10, -pKa);

      const vEquiv = (cAcid * vAcid) / cBase; // 25.0 mL
      let pH = 7.0;
      let region = 'Initial Acid';

      if (acidType === 'strong-strong') {
        if (vBaseAdded < vEquiv) {
          const molesH = (cAcid * vAcid - cBase * vBaseAdded) / 1000.0;
          const totalV = (vAcid + vBaseAdded) / 1000.0;
          pH = -Math.log10(molesH / totalV);
          region = 'Strong Acid Region';
        } else if (Math.abs(vBaseAdded - vEquiv) < 0.01) {
          pH = 7.00;
          region = 'Equivalence Point (pH 7.0)';
        } else {
          const molesOH = (cBase * vBaseAdded - cAcid * vAcid) / 1000.0;
          const totalV = (vAcid + vBaseAdded) / 1000.0;
          pH = 14.0 + Math.log10(molesOH / totalV);
          region = 'Excess Base Region';
        }
      } else { // Weak acid CH3COOH
        if (vBaseAdded === 0) {
          // [H+] = sqrt(Ka * C)
          const hConc = Math.sqrt(Ka * cAcid);
          pH = -Math.log10(hConc);
          region = 'Weak Acid Baseline';
        } else if (vBaseAdded < vEquiv) {
          if (Math.abs(vBaseAdded - vEquiv / 2.0) < 0.2) {
            pH = pKa;
            region = 'Half-Equivalence Point (pH = pKa)';
          } else {
            // Henderson-Hasselbalch: pH = pKa + log([A-]/[HA])
            const vBaseRatio = vBaseAdded / (vEquiv - vBaseAdded);
            pH = pKa + Math.log10(vBaseRatio);
            region = 'Buffer Region';
          }
        } else if (Math.abs(vBaseAdded - vEquiv) < 0.01) {
          // Hydrolysis of conjugate base CH3COO-
          const totalV = (vAcid + vEquiv) / 1000.0;
          const cBaseConj = (cAcid * vAcid / 1000.0) / totalV;
          const Kb = 1e-14 / Ka;
          const ohConc = Math.sqrt(Kb * cBaseConj);
          pH = 14.0 + Math.log10(ohConc);
          region = 'Equivalence Point (Basic pH ~8.72)';
        } else {
          const molesOH = (cBase * vBaseAdded - cAcid * vAcid) / 1000.0;
          const totalV = (vAcid + vBaseAdded) / 1000.0;
          pH = 14.0 + Math.log10(molesOH / totalV);
          region = 'Excess Base Region';
        }
      }

      return {
        vBaseAdded: Number(vBaseAdded.toFixed(2)),
        acidType,
        pH: Number(pH.toFixed(2)),
        vEquiv,
        region,
        pKaExtracted: acidType === 'weak-strong' ? pKa : null,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'vBaseAdded', label: 'Vol NaOH', unit: 'mL', precision: 2 },
      { key: 'pH', label: 'pH', unit: '', precision: 2 },
      { key: 'region', label: 'Equilibrium Region', unit: '', precision: 0 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const v = Number(inputs.vBaseAdded || 0);
      let pH = 2.88;
      if (v > 0 && v < 25) {
        pH = 4.76 + Math.log10(v / (25 - v));
      } else if (v === 25) {
        pH = 8.72;
      } else if (v > 25) {
        pH = 14 + Math.log10(((v - 25) * 0.1 / 1000) / ((25 + v) / 1000));
      }
      return { vBaseAdded: v, pH: Number(pH.toFixed(2)), region: v === 12.5 ? 'Half-Equivalence' : v === 25 ? 'Equivalence' : 'Titration' };
    },
  },
  graph: {
    xAxis: { label: 'Volume 0.1M NaOH Added', unit: 'mL', key: 'vBaseAdded' },
    yAxis: { label: 'pH', unit: '', key: 'pH' },
    expectedSlopeKey: 'Inflection Point dpH/dV',
    expectedSlopeValue: 25.0,
    expectedFormula: 'pH = pK_a + \\log\\frac{[A^-]}{[HA]}',
  },
  mistakes: [
    {
      id: 'uncalibrated-ph-meter',
      name: 'Using Uncalibrated pH Meter',
      triggerCondition: 'inputs.isCalibrated === false',
      consequence: 'Electrode zero offset errors shift entire pH curve vertically by ±0.5 - 1.2 pH units.',
      aiExplanation: 'Always perform two-point or three-point buffer calibration (pH 4.0, 7.0, 10.0) before taking quantitative potentiometric readings.',
    },
  ],
  assessment: [
    { id: 'p1', description: 'Calibrated pH meter using standard buffer solutions', points: 15, verifyCondition: 'isCalibrated === true' },
    { id: 'p2', description: 'Plotted complete sigmoidal pH curve across 0 - 40 mL range', points: 25, verifyCondition: 'data.length >= 15' },
    { id: 'p3', description: 'Identified equivalence point at V = 25.0 mL (pH 8.72 for weak acid)', points: 30, verifyCondition: 'equivIdentified === true' },
    { id: 'p4', description: 'Extracted pKa = 4.76 from half-equivalence volume V = 12.5 mL', points: 30, verifyCondition: 'abs(pKaExtracted - 4.76) < 0.1' },
  ],
  freeMode: {
    objective: 'Determine pKa1 and pKa2 of unknown diprotic acid (e.g. oxalic acid) via double-inflection pH curve.',
    availableApparatus: ['pH meter', 'Burette', 'Unknown diprotic acid', 'NaOH titrant'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate buffer capacity β = dB/dpH of acetate vs phosphate buffer systems.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Low' },
    requiredIdentifications: ['Independent: Buffer ratio [A-]/[HA]', 'Dependent: Buffer capacity β'] },
  smartboardTrigger: {
    detectedLaTeX: ['pH = pK_a + \\log\\left(\\frac{[A^-]}{[HA]}\\right)', 'pK_a = -\\log(K_a)', 'K_a = \\frac{[H^+][A^-]}{[HA]}'],
    conceptKeywords: ['ph curve', 'titration curve', 'buffer region', 'pka', 'equivalence point', 'henderson hasselbalch'],
  },
};
