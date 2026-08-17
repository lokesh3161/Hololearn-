import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';

interface UndoRedoProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

export const UndoRedo: React.FC<UndoRedoProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/10 ${className}`}>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo Annotation (Ctrl+Z)"
        title="Undo (Ctrl+Z)"
        className={`p-1.5 rounded-lg transition-all ${
          canUndo
            ? 'text-zinc-200 hover:text-white hover:bg-white/10 active:scale-95'
            : 'text-zinc-600 opacity-40 cursor-not-allowed'
        }`}
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo Annotation (Ctrl+Shift+Z)"
        title="Redo (Ctrl+Shift+Z)"
        className={`p-1.5 rounded-lg transition-all ${
          canRedo
            ? 'text-zinc-200 hover:text-white hover:bg-white/10 active:scale-95'
            : 'text-zinc-600 opacity-40 cursor-not-allowed'
        }`}
      >
        <Redo2 className="w-4 h-4" />
      </button>
    </div>
  );
};
