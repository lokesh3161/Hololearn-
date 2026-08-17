export class GasLawEngine {
  readonly R_ATM = 0.082057; // L·atm / (mol·K)
  readonly R_JOULES = 8.314; // J / (mol·K)

  calculateIdealGasPressure(nMoles: number, tempK: number, volumeLiters: number): { P_atm: number; steps: string[] } {
    const P = (nMoles * this.R_ATM * tempK) / Math.max(0.1, volumeLiters);
    const P_atm = Number(P.toFixed(3));

    return {
      P_atm,
      steps: [
        `Given: n = ${nMoles} mol, T = ${tempK} K, V = ${volumeLiters} L`,
        `Gas Constant R = ${this.R_ATM} L·atm/(mol·K)`,
        `Formula: P = (n R T) / V`,
        `Substitution: P = (${nMoles} × ${this.R_ATM} × ${tempK}) / ${volumeLiters}`,
        `Result: Pressure P = ${P_atm} atm`,
      ],
    };
  }
}

export const gasLawEngine = new GasLawEngine();
