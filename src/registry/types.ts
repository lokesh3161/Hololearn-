export type Subject = 'physics' | 'mathematics' | 'chemistry';

export type Topic =
  | 'mechanics'
  | 'kinematics'
  | 'gravitation'
  | 'waves'
  | 'oscillations'
  | 'electricity'
  | 'magnetism'
  | 'optics'
  | 'thermodynamics'
  | 'fluid-mechanics'
  | 'modern-physics'
  | 'algebra'
  | 'geometry'
  | 'trigonometry'
  | 'calculus'
  | 'statistics'
  | 'probability'
  | 'coordinate-geometry';

export type SimulationType =
  | 'projectile'
  | 'newton'
  | 'ohm'
  | 'wave'
  | 'shm'
  | 'graph'
  | 'kinetic'
  | 'kinetics'
  | 'gravitation'
  | 'lens'
  | 'gas'
  | 'pendulum'
  | 'circuit'
  | 'lorentz'
  | 'thermodynamic'
  | 'fluid'
  | 'interference'
  | 'photoelectric'
  | 'decay'
  | 'circle-area'
  | 'geometry3d'
  | 'chemistry'
  | 'titration'
  | 'water-lab'
  | 'circular'
  | 'torque'
  | 'einstein'
  | 'refraction'
  | 'capacitor'
  | 'coulomb'
  | 'field'
  | 'heat'
  | 'equilibrium'
  | 'electrochemistry';

export type GraphType =
  | 'cartesian'
  | 'parametric'
  | 'polar'
  | 'scatter'
  | 'histogram'
  | 'vector-field'
  | 'phase-space';

export type ActionType =
  | 'explain'
  | 'visualize'
  | 'simulate'
  | 'graph'
  | 'solve'
  | 'practice'
  | 'quiz'
  | 'example'
  | 'simplify';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Variable {
  symbol: string;
  name: string;
  unit: string;
  description?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface EquationEntry {
  id: string;
  latex: string;
  aliases: string[]; // all text patterns that match this
  displayName: string;
  subject: Subject;
  topic: Topic;
  variables: Variable[];
  explanation: string;
  explanation_beginner: string;
  explanation_advanced: string;
  relatedEquations: string[]; // ids of related entries
  graphType?: GraphType;
  simulationType?: SimulationType;
  visualizationType?: string;
  availableActions: ActionType[];
  jeeRelevance?: string; // JEE exam tip
  prerequisites: string[]; // concept ids
  tags: string[];
}

export interface ConceptEntry {
  id: string;
  name: string;
  aliases: string[];
  subject: Subject;
  topic: Topic;
  equations: string[]; // equation ids
  explanation: string;
  availableActions: ActionType[];
  simulationType?: SimulationType;
  tags: string[];
}

export interface SimulationEntry {
  id: SimulationType;
  subject: Subject;
  category: string;
  name: string;
  formula?: string;
  description: string;
  parameters: Variable[];
  equations: string[]; // equation ids this sim demonstrates
  component: string; // component name
  keywords: string[];
}

export interface GraphEntry {
  id: string;
  equationId: string;
  graphType: GraphType;
  defaultXRange: [number, number];
  defaultYRange: [number, number];
  showRoots: boolean;
  showVertex: boolean;
  showAsymptotes: boolean;
  showDerivative: boolean;
  showIntegral: boolean;
  parameterControls: Variable[];
}
