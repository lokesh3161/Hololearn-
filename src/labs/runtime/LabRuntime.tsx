import React from 'react';
import { useBoardStore } from '../../store/boardStore';
import { getExperimentConfig } from '../index';
import { LabRuntimeProvider } from './LabRuntimeProvider';
import { LabWorkbenchView } from '../../components/labs/LabWorkbenchView';

export const LabRuntime: React.FC = () => {
  const { activeLabId, labState, closeVirtualLab } = useBoardStore();
  const isOpen = labState.isLabOpen || Boolean(activeLabId);
  const experimentId = labState.experimentId || activeLabId;

  if (!isOpen || !experimentId) return null;

  const config = getExperimentConfig(experimentId);

  if (!config) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white font-mono">
        <div className="text-center p-8 bg-zinc-900 border border-white/20 rounded-2xl">
          <h2 className="text-xl font-bold mb-2">Experiment Not Found</h2>
          <p className="text-xs text-zinc-400 mb-4">ID: {experimentId}</p>
          <button
            onClick={closeVirtualLab}
            className="px-4 py-2 bg-white text-black font-bold rounded-lg text-xs"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <LabRuntimeProvider config={config}>
      <LabWorkbenchView />
    </LabRuntimeProvider>
  );
};
