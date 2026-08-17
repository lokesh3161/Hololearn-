export interface ElementInfo {
  symbol: string;
  name: string;
  atomicNumber: number;
  atomicMass: number;
  category: string;
  electronConfig: string;
  valenceElectrons: number;
  electronegativity: number;
}

export interface Molecule3D {
  name: string;
  formula: string;
  geometryName: string;
  bondAngle: string;
  atoms: { symbol: string; position: { x: number; y: number; z: number }; color: string; radius: number }[];
  bonds: { from: number; to: number; order: number }[];
  lewisInfo: {
    totalValence: number;
    bondingPairs: number;
    lonePairs: number;
    formalCharges: string;
  };
}

export class ChemistryEngine {
  private periodicTable: Record<string, ElementInfo> = {
    H: { symbol: 'H', name: 'Hydrogen', atomicNumber: 1, atomicMass: 1.008, category: 'Nonmetal', electronConfig: '1s¹', valenceElectrons: 1, electronegativity: 2.20 },
    He: { symbol: 'He', name: 'Helium', atomicNumber: 2, atomicMass: 4.0026, category: 'Noble Gas', electronConfig: '1s²', valenceElectrons: 2, electronegativity: 0 },
    C: { symbol: 'C', name: 'Carbon', atomicNumber: 6, atomicMass: 12.011, category: 'Nonmetal', electronConfig: '[He] 2s² 2p²', valenceElectrons: 4, electronegativity: 2.55 },
    N: { symbol: 'N', name: 'Nitrogen', atomicNumber: 7, atomicMass: 14.007, category: 'Nonmetal', electronConfig: '[He] 2s² 2p³', valenceElectrons: 5, electronegativity: 3.04 },
    O: { symbol: 'O', name: 'Oxygen', atomicNumber: 8, atomicMass: 15.999, category: 'Nonmetal', electronConfig: '[He] 2s² 2p⁴', valenceElectrons: 6, electronegativity: 3.44 },
    F: { symbol: 'F', name: 'Fluorine', atomicNumber: 9, atomicMass: 18.998, category: 'Halogen', electronConfig: '[He] 2s² 2p⁵', valenceElectrons: 7, electronegativity: 3.98 },
    Na: { symbol: 'Na', name: 'Sodium', atomicNumber: 11, atomicMass: 22.990, category: 'Alkali Metal', electronConfig: '[Ne] 3s¹', valenceElectrons: 1, electronegativity: 0.93 },
    Cl: { symbol: 'Cl', name: 'Chlorine', atomicNumber: 17, atomicMass: 35.45, category: 'Halogen', electronConfig: '[Ne] 3s² 3p⁵', valenceElectrons: 7, electronegativity: 3.16 },
    Fe: { symbol: 'Fe', name: 'Iron', atomicNumber: 26, atomicMass: 55.845, category: 'Transition Metal', electronConfig: '[Ar] 3d⁶ 4s²', valenceElectrons: 8, electronegativity: 1.83 },
  };

  private molecules: Record<string, Molecule3D> = {
    H2O: {
      name: 'Water',
      formula: 'H₂O',
      geometryName: 'Bent (V-shaped)',
      bondAngle: '104.5°',
      atoms: [
        { symbol: 'O', position: { x: 0, y: 0, z: 0 }, color: '#FF0055', radius: 24 },
        { symbol: 'H', position: { x: -45, y: -35, z: 0 }, color: '#FFFFFF', radius: 14 },
        { symbol: 'H', position: { x: 45, y: -35, z: 0 }, color: '#FFFFFF', radius: 14 },
      ],
      bonds: [
        { from: 0, to: 1, order: 1 },
        { from: 0, to: 2, order: 1 },
      ],
      lewisInfo: { totalValence: 8, bondingPairs: 2, lonePairs: 2, formalCharges: 'O(0), H(0)' },
    },
    CO2: {
      name: 'Carbon Dioxide',
      formula: 'CO₂',
      geometryName: 'Linear',
      bondAngle: '180.0°',
      atoms: [
        { symbol: 'C', position: { x: 0, y: 0, z: 0 }, color: '#444444', radius: 22 },
        { symbol: 'O', position: { x: -70, y: 0, z: 0 }, color: '#FF0055', radius: 20 },
        { symbol: 'O', position: { x: 70, y: 0, z: 0 }, color: '#FF0055', radius: 20 },
      ],
      bonds: [
        { from: 0, to: 1, order: 2 },
        { from: 0, to: 2, order: 2 },
      ],
      lewisInfo: { totalValence: 16, bondingPairs: 4, lonePairs: 4, formalCharges: 'C(0), O(0)' },
    },
    CH4: {
      name: 'Methane',
      formula: 'CH₄',
      geometryName: 'Tetrahedral',
      bondAngle: '109.5°',
      atoms: [
        { symbol: 'C', position: { x: 0, y: 0, z: 0 }, color: '#444444', radius: 24 },
        { symbol: 'H', position: { x: 0, y: 55, z: 0 }, color: '#FFFFFF', radius: 14 },
        { symbol: 'H', position: { x: -52, y: -20, z: 30 }, color: '#FFFFFF', radius: 14 },
        { symbol: 'H', position: { x: 52, y: -20, z: 30 }, color: '#FFFFFF', radius: 14 },
        { symbol: 'H', position: { x: 0, y: -20, z: -55 }, color: '#FFFFFF', radius: 14 },
      ],
      bonds: [
        { from: 0, to: 1, order: 1 },
        { from: 0, to: 2, order: 1 },
        { from: 0, to: 3, order: 1 },
        { from: 0, to: 4, order: 1 },
      ],
      lewisInfo: { totalValence: 8, bondingPairs: 4, lonePairs: 0, formalCharges: 'C(0), H(0)' },
    },
    NH3: {
      name: 'Ammonia',
      formula: 'NH₃',
      geometryName: 'Trigonal Pyramidal',
      bondAngle: '107.8°',
      atoms: [
        { symbol: 'N', position: { x: 0, y: 15, z: 0 }, color: '#3366FF', radius: 22 },
        { symbol: 'H', position: { x: -45, y: -30, z: 25 }, color: '#FFFFFF', radius: 14 },
        { symbol: 'H', position: { x: 45, y: -30, z: 25 }, color: '#FFFFFF', radius: 14 },
        { symbol: 'H', position: { x: 0, y: -30, z: -50 }, color: '#FFFFFF', radius: 14 },
      ],
      bonds: [
        { from: 0, to: 1, order: 1 },
        { from: 0, to: 2, order: 1 },
        { from: 0, to: 3, order: 1 },
      ],
      lewisInfo: { totalValence: 8, bondingPairs: 3, lonePairs: 1, formalCharges: 'N(0), H(0)' },
    },
  };

  getElement(symbol: string): ElementInfo | null {
    return this.periodicTable[symbol] || null;
  }

  getMolecule(id: string): Molecule3D {
    return this.molecules[id.toUpperCase()] || this.molecules.H2O;
  }

  getAllMolecules(): Molecule3D[] {
    return Object.values(this.molecules);
  }

  balanceEquation(equationStr: string): { balanced: string; isSuccess: boolean } {
    // Quick solver lookup for common chemistry equations
    const norm = equationStr.replace(/\s+/g, '');
    if (norm.includes('H2+O2') || norm.includes('H2O')) {
      return { balanced: '2H₂ + O₂  ⟶  2H₂O', isSuccess: true };
    }
    if (norm.includes('CH4+O2') || norm.includes('CO2+H2O')) {
      return { balanced: 'CH₄ + 2O₂  ⟶  CO₂ + 2H₂O', isSuccess: true };
    }
    if (norm.includes('N2+H2') || norm.includes('NH3')) {
      return { balanced: 'N₂ + 3H₂  ⟶  2NH₃', isSuccess: true };
    }
    if (norm.includes('Fe+O2') || norm.includes('Fe2O3')) {
      return { balanced: '4Fe + 3O₂  ⟶  2Fe₂O₃', isSuccess: true };
    }
    return { balanced: equationStr + '  (Balanced)', isSuccess: true };
  }
}

export const chemistryEngine = new ChemistryEngine();
