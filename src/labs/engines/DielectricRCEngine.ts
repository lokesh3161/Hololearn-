/**
 * Dielectric Constant & RC Charging/Discharging Physics Engine
 * HoloLearn Virtual Physics Laboratory — Experiment 09
 */

import type {
  DielectricMaterial,
  CapacitorState,
  RCCircuitState,
  Reading,
  ExperimentalResult,
  LabEvent,
  MisconceptionWarning,
  ExperimentConfig,
} from '../types/dielectricExperimentTypes';

export const EPSILON_0 = 8.854187817e-12; // Permittivity of free space (F/m)

export const DEFAULT_MATERIALS: DielectricMaterial[] = [
  { id: 'air', name: 'Air', relativePermittivity: 1.0, typicalRange: [1.0, 1.0], colorHex: '#38bdf8' },
  { id: 'paper', name: 'Paper', relativePermittivity: 3.5, typicalRange: [3.0, 4.0], colorHex: '#fef08a' },
  { id: 'glass', name: 'Glass', relativePermittivity: 7.0, typicalRange: [5.0, 10.0], colorHex: '#a7f3d0' },
  { id: 'mica', name: 'Mica', relativePermittivity: 6.0, typicalRange: [5.0, 8.0], colorHex: '#f472b6' },
  { id: 'ceramic', name: 'Ceramic', relativePermittivity: 10.0, typicalRange: [8.0, 12.0], colorHex: '#fb923c' },
  { id: 'plastic', name: 'Plastic', relativePermittivity: 2.2, typicalRange: [2.0, 3.0], colorHex: '#c084fc' },
  { id: 'custom', name: 'Custom Dielectric', relativePermittivity: 4.0, typicalRange: [1.0, 15.0], colorHex: '#e2e8f0', isCustom: true },
];

export const DEFAULT_DIELECTRIC_CONFIG: ExperimentConfig = {
  id: 'dielectric-constant-rc',
  plate: {
    areaRangeM2: [0.01, 0.05], // 100 cm² to 500 cm²
    separationRangeMm: [1, 10], // 1 mm to 10 mm
  },
  supply: { voltageRangeV: [1, 12] },
  resistor: { ohmsRangeOhm: [10000, 100000] }, // 10 kΩ to 100 kΩ
  materials: DEFAULT_MATERIALS,
  sampling: {
    intervalSeconds: 1.0,
  },
  noise: {
    enabled: false,
    voltageNoiseFractionOfReading: 0.01,
    timingNoiseSeconds: 0.1,
  },
};

export class DielectricRCEngine {
  /**
   * Calculate effective relative permittivity eps_r based on dielectric insertion fraction f (0.0 to 1.0)
   */
  static calculateEffectiveEpsR(
    capState: CapacitorState,
    materials: DielectricMaterial[] = DEFAULT_MATERIALS
  ): number {
    const mat = materials.find((m) => m.id === capState.dielectric.materialId) || materials[0];
    const epsR_mat = mat.isCustom && capState.customPermittivity ? capState.customPermittivity : mat.relativePermittivity;
    const f = Math.max(0.0, Math.min(1.0, capState.dielectric.insertionFraction));

    // Linear blending: effective eps_r = 1.0 + f * (eps_r_mat - 1.0)
    const effectiveEpsR = 1.0 + f * (epsR_mat - 1.0);
    return Number(effectiveEpsR.toFixed(3));
  }

  /**
   * Geometric Capacitance C = eps0 * effectiveEpsR * A / d (Scaled to uF range for bench timing)
   * Air baseline C0 = 20.0 uF (0.000020 F) when A = 0.02 m² & d = 0.002 m
   */
  static calculateGeometricCapacitanceF(
    capState: CapacitorState,
    materials: DielectricMaterial[] = DEFAULT_MATERIALS
  ): number {
    const effectiveEpsR = DielectricRCEngine.calculateEffectiveEpsR(capState, materials);
    // Base scaling factor converts pF geometric ratio to 20 uF Air baseline
    const baseC_F = (EPSILON_0 * effectiveEpsR * capState.areaM2) / capState.separationM;
    const benchCapacitanceF = baseC_F * 2.25885e5; // Scaled so Air = 20 uF
    return benchCapacitanceF;
  }

  /**
   * Calculate RC Time Constant tau = R * C (seconds)
   */
  static calculateTimeConstantSeconds(
    capState: CapacitorState,
    resistanceOhm: number,
    materials: DielectricMaterial[] = DEFAULT_MATERIALS
  ): number {
    const C_F = DielectricRCEngine.calculateGeometricCapacitanceF(capState, materials);
    return resistanceOhm * C_F;
  }

  /**
   * Calculate Live Capacitor Voltage V(t) & Current I(t)
   * Charging: V(t) = V0(1 - e^-t/tau), I(t) = +(V0 - V(t))/R = +(V0/R)e^-t/tau
   * Discharging: V(t) = V0 e^-t/tau, I(t) = -(V(t)/R) = -(V0/R)e^-t/tau
   */
  static calculateRCVoltageAndCurrent(
    capState: CapacitorState,
    circuitState: RCCircuitState,
    tSeconds: number,
    materials: DielectricMaterial[] = DEFAULT_MATERIALS
  ): { voltageV: number; currentA: number; timeConstantS: number } {
    if (!circuitState.switchClosed || circuitState.mode === 'idle') {
      return { voltageV: 0.0, currentA: 0.0, timeConstantS: 0.0 };
    }

    const V0 = circuitState.supplyVoltageV;
    const R = Math.max(100, circuitState.resistanceOhm);
    const tau = DielectricRCEngine.calculateTimeConstantSeconds(capState, R, materials);

    let voltageV = 0.0;
    let currentA = 0.0;

    if (circuitState.mode === 'charging') {
      voltageV = V0 * (1.0 - Math.exp(-tSeconds / tau));
      currentA = (V0 - voltageV) / R; // Starts at +V0/R, exponentially decays to 0
    } else if (circuitState.mode === 'discharging') {
      voltageV = V0 * Math.exp(-tSeconds / tau);
      currentA = -(voltageV / R); // Starts at -V0/R, exponentially decays to 0
    }

    return {
      voltageV: Number(voltageV.toFixed(3)),
      currentA: Number(currentA.toFixed(8)),
      timeConstantS: Number(tau.toFixed(4)),
    };
  }

  /**
   * Format current in mA with proper signs (+ for charging, - for discharging) & dynamic precision
   */
  static formatCurrentmA(currentA: number): string {
    const currentmA = currentA * 1000.0;
    const absmA = Math.abs(currentmA);
    if (absmA < 1e-7) return '0.000 mA';
    const sign = currentmA > 0 ? '+' : '-';
    if (absmA >= 0.001) {
      return `${sign}${absmA.toFixed(3)} mA`;
    }
    return `${sign}${absmA.toExponential(2)} mA`;
  }

  /**
   * Linear Regression Fit on Discharge Readings: ln(V / V0) vs t
   * Slope m = -1 / (R * C) => C_exp = -1 / (R * m)
   */
  static calculateDischargeLinearRegression(
    readings: Reading[],
    resistanceOhm: number,
    V0: number
  ): {
    slope: number;
    rSquared: number;
    experimentalCapacitanceF: number;
    experimentalTimeConstantS: number;
  } {
    const dischargeReadings = readings.filter((r) => r.mode === 'discharging' && r.voltageV > 0.01);

    if (dischargeReadings.length < 2) {
      return {
        slope: 0.0,
        rSquared: 1.0,
        experimentalCapacitanceF: 0.0,
        experimentalTimeConstantS: 0.0,
      };
    }

    const tValues = dischargeReadings.map((r) => r.tSeconds);
    const lnValues = dischargeReadings.map((r) => Math.log(r.voltageV / V0));
    const n = dischargeReadings.length;

    const sumT = tValues.reduce((a, b) => a + b, 0);
    const sumLn = lnValues.reduce((a, b) => a + b, 0);
    const sumTLn = dischargeReadings.reduce((acc, r) => acc + r.tSeconds * Math.log(r.voltageV / V0), 0);
    const sumTSq = tValues.reduce((acc, t) => acc + t * t, 0);

    const slope = (n * sumTLn - sumT * sumLn) / (n * sumTSq - sumT * sumT);
    const intercept = (sumLn - slope * sumT) / n;

    // Calculate R²
    const meanLn = sumLn / n;
    const ssTotal = lnValues.reduce((acc, y) => acc + Math.pow(y - meanLn, 2), 0);
    const ssRes = dischargeReadings.reduce((acc, r) => {
      const yPred = slope * r.tSeconds + intercept;
      return acc + Math.pow(Math.log(r.voltageV / V0) - yPred, 2);
    }, 0);

    const rSquared = ssTotal === 0 ? 1.0 : Math.max(0, Math.min(1.0, 1 - ssRes / ssTotal));

    // Experimental Capacitance C_exp = -1 / (R * slope)
    const C_exp = slope !== 0 ? -1.0 / (resistanceOhm * slope) : 0.0;
    const tau_exp = C_exp * resistanceOhm;

    return {
      slope: Number(slope.toFixed(5)),
      rSquared: Number(rSquared.toFixed(4)),
      experimentalCapacitanceF: Math.abs(C_exp),
      experimentalTimeConstantS: Math.abs(tau_exp),
    };
  }

  /**
   * Grounded Misconception Detection
   */
  static detectMisconceptions(
    readings: Reading[],
    events: LabEvent[],
    circuitState: RCCircuitState
  ): MisconceptionWarning[] {
    const warnings: MisconceptionWarning[] = [];

    // Open switch reading attempt
    if (!circuitState.switchClosed && readings.length === 0) {
      warnings.push({
        id: 'switch-open-attempt',
        title: 'Circuit Switch Open',
        message: 'The charging/discharging switch is open. Close the switch to initiate current flow.',
        eventTrigger: 'switch_open',
        severity: 'info',
      });
    }

    // Checking for charging readings assigned to discharge calculations
    const chargingInDischarge = readings.filter((r) => r.mode === 'charging');
    if (chargingInDischarge.length > 5) {
      warnings.push({
        id: 'mode-equation-mismatch',
        title: 'Charging Curve Used for Discharge Slope',
        message: 'You have recorded charging data points. Ensure you perform discharge measurements to calculate linear slope ln(V/V0) vs t.',
        eventTrigger: 'reading_recorded',
        severity: 'warning',
      });
    }

    return warnings;
  }
}
