import React from 'react';
import type { ExperimentConfig } from '../../types';

interface ComingSoonLabProps {
  config: ExperimentConfig;
  onBack?: () => void;
}

export const ComingSoonLab: React.FC<ComingSoonLabProps> = ({ config, onBack }) => {
  return (
    <div className="coming-soon-lab flex flex-col items-center justify-center min-h-full overflow-y-auto min-h-0 p-8 text-center bg-[#0a0a0a] text-white font-mono select-none">
      <div className="text-6xl mb-4">🔬</div>
      <h2 className="text-2xl font-bold mb-2">{config.title || (config as any).name}</h2>
      <p className="text-zinc-400 text-sm mb-4">{config.subject} · {config.id}</p>
      <div className="w-24 h-[1px] bg-white/20 mb-6" />
      <p className="message text-zinc-300 text-xs max-w-md mb-6 leading-relaxed">
        This laboratory is registered and configured.
        The interactive runtime is being developed.
      </p>
      <div className="objective bg-zinc-900 border border-white/10 p-4 rounded-xl text-xs max-w-lg mb-6 text-left w-full">
        <span className="font-bold text-white">Objective:</span> {config.objective}
      </div>
      <div className="apparatus-list bg-zinc-900 border border-white/10 p-4 rounded-xl text-xs max-w-lg mb-6 text-left w-full">
        <span className="font-bold text-white">Apparatus:</span> {config.apparatus?.map((a) => a.name).join(', ')}
      </div>
      <button
        onClick={onBack}
        className="px-6 py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200 transition-all active:scale-95"
      >
        ← Back to Labs
      </button>
    </div>
  );
};
