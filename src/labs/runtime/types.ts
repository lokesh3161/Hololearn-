import type { ExperimentConfig } from '../types';

export interface ApparatusState {
  id: string;
  position: { x: number; y: number };
  rotation?: number;
  isOpen?: boolean;
  value?: number;
  [key: string]: any;
}

export interface DataRow {
  [key: string]: any;
}

export interface ProcedureStep {
  stepNumber: number;
  instruction: string;
  expectedAction: string;
  completed: boolean;
}

export interface MistakeRecord {
  id: string;
  name: string;
  timestamp: string;
  explanation: string;
}

export interface TitrationResult {
  trial: number;
  vInitial: number;
  vFinal: number;
  vTitre: number;
  isConcordant: boolean;
}

export interface LabRuntimeState {
  experimentId: string | null;
  config: ExperimentConfig | null;
  phase: 'setup' | 'running' | 'paused' | 'completed';
  elapsedTime: number;
  apparatusState: Record<string, ApparatusState>;
  sensorReadings: Record<string, number>;
  dataLog: DataRow[];
  procedureProgress: ProcedureStep[];
  mistakes: MistakeRecord[];
  isOpen: boolean;
  canResume: boolean;
}
