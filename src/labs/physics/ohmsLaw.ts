import type { ExperimentConfig } from '../types';

export const ohmsLawConfig: ExperimentConfig = {
  id: 'ohms-law',
  title: "Ohm's Law & Resistor Characterization",
  subject: 'physics',
  objective: "Verify Ohm's Law (V = IR) and determine resistance R from the I-V linear characteristic curve.",
  apparatus: [
    { id: 'power', name: 'Variable DC Power Supply', specs: '0 - 12V continuous adjustment, 2A max', instructions: 'Set voltage knob to 0V before closing switch.' },
    { id: 'resistor', name: 'Carbon Film Resistor', specs: 'Nominal R = 100 Ω (±5% tolerance, 0.5W)', instructions: 'Connect in main circuit branch.' },
    { id: 'ammeter', name: 'Digital DC Ammeter', specs: 'Range 0 - 200mA (0.1mA resolution, internal r_a = 0.1Ω)', instructions: 'Connect in series with resistor.' },
    { id: 'voltmeter', name: 'Digital DC Voltmeter', specs: 'Range 0 - 20V (0.01V resolution, internal r_v = 10MΩ)', instructions: 'Connect in parallel across resistor.' },
    { id: 'rheostat', name: 'Wire-wound Rheostat', specs: '0 - 50 Ω variable slider', instructions: 'Use for fine current adjustments.' },
    { id: 'switch', name: 'Single Pole Single Throw Switch', specs: 'Knife switch rated 5A', instructions: 'Keep open while modifying wiring.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Wire circuit in series: Power Supply (+) → Switch → Rheostat → Ammeter → Resistor → (-).', expectedAction: 'Complete main current loop.' },
    { stepNumber: 2, instruction: 'Connect Voltmeter in parallel directly across the 100Ω resistor terminals.', expectedAction: 'Verify parallel voltmeter connection.' },
    { stepNumber: 3, instruction: 'Close switch and set Power Supply output to 1.0 V.', expectedAction: 'Record voltage V and current I.' },
    { stepNumber: 4, instruction: 'Step voltage upward in 1.0V increments (2V, 3V, 4V, 5V, 6V, 7V, 8V).', expectedAction: 'Take paired V and I readings.' },
    { stepNumber: 5, instruction: 'Plot Current I (mA) on y-axis versus Voltage V (V) on x-axis.', expectedAction: 'Plot linear characteristic.' },
    { stepNumber: 6, instruction: 'Calculate resistance R = 1 / slope (or V/I gradient).', expectedAction: 'Determine R in ohms.' },
  ],
  stateEngine: {
    constants: { nominalResistance: 100.0 },
    calculateState: (inputs: Record<string, any>) => {
      const voltageSet = Number(inputs.voltageSet || 0);
      const isShortCircuit = inputs.isShortCircuit === true;
      const isVoltmeterInSeries = inputs.isVoltmeterInSeries === true;
      const isAmmeterInParallel = inputs.isAmmeterInParallel === true;
      const resistance = 100.0;

      if (isShortCircuit) {
        return {
          voltage: voltageSet,
          currentMa: 2000.0, // max overload
          resistanceCalc: 0,
          warning: 'CRITICAL: Short Circuit Detected! High current overload warning.',
        };
      }

      if (isVoltmeterInSeries) {
        // High internal impedance blocks current flow
        return {
          voltage: voltageSet,
          currentMa: 0.001,
          resistanceCalc: Infinity,
          warning: 'Voltmeter connected in series: high resistance blocks current flow.',
        };
      }

      if (isAmmeterInParallel) {
        return {
          voltage: 0.05,
          currentMa: 1500.0,
          resistanceCalc: 0,
          warning: 'Ammeter connected in parallel shorts out resistor component.',
        };
      }

      const currentAmps = voltageSet / resistance;
      const noise = (Math.random() - 0.5) * 0.005; // ±0.5% real instrument jitter
      const measuredCurrentMa = (currentAmps + noise) * 1000.0;
      const measuredVoltage = voltageSet + noise * 10.0;

      return {
        voltage: Number(measuredVoltage.toFixed(2)),
        currentMa: Number(measuredCurrentMa.toFixed(1)),
        currentAmps: Number((measuredCurrentMa / 1000.0).toFixed(4)),
        resistanceCalc: Number((measuredVoltage / (measuredCurrentMa / 1000.0)).toFixed(1)),
        warning: null,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'voltage', label: 'Voltage V', unit: 'V', precision: 2 },
      { key: 'currentMa', label: 'Current I', unit: 'mA', precision: 1 },
      { key: 'currentAmps', label: 'Current I', unit: 'A', precision: 4 },
      { key: 'resistanceCalc', label: 'R = V/I', unit: 'Ω', precision: 1 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const voltage = Number(inputs.voltage || 0);
      const R = 100.0;
      const currentAmps = voltage / R;
      const currentMa = currentAmps * 1000.0;
      return {
        voltage,
        currentMa: Number(currentMa.toFixed(1)),
        currentAmps: Number(currentAmps.toFixed(4)),
        resistanceCalc: Number(R.toFixed(1)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Voltage V', unit: 'V', key: 'voltage' },
    yAxis: { label: 'Current I', unit: 'mA', key: 'currentMa' },
    expectedSlopeKey: '1000/R',
    expectedSlopeValue: 10.0, // 1000/100
    expectedFormula: 'I(mA) = (1000 / R) * V',
  },
  mistakes: [
    {
      id: 'short-circuit',
      name: 'Power Supply Short Circuit',
      triggerCondition: 'inputs.isShortCircuit === true',
      consequence: 'Zero resistance path triggers power supply current limiter and trips fuse.',
      aiExplanation: 'Never connect power supply positive directly to negative without a load resistor to limit current.',
    },
    {
      id: 'voltmeter-in-series',
      name: 'Voltmeter Wired in Series',
      triggerCondition: 'inputs.isVoltmeterInSeries === true',
      consequence: 'High internal resistance (~10MΩ) prevents current flow; ammeter reads zero.',
      aiExplanation: 'Voltmeters must be connected in PARALLEL across components to measure potential difference without disrupting current.',
    },
    {
      id: 'ammeter-in-parallel',
      name: 'Ammeter Wired in Parallel',
      triggerCondition: 'inputs.isAmmeterInParallel === true',
      consequence: 'Low ammeter internal resistance (~0.1Ω) bypasses and shorts out resistor.',
      aiExplanation: 'Ammeters must be connected in SERIES within the circuit line to measure throughput current.',
    },
  ],
  assessment: [
    { id: 'o1', description: 'Voltmeter correctly wired in parallel across resistor', points: 15, verifyCondition: 'voltmeterParallel === true' },
    { id: 'o2', description: 'Ammeter correctly wired in series within circuit', points: 15, verifyCondition: 'ammeterSeries === true' },
    { id: 'o3', description: 'Collected at least 6 paired V-I data points', points: 20, verifyCondition: 'data.length >= 6' },
    { id: 'o4', description: 'Plotted linear I vs V characteristic graph', points: 20, verifyCondition: 'graphLinearityScore > 0.99' },
    { id: 'o5', description: 'Calculated resistance R = 100 Ω within ±2% accuracy', points: 20, verifyCondition: 'abs(calculatedR - 100) < 2.0' },
    { id: 'o6', description: 'Stated units correctly (V, mA, Ω)', points: 10, verifyCondition: 'unitsCorrect === true' },
  ],
  freeMode: {
    objective: 'Identify an unknown electronic component (Ohmic resistor, filament lamp, or diode) from its I-V curve.',
    availableApparatus: ['DC power supply (0-15V)', 'Multimeters', 'Unknown components A, B, C', 'Rheostat', 'Connecting leads'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate how temperature rise affects resistance in carbon film vs tungsten filament loads.',
    constraints: { timeMinutes: 30, budget: 120, safetyLevel: 'Medium (Thermal Risk)' },
    requiredIdentifications: ['Independent variable: Applied voltage / Power dissipated', 'Dependent variable: Component resistance', 'Control variable: Ambient temperature'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['V = IR', 'I = \\frac{V}{R}', 'R = \\frac{V}{I}', 'P = VI = I^2 R'],
    conceptKeywords: ['ohm', 'ohms law', 'resistance', 'voltage', 'current', 'ammeter', 'voltmeter'],
  },
};
