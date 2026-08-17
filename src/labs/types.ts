export type SubjectType = 'physics' | 'chemistry';

export interface ApparatusItem {
  id: string;
  name: string;
  specs: string;
  initialPosition?: { x: number; y: number };
  instructions: string;
}

export interface SubstanceItem {
  id: string;
  name: string;
  formula: string;
  concentrationMolar?: number;
  massGrams?: number;
  volumeMl?: number;
  initialColor?: string;
  initialPh?: number;
  initialTemp?: number;
}

export interface Step {
  stepNumber: number;
  instruction: string;
  expectedAction: string;
  tip?: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  unit: string;
  precision?: number;
}

export interface MistakeRule {
  id: string;
  name: string;
  triggerCondition: string;
  consequence: string;
  aiExplanation: string;
}

export interface Checkpoint {
  id: string;
  description: string;
  points: number;
  verifyCondition: string;
}

export interface ExperimentConfig {
  id: string;
  title: string;
  subject: SubjectType;
  objective: string;
  apparatus: ApparatusItem[];
  substances?: SubstanceItem[];
  procedure: Step[];
  stateEngine: {
    calculateState: (inputs: Record<string, any>) => Record<string, any>;
    simulateNoise?: (val: number, errorPct?: number) => number;
    constants?: Record<string, number>;
  };
  dataTable: {
    columns: ColumnDef[];
    calculateRow: (inputs: Record<string, any>) => Record<string, any>;
  };
  graph: {
    xAxis: { label: string; unit: string; key: string };
    yAxis: { label: string; unit: string; key: string };
    expectedSlopeKey?: string;
    expectedSlopeValue?: number;
    expectedFormula?: string;
  };
  mistakes: MistakeRule[];
  assessment: Checkpoint[];
  freeMode: {
    objective: string;
    availableApparatus: string[];
    availableSubstances?: string[];
    aiGuidanceStyle: 'safety_and_hints_only';
  };
  researchMode: {
    scientificQuestion: string;
    constraints: {
      timeMinutes: number;
      budget: number;
      safetyLevel: string;
    };
    requiredIdentifications: string[];
  };
  smartboardTrigger: {
    detectedLaTeX: string[];
    conceptKeywords: string[];
  };
}
