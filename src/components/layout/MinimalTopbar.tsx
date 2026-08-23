import React, { useState } from 'react';
import { Maximize2, Minimize2, Grid, RotateCcw, RotateCw, Trash2, GraduationCap } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

export const MinimalTopbar: React.FC = () => {
  const {
    showGrid,
    toggleGrid,
    mode,
    setMode,
    undo,
    redo,
    undoStack,
    redoStack,
    clearCanvas,
    pushHistory,
  } = useBoardStore();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const handleClear = () => {
    pushHistory();
    clearCanvas();
  };

  return (
    <div className="absolute top-3 left-4 right-4 z-30 pointer-events-none flex items-center justify-between select-none">
      {/* Top Left: Subdued Branding & Mode */}
      <div className="pointer-events-auto flex items-center gap-3 bg-[#0a0a0a]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-semibold text-xs tracking-tight text-white font-sans">
            HoloLearn AI
          </span>
          <span className="text-[10px] text-zinc-500 font-mono border-l border-white/10 pl-2">
            FOUNDATION
          </span>
        </div>

        <div className="h-3 w-[1px] bg-white/10" />

        {/* Mode Toggle Button */}
        <button
          onClick={() => setMode(mode === 'teacher' ? 'student' : 'teacher')}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5"
          title="Toggle Teacher / Student Mode"
        >
          <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
          <span className="capitalize">{mode} Mode</span>
        </button>
      </div>

      {/* Top Right: Quick Board Actions */}
      <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0a0a0a]/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-white/10 shadow-lg">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${
            canUndo ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${
            canRedo ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-[1px] bg-white/10 mx-0.5" />

        <button
          onClick={toggleGrid}
          className={`p-1.5 rounded-lg transition-colors ${
            showGrid ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Grid"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleClear}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors"
          title="Clear Blackboard"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-[1px] bg-white/10 mx-0.5" />

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Board'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
