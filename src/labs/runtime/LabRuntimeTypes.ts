export interface LabRuntimeState {
  labId: string;
  subject: 'physics' | 'chemistry';
  mode: 'guided' | 'practice' | 'challenge' | 'free' | 'research';
  isRunning: boolean;
  elapsedSeconds: number;
  inputs: Record<string, any>;
  liveOutputs: Record<string, any>;
  procedureStepIndex: number;
  completedSteps: number[];
  loggedData: Record<string, any>[];
  hypothesis: string;
  observations: string;
  conclusion: string;
}

export type LabAction =
  | { type: 'SET_INPUT'; key: string; value: any }
  | { type: 'STEP_PROCEDURE'; stepIndex: number }
  | { type: 'LOG_DATA_POINT' }
  | { type: 'CLEAR_DATA' }
  | { type: 'RESET_EXPERIMENT' }
  | { type: 'SET_NOTEBOOK'; field: 'hypothesis' | 'observations' | 'conclusion'; value: string };
