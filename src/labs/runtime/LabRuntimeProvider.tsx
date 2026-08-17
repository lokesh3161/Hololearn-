import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ExperimentConfig } from '../types';
import type { LabRuntimeState, ApparatusState, DataRow, ProcedureStep, MistakeRecord } from './types';

interface LabRuntimeContextType {
  state: LabRuntimeState;
  updateApparatusState: (id: string, patch: Partial<ApparatusState>) => void;
  setSensorReading: (key: string, value: number) => void;
  logDataRow: (row: DataRow) => void;
  completeProcedureStep: (stepNumber: number) => void;
  addMistake: (mistake: Omit<MistakeRecord, 'timestamp'>) => void;
  togglePause: () => void;
  resetLab: () => void;
}

const LabRuntimeContext = createContext<LabRuntimeContextType | null>(null);

export const LabRuntimeProvider: React.FC<{
  config: ExperimentConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const [state, setState] = useState<LabRuntimeState>({
    experimentId: config.id,
    config,
    phase: 'running',
    elapsedTime: 0,
    apparatusState: {},
    sensorReadings: {},
    dataLog: [],
    procedureProgress: config.procedure.map((p) => ({ ...p, completed: false })),
    mistakes: [],
    isOpen: true,
    canResume: false,
  });

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Engine tick via requestAnimationFrame
  useEffect(() => {
    const tick = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (state.phase === 'running') {
        setState((prev) => ({
          ...prev,
          elapsedTime: prev.elapsedTime + deltaSec,
        }));
      }

      animRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [state.phase]);

  const updateApparatusState = (id: string, patch: Partial<ApparatusState>) => {
    setState((prev) => ({
      ...prev,
      apparatusState: {
        ...prev.apparatusState,
        [id]: { ...(prev.apparatusState[id] || { id, position: { x: 0, y: 0 } }), ...patch },
      },
    }));
  };

  const setSensorReading = (key: string, value: number) => {
    setState((prev) => ({
      ...prev,
      sensorReadings: {
        ...prev.sensorReadings,
        [key]: value,
      },
    }));
  };

  const logDataRow = (row: DataRow) => {
    setState((prev) => ({
      ...prev,
      dataLog: [...prev.dataLog, row],
    }));
  };

  const completeProcedureStep = (stepNumber: number) => {
    setState((prev) => ({
      ...prev,
      procedureProgress: prev.procedureProgress.map((p) =>
        p.stepNumber === stepNumber ? { ...p, completed: true } : p
      ),
    }));
  };

  const addMistake = (m: Omit<MistakeRecord, 'timestamp'>) => {
    const record: MistakeRecord = {
      ...m,
      timestamp: new Date().toLocaleTimeString(),
    };
    setState((prev) => ({
      ...prev,
      mistakes: [...prev.mistakes, record],
    }));
  };

  const togglePause = () => {
    setState((prev) => ({
      ...prev,
      phase: prev.phase === 'running' ? 'paused' : 'running',
    }));
  };

  const resetLab = () => {
    setState({
      experimentId: config.id,
      config,
      phase: 'running',
      elapsedTime: 0,
      apparatusState: {},
      sensorReadings: {},
      dataLog: [],
      procedureProgress: config.procedure.map((p) => ({ ...p, completed: false })),
      mistakes: [],
      isOpen: true,
      canResume: false,
    });
  };

  return (
    <LabRuntimeContext.Provider
      value={{
        state,
        updateApparatusState,
        setSensorReading,
        logDataRow,
        completeProcedureStep,
        addMistake,
        togglePause,
        resetLab,
      }}
    >
      {children}
    </LabRuntimeContext.Provider>
  );
};

export const useLabRuntime = () => {
  const context = useContext(LabRuntimeContext);
  if (!context) {
    throw new Error('useLabRuntime must be used within a LabRuntimeProvider');
  }
  return context;
};
