// Pure physics optics calculations — no React, no DOM side effects
// All units in centimeters internally.

export interface RayPath {
  id: string;
  color: string;
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

export type ObjectPositionClass =
  | 'beyond-2f'
  | 'at-2f'
  | 'between-f-and-2f'
  | 'at-focal'
  | 'inside-focal'
  | 'invalid';

export const OpticsEngine = {
  // ── CORE LENS EQUATION ──────────────────────────────
  // 1/f = 1/v - 1/u  (Real-is-positive Cartesian)
  // u is negative for real object (to left of lens)
  // v is positive for real image (to right of lens)
  // f is positive for converging (convex) lens

  // Calculate image distance (v) from object distance (u) and focal length (f)
  calculateImageDistance(u_cm: number, f_cm: number): number {
    const absU = Math.abs(u_cm);
    if (absU < 0.001) return Infinity;
    const inv_v = 1 / f_cm - 1 / absU;
    if (Math.abs(inv_v) < 0.0001) return Infinity; // Object at focal point
    return 1 / inv_v;
  },

  // Calculate focal length (f) from object distance (u) and image distance (v)
  calculateFocalLength(u_cm: number, v_cm: number): number {
    const absU = Math.abs(u_cm);
    if (absU + v_cm === 0) return Infinity;
    return (absU * v_cm) / (absU + v_cm);
  },

  // Magnification: m = -v/|u|
  calculateMagnification(u_cm: number, v_cm: number): number {
    const absU = Math.abs(u_cm);
    if (absU < 0.001) return 0;
    return -v_cm / absU;
  },

  // Image height from object height and magnification
  calculateImageHeight(objectHeight_cm: number, magnification: number): number {
    return objectHeight_cm * magnification;
  },

  // Is the image real? (v > 0)
  isRealImage(v_cm: number): boolean {
    return isFinite(v_cm) && v_cm > 0;
  },

  // Is the image upright? (m > 0)
  isUprightImage(magnification: number): boolean {
    return magnification > 0;
  },

  // ── SHARPNESS MODEL ────────────────────────────────
  // Returns 0 (completely blurred) to 1 (perfectly sharp)
  calculateSharpness(
    screenPosition_cm: number,
    calculatedImagePosition_cm: number,
    blurRadius_cm: number = 2.5
  ): number {
    if (!isFinite(calculatedImagePosition_cm)) return 0;
    const error = Math.abs(screenPosition_cm - calculatedImagePosition_cm);
    const sharpness = Math.exp(-(error * error) / (2 * blurRadius_cm * blurRadius_cm));
    return Math.max(0, Math.min(1, sharpness));
  },

  // ── OBJECT POSITION CLASSIFICATION ─────────────────
  classifyObjectPosition(u_magnitude: number, f: number): ObjectPositionClass {
    if (u_magnitude <= 0) return 'invalid';
    if (u_magnitude < f * 0.98) return 'inside-focal';
    if (Math.abs(u_magnitude - f) < f * 0.03) return 'at-focal';
    if (u_magnitude < f * 2 * 0.98) return 'between-f-and-2f';
    if (Math.abs(u_magnitude - f * 2) < f * 0.03) return 'at-2f';
    return 'beyond-2f';
  },

  getObjectPositionDescription(cls: ObjectPositionClass): {
    region: string;
    expectedImage: string;
    imageType: string;
    orientation: string;
    size: string;
  } {
    const descriptions: Record<
      ObjectPositionClass,
      { region: string; expectedImage: string; imageType: string; orientation: string; size: string }
    > = {
      'beyond-2f': {
        region: 'Beyond 2F',
        expectedImage: "Between F' and 2F'",
        imageType: 'Real',
        orientation: 'Inverted',
        size: 'Diminished',
      },
      'at-2f': {
        region: 'At 2F',
        expectedImage: "At 2F'",
        imageType: 'Real',
        orientation: 'Inverted',
        size: 'Same size',
      },
      'between-f-and-2f': {
        region: 'Between F and 2F',
        expectedImage: "Beyond 2F'",
        imageType: 'Real',
        orientation: 'Inverted',
        size: 'Magnified',
      },
      'at-focal': {
        region: 'At F',
        expectedImage: 'Infinity',
        imageType: 'No real image',
        orientation: '—',
        size: '—',
      },
      'inside-focal': {
        region: 'Inside F',
        expectedImage: 'Same side as object',
        imageType: 'Virtual',
        orientation: 'Upright',
        size: 'Magnified',
      },
      invalid: {
        region: 'Invalid',
        expectedImage: '—',
        imageType: '—',
        orientation: '—',
        size: '—',
      },
    };
    return descriptions[cls];
  },

  // ── BENCH COORDINATE SYSTEM ─────────────────────────
  objectDistance(objectPos_cm: number, lensPos_cm: number): number {
    return objectPos_cm - lensPos_cm; // Negative when object is to left
  },

  imageDistance(screenPos_cm: number, lensPos_cm: number): number {
    return screenPos_cm - lensPos_cm; // Positive when screen is to right
  },

  // ── MEASUREMENT UNCERTAINTY ─────────────────────────
  focalLengthUncertainty(
    u: number,
    v: number,
    delta_u: number = 0.1,
    delta_v: number = 0.1
  ): number {
    const absU = Math.abs(u);
    if (absU + v === 0) return 0;
    const df_du = (v / (absU + v)) ** 2;
    const df_dv = (absU / (absU + v)) ** 2;
    return Math.sqrt((df_du * delta_u) ** 2 + (df_dv * delta_v) ** 2);
  },

  // ── RAY TRACING ─────────────────────────────────────
  calculatePrincipalRays(
    objectPos_cm: number,
    objectHeight_cm: number,
    lensPos_cm: number,
    f_cm: number,
    benchLength_cm: number
  ): RayPath[] {
    const u = this.objectDistance(objectPos_cm, lensPos_cm);
    const absU = Math.abs(u);
    const v = this.calculateImageDistance(u, f_cm);
    const tipX = objectPos_cm;
    const tipY = objectHeight_cm;

    const F_prime = lensPos_cm + f_cm; // image-side focal point
    const F = lensPos_cm - f_cm; // object-side focal point

    const rays: RayPath[] = [];

    // RAY 1: Parallel to axis → refracts through F'
    if (isFinite(v) && v > 0) {
      const imgX = lensPos_cm + v;
      const imgY = -tipY * (v / absU);
      rays.push({
        id: 'ray1',
        color: '#4F8EF7', // Blue
        segments: [
          { x1: tipX, y1: tipY, x2: lensPos_cm, y2: tipY },
          { x1: lensPos_cm, y1: tipY, x2: imgX, y2: imgY },
        ],
      });
    }

    // RAY 2: Through optical center O → straight undeviated
    if (isFinite(v) && v > 0) {
      const imgX = lensPos_cm + v;
      const imgY = -tipY * (v / absU);
      rays.push({
        id: 'ray2',
        color: '#2DD4A0', // Green
        segments: [{ x1: tipX, y1: tipY, x2: imgX, y2: imgY }],
      });
    }

    // RAY 3: Through object-side F → emerges parallel to axis
    if (isFinite(v) && v > 0 && Math.abs(F - tipX) > 0.1) {
      const imgX = lensPos_cm + v;
      const imgY = -tipY * (v / absU);
      rays.push({
        id: 'ray3',
        color: '#F5A623', // Amber
        segments: [
          { x1: tipX, y1: tipY, x2: lensPos_cm, y2: imgY },
          { x1: lensPos_cm, y1: imgY, x2: imgX, y2: imgY },
        ],
      });
    }

    return rays;
  },

  // ── STATISTICS ──────────────────────────────────────
  meanFocalLength(fValues: number[]): number {
    if (fValues.length === 0) return 0;
    return fValues.reduce((s, f) => s + f, 0) / fValues.length;
  },

  standardDeviation(fValues: number[]): number {
    if (fValues.length < 2) return 0;
    const mean = this.meanFocalLength(fValues);
    const variance = fValues.reduce((s, f) => s + (f - mean) ** 2, 0) / (fValues.length - 1);
    return Math.sqrt(variance);
  },

  percentageError(experimental: number, reference: number): number {
    if (reference === 0) return 0;
    return Math.abs((experimental - reference) / reference) * 100;
  },

  addNoise(value: number, scaleResolution_cm: number = 0.1): number {
    return value + (Math.random() - 0.5) * scaleResolution_cm * 2;
  },
};
