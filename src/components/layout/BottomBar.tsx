import React from 'react';
import { Undo2, Redo2, Grid, Trash2, Sliders, Layers, RefreshCw, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

export const BottomBar: React.FC = () => {
  const {
    transform,
    setZoom,
    setTransform,
    showGrid,
    toggleGrid,
    undo,
    redo,
    undoStack,
    redoStack,
    selectedIds,
    deleteSelectedObjects,
    clearCanvas,
    strokeWidth,
    setStrokeWidth,
    mode,
  } = useBoardStore();

  const handleZoomIn = () => setZoom(transform.zoom * 1.15);
  const handleZoomOut = () => setZoom(transform.zoom * 0.85);
  const handleResetZoom = () => setTransform({ x: 0, y: 0, zoom: 1.0 });

  return (
    <footer className="h-10 bg-black border-t border-white/10 px-4 flex items-center justify-between text-xs text-white select-none z-20">
      {/* Left: Context-sensitive controls or Canvas Stats */}
      <div className="flex items-center gap-3">
        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg border border-white/15">
            <span className="text-zinc-300 font-mono text-[11px]">
              {selectedIds.length} object{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="h-3 w-[1px] bg-white/20 mx-1" />

            {/* Stroke Width Slider */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
              <Sliders className="w-3 h-3 text-zinc-400" />
              <input
                type="range"
                min="1"
                max="10"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-16 accent-white bg-zinc-800"
              />
            </div>

            {/* Delete Selected Button */}
            <button
              onClick={deleteSelectedObjects}
              className="flex items-center gap-1 text-zinc-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors text-[11px]"
              title="Delete Selected"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-mono">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span>SMARTBOARD PAGE 1 / 1</span>
          </div>
        )}
      </div>

      {/* Right: Default Viewport & History Controls */}
      <div className="flex items-center gap-3">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={undoStack.length === 0 || mode === 'student'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 hover:bg-white/10 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0 || mode === 'student'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 hover:bg-white/10 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-3 w-[1px] bg-white/10" />

        {/* Grid Toggle */}
        <button
          onClick={toggleGrid}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors ${
            showGrid
              ? 'bg-white/15 border-white/20 text-white'
              : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title="Toggle Grid (G)"
        >
          <Grid className="w-3 h-3" />
          <span>Grid</span>
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/10">
          <button
            onClick={handleZoomOut}
            className="p-0.5 text-zinc-400 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={handleResetZoom}
            className="hover:text-white text-zinc-200 px-1 font-bold transition-colors"
            title="Reset Zoom to 100%"
          >
            {Math.round(transform.zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-0.5 text-zinc-400 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* Clear Board */}
        {mode === 'teacher' && (
          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear Board"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </footer>
  );
};
