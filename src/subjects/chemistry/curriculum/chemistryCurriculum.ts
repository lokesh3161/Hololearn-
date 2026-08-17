export interface ChemistryChapter {
  id: number;
  code: string;
  name: string;
  category: 'General' | 'Physical' | 'Inorganic' | 'Organic' | 'Analytical' | 'Biochemistry';
  description: string;
}

export const chemistryCurriculum: ChemistryChapter[] = [
  { id: 1, code: 'CHEM-01', name: '01. Introduction to Chemistry', category: 'General', description: 'Scientific method, matter, and chemical processes.' },
  { id: 2, code: 'CHEM-02', name: '02. Matter and Its Classification', category: 'General', description: 'Elements, compounds, homogeneous and heterogeneous mixtures.' },
  { id: 3, code: 'CHEM-03', name: '03. Measurements and Units', category: 'General', description: 'SI units, dimensional analysis, and significant figures.' },
  { id: 4, code: 'CHEM-04', name: '04. Atomic Structure', category: 'Physical', description: 'Subatomic particles, isotopes, and atomic spectra.' },
  { id: 5, code: 'CHEM-05', name: '05. Periodic Table', category: 'Inorganic', description: 'Organization of elements, periods, groups, and blocks.' },
  { id: 6, code: 'CHEM-06', name: '06. Periodic Trends', category: 'Inorganic', description: 'Atomic radius, electronegativity, and ionization energy trends.' },
  { id: 7, code: 'CHEM-07', name: '07. Chemical Bonding', category: 'Inorganic', description: 'Ionic, covalent, metallic, and coordinate covalent bonds.' },
  { id: 8, code: 'CHEM-08', name: '08. Lewis Structures', category: 'Inorganic', description: 'Valence electron distribution, octet rule, and resonance.' },
  { id: 9, code: 'CHEM-09', name: '09. Molecular Geometry', category: 'Inorganic', description: 'VSEPR theory, hybridization, and 3D molecular shapes.' },
  { id: 10, code: 'CHEM-10', name: '10. Intermolecular Forces', category: 'Physical', description: 'Hydrogen bonding, dipole-dipole, and London dispersion forces.' },
  { id: 11, code: 'CHEM-11', name: '11. Mole Concept', category: 'Physical', description: 'Avogadro number, molar mass, and mole conversions.' },
  { id: 12, code: 'CHEM-12', name: '12. Stoichiometry', category: 'Physical', description: 'Mass-mole ratios, limiting reagents, and percent yields.' },
  { id: 13, code: 'CHEM-13', name: '13. Chemical Reactions', category: 'General', description: 'Synthesis, decomposition, single & double displacement.' },
  { id: 14, code: 'CHEM-14', name: '14. Chemical Equations', category: 'General', description: 'Balancing chemical equations and atom conservation.' },
  { id: 15, code: 'CHEM-15', name: '15. Solutions', category: 'Physical', description: 'Solutes, solvents, solubility curves, and dissolution.' },
  { id: 16, code: 'CHEM-16', name: '16. Concentration', category: 'Physical', description: 'Molarity, molality, mole fraction, and dilution (M1V1=M2V2).' },
  { id: 17, code: 'CHEM-17', name: '17. Acids and Bases', category: 'Physical', description: 'Arrhenius, Brønsted-Lowry, and Lewis acid-base theories.' },
  { id: 18, code: 'CHEM-18', name: '18. pH and pOH', category: 'Physical', description: 'Logarithmic pH scale, Kw, and hydronium calculations.' },
  { id: 19, code: 'CHEM-19', name: '19. Buffers', category: 'Physical', description: 'Henderson-Hasselbalch equation and buffer capacity.' },
  { id: 20, code: 'CHEM-20', name: '20. Solubility', category: 'Physical', description: 'Ksp solubility product constant and precipitation prediction.' },
  { id: 21, code: 'CHEM-21', name: '21. Gases', category: 'Physical', description: 'Ideal gas law (PV=nRT), Boyle, Charles, and Dalton laws.' },
  { id: 22, code: 'CHEM-22', name: '22. Liquids and Solids', category: 'Physical', description: 'Vapor pressure, viscosity, and crystal lattice structures.' },
  { id: 23, code: 'CHEM-23', name: '23. Thermochemistry', category: 'Physical', description: 'Calorimetry (q=mcΔT), enthalpy changes, and Hess law.' },
  { id: 24, code: 'CHEM-24', name: '24. Thermodynamics', category: 'Physical', description: 'Gibbs free energy (ΔG=ΔH-TΔS), entropy, and spontaneity.' },
  { id: 25, code: 'CHEM-25', name: '25. Chemical Kinetics', category: 'Physical', description: 'Reaction rates, rate laws, Arrhenius equation, and catalysts.' },
  { id: 26, code: 'CHEM-26', name: '26. Chemical Equilibrium', category: 'Physical', description: 'Kc, Kp equilibrium constants and Le Chatelier principle.' },
  { id: 27, code: 'CHEM-27', name: '27. Ionic Equilibrium', category: 'Physical', description: 'Dissociation of weak electrolytes and common ion effect.' },
  { id: 28, code: 'CHEM-28', name: '28. Electrochemistry', category: 'Physical', description: 'Galvanic cells, Nernst equation, and cell potential E°.' },
  { id: 29, code: 'CHEM-29', name: '29. Redox Chemistry', category: 'Physical', description: 'Oxidation numbers and half-reaction balancing.' },
  { id: 30, code: 'CHEM-30', name: '30. Organic Chemistry', category: 'Organic', description: 'Carbon hybridization, IUPAC nomenclature, and isomerism.' },
  { id: 31, code: 'CHEM-31', name: '31. Hydrocarbons', category: 'Organic', description: 'Alkanes, alkenes, alkynes, and aromatic benzene rings.' },
  { id: 32, code: 'CHEM-32', name: '32. Functional Groups', category: 'Organic', description: 'Identification of haloalkanes, alcohols, and carbonyls.' },
  { id: 33, code: 'CHEM-33', name: '33. Alcohols', category: 'Organic', description: 'Primary, secondary, tertiary alcohols and dehydration.' },
  { id: 34, code: 'CHEM-34', name: '34. Aldehydes', category: 'Organic', description: 'Carbonyl group reactivity and Tollens test.' },
  { id: 35, code: 'CHEM-35', name: '35. Ketones', category: 'Organic', description: 'Nucleophilic addition reactions of ketones.' },
  { id: 36, code: 'CHEM-36', name: '36. Carboxylic Acids', category: 'Organic', description: 'Acidity of carboxylic acids and decarboxylation.' },
  { id: 37, code: 'CHEM-37', name: '37. Esters', category: 'Organic', description: 'Esterification synthesis and saponification.' },
  { id: 38, code: 'CHEM-38', name: '38. Amines', category: 'Organic', description: 'Basicity of aliphatic and aromatic amines.' },
  { id: 39, code: 'CHEM-39', name: '39. Polymers', category: 'Organic', description: 'Addition and condensation polymerization (polyethylene, nylon).' },
  { id: 40, code: 'CHEM-40', name: '40. Biomolecules', category: 'Biochemistry', description: 'Carbohydrates, amino acids, proteins, lipids, and DNA.' },
  { id: 41, code: 'CHEM-41', name: '41. Environmental Chemistry', category: 'General', description: 'Atmospheric chemistry, ozone depletion, and water purification.' },
  { id: 42, code: 'CHEM-42', name: '42. Analytical Chemistry', category: 'Analytical', description: 'Titration, chromatography, and spectroscopy.' },
  { id: 43, code: 'CHEM-43', name: '43. Nuclear Chemistry', category: 'Physical', description: 'Radioactive decay, half-life, fission, and fusion.' },
  { id: 44, code: 'CHEM-44', name: '44. Practical Laboratory Chemistry', category: 'General', description: 'Virtual lab equipment, titrations, and chemical safety.' },
];
