import type { ExperimentConfig } from '../types';

export const careyFosterBridgeConfig: ExperimentConfig = {
  id: 'carey-foster-bridge',
  title: "Verification of Laws of Series and Parallel Combination of Resistances by Carey Foster's Bridge Method",
  subject: 'physics',
  objective:
    "Accurately determine unknown resistances and verify series (Rs = R1 + R2) and parallel (Rp = R1*R2/(R1+R2)) combination laws using Carey Foster's bridge method.",

  apparatus: [
    { id: 'carey-foster-bridge', name: 'Carey Foster Bridge Rail', specs: '100 cm meter scale with uniform manganin wire', instructions: 'Inspect Carey Foster bridge wire' },
    { id: 'galvanometer', name: 'Galvanometer', specs: 'Center-zero analog pointer (-30 to +30 divs)', instructions: 'Observe zero deflection' },
    { id: 'commutator', name: 'Commutator Switch', specs: 'Four-terminal reversal key', instructions: 'Reverse resistance arms P and Y' },
    { id: 'resistance-box', name: 'Resistance Box (P)', specs: 'Precision standard 1 - 100 Ω', instructions: 'Set standard P resistance' },
    { id: 'resistors', name: 'Resistor Set (R1, R2, R3)', specs: 'R1 = 2.0 Ω, R2 = 3.0 Ω, R3 = 5.0 Ω', instructions: 'Connect resistors in Y gap' },
    { id: 'plug-key', name: 'Battery Plug Key', specs: 'Heavy brass plug key', instructions: 'Energize bridge circuit' },
    { id: 'jockey', name: 'Knife-Edge Jockey', specs: 'Brass sliding contact with position scale', instructions: 'Traverse along wire to find null' },
  ],

  substances: [
    { id: 'r1', name: 'Resistor R1', formula: '2.0 Ω', initialColor: '#06b6d4' },
    { id: 'r2', name: 'Resistor R2', formula: '3.0 Ω', initialColor: '#f59e0b' },
    { id: 'r3', name: 'Resistor R3', formula: '5.0 Ω', initialColor: '#10b981' },
  ],

  procedure: [
    { stepNumber: 1, instruction: 'Inspect Carey Foster bridge wire and verify resistance per unit length (r = 0.05 Ω/cm).', expectedAction: 'Inspect Bridge Rail' },
    { stepNumber: 2, instruction: 'Choose Series mode (Rs = R1 + R2) or Parallel mode (Rp = R1*R2/(R1+R2)).', expectedAction: 'Select Mode' },
    { stepNumber: 3, instruction: 'Connect selected resistors in the unknown gap Y of the bridge.', expectedAction: 'Connect Resistors' },
    { stepNumber: 4, instruction: 'Set standard resistance box P close to expected Y.', expectedAction: 'Set P Resistance' },
    { stepNumber: 5, instruction: 'Close the plug key to energize the circuit.', expectedAction: 'Close Plug Key' },
    { stepNumber: 6, instruction: 'Slide the jockey along the wire to find null galvanometer deflection.', expectedAction: 'Move Jockey' },
    { stepNumber: 7, instruction: 'When galvanometer reads 0, record initial balance length l1.', expectedAction: 'Record l1' },
    { stepNumber: 8, instruction: 'Reverse the commutator switch to swap P and Y resistance arms.', expectedAction: 'Reverse Commutator' },
    { stepNumber: 9, instruction: 'Slide jockey to find new zero deflection position l2.', expectedAction: 'Move Jockey' },
    { stepNumber: 10, instruction: 'Record reversed balance length l2.', expectedAction: 'Record l2' },
    { stepNumber: 11, instruction: 'Compute Δl = l2 - l1 and experimental resistance Y = P + r*Δl.', expectedAction: 'Calculate Y' },
    { stepNumber: 12, instruction: 'Compare experimental Y against theoretical Rs or Rp value.', expectedAction: 'Compare Values' },
    { stepNumber: 13, instruction: 'Switch to Parallel combination mode and repeat measurement procedure.', expectedAction: 'Repeat for Parallel' },
    { stepNumber: 14, instruction: 'Verify both series and parallel combination laws from trial data.', expectedAction: 'Verify Laws' },
    { stepNumber: 15, instruction: 'Inspect Galvanometer Deflection vs Jockey Position zero-crossing graph.', expectedAction: 'View Graph' },
    { stepNumber: 16, instruction: 'Calculate absolute and percentage error for all trials.', expectedAction: 'Error Analysis' },
    { stepNumber: 17, instruction: 'Generate and review formal laboratory report.', expectedAction: 'Generate Report' },
  ],

  stateEngine: {
    calculateState: (inputs: Record<string, any>) => inputs,
  },

  dataTable: {
    columns: [
      { key: 'trial', label: 'Trial', unit: '#' },
      { key: 'mode', label: 'Mode', unit: 'text' },
      { key: 'l1', label: 'l1', unit: 'cm' },
      { key: 'l2', label: 'l2', unit: 'cm' },
      { key: 'deltaL', label: 'Δl', unit: 'cm' },
      { key: 'rExp', label: 'R_exp', unit: 'Ω' },
      { key: 'rTheo', label: 'R_theo', unit: 'Ω' },
      { key: 'errorPct', label: 'Error', unit: '%' },
    ],
    calculateRow: (inputs: Record<string, any>) => inputs,
  },

  graph: {
    xAxis: { label: 'Jockey Position', unit: 'cm', key: 'jockeyPositionCm' },
    yAxis: { label: 'Deflection', unit: 'div', key: 'galvanometerDeflection' },
  },

  mistakes: [
    { id: 'open-key', name: 'Open Key', triggerCondition: 'Key open during measurement', consequence: 'No deflection', aiExplanation: 'Plug key is open. Close key to energize circuit.' },
  ],

  assessment: [
    { id: 'c1', description: 'What formula gives experimental resistance Y in Carey Foster’s bridge?', points: 10, verifyCondition: 'y_formula_known' },
  ],

  freeMode: {
    objective: 'Explore Carey Foster bridge circuit in free mode.',
    availableApparatus: ['carey-foster-bridge', 'galvanometer', 'commutator', 'resistance-box', 'resistors', 'plug-key', 'jockey'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },

  researchMode: {
    scientificQuestion: "Verify series and parallel resistance laws using Carey Foster's bridge.",
    constraints: {
      timeMinutes: 30,
      budget: 500,
      safetyLevel: 'Standard',
    },
    requiredIdentifications: ['Series Law Rs = R1 + R2', 'Parallel Law Rp = R1*R2/(R1+R2)'],
  },

  smartboardTrigger: {
    detectedLaTeX: ['\\Delta R = r (l_2 - l_1)', 'Y = P + r(l_2 - l_1)'],
    conceptKeywords: ["Carey Foster's Bridge", 'Series Resistance', 'Parallel Resistance'],
  },
};
