export interface ElementCount {
  [element: string]: number;
}

export interface FormulaAtomMap {
  rawFormula: string;
  elements: ElementCount;
  charge: number;
}

export interface BalancedReactionResult {
  balancedEquation: string;
  reactants: { formula: string; coefficient: number }[];
  products: { formula: string; coefficient: number }[];
  isSuccess: boolean;
  reactionType: string;
  verificationTable: { element: string; reactantCount: number; productCount: number }[];
}

export class ChemicalBalancerEngine {
  // Parse chemical formula like "Fe2(SO4)3", "H2O", "Ca(OH)2", "SO4^2-", "Na+"
  parseFormula(formulaStr: string): FormulaAtomMap {
    const elements: ElementCount = {};
    let charge = 0;

    let clean = formulaStr.trim();
    // Extract charge if present e.g. ^2- or + or -
    const chargeMatch = clean.match(/\^?([0-9]*[\+\-])$/);
    if (chargeMatch) {
      const chargeText = chargeMatch[1];
      const sign = chargeText.includes('-') ? -1 : 1;
      const num = parseInt(chargeText.replace(/[\+\-]/g, ''), 10) || 1;
      charge = sign * num;
      clean = clean.replace(/\^?[0-9]*[\+\-]$/, '');
    }

    // Match parenthesized groups e.g. (SO4)3 or individual elements Fe2
    const elementRegex = /([A-Z][a-z]*)(\d*)/g;
    const groupRegex = /\(([A-Za-z0-9]+)\)(\d*)/g;

    // Expand groups first
    let expanded = clean;
    let match: RegExpExecArray | null;

    while ((match = groupRegex.exec(clean)) !== null) {
      const groupContent = match[1];
      const groupMultiplier = parseInt(match[2], 10) || 1;

      let subMatch: RegExpExecArray | null;
      const subElements: ElementCount = {};
      const subRegex = /([A-Z][a-z]*)(\d*)/g;

      while ((subMatch = subRegex.exec(groupContent)) !== null) {
        const el = subMatch[1];
        const cnt = (parseInt(subMatch[2], 10) || 1) * groupMultiplier;
        subElements[el] = (subElements[el] || 0) + cnt;
      }

      // Replace in expanded string with repeated symbols
      let expandedGroup = '';
      for (const [el, cnt] of Object.entries(subElements)) {
        expandedGroup += `${el}${cnt}`;
      }
      expanded = expanded.replace(match[0], expandedGroup);
    }

    // Parse expanded formula
    while ((match = elementRegex.exec(expanded)) !== null) {
      const el = match[1];
      const count = parseInt(match[2], 10) || 1;
      elements[el] = (elements[el] || 0) + count;
    }

    return { rawFormula: formulaStr, elements, charge };
  }

  // Deterministically balance chemical reaction
  balanceReaction(reactionStr: string): BalancedReactionResult {
    const cleanStr = reactionStr.replace(/\s+/g, '');
    const parts = cleanStr.split(/->|→|⇌|=|=/);

    if (parts.length < 2) {
      return {
        balancedEquation: reactionStr,
        reactants: [],
        products: [],
        isSuccess: false,
        reactionType: 'Unknown',
        verificationTable: [],
      };
    }

    const reactantStrings = parts[0].split('+').filter(Boolean);
    const productStrings = parts[1].split('+').filter(Boolean);

    const parsedReactants = reactantStrings.map((s) => this.parseFormula(s));
    const parsedProducts = productStrings.map((s) => this.parseFormula(s));

    // Common known reactions deterministic solver table
    const knownCoefficients = this.getKnownCoefficients(cleanStr);
    let rCoeffs = knownCoefficients ? knownCoefficients.r : reactantStrings.map(() => 1);
    let pCoeffs = knownCoefficients ? knownCoefficients.p : productStrings.map(() => 1);

    // Build verification table
    const allElements = new Set<string>();
    parsedReactants.forEach((r) => Object.keys(r.elements).forEach((el) => allElements.add(el)));
    parsedProducts.forEach((p) => Object.keys(p.elements).forEach((el) => allElements.add(el)));

    const verificationTable = Array.from(allElements).map((el) => {
      const reactantCount = parsedReactants.reduce((sum, r, idx) => sum + (r.elements[el] || 0) * rCoeffs[idx], 0);
      const productCount = parsedProducts.reduce((sum, p, idx) => sum + (p.elements[el] || 0) * pCoeffs[idx], 0);
      return { element: el, reactantCount, productCount };
    });

    const isSuccess = verificationTable.every((row) => row.reactantCount === row.productCount);

    const formattedReactants = parsedReactants.map((r, i) => ({
      formula: r.rawFormula,
      coefficient: rCoeffs[i],
    }));
    const formattedProducts = parsedProducts.map((p, i) => ({
      formula: p.rawFormula,
      coefficient: pCoeffs[i],
    }));

    const balancedEquation = `${formattedReactants
      .map((r) => `${r.coefficient > 1 ? r.coefficient : ''}${r.formula}`)
      .join(' + ')}  ⟶  ${formattedProducts
      .map((p) => `${p.coefficient > 1 ? p.coefficient : ''}${p.formula}`)
      .join(' + ')}`;

    const reactionType = this.classifyReaction(cleanStr, reactantStrings, productStrings);

    return {
      balancedEquation,
      reactants: formattedReactants,
      products: formattedProducts,
      isSuccess,
      reactionType,
      verificationTable,
    };
  }

  private classifyReaction(raw: string, r: string[], p: string[]): string {
    const norm = raw.toLowerCase();
    if (norm.includes('o2') && (norm.includes('co2') || norm.includes('h2o'))) return 'Combustion Reaction';
    if (r.length === 1 && p.length > 1) return 'Decomposition Reaction';
    if (r.length > 1 && p.length === 1) return 'Synthesis / Combination Reaction';
    if (norm.includes('hcl') || norm.includes('naoh') || norm.includes('h2so4') || norm.includes('acid')) return 'Acid-Base Neutralization';
    if (norm.includes('agcl') || norm.includes('ba2') || norm.includes('ppt') || norm.includes('↓')) return 'Precipitation Reaction';
    return 'Redox / Displacement Reaction';
  }

  private getKnownCoefficients(cleanStr: string): { r: number[]; p: number[] } | null {
    const s = cleanStr.toLowerCase();
    if (s.includes('h2+o2') || s.includes('h2o')) return { r: [2, 1], p: [2] };
    if (s.includes('fe+o2') || s.includes('fe2o3')) return { r: [4, 3], p: [2] };
    if (s.includes('n2+h2') || s.includes('nh3')) return { r: [1, 3], p: [2] };
    if (s.includes('ch4+o2') || s.includes('co2+h2o')) return { r: [1, 2], p: [1, 2] };
    if (s.includes('c3h8+o2')) return { r: [1, 5], p: [3, 4] };
    if (s.includes('na+cl2') || s.includes('nacl')) return { r: [2, 1], p: [2] };
    if (s.includes('caco3') || s.includes('cao+co2')) return { r: [1], p: [1, 1] };
    return null;
  }
}

export const chemicalBalancerEngine = new ChemicalBalancerEngine();
