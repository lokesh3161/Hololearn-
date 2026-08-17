export interface PHCalculationResult {
  pH: number;
  pOH: number;
  hConc: number;
  ohConc: number;
  classification: 'Strongly Acidic' | 'Weakly Acidic' | 'Neutral' | 'Weakly Basic' | 'Strongly Basic';
  steps: string[];
}

export class PHCalculationEngine {
  calculateFromHConc(hConc: number): PHCalculationResult {
    const validH = Math.max(1e-14, Math.min(1.0, hConc));
    const pH = Number((-Math.log10(validH)).toFixed(2));
    const pOH = Number((14.0 - pH).toFixed(2));
    const ohConc = Math.pow(10, -pOH);

    let classification: PHCalculationResult['classification'] = 'Neutral';
    if (pH < 3.0) classification = 'Strongly Acidic';
    else if (pH < 7.0) classification = 'Weakly Acidic';
    else if (pH === 7.0) classification = 'Neutral';
    else if (pH < 11.0) classification = 'Weakly Basic';
    else classification = 'Strongly Basic';

    return {
      pH,
      pOH,
      hConc: validH,
      ohConc,
      classification,
      steps: [
        `Given [H⁺] = ${validH.toExponential(3)} M`,
        `Formula: pH = -log₁₀[H⁺]`,
        `Substitution: pH = -log₁₀(${validH.toExponential(3)}) = ${pH}`,
        `Formula: pH + pOH = 14.0`,
        `Result: pOH = 14.0 - ${pH} = ${pOH}`,
        `Result: [OH⁻] = 10⁻ᵖᴼᴴ = ${ohConc.toExponential(3)} M`,
      ],
    };
  }

  calculateBufferPH(pK_a: number, concBase: number, concAcid: number): number {
    const ratio = Math.max(0.001, concBase) / Math.max(0.001, concAcid);
    const pH = pK_a + Math.log10(ratio);
    return Number(pH.toFixed(2));
  }
}

export const phCalculationEngine = new PHCalculationEngine();
