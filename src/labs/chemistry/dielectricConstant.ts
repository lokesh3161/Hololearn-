import type { ExperimentConfig } from '../types';

export const dielectricConstantConfig: ExperimentConfig = {
  id: 'dielectric-constant-rc',
  title: 'Determination of Dielectric Constant Using Charging and Discharging Method',
  subject: 'physics',
  objective:
    'Experimentally determine the dielectric constant (relative permittivity) of materials by analyzing capacitor charging and discharging RC curves.',

  apparatus: [
    { id: 'dc-power-supply', name: 'DC Variable Power Supply', specs: '1 - 12 V regulated DC voltage source', instructions: 'Set supply voltage V0' },
    { id: 'parallel-capacitor', name: 'Parallel Plate Capacitor', specs: 'Variable plate area A & separation d', instructions: 'Adjust plate geometry and insert dielectric' },
    { id: 'dielectric-slabs', name: 'Dielectric Material Set', specs: 'Glass, Paper, Mica, Ceramic, Plastic, Custom', instructions: 'Drag dielectric slab into capacitor gap' },
    { id: 'resistor-box', name: 'Precision Resistor Box', specs: '10 kΩ - 100 kΩ selectable resistance', instructions: 'Set circuit resistance R' },
    { id: 'spdt-switch', name: 'SPDT Charge/Discharge Switch', specs: 'Single-pole double-throw switch', instructions: 'Toggle between Charge and Discharge modes' },
    { id: 'voltmeter', name: 'Digital Voltmeter', specs: 'High-impedance voltage meter across capacitor', instructions: 'Measure live capacitor voltage V(t)' },
    { id: 'ammeter', name: 'Microammeter', specs: 'Series current meter (μA / mA)', instructions: 'Measure live charging/discharging current I(t)' },
    { id: 'stopwatch', name: 'Digital Precision Stopwatch', specs: '0.01 s least-count timer', instructions: 'Track elapsed time t' },
  ],

  substances: [
    { id: 'glass-slab', name: 'Glass Slab (εr = 7.0)', formula: 'Glass', initialColor: '#a7f3d0' },
    { id: 'paper-slab', name: 'Paper Slab (εr = 3.5)', formula: 'Paper', initialColor: '#fef08a' },
    { id: 'mica-slab', name: 'Mica Slab (εr = 6.0)', formula: 'Mica', initialColor: '#f472b6' },
    { id: 'ceramic-slab', name: 'Ceramic Slab (εr = 10.0)', formula: 'Ceramic', initialColor: '#fb923c' },
  ],

  procedure: [
    { stepNumber: 1, instruction: 'Identify the parallel-plate capacitor, DC power supply, resistor box, and SPDT switch.', expectedAction: 'Inspect Apparatus' },
    { stepNumber: 2, instruction: 'Set capacitor plate area A = 200 cm² (0.02 m²) and separation d = 2.0 mm (0.002 m).', expectedAction: 'Set Plate Geometry' },
    { stepNumber: 3, instruction: 'Select Air (no dielectric) as the initial material baseline.', expectedAction: 'Select Air Material' },
    { stepNumber: 4, instruction: 'Set supply voltage V0 = 10 V and circuit resistance R = 50 kΩ.', expectedAction: 'Set V0 & R' },
    { stepNumber: 5, instruction: 'Connect voltmeter across capacitor and ammeter in series.', expectedAction: 'Connect Circuit' },
    { stepNumber: 6, instruction: 'Toggle SPDT switch to CHARGE position and observe exponential voltage rise V(t).', expectedAction: 'Charge Capacitor' },
    { stepNumber: 7, instruction: 'Allow capacitor to fully charge to 10 V.', expectedAction: 'Full Charge' },
    { stepNumber: 8, instruction: 'Toggle SPDT switch to DISCHARGE position and record V(t) at 1-second intervals.', expectedAction: 'Record Discharge Data' },
    { stepNumber: 9, instruction: 'Inspect the ln(V/V0) vs t linear graph to determine slope m and baseline capacitance C_air.', expectedAction: 'Analyze Air Graph' },
    { stepNumber: 10, instruction: 'Select a dielectric slab (e.g. Glass, Paper, Mica, Ceramic) from the material shelf.', expectedAction: 'Select Dielectric' },
    { stepNumber: 11, instruction: 'Drag and fully insert the dielectric slab into the capacitor gap.', expectedAction: 'Insert Dielectric' },
    { stepNumber: 12, instruction: 'Repeat the CHARGE cycle until fully charged.', expectedAction: 'Re-charge Capacitor' },
    { stepNumber: 13, instruction: 'Toggle to DISCHARGE position and record V(t) data with dielectric.', expectedAction: 'Record Dielectric Discharge' },
    { stepNumber: 14, instruction: 'Inspect the new ln(V/V0) vs t linear fit slope to derive C_dielectric.', expectedAction: 'Determine C_dielectric' },
    { stepNumber: 15, instruction: 'Calculate experimental dielectric constant εr = C_dielectric / C_air and compare vs reference value.', expectedAction: 'Calculate εr' },
    { stepNumber: 16, instruction: 'Generate and review formal laboratory report and error analysis.', expectedAction: 'Generate Report' },
  ],

  stateEngine: {
    calculateState: (inputs: Record<string, any>) => inputs,
  },

  dataTable: {
    columns: [
      { key: 't', label: 'Time (t)', unit: 's' },
      { key: 'mode', label: 'Mode', unit: 'text' },
      { key: 'material', label: 'Material', unit: 'text' },
      { key: 'voltage', label: 'Voltage V(t)', unit: 'V' },
      { key: 'current', label: 'Current I(t)', unit: 'mA' },
      { key: 'capacitance', label: 'Capacitance C', unit: 'nF' },
      { key: 'tau', label: 'Time Const τ', unit: 's' },
    ],
    calculateRow: (inputs: Record<string, any>) => inputs,
  },

  graph: {
    xAxis: { label: 'Time t', unit: 's', key: 'tSeconds' },
    yAxis: { label: 'Voltage V(t)', unit: 'V', key: 'voltageV' },
  },

  mistakes: [
    { id: 'open-switch', name: 'Switch Open', triggerCondition: 'Attempting to measure when switch is open', consequence: 'No current flow', aiExplanation: 'Close the SPDT switch to CHARGE or DISCHARGE to energize the RC circuit.' },
  ],

  assessment: [
    { id: 'c1', description: 'What is the physical effect of inserting a dielectric into a capacitor?', points: 10, verifyCondition: 'dielectric_effect_known' },
  ],

  freeMode: {
    objective: 'Explore capacitor charging and discharging with various dielectric materials.',
    availableApparatus: ['dc-power-supply', 'parallel-capacitor', 'dielectric-slabs', 'resistor-box', 'spdt-switch', 'voltmeter', 'ammeter', 'stopwatch'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },

  researchMode: {
    scientificQuestion: 'Determine relative permittivity of dielectric materials using RC curve slope analysis.',
    constraints: {
      timeMinutes: 30,
      budget: 500,
      safetyLevel: 'Standard',
    },
    requiredIdentifications: ['Capacitance C = -1/(R*slope)', 'Dielectric Constant εr = C_dielectric / C_air'],
  },

  smartboardTrigger: {
    detectedLaTeX: ['V(t) = V_0 (1 - e^{-t/RC})', 'V(t) = V_0 e^{-t/RC}', '\\tau = RC', '\\varepsilon_r = \\frac{C_d}{C_0}'],
    conceptKeywords: ['Dielectric Constant', 'Capacitor Charging', 'Capacitor Discharging', 'Time Constant'],
  },
};
