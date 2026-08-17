export class PhysicsEngine {
  // Mechanics & Kinematics
  kinematicsV(u: number, a: number, t: number): number {
    return u + a * t;
  }
  kinematicsS(u: number, a: number, t: number): number {
    return u * t + 0.5 * a * t * t;
  }
  kinematicsV2(u: number, a: number, s: number): number {
    const val = u * u + 2 * a * s;
    return val >= 0 ? Math.sqrt(val) : 0;
  }

  // Dynamics & Momentum
  force(m: number, a: number): number {
    return m * a;
  }
  momentum(m: number, v: number): number {
    return m * v;
  }
  work(f: number, d: number, thetaRad: number = 0): number {
    return f * d * Math.cos(thetaRad);
  }
  kineticEnergy(m: number, v: number): number {
    return 0.5 * m * v * v;
  }
  potentialEnergy(m: number, g: number, h: number): number {
    return m * g * h;
  }

  // Gravitation
  gravitationalForce(m1: number, m2: number, r: number, G: number = 6.674e-11): number {
    if (r <= 0) return 0;
    return (G * m1 * m2) / (r * r);
  }
  escapeVelocity(M: number, R: number, G: number = 6.674e-11): number {
    if (R <= 0) return 0;
    return Math.sqrt((2 * G * M) / R);
  }
  orbitalVelocity(M: number, r: number, G: number = 6.674e-11): number {
    if (r <= 0) return 0;
    return Math.sqrt((G * M) / r);
  }

  // Electricity & Circuit
  ohmsLawV(i: number, r: number): number {
    return i * r;
  }
  ohmsLawI(v: number, r: number): number {
    if (r <= 0) return 0;
    return v / r;
  }
  electricPower(v: number, i: number): number {
    return v * i;
  }
  coulombForce(q1: number, q2: number, r: number, k: number = 8.99e9): number {
    if (r <= 0) return 0;
    return (k * Math.abs(q1 * q2)) / (r * r);
  }

  // Optics
  lensImageDistance(f: number, u: number): number {
    // 1/f = 1/v - 1/u => 1/v = 1/f + 1/u => v = (f * u) / (u + f)
    const denom = u + f;
    if (Math.abs(denom) < 0.0001) return Infinity;
    return (f * u) / denom;
  }
  snellsLawRefractedAngle(n1: number, n2: number, theta1Rad: number): number | null {
    if (n2 <= 0) return null;
    const sinTheta2 = (n1 * Math.sin(theta1Rad)) / n2;
    if (Math.abs(sinTheta2) > 1) return null; // Total internal reflection
    return Math.asin(sinTheta2);
  }

  // Thermodynamics & Gas
  idealGasPressure(n: number, R: number, T: number, V: number): number {
    if (V <= 0) return 0;
    return (n * R * T) / V;
  }
  specificHeatQ(m: number, c: number, deltaT: number): number {
    return m * c * deltaT;
  }

  // Modern Physics
  einsteinMassEnergy(m: number, c: number = 3e8): number {
    return m * c * c;
  }
  photonEnergy(f: number, h: number = 6.626e-34): number {
    return h * f;
  }
  radioactiveDecayN(n0: number, lambda: number, t: number): number {
    return n0 * Math.exp(-lambda * t);
  }
}

export const physicsEngine = new PhysicsEngine();
