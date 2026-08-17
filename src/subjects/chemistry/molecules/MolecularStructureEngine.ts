import { chemistryEngine, type Molecule3D } from '../../../engines/ChemistryEngine';

export class MolecularStructureEngine {
  getMoleculeStructure(formulaOrId: string): Molecule3D {
    return chemistryEngine.getMolecule(formulaOrId);
  }

  getVSEPRGeometry(bondingPairs: number, lonePairs: number): { geometryName: string; bondAngle: string } {
    if (bondingPairs === 2 && lonePairs === 0) return { geometryName: 'Linear', bondAngle: '180.0°' };
    if (bondingPairs === 2 && lonePairs === 2) return { geometryName: 'Bent (V-shaped)', bondAngle: '104.5°' };
    if (bondingPairs === 3 && lonePairs === 0) return { geometryName: 'Trigonal Planar', bondAngle: '120.0°' };
    if (bondingPairs === 3 && lonePairs === 1) return { geometryName: 'Trigonal Pyramidal', bondAngle: '107.8°' };
    if (bondingPairs === 4 && lonePairs === 0) return { geometryName: 'Tetrahedral', bondAngle: '109.5°' };
    if (bondingPairs === 5 && lonePairs === 0) return { geometryName: 'Trigonal Bipyramidal', bondAngle: '90.0° / 120.0°' };
    if (bondingPairs === 6 && lonePairs === 0) return { geometryName: 'Octahedral', bondAngle: '90.0°' };
    return { geometryName: 'Complex Geometry', bondAngle: 'Variable' };
  }
}

export const molecularStructureEngine = new MolecularStructureEngine();
