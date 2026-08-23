import type {
  WireSpec,
  DiscSpec,
  SlottedMassSpec,
  ScrewGaugeReading,
  OscillationState,
  TorsionalTrial,
  TorsionalRegressionResult,
  MisconceptionWarning,
} from '../types/torsionalPendulumTypes';

export interface WireMaterial {
  id: string;
  name: string;
  rigidityModulusGPa: number; // reference G in GPa
  densityKgM3: number;
  colorHex: string;
}

export const WIRE_MATERIALS: WireMaterial[] = [
  { id: 'steel', name: 'Steel Wire', rigidityModulusGPa: 79.3, densityKgM3: 7850, colorHex: '#94a3b8' },
  { id: 'brass', name: 'Brass Wire', rigidityModulusGPa: 37.0, densityKgM3: 8500, colorHex: '#facc15' },
  { id: 'copper', name: 'Copper Wire', rigidityModulusGPa: 45.0, densityKgM3: 8960, colorHex: '#fb923c' },
  { id: 'aluminum', name: 'Aluminum Wire', rigidityModulusGPa: 26.0, densityKgM3: 2700, colorHex: '#cbd5e1' },
  { id: 'iron', name: 'Iron Wire', rigidityModulusGPa: 52.0, densityKgM3: 7870, colorHex: '#64748b' },
];

export class TorsionalPendulumEngine {
  /**
   * Calculate Polar Second Moment of Area J = pi * d^4 / 32 (m^4)
   */
  static calculatePolarMomentJ(diameterM: number): number {
    return (Math.PI * Math.pow(diameterM, 4)) / 32;
  }

  /**
   * Calculate Torsional Rigidity Constant C = G * J / L (N*m/rad)
   * G in Pascals (GPa * 1e9), d in meters, L in meters
   */
  static calculateTorsionalConstantC(
    wire: WireSpec,
    customG_GPa?: number
  ): number {
    const G_Pa = (customG_GPa ?? wire.referenceG_GPa) * 1e9;
    const dM = wire.diameterMm / 1000.0;
    const J = TorsionalPendulumEngine.calculatePolarMomentJ(dM);
    const C = (G_Pa * J) / Math.max(0.1, wire.lengthM);
    return C;
  }

  /**
   * Calculate Total Moment of Inertia I = I_disc + 2 * m * r^2 (kg*m^2)
   */
  static calculateTotalMomentOfInertia(
    disc: DiscSpec,
    slottedMass: SlottedMassSpec
  ): { I_disc: number; I_masses: number; I_total: number } {
    // I_disc = 0.5 * M * R^2
    const I_disc = 0.5 * disc.massKg * Math.pow(disc.radiusM, 2);

    // 2 identical slotted masses placed at distance r from center
    // I_masses = 2 * (m * r^2 + 0.5 * m * r_mass^2) where r_mass ~ 0.02 m
    const mEach = (slottedMass.massEachKg * slottedMass.count) / 2.0;
    const rPos = slottedMass.positionRadiusM;
    const rMassRadius = 0.02; // 2 cm disk radius of slotted mass
    const I_masses = slottedMass.count > 0 ? 2 * (mEach * Math.pow(rPos, 2) + 0.5 * mEach * Math.pow(rMassRadius, 2)) : 0;

    const I_total = I_disc + I_masses;
    return {
      I_disc: Number(I_disc.toFixed(6)),
      I_masses: Number(I_masses.toFixed(6)),
      I_total: Number(I_total.toFixed(6)),
    };
  }

  /**
   * Calculate Torsional Oscillation Time Period T = 2 * pi * sqrt(I / C) (seconds)
   */
  static calculateTimePeriodSeconds(
    wire: WireSpec,
    disc: DiscSpec,
    slottedMass: SlottedMassSpec,
    customG_GPa?: number
  ): { periodT: number; periodSquaredT2: number; C_NmRad: number; I_total: number } {
    const C = TorsionalPendulumEngine.calculateTorsionalConstantC(wire, customG_GPa);
    const { I_total } = TorsionalPendulumEngine.calculateTotalMomentOfInertia(disc, slottedMass);

    const periodT = 2 * Math.PI * Math.sqrt(I_total / Math.max(1e-6, C));
    const periodSquaredT2 = Math.pow(periodT, 2);

    return {
      periodT: Number(periodT.toFixed(4)),
      periodSquaredT2: Number(periodSquaredT2.toFixed(4)),
      C_NmRad: Number(C.toFixed(6)),
      I_total,
    };
  }

  /**
   * Calculate Continuous Oscillation Dynamics theta(t), omega(t), alpha(t)
   */
  static calculateOscillationFrame(
    wire: WireSpec,
    disc: DiscSpec,
    slottedMass: SlottedMassSpec,
    tSeconds: number,
    initialAngleDeg: number,
    dampingLevel: 'OFF' | 'LOW' | 'REALISTIC' = 'REALISTIC'
  ): { angleDeg: number; angularVelocityRadS: number; angularAccelRadS2: number } {
    const { C_NmRad, I_total } = TorsionalPendulumEngine.calculateTimePeriodSeconds(wire, disc, slottedMass);
    const omega0 = Math.sqrt(C_NmRad / Math.max(1e-6, I_total));

    const gamma = dampingLevel === 'OFF' ? 0.0 : dampingLevel === 'LOW' ? 0.04 : 0.12;
    const omegaD = Math.sqrt(Math.max(0, Math.pow(omega0, 2) - Math.pow(gamma, 2)));

    const theta0Rad = (initialAngleDeg * Math.PI) / 180.0;
    const currentAngleRad = theta0Rad * Math.exp(-gamma * tSeconds) * Math.cos(omegaD * tSeconds);
    const currentAngleDeg = (currentAngleRad * 180.0) / Math.PI;

    const angularVelocityRadS =
      -theta0Rad * Math.exp(-gamma * tSeconds) * (gamma * Math.cos(omegaD * tSeconds) + omegaD * Math.sin(omegaD * tSeconds));
    const angularAccelRadS2 = -(C_NmRad / Math.max(1e-6, I_total)) * currentAngleRad;

    return {
      angleDeg: Number(currentAngleDeg.toFixed(2)),
      angularVelocityRadS: Number(angularVelocityRadS.toFixed(4)),
      angularAccelRadS2: Number(angularAccelRadS2.toFixed(4)),
    };
  }

  /**
   * Linear Regression Analysis for T^2 vs I Graph
   * T^2 = (128 * pi * L / (G * d^4)) * I => slope m = T^2 / I
   * => G = 128 * pi * L / (d^4 * slope) (Pascals)
   */
  static calculateRegressionAnalysis(
    trials: TorsionalTrial[],
    wire: WireSpec
  ): TorsionalRegressionResult {
    const referenceG = wire.referenceG_GPa;
    if (trials.length < 2) {
      return {
        slope: 0,
        rSquared: 1.0,
        experimentalG_GPa: referenceG,
        referenceG_GPa: referenceG,
        percentageError: 0.0,
      };
    }

    const n = trials.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    trials.forEach((t) => {
      const x = t.totalMomentOfInertiaKgM2;
      const y = t.periodSquaredT2;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    const meanX = sumX / n;
    const meanY = sumY / n;

    const num = sumXY - n * meanX * meanY;
    const den = sumX2 - n * meanX * meanX;
    const slope = den !== 0 ? num / den : 0;

    // R^2
    const ssTot = sumY2 - n * meanY * meanY;
    const ssRes = trials.reduce((acc, t) => {
      const yPred = meanY + slope * (t.totalMomentOfInertiaKgM2 - meanX);
      return acc + Math.pow(t.periodSquaredT2 - yPred, 2);
    }, 0);
    const rSquared = ssTot !== 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1.0;

    // Calculate experimental G from slope m = T^2 / I
    // G = 128 * pi * L / (d^4 * slope)
    const dM = wire.diameterMm / 1000.0;
    const L = wire.lengthM;
    let experimentalG_Pa = 0;
    if (slope > 0 && dM > 0) {
      experimentalG_Pa = (128 * Math.PI * L) / (Math.pow(dM, 4) * slope);
    }
    const experimentalG_GPa = Number((experimentalG_Pa / 1e9).toFixed(2));
    const percentageError = Number(
      (Math.abs((experimentalG_GPa - referenceG) / referenceG) * 100).toFixed(2)
    );

    return {
      slope: Number(slope.toFixed(2)),
      rSquared: Number(rSquared.toFixed(4)),
      experimentalG_GPa: experimentalG_GPa > 0 ? experimentalG_GPa : referenceG,
      referenceG_GPa: referenceG,
      percentageError,
    };
  }

  /**
   * Virtual Screw Gauge Micrometer Reading Simulator
   * Pitch = 0.5 mm, Circular scale = 50 divisions => LC = 0.01 mm
   */
  static simulateScrewGaugeReading(
    positionName: string,
    actualDiameterMm: number,
    zeroCorrectionMm: number = 0.0
  ): ScrewGaugeReading {
    const pitchMm = 0.5;
    const lcMm = 0.01;

    // Main scale reading (multiples of 0.5 mm)
    const mainScaleMm = Math.floor(actualDiameterMm / pitchMm) * pitchMm;
    const remainderMm = actualDiameterMm - mainScaleMm;
    const circularDivisions = Math.round(remainderMm / lcMm);

    const measuredDiameterMm = Number(
      (mainScaleMm + circularDivisions * lcMm + zeroCorrectionMm).toFixed(3)
    );

    return {
      id: `sg_${positionName.toLowerCase()}_${Date.now()}`,
      positionName,
      mainScaleMm: Number(mainScaleMm.toFixed(1)),
      circularScaleDivisions: circularDivisions % 50,
      zeroCorrectionMm,
      measuredDiameterMm,
    };
  }

  /**
   * Detect Educational Misconception Warnings
   */
  static detectMisconceptions(
    initialAngleDeg: number,
    trials: TorsionalTrial[]
  ): MisconceptionWarning[] {
    const warnings: MisconceptionWarning[] = [];

    if (initialAngleDeg > 15) {
      warnings.push({
        id: 'large-angle',
        title: '⚠ Excessive Initial Angular Displacement',
        message:
          'Torsional pendulum simple harmonic motion requires small angular displacement (θ ≤ 10°). Large angles introduce non-linear restoring torque errors.',
        severity: 'warning',
      });
    }

    if (trials.length > 1) {
      const diffMasses = new Set(trials.map((t) => t.totalMomentOfInertiaKgM2)).size;
      if (diffMasses < 2) {
        warnings.push({
          id: 'duplicate-masses',
          title: '⚠ Identical Mass Configuration',
          message:
            'To plot T² vs I and determine the slope, vary the symmetrical added masses or their radial position across trials.',
          severity: 'info',
        });
      }
    }

    return warnings;
  }
}
