/**
 * Newton's Rings Interference Physics Engine & Linear Regression Calculator
 * HoloLearn Virtual Physics Laboratory — Experiment 07
 */

import type {
  OpticsLightSource,
  NewtonsRingsReading,
  NewtonsRingsState,
  MicroscopeState,
} from '../types/opticsExperimentTypes';

export const DEFAULT_LIGHT_SOURCES: OpticsLightSource[] = [
  { id: 'sodium', name: 'Sodium Monochromatic Lamp (589 nm)', wavelengthNm: 589, colorHex: '#eab308' },
  { id: 'red-laser', name: 'He-Ne Red Laser (650 nm)', wavelengthNm: 650, colorHex: '#ef4444' },
  { id: 'green-laser', name: 'DPSS Green Laser (532 nm)', wavelengthNm: 532, colorHex: '#22c55e' },
];

export class OpticsNewtonsRingsEngine {
  /**
   * Initial default state
   */
  static getInitialState(): NewtonsRingsState {
    return {
      wavelengthNm: 589,
      radiusCm: 100, // 1.0 m radius of curvature
      microscope: {
        positionXMm: 0.0,
        focusBlurPx: 0,
        isFocused: true,
        mainScaleMm: 0,
        vernierScaleMm: 0,
        leastCountMm: 0.01,
        locked: false,
      },
      readings: [],
      noiseEnabled: false,
      activeView: 'APPARATUS',
    };
  }

  /**
   * Calculate theoretical dark ring diameter D_n in mm
   * Formula: D_n^2 = 4 * n * lambda * R
   */
  static calculateDarkRingDiameterMm(
    ringOrderN: number,
    wavelengthNm: number = 589,
    radiusCm: number = 100
  ): number {
    if (ringOrderN <= 0) return 0.0;

    // Convert wavelength to cm: 1 nm = 1e-7 cm
    const lambdaCm = wavelengthNm * 1e-7;
    // D_n^2 in cm^2
    const dSqCm2 = 4 * ringOrderN * lambdaCm * radiusCm;
    // D_n in cm
    const dCm = Math.sqrt(dSqCm2);
    // D_n in mm
    const dMm = dCm * 10.0;

    return Number(dMm.toFixed(3));
  }

  /**
   * Generate left and right micrometer readings for ring n
   */
  static generateFringeReadings(
    ringOrderN: number,
    wavelengthNm: number = 589,
    radiusCm: number = 100,
    noiseEnabled: boolean = false
  ): { leftReadingMm: number; rightReadingMm: number; diameterMm: number; diameterSqCm2: number } {
    const theoreticalDMm = OpticsNewtonsRingsEngine.calculateDarkRingDiameterMm(ringOrderN, wavelengthNm, radiusCm);
    
    // Add realistic micrometer measurement noise if enabled
    const noise = noiseEnabled ? (Math.random() - 0.5) * 0.04 : 0.0;
    const actualDMm = Math.max(0.1, theoreticalDMm + noise);
    
    const radiusMm = actualDMm / 2.0;
    const leftMm = Number((-radiusMm).toFixed(2));
    const rightMm = Number((radiusMm).toFixed(2));
    const diameterMm = Number((rightMm - leftMm).toFixed(2));
    const diameterCm = diameterMm / 10.0;
    const diameterSqCm2 = Number((diameterCm * diameterCm).toFixed(4));

    return {
      leftReadingMm: leftMm,
      rightReadingMm: rightMm,
      diameterMm,
      diameterSqCm2,
    };
  }

  /**
   * Calculate linear regression fit D_n^2 vs n
   * Expected line: D_n^2 = slope * n + c, where slope = 4 * lambda * R
   */
  static calculateLinearRegression(
    readings: NewtonsRingsReading[],
    wavelengthNm: number = 589,
    nominalRadiusCm: number = 100
  ): {
    slopeCm2PerN: number;
    derivedRadiusCm: number;
    derivedRadiusM: number;
    rSquared: number;
    percentageError: number;
  } {
    if (readings.length < 2) {
      return {
        slopeCm2PerN: 0,
        derivedRadiusCm: nominalRadiusCm,
        derivedRadiusM: nominalRadiusCm / 100.0,
        rSquared: 1.0,
        percentageError: 0,
      };
    }

    const nValues = readings.map((r) => r.ringOrder);
    const yValues = readings.map((r) => r.diameterSqCm2);
    const count = readings.length;

    const sumN = nValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumNY = readings.reduce((acc, r) => acc + r.ringOrder * r.diameterSqCm2, 0);
    const sumNSq = nValues.reduce((acc, n) => acc + n * n, 0);

    const slope = (count * sumNY - sumN * sumY) / (count * sumNSq - sumN * sumN);

    // Derived Radius: R = Slope / (4 * lambdaCm)
    const lambdaCm = wavelengthNm * 1e-7;
    const derivedRadiusCm = slope / (4 * lambdaCm);
    const derivedRadiusM = derivedRadiusCm / 100.0;

    // R^2 confidence calculation
    const meanY = sumY / count;
    const ssTotal = yValues.reduce((acc, y) => acc + Math.pow(y - meanY, 2), 0);
    const ssRes = readings.reduce((acc, r) => {
      const predY = slope * r.ringOrder + (sumY - slope * sumN) / count;
      return acc + Math.pow(r.diameterSqCm2 - predY, 2);
    }, 0);

    const rSquared = ssTotal === 0 ? 1.0 : Math.max(0, Math.min(1.0, 1 - ssRes / ssTotal));
    const percentageError = Math.abs((derivedRadiusCm - nominalRadiusCm) / nominalRadiusCm) * 100.0;

    return {
      slopeCm2PerN: Number(slope.toFixed(5)),
      derivedRadiusCm: Number(derivedRadiusCm.toFixed(1)),
      derivedRadiusM: Number(derivedRadiusM.toFixed(2)),
      rSquared: Number(rSquared.toFixed(4)),
      percentageError: Number(percentageError.toFixed(2)),
    };
  }

  /**
   * Detect misconceptions grounded in actual measurements & event history
   */
  static detectMisconceptions(
    readings: NewtonsRingsReading[],
    events: any[]
  ): Array<{ id: string; title: string; message: string; eventTrigger: string; severity: "warning" | "info" }> {
    const warnings: Array<{ id: string; title: string; message: string; eventTrigger: string; severity: "warning" | "info" }> = [];

    // Check for reversed micrometer readings (X_L > X_R)
    readings.forEach((r) => {
      if (r.leftReadingMm > r.rightReadingMm) {
        warnings.push({
          id: `reversed-reading-n${r.ringOrder}`,
          title: `Reversed Micrometer Readings (Ring n=${r.ringOrder})`,
          message: `Your left reading (${r.leftReadingMm} mm) is greater than your right reading (${r.rightReadingMm} mm). Confirm crosshair positioning on both sides of central spot.`,
          eventTrigger: `reading_added_n${r.ringOrder}`,
          severity: "warning",
        });
      }
    });

    // Check for Radius vs Diameter confusion (implausible diameter relative to ring order)
    readings.forEach((r) => {
      const expectedD = OpticsNewtonsRingsEngine.calculateDarkRingDiameterMm(r.ringOrder, 589, 100);
      if (Math.abs(r.diameterMm - expectedD / 2.0) < 0.3) {
        warnings.push({
          id: `radius-vs-diameter-n${r.ringOrder}`,
          title: `Possible Radius vs. Diameter Confusion (Ring n=${r.ringOrder})`,
          message: `Recorded value (${r.diameterMm} mm) appears close to ring radius rather than full diameter |X_R - X_L|. Ensure you subtract left micrometer position from right position.`,
          eventTrigger: `reading_added_n${r.ringOrder}`,
          severity: "warning",
        });
      }
    });

    return warnings;
  }
}
