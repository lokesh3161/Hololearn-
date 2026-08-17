// Pure physics calculation engine for Mechanics labs
// All functions are pure math with no React dependencies

export const MechanicsEngine = {
  // Newton's Second Law
  acceleration: (F: number, m: number): number => (m !== 0 ? F / m : 0),
  force: (m: number, a: number): number => m * a,
  netForce: (forces: number[]): number => forces.reduce((s, f) => s + f, 0),

  // Kinematics
  velocityFinal: (u: number, a: number, t: number): number => u + a * t,
  displacement: (u: number, a: number, t: number): number => u * t + 0.5 * a * t * t,
  velocitySquared: (u: number, a: number, s: number): number => u * u + 2 * a * s,

  // Projectile (angle in degrees)
  projectileX: (v0: number, angleDeg: number, t: number): number =>
    v0 * Math.cos((angleDeg * Math.PI) / 180) * t,
  projectileY: (v0: number, angleDeg: number, t: number, g = 9.81): number =>
    v0 * Math.sin((angleDeg * Math.PI) / 180) * t - 0.5 * g * t * t,
  range: (v0: number, angleDeg: number, g = 9.81): number =>
    (v0 * v0 * Math.sin((2 * angleDeg * Math.PI) / 180)) / g,
  maxHeight: (v0: number, angleDeg: number, g = 9.81): number =>
    (v0 * v0 * Math.pow(Math.sin((angleDeg * Math.PI) / 180), 2)) / (2 * g),
  timeOfFlight: (v0: number, angleDeg: number, g = 9.81): number =>
    (2 * v0 * Math.sin((angleDeg * Math.PI) / 180)) / g,

  // Momentum and Collisions
  momentum: (m: number, v: number): number => m * v,
  elasticV1: (m1: number, m2: number, u1: number, u2: number): number =>
    m1 + m2 !== 0 ? ((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2) : 0,
  elasticV2: (m1: number, m2: number, u1: number, u2: number): number =>
    m1 + m2 !== 0 ? ((m2 - m1) * u2 + 2 * m1 * u1) / (m1 + m2) : 0,
  inelasticV: (m1: number, m2: number, u1: number, u2: number): number =>
    m1 + m2 !== 0 ? (m1 * u1 + m2 * u2) / (m1 + m2) : 0,

  // Energy
  kineticEnergy: (m: number, v: number): number => 0.5 * m * v * v,
  potentialEnergy: (m: number, h: number, g = 9.81): number => m * g * h,
  mechanicalEnergy: (m: number, v: number, h: number, g = 9.81): number =>
    0.5 * m * v * v + m * g * h,
  workDone: (F: number, d: number, angleDeg = 0): number =>
    F * d * Math.cos((angleDeg * Math.PI) / 180),

  // Friction
  frictionForce: (mu: number, N: number): number => mu * N,
  normalForce: (m: number, angleDeg = 0, g = 9.81): number =>
    m * g * Math.cos((angleDeg * Math.PI) / 180),
  accelerationOnRamp: (mu: number, angleDeg: number, g = 9.81): number =>
    g * (Math.sin((angleDeg * Math.PI) / 180) - mu * Math.cos((angleDeg * Math.PI) / 180)),

  // Hooke's Law
  springForce: (k: number, x: number): number => k * x,
  springExtension: (F: number, k: number): number => (k !== 0 ? F / k : 0),
  springConstant: (F: number, x: number): number => (x !== 0 ? F / x : 0),
  elasticPE: (k: number, x: number): number => 0.5 * k * x * x,

  // Pendulum
  pendulumPeriod: (L: number, g = 9.81): number => 2 * Math.PI * Math.sqrt(L / g),
  pendulumG: (T: number, L: number): number => (T !== 0 ? (4 * Math.PI * Math.PI * L) / (T * T) : 0),
  pendulumAngle: (A: number, omega: number, t: number, phi = 0): number =>
    A * Math.cos(omega * t + phi),

  // Free Fall
  freeFallTime: (h: number, g = 9.81): number => Math.sqrt((2 * h) / g),
  freeFallHeight: (t: number, g = 9.81): number => 0.5 * g * t * t,
  gFromFall: (h: number, t: number): number => (t !== 0 ? (2 * h) / (t * t) : 0),

  // Torque
  torque: (F: number, r: number, angleDeg = 90): number =>
    F * r * Math.sin((angleDeg * Math.PI) / 180),
  angularAcceleration: (tau: number, I: number): number => (I !== 0 ? tau / I : 0),

  // Centripetal
  centripetalForce: (m: number, v: number, r: number): number => (r !== 0 ? (m * v * v) / r : 0),
  centripetalAcceleration: (v: number, r: number): number => (r !== 0 ? (v * v) / r : 0),
  angularVelocity: (v: number, r: number): number => (r !== 0 ? v / r : 0),

  // Measurement noise (realistic experimental variation)
  addNoise: (value: number, percentNoise = 0.5): number =>
    value * (1 + (Math.random() - 0.5) * (percentNoise / 100)),

  // Error analysis
  percentageError: (experimental: number, theoretical: number): number =>
    theoretical !== 0 ? Math.abs((experimental - theoretical) / theoretical) * 100 : 0,
  absoluteError: (experimental: number, theoretical: number): number =>
    Math.abs(experimental - theoretical),
};
