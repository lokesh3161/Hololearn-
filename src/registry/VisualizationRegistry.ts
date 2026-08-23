export interface ScienceVisualizationDomain {
  id: string;
  name: string;
  category: 'Mathematics' | 'Geometry' | 'Physics' | 'Chemistry' | 'Biology' | 'Engineering';
  description: string;
  iconName: string;
  supportedRenderers: string[];
}

export class VisualizationRegistry {
  private static domains: ScienceVisualizationDomain[] = [
    {
      id: 'math-algebra',
      name: 'Algebra & Coordinate Geometry',
      category: 'Mathematics',
      description: 'Functions, parabolas, roots, intercepts, and linear regression.',
      iconName: 'Activity',
      supportedRenderers: ['EmbeddedGraphOnCanvas', 'FunctionPlotter'],
    },
    {
      id: 'math-geometry-3d',
      name: '3D Solid Geometry',
      category: 'Geometry',
      description: 'Cubes, spheres, cylinders, cones, and polyhedra.',
      iconName: 'Box',
      supportedRenderers: ['Interactive3DViewer'],
    },
    {
      id: 'physics-mechanics',
      name: 'Physics Mechanics & Torsion',
      category: 'Physics',
      description: 'Torsional pendulum, spring mechanics, vectors, and projectile motion.',
      iconName: 'Zap',
      supportedRenderers: ['TorsionalPendulumLab', 'VectorCanvas'],
    },
    {
      id: 'physics-optics',
      name: 'Physics Optics & Diffraction',
      category: 'Physics',
      description: 'Laser diffraction, Newton\'s rings, and ray optics.',
      iconName: 'Compass',
      supportedRenderers: ['DiffractionGratingLab', 'NewtonsRingsLab'],
    },
    {
      id: 'chemistry-polymers',
      name: 'Chemistry Polymers & Titration',
      category: 'Chemistry',
      description: 'Phenol-formaldehyde resin, acid-base titration, and pH instrumentation.',
      iconName: 'FlaskConical',
      supportedRenderers: ['PhenolFormaldehydeLab', 'DielectricConstantLab'],
    },
  ];

  static getAllDomains(): ScienceVisualizationDomain[] {
    return VisualizationRegistry.domains;
  }

  static getDomainsByCategory(category: string): ScienceVisualizationDomain[] {
    return VisualizationRegistry.domains.filter((d) => d.category === category);
  }
}
