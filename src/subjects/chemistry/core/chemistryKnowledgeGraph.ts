export interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  formula?: string;
  vseprGeometry?: string;
  bondAngle?: string;
  polarity?: string;
  relatedConcepts: string[];
  relatedSimulations: string[];
  relatedExperiments: string[];
  explanation: string;
  jeeTip: string;
}

export class ChemistryKnowledgeGraph {
  private graph: Record<string, KnowledgeNode> = {
    H2O: {
      id: 'H2O',
      name: 'Water Molecule',
      category: 'Molecules',
      formula: 'H₂O',
      vseprGeometry: 'Bent (V-shaped)',
      bondAngle: '104.5°',
      polarity: 'Polar (Dipole Moment = 1.85 D)',
      relatedConcepts: ['Hydrogen Bonding', 'Dipole Moment', 'Surface Tension', 'Water Electrolysis', 'Ice Density Anomaly'],
      relatedSimulations: ['water-lab', 'chemistry', 'titration'],
      relatedExperiments: ['Water Electrolysis', 'Specific Heat Capacity of Water'],
      explanation: 'Water is a polar molecule with a bent VSEPR geometry (104.5°) due to two lone pairs on Oxygen.',
      jeeTip: 'JEE: High boiling point of H₂O (100°C) is due to extensive intermolecular hydrogen bonding.',
    },
    CO2: {
      id: 'CO2',
      name: 'Carbon Dioxide',
      category: 'Molecules',
      formula: 'CO₂',
      vseprGeometry: 'Linear',
      bondAngle: '180.0°',
      polarity: 'Nonpolar (Zero Net Dipole)',
      relatedConcepts: ['Linear Geometry', 'Double Bonds', 'Resonance', 'Greenhouse Gas'],
      relatedSimulations: ['chemistry', 'gas'],
      relatedExperiments: ['Carbon Dioxide Sublimation'],
      explanation: 'CO₂ has two C=O double bonds in a linear 180° arrangement. Equal opposite bond dipoles cancel out.',
      jeeTip: 'JEE: CO₂ is nonpolar despite polar C=O bonds due to symmetrical linear molecular geometry.',
    },
    CH4: {
      id: 'CH4',
      name: 'Methane',
      category: 'Organic Chemistry',
      formula: 'CH₄',
      vseprGeometry: 'Tetrahedral',
      bondAngle: '109.5°',
      polarity: 'Nonpolar',
      relatedConcepts: ['sp3 Hybridization', 'Tetrahedral Geometry', 'Alkanes', 'Combustion'],
      relatedSimulations: ['chemistry'],
      relatedExperiments: ['Methane Combustion Calorimetry'],
      explanation: 'Methane has sp³ hybridized carbon forming 4 symmetric C-H single bonds at 109.5°.',
      jeeTip: 'JEE: Carbon in CH₄ uses 4 equivalent sp³ hybrid orbitals formed from 2s and 2p orbitals.',
    },
    NH3: {
      id: 'NH3',
      name: 'Ammonia',
      category: 'Molecules',
      formula: 'NH₃',
      vseprGeometry: 'Trigonal Pyramidal',
      bondAngle: '107.8°',
      polarity: 'Polar (Dipole Moment = 1.47 D)',
      relatedConcepts: ['Trigonal Pyramidal', 'Lone Pair Repulsion', 'Brønsted Base', 'Haber Process'],
      relatedSimulations: ['chemistry', 'titration'],
      relatedExperiments: ['Ammonia Weak Base Titration'],
      explanation: 'NH₃ has 3 bonding pairs and 1 lone pair. Lone pair-bond pair repulsion reduces angle to 107.8°.',
      jeeTip: 'JEE: NH₃ acts as a Lewis base due to the unshared lone pair of electrons on Nitrogen.',
    },
    'acid-base-titration': {
      id: 'acid-base-titration',
      name: 'Acid-Base Neutralization Titration',
      category: 'Acids & Bases',
      formula: 'HCl + NaOH ⟶ NaCl + H₂O',
      relatedConcepts: ['pH Scale', 'Equivalence Point', 'Phenolphthalein Indicator', 'Molarity'],
      relatedSimulations: ['titration'],
      relatedExperiments: ['Strong Acid - Strong Base Titration'],
      explanation: 'Titration measures analyte concentration by adding titrant until the equivalence point (pH 7.0 for strong acid/base).',
      jeeTip: 'JEE: At equivalence point: M₁V₁ (acid) = M₂V₂ (base) for 1:1 stoichiometric ratio.',
    },
    'ideal-gas': {
      id: 'ideal-gas',
      name: 'Ideal Gas Law',
      category: 'Gases',
      formula: 'PV = nRT',
      relatedConcepts: ['Boyle Law', 'Charles Law', 'Gay-Lussac Law', 'Dalton Law'],
      relatedSimulations: ['gas'],
      relatedExperiments: ['Ideal Gas Piston Compression'],
      explanation: 'Relates pressure P, volume V, moles n, and temperature T for ideal gas particles (R = 0.08206 L·atm/mol·K).',
      jeeTip: 'JEE: Real gases approach ideal behavior at low pressure and high temperature.',
    },
  };

  getNode(id: string): KnowledgeNode | null {
    const key = id.toUpperCase();
    return this.graph[key] || this.graph[id] || null;
  }

  getRelatedSimulations(id: string): string[] {
    const node = this.getNode(id);
    return node ? node.relatedSimulations : ['chemistry'];
  }

  getRankedActions(id: string): { label: string; actionType: string; payload: string }[] {
    const node = this.getNode(id);
    if (!node) {
      return [
        { label: '3D Molecular Viewer', actionType: 'simulation', payload: 'chemistry' },
        { label: 'Acid-Base Titration', actionType: 'simulation', payload: 'titration' },
        { label: 'Water Lab', actionType: 'simulation', payload: 'water-lab' },
      ];
    }

    return [
      { label: `View 3D ${node.name}`, actionType: 'simulation', payload: node.relatedSimulations[0] || 'chemistry' },
      { label: `Explain ${node.name}`, actionType: 'explain', payload: node.explanation },
      { label: 'Open Chemistry Calculator', actionType: 'calculator', payload: node.id },
      { label: 'Practice Quiz', actionType: 'quiz', payload: node.id },
    ];
  }
}

export const chemistryKnowledgeGraph = new ChemistryKnowledgeGraph();
