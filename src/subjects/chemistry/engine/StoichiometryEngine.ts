export interface StoichiometryResult {
  inputMass: number;
  moles: number;
  particles: string;
  limitingReagent?: string;
  theoreticalYield: number;
  units: string;
  steps: string[];
}

export class StoichiometryEngine {
  readonly AVOGADRO = 6.02214076e23;

  calculateMoles(massGrams: number, molarMass: number): StoichiometryResult {
    const moles = Number((massGrams / Math.max(0.0001, molarMass)).toFixed(4));
    const particlesNum = moles * this.AVOGADRO;
    const particles = particlesNum.toExponential(4);

    return {
      inputMass: massGrams,
      moles,
      particles,
      theoreticalYield: massGrams,
      units: 'mol',
      steps: [
        `Given Mass m = ${massGrams} g`,
        `Molar Mass M = ${molarMass} g/mol`,
        `Formula: n = m / M`,
        `Substitution: n = ${massGrams} / ${molarMass} = ${moles} mol`,
        `Particles N = n × N_A = ${moles} × (6.022 × 10²³) = ${particles} molecules`,
      ],
    };
  }

  calculateLimitingReagent(
    molesA: number,
    coeffA: number,
    molesB: number,
    coeffB: number,
    nameA: string = 'Reactant A',
    nameB: string = 'Reactant B'
  ): { limitingReagent: string; excessReagent: string; maxProductMoles: number } {
    const ratioA = molesA / coeffA;
    const ratioB = molesB / coeffB;

    const isALimiting = ratioA <= ratioB;

    return {
      limitingReagent: isALimiting ? nameA : nameB,
      excessReagent: isALimiting ? nameB : nameA,
      maxProductMoles: Number(Math.min(ratioA, ratioB).toFixed(4)),
    };
  }
}

export const stoichiometryEngine = new StoichiometryEngine();
