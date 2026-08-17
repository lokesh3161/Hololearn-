import React from 'react';
import { Eraser, Trash2 } from 'lucide-react';
import type { LabInteractionMode } from '../../hooks/virtual-lab/useAnnotations';

interface EraserToolProps {
  activeMode: LabInteractionMode;
  onSelectEraser: () => void;
  onClearAll: () => void;
  className?: string;
}

export const EraserTool: React.FC<EraserToolProps> = ({
  activeMode,
  onSelectEraser,
  onClearAll,
  className = '',
}) => {
  const isSelected = activeMode === 'eraser';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={onSelectEraser}
        aria-label="Eraser Tool (E)"
        title="Stroke Eraser (E)"
        className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs ${
          isSelected
            ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/30 ring-1 ring-amber-300'
            : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10'
        }`}
      >
        <Eraser className="w-4 h-4" />
        <span className="hidden sm:inline">Eraser</span>
      </button>

      <button
        type="button"
        onClick={onClearAll}
        aria-label="Clear All Annotations"
        title="Clear All Annotations"
        className="p-2 rounded-xl bg-zinc-900/80 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 border border-white/10 transition-all active:scale-95 flex items-center gap-1 font-mono text-xs"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden md:inline">Clear</span>
      </button>
    </div>
  );
};
