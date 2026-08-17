import React from 'react';
import { PenTool as PenIcon } from 'lucide-react';
import type { LabInteractionMode } from '../../hooks/virtual-lab/useAnnotations';

interface PenToolProps {
  activeMode: LabInteractionMode;
  onSelect: () => void;
  className?: string;
}

export const PenTool: React.FC<PenToolProps> = ({ activeMode, onSelect, className = '' }) => {
  const isSelected = activeMode === 'pen';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label="Pen Tool (P)"
      title="Digital Pen (P)"
      className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs ${
        isSelected
          ? 'bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 ring-1 ring-blue-300'
          : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10'
      } ${className}`}
    >
      <PenIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Pen</span>
    </button>
  );
};
