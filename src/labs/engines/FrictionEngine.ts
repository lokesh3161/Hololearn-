import type {
  SurfaceProfile,
  MotionState,
  SimulationState,
  FrictionTrial,
  RegressionResult,
} from '../physics/frictionTypes';

export class FrictionEngine {
  public static readonly GRAVITY = 9.81; // m/s²

  /**
   * Box-Muller transform for deterministic/controlled Gaussian noise.
   */
  public static gaussianNoise(mean = 0, stdDev = 1): number {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Calculates normal force N = m * g * cos(theta).
   */
  public static calculateNormalForce(totalMassKg: number, angleDeg = 0): number {
    const angleRad = (angleDeg * Math.PI) / 180;
    return totalMassKg * this.GRAVITY * Math.cos(angleRad);
  }

  /**
   * Simulates a single fixed timestep for the Horizontal Pull method.
   */
  public static stepHorizontal(
    prevState: SimulationState,
    profile: SurfaceProfile,
    rawDt: number
  ): SimulationState {
    const dt = Math.min(0.03, rawDt);
    const totalMass = Math.max(0.01, prevState.blockMass + prevState.additionalLoad);
    const normalForce = totalMass * this.GRAVITY;
    const maxStaticF = profile.muSRef * normalForce;
    const kineticF = profile.muKRef * normalForce;
    const appForce = Math.max(0, prevState.appliedForce);

    let motionState: MotionState = prevState.motionState;
    let frictionForce = 0;
    let velocity = prevState.velocity;
    let position = prevState.position;

    if (motionState !== 'sliding') {
      // Static or Impending phase
      if (appForce < maxStaticF) {
        frictionForce = appForce;
        velocity = 0;
        motionState = appForce >= 0.95 * maxStaticF ? 'impending' : 'static';
      } else {
        // Exceeded max static friction -> initiate sliding
        motionState = 'sliding';
        frictionForce = kineticF;
      }
    }

    if (motionState === 'sliding') {
      // Kinetic sliding phase
      frictionForce = kineticF;
      const netForce = appForce - kineticF;
      const accel = netForce / totalMass;

      const nextVel = velocity + accel * dt;

      if (nextVel <= 0) {
        // Motion came to a rest due to reduced applied force
        velocity = 0;
        if (appForce < maxStaticF) {
          motionState = appForce >= 0.95 * maxStaticF ? 'impending' : 'static';
          frictionForce = appForce;
        } else {
          motionState = 'sliding';
        }
      } else {
        velocity = nextVel;
        position = position + velocity * dt;
        if (position >= 2.5) {
          position = 2.5;
          velocity = 0; // Stopped at track end bumper
        }
      }
    }

    return {
      ...prevState,
      blockMass: prevState.blockMass,
      additionalLoad: prevState.additionalLoad,
      velocity,
      position,
      motionState,
      frictionForce,
      normalForce,
      timestamp: prevState.timestamp + dt,
    };
  }

  /**
   * Simulates a single fixed timestep for the Inclined Plane method.
   */
  public static stepInclined(
    prevState: SimulationState,
    profile: SurfaceProfile,
    rawDt: number
  ): SimulationState {
    const dt = Math.min(0.03, rawDt);
    const totalMass = Math.max(0.01, prevState.blockMass + prevState.additionalLoad);
    const angleRad = (Math.min(89, Math.max(0, prevState.angleDeg)) * Math.PI) / 180;
    const normalForce = totalMass * this.GRAVITY * Math.cos(angleRad);
    const parallelForce = totalMass * this.GRAVITY * Math.sin(angleRad);

    const maxStaticF = profile.muSRef * normalForce;
    const kineticF = profile.muKRef * normalForce;

    let motionState: MotionState = prevState.motionState;
    let frictionForce = 0;
    let velocity = prevState.velocity;
    let position = prevState.position;

    if (motionState !== 'sliding') {
      if (parallelForce < maxStaticF) {
        frictionForce = parallelForce;
        velocity = 0;
        motionState = parallelForce >= 0.95 * maxStaticF ? 'impending' : 'static';
      } else {
        motionState = 'sliding';
        frictionForce = kineticF;
      }
    }

    if (motionState === 'sliding') {
      frictionForce = kineticF;
      const netForce = parallelForce - kineticF;
      const accel = netForce / totalMass;

      const nextVel = velocity + accel * dt;

      if (nextVel <= 0) {
        velocity = 0;
        if (parallelForce < maxStaticF) {
          motionState = parallelForce >= 0.95 * maxStaticF ? 'impending' : 'static';
          frictionForce = parallelForce;
        } else {
          motionState = 'sliding';
        }
      } else {
        velocity = nextVel;
        position = position + velocity * dt;
        if (position >= 2.5) {
          position = 2.5;
          velocity = 0; // Stopped at track end bumper
        }
      }
    }

    return {
      ...prevState,
      velocity,
      position,
      motionState,
      frictionForce,
      normalForce,
      timestamp: prevState.timestamp + dt,
    };
  }

  /**
   * Applies Gaussian noise to readouts (never to underlying motion logic).
   */
  public static applyNoiseToDisplay(
    value: number,
    noiseAmp: number,
    resolution: number,
    enabled: boolean
  ): number {
    if (!enabled || noiseAmp === 0) return Number(value.toFixed(2));
    const noise = this.gaussianNoise(0, noiseAmp);
    const noisy = value + noise;
    const rounded = Math.round(noisy / resolution) * resolution;
    return Number(rounded.toFixed(2));
  }

  /**
   * Computes simple linear regression (y = mx + c) across trial data points.
   */
  public static computeLinearRegression(
    points: Array<{ x: number; y: number }>
  ): RegressionResult | null {
    const n = points.length;
    if (n < 2) return null;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
      sumYY += p.y * p.y;
    }

    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-9) {
      return { slope: 0, intercept: 0, r2: 0, count: n };
    }

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // Compute R²
    const yMean = sumY / n;
    let ssTot = 0;
    let ssRes = 0;

    for (const p of points) {
      const yPred = slope * p.x + intercept;
      ssTot += Math.pow(p.y - yMean, 2);
      ssRes += Math.pow(p.y - yPred, 2);
    }

    const r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

    return {
      slope: Number(slope.toFixed(4)),
      intercept: Number(intercept.toFixed(4)),
      r2: Number(r2.toFixed(4)),
      count: n,
    };
  }

  /**
   * Helper to derive percent error.
   */
  public static percentError(exp: number, ref: number): number {
    if (ref === 0) return 0;
    return Number((Math.abs((exp - ref) / ref) * 100).toFixed(2));
  }
}
