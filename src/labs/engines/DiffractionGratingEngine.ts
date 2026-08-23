import type {
  LaserSpec,
  GratingSpec,
  DiffractionOrderSpot,
  DiffractionTrial,
  DiffractionRegressionResult,
  GoniometerReading,
  MisconceptionWarning,
} from '../types/diffractionGratingTypes';

export interface LaserPreset {
  id: string;
  name: string;
  wavelengthNm: number;
  colorHex: string;
  description: string;
}

export const LASER_PRESETS: LaserPreset[] = [
  { id: 'red-650', name: 'Red He-Ne Laser', wavelengthNm: 650.0, colorHex: '#ef4444', description: 'Standard Red Laser (650 nm)' },
  { id: 'red-635', name: 'Red Diode Laser', wavelengthNm: 635.0, colorHex: '#f87171', description: 'Precision Red Laser (635 nm)' },
  { id: 'green-532', name: 'Green DPSS Laser', wavelengthNm: 532.0, colorHex: '#22c55e', description: 'Bright Green Laser (532 nm)' },
  { id: 'custom', name: 'Custom Tunable Laser', wavelengthNm: 589.0, colorHex: '#eab308', description: 'Tunable Laser Source' },
];

export interface GratingPreset {
  id: string;
  name: string;
  linesPerMm: number;
  description: string;
}

export const GRATING_PRESETS: GratingPreset[] = [
  { id: 'g-300', name: '300 lines/mm', linesPerMm: 300, description: 'Coarse Transmission Grating' },
  { id: 'g-600', name: '600 lines/mm', linesPerMm: 600, description: 'Standard Physics Lab Grating' },
  { id: 'g-1000', name: '1000 lines/mm', linesPerMm: 1000, description: 'High Resolution Grating' },
  { id: 'g-1200', name: '1200 lines/mm', linesPerMm: 1200, description: 'Precision Spectrometer Grating' },
];

export class DiffractionGratingEngine {
  /**
   * Calculate Grating Element Spacing d = 1 / (N * 1000) (meters)
   * N = lines per mm
   */
  static calculateGratingSpacingD(linesPerMm: number): number {
    const N_per_meter = linesPerMm * 1000.0;
    return N_per_meter > 0 ? 1.0 / N_per_meter : 1.666667e-6;
  }

  /**
   * Calculate Maximum Physically Observable Diffraction Order n_max = floor(d / lambda)
   */
  static calculateMaxObservableOrder(spacingM: number, wavelengthNm: number): number {
    const wavelengthM = wavelengthNm * 1e-9;
    if (wavelengthM <= 0 || spacingM <= 0) return 1;
    return Math.floor(spacingM / wavelengthM);
  }

  /**
   * Calculate Diffraction Order Spots on Screen at Distance L
   * Formula: sin(theta_n) = n * lambda / d
   * Spot position: x_n = L * tan(theta_n)
   */
  static calculateDiffractionSpots(
    laser: LaserSpec,
    grating: GratingSpec,
    screenDistanceL: number,
    maxOrderLimit: number = 4
  ): DiffractionOrderSpot[] {
    const d = grating.spacingM > 0 ? grating.spacingM : DiffractionGratingEngine.calculateGratingSpacingD(grating.linesPerMm);
    const lambda = laser.wavelengthNm * 1e-9;
    const maxN = Math.min(maxOrderLimit, DiffractionGratingEngine.calculateMaxObservableOrder(d, laser.wavelengthNm));
    const alignmentOffsetRad = (laser.alignmentDeg * Math.PI) / 180.0;

    const spots: DiffractionOrderSpot[] = [];

    for (let n = -maxN; n <= maxN; n++) {
      const sinThetaTheoretical = (n * lambda) / d;

      if (Math.abs(sinThetaTheoretical) <= 1.0) {
        const thetaTheoreticalRad = Math.asin(sinThetaTheoretical);
        const thetaTotalRad = thetaTheoreticalRad + alignmentOffsetRad;
        const thetaTotalDeg = (thetaTotalRad * 180.0) / Math.PI;

        const xM = screenDistanceL * Math.tan(thetaTotalRad);
        const intensityRatio = n === 0 ? 1.0 : Math.max(0.1, 1.0 / (1.0 + 0.6 * Math.abs(n)));

        // Screen physical half-width is ~0.85 meters
        const isObservable = Math.abs(xM) <= 0.85;

        spots.push({
          orderN: n,
          angleRad: Number(thetaTotalRad.toFixed(6)),
          angleDeg: Number(thetaTotalDeg.toFixed(2)),
          displacementXM: Number(xM.toFixed(4)),
          intensityRatio: Number(intensityRatio.toFixed(2)),
          isObservable,
        });
      }
    }

    return spots;
  }

  /**
   * Calculate Experimental Wavelength from Screen Displacement x and Order n
   * theta_exp = arctan(x / L)
   * lambda_exp = d * sin(theta_exp) / n
   */
  static calculateExperimentalWavelength(
    spacingM: number,
    orderN: number,
    screenDistanceL: number,
    measuredXM: number
  ): { angleDeg: number; experimentalWavelengthNm: number; errorPercent: number; theoreticalWavelengthNm: number } {
    if (orderN === 0 || screenDistanceL <= 0 || spacingM <= 0) {
      return { angleDeg: 0, experimentalWavelengthNm: 650.0, errorPercent: 0, theoreticalWavelengthNm: 650.0 };
    }

    const absX = Math.abs(measuredXM);
    const absN = Math.abs(orderN);
    const thetaRad = Math.atan2(absX, screenDistanceL);
    const angleDeg = (thetaRad * 180.0) / Math.PI;

    const lambdaM = (spacingM * Math.sin(thetaRad)) / absN;
    const experimentalWavelengthNm = Number((lambdaM * 1e9).toFixed(2));

    return {
      angleDeg: Number(angleDeg.toFixed(2)),
      experimentalWavelengthNm,
      errorPercent: 0,
      theoreticalWavelengthNm: 650.0,
    };
  }

  /**
   * Linear Regression Fit on sin(theta) vs n
   * sin(theta) = (lambda / d) * n => slope m = lambda / d
   * => lambda_exp = m * d (meters -> nm)
   */
  static calculateRegressionAnalysis(
    trials: DiffractionTrial[],
    theoreticalWavelengthNm: number
  ): DiffractionRegressionResult {
    if (trials.length < 2) {
      return {
        slope: 0,
        rSquared: 1.0,
        experimentalWavelengthNm: theoreticalWavelengthNm,
        theoreticalWavelengthNm,
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
      const x = t.orderN; // order n
      const sinTheta = Math.sin((t.calculatedAngleDeg * Math.PI) / 180.0);
      const y = sinTheta;
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
      const sinTheta = Math.sin((t.calculatedAngleDeg * Math.PI) / 180.0);
      const yPred = meanY + slope * (t.orderN - meanX);
      return acc + Math.pow(sinTheta - yPred, 2);
    }, 0);
    const rSquared = ssTot !== 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1.0;

    // Derived experimental wavelength from slope: slope = lambda / d => lambda = slope * d
    const meanD = trials.reduce((acc, t) => acc + t.gratingSpacingM, 0) / n;
    const experimentalWavelengthNm = Number((slope * meanD * 1e9).toFixed(2));
    const percentageError = Number(
      (Math.abs((experimentalWavelengthNm - theoreticalWavelengthNm) / theoreticalWavelengthNm) * 100).toFixed(2)
    );

    return {
      slope: Number(slope.toFixed(6)),
      rSquared: Number(rSquared.toFixed(4)),
      experimentalWavelengthNm: experimentalWavelengthNm > 0 ? experimentalWavelengthNm : theoreticalWavelengthNm,
      theoreticalWavelengthNm,
      percentageError,
    };
  }

  /**
   * Virtual Vernier / Goniometer Simulator
   */
  static simulateGoniometerReading(angleDeg: number): GoniometerReading {
    const leastCountDeg = 0.01;
    const mainScaleDeg = Math.floor(angleDeg * 2) / 2.0; // 0.5° divisions
    const remainderDeg = angleDeg - mainScaleDeg;
    const vernierDivisions = Math.round(remainderDeg / leastCountDeg);
    const totalAngleDeg = Number((mainScaleDeg + vernierDivisions * leastCountDeg).toFixed(2));

    return {
      mainScaleDeg: Number(mainScaleDeg.toFixed(1)),
      vernierDivisions: vernierDivisions % 50,
      leastCountDeg,
      totalAngleDeg,
    };
  }

  /**
   * Misconception Warning Detection
   */
  static detectMisconceptions(
    alignmentDeg: number,
    trials: DiffractionTrial[]
  ): MisconceptionWarning[] {
    const warnings: MisconceptionWarning[] = [];

    if (Math.abs(alignmentDeg) > 2.0) {
      warnings.push({
        id: 'laser-misalignment',
        title: '⚠ Laser Beam Axis Misaligned',
        message: `Laser is misaligned by ${alignmentDeg.toFixed(1)}°. Align the laser beam along the optical axis for symmetrical +n and -n diffraction spots.`,
        severity: 'warning',
      });
    }

    if (trials.length > 1) {
      const orders = new Set(trials.map((t) => t.orderN));
      if (orders.size < 2) {
        warnings.push({
          id: 'single-order',
          title: '⚠ Single Diffraction Order Recorded',
          message: 'To plot sin(θ) vs n and perform linear regression, measure positions for multiple diffraction orders (e.g. n = ±1, ±2).',
          severity: 'info',
        });
      }
    }

    return warnings;
  }
}
