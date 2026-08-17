import type { ExperimentConfig } from '../types';

export const specificHeatConfig: ExperimentConfig = {
  id: 'specific-heat',
  title: 'Specific Heat Capacity of Water & Electrical Heating',
  subject: 'physics',
  objective: 'Determine specific heat capacity c of water using electrical heating Q = VIt = mcΔT.',
  apparatus: [
    { id: 'calorimeter', name: 'Insulated Copper Calorimeter with Lid', specs: 'Polystyrene outer jacket, mass m_c = 120g', instructions: 'Insulates liquid to minimize ambient heat loss.' },
    { id: 'heater', name: 'Immersion Electric Heating Coil', specs: '12V DC, 36W (3A nominal current)', instructions: 'Submerge fully in water before powering.' },
    { id: 'thermometer', name: 'Digital Precision Thermometer Probe', specs: '0.1°C resolution (-10°C to 110°C)', instructions: 'Place in water through calorimeter lid port.' },
    { id: 'voltmeter', name: 'Digital DC Voltmeter', specs: '0 - 20V range', instructions: 'Connect in parallel across heater terminals.' },
    { id: 'ammeter', name: 'Digital DC Ammeter', specs: '0 - 5A range', instructions: 'Connect in series with heater coil.' },
    { id: 'balance', name: 'Electronic Top-pan Balance', specs: '0.01g precision', instructions: 'Measure mass of water.' },
    { id: 'stopwatch', name: 'Digital Timer', specs: '1s interval alert', instructions: 'Record temperature every 30 seconds for 10 minutes.' },
  ],
  procedure: [
    { stepNumber: 1, instruction: 'Weigh empty calorimeter cup (m₁ = 120.0 g).', expectedAction: 'Tare balance and record m1.' },
    { stepNumber: 2, instruction: 'Add ~200 mL distilled water and reweigh (m₂ = 320.0 g); water mass m = 200.0 g.', expectedAction: 'Calculate m = m2 - m1.' },
    { stepNumber: 3, instruction: 'Insert immersion heater and stirrer into water; record initial temperature T₀.', expectedAction: 'Record baseline T0 (~22.0°C).' },
    { stepNumber: 4, instruction: 'Turn on 12V power supply and start timer simultaneously.', expectedAction: 'Observe V and I values.' },
    { stepNumber: 5, instruction: 'Record Voltmeter V (V) and Ammeter I (A) readings every 30 seconds.', expectedAction: 'Compute power P = V * I.' },
    { stepNumber: 6, instruction: 'Stir water continuously and record temperature T every 30 seconds for 10 minutes (600s).', expectedAction: 'Build T vs time log.' },
    { stepNumber: 7, instruction: 'Calculate total electrical energy supplied Q = V * I * t.', expectedAction: 'Compute Q in Joules.' },
    { stepNumber: 8, instruction: 'Calculate c_water = (V * I * t - m_c * c_cu * ΔT) / (m * ΔT).', expectedAction: 'Determine c in J/(kg·°C).' },
  ],
  stateEngine: {
    constants: { cNominal: 4184.0, cCu: 385.0, ambientTemp: 22.0 },
    calculateState: (inputs: Record<string, any>) => {
      const timeSec = Number(inputs.timeSec || 0);
      const voltage = Number(inputs.voltage || 12.0);
      const current = Number(inputs.current || 3.0);
      const massWaterKg = Number(inputs.massWaterKg || 0.20);
      const massCalorimeterKg = 0.12;
      const isStirred = inputs.isStirred !== false;
      const ambientTemp = 22.0;
      const cWater = 4184.0;
      const cCu = 385.0;

      const power = voltage * current;
      const energyJ = power * timeSec;
      const thermalCapacity = massWaterKg * cWater + massCalorimeterKg * cCu;

      // Ideal temperature rise
      const idealDeltaT = energyJ / thermalCapacity;
      let currentTemp = ambientTemp + idealDeltaT;

      // Newton's law of cooling heat loss: dQ/dt = k * (T - T_amb)
      const heatLossFactor = 0.00015 * (currentTemp - ambientTemp) * timeSec;
      currentTemp -= heatLossFactor;

      if (!isStirred) {
        // Temperature stratification noise if not stirred
        currentTemp += (Math.random() - 0.5) * 2.5;
      }

      return {
        timeSec,
        voltage,
        current,
        powerWatts: Number(power.toFixed(1)),
        energyJoules: Number(energyJ.toFixed(0)),
        temperatureC: Number(currentTemp.toFixed(1)),
        deltaTC: Number((currentTemp - ambientTemp).toFixed(1)),
        calculatedC: Number((energyJ / (massWaterKg * Math.max(0.1, currentTemp - ambientTemp))).toFixed(0)),
        isStirred,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'timeSec', label: 'Time t', unit: 's', precision: 0 },
      { key: 'voltage', label: 'Voltage V', unit: 'V', precision: 1 },
      { key: 'current', label: 'Current I', unit: 'A', precision: 2 },
      { key: 'energyJoules', label: 'Energy Q', unit: 'J', precision: 0 },
      { key: 'temperatureC', label: 'Temperature T', unit: '°C', precision: 1 },
      { key: 'deltaTC', label: 'Temp Rise ΔT', unit: '°C', precision: 1 },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      const timeSec = Number(inputs.timeSec || 0);
      const voltage = 12.0;
      const current = 3.0;
      const power = voltage * current;
      const energyJoules = power * timeSec;
      const massWaterKg = 0.20;
      const massCuKg = 0.12;
      const thermalCapacity = massWaterKg * 4184.0 + massCuKg * 385.0;
      const deltaT = energyJoules / thermalCapacity;
      const temp = 22.0 + deltaT;
      return {
        timeSec,
        voltage,
        current,
        energyJoules: Number(energyJoules.toFixed(0)),
        temperatureC: Number(temp.toFixed(1)),
        deltaTC: Number(deltaT.toFixed(1)),
      };
    },
  },
  graph: {
    xAxis: { label: 'Time t', unit: 's', key: 'timeSec' },
    yAxis: { label: 'Temperature T', unit: '°C', key: 'temperatureC' },
    expectedSlopeKey: 'P / (m*c)',
    expectedSlopeValue: 36.0 / (0.2 * 4184.0 + 0.12 * 385.0),
    expectedFormula: 'T(t) = T_0 + \\frac{V I}{m c} t',
  },
  mistakes: [
    {
      id: 'no-stirring',
      name: 'Failure to Stir Liquid Continuously',
      triggerCondition: 'inputs.isStirred === false',
      consequence: 'Thermal stratification causes thermometer probe to measure local hot spots around heater coil.',
      aiExplanation: 'Stirring ensures uniform thermal distribution throughout the liquid volume so the thermometer measures true average temperature.',
    },
    {
      id: 'heater-exposure',
      name: 'Operating Heater Above Liquid Level',
      triggerCondition: 'inputs.isHeaterExposed === true',
      consequence: 'Heater coil overheats rapidly in air; thermal energy is lost directly to ambient atmosphere.',
      aiExplanation: 'Submerge the immersion heating element completely before switching on electrical current.',
    },
    {
      id: 'ignoring-calorimeter-mass',
      name: 'Ignoring Calorimeter Vessel Thermal Capacity',
      triggerCondition: 'inputs.includeCalorimeter === false',
      consequence: 'Systematically overestimates c_water because heat absorbed by the copper vessel is neglected.',
      aiExplanation: 'Total heat absorbed Q = (m_water * c_water + m_calorimeter * c_copper) * ΔT.',
    },
  ],
  assessment: [
    { id: 's1', description: 'Accurately measured mass of water m = m2 - m1', points: 15, verifyCondition: 'massCalculatedCorrectly === true' },
    { id: 's2', description: 'Monitored V and I continuously to verify constant 36W power', points: 15, verifyCondition: 'powerMonitored === true' },
    { id: 's3', description: 'Recorded temperature every 30s for full 10-minute interval', points: 20, verifyCondition: 'data.length >= 10' },
    { id: 's4', description: 'Stirred solution continuously throughout heating', points: 15, verifyCondition: 'isStirred === true' },
    { id: 's5', description: 'Accounted for heat capacity of copper vessel', points: 15, verifyCondition: 'calorimeterCorrectionApplied === true' },
    { id: 's6', description: 'Calculated c = 4184 J/(kg·°C) within ±5% experimental error', points: 20, verifyCondition: 'abs(calculatedC - 4184) < 210' },
  ],
  freeMode: {
    objective: 'Identify an unknown liquid sample by determining its specific heat capacity c.',
    availableApparatus: ['Calorimeter set', 'Unknown liquids A, B, C', 'Immersion heater', 'Digital thermometer', 'Joulemeter'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate how thermal insulation thickness reduces Newton cooling loss rates in calorimetry.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Medium (Heat Risk)' },
    requiredIdentifications: ['Independent variable: Insulation jacket thickness', 'Dependent variable: Cooling rate dT/dt', 'Control variable: Initial water temperature'],
  },
  smartboardTrigger: {
    detectedLaTeX: ['Q = mc\\Delta T', 'Q = V I t', 'c = \\frac{V I t}{m \\Delta T}', 'P = \\frac{Q}{t} = V I'],
    conceptKeywords: ['specific heat capacity', 'calorimetry', 'heating', 'heat energy', 'temperature rise', 'thermodynamics'],
  },
};
