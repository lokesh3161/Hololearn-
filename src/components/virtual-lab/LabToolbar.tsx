import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, PenTool as PenIcon, Eraser, Trash2, X, ChevronUp, ChevronDown, Check } from 'lucide-react';
import type { LabInteractionMode } from '../../hooks/virtual-lab/useAnnotations';
import { ColorPalette } from './ColorPalette';
import { StrokeWidthSelector } from './StrokeWidthSelector';
import { UndoRedo } from './UndoRedo';
import { SnapshotTool } from './SnapshotTool';
import { labSound } from '../../labs/utils/LabSoundManager';

interface LabToolbarProps {
  isFullscreen: boolean;
  mode: LabInteractionMode;
  onSetMode: (mode: LabInteractionMode) => void;
  color: string;
  onSetColor: (color: string) => void;
  strokeWidth: number;
  onSetStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  experimentId?: string;
  onSaveToNotebook?: (dataUrl: string) => void;
  className?: string;
}

export const LabToolbar: React.FC<LabToolbarProps> = ({
  isFullscreen,
  mode,
  onSetMode,
  color,
  onSetColor,
  strokeWidth,
  onSetStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearAll,
  containerRef,
  experimentId,
  onSaveToNotebook,
  className = '',
}) => {
  // Progressive Disclosure States
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isPenConfigOpen, setIsPenConfigOpen] = useState(false);

  // ANNOTATION TOOLS ARE FULLSCREEN-ONLY. If not in fullscreen mode, render NOTHING!
  if (!isFullscreen) {
    return null;
  }

  const handleToggleTools = () => {
    setIsToolsExpanded((prev) => !prev);
    if (isToolsExpanded) {
      setIsPenConfigOpen(false);
    }
    labSound.playPause();
  };

  const handleSelectPenMode = () => {
    onSetMode('pen');
    setIsPenConfigOpen(true);
  };

  const handleSelectInteractMode = () => {
    onSetMode('interact');
    setIsPenConfigOpen(false);
  };

  const handleSelectEraserMode = () => {
    onSetMode('eraser');
    setIsPenConfigOpen(false);
  };

  return (
    <div className={`absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2 font-mono text-xs select-none ${className}`}>
      {/* 1. PEN CONFIGURATION POPOVER (Shown only when Pen mode is active & Pen Config is open) */}
      <AnimatePresence>
        {isToolsExpanded && isPenConfigOpen && mode === 'pen' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="p-3 rounded-2xl bg-zinc-950/95 backdrop-blur-md border border-white/20 shadow-2xl space-y-3 w-64"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                <PenIcon className="w-3.5 h-3.5 text-blue-400" /> Pen Configuration
              </span>
              <button
                type="button"
                onClick={() => setIsPenConfigOpen(false)}
                className="text-zinc-400 hover:text-white p-0.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase">Color:</label>
              <ColorPalette currentColor={color} onSelectColor={onSetColor} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase">Thickness:</label>
              <StrokeWidthSelector currentWidth={strokeWidth} onSelectWidth={onSetStrokeWidth} />
            </div>

            <button
              type="button"
              onClick={() => setIsPenConfigOpen(false)}
              className="w-full py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <Check className="w-3.5 h-3.5" /> Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. EXPANDED FULLSCREEN TOOLBAR OR COMPACT [ ✎ Tools ] BUTTON */}
      <AnimatePresence mode="wait">
        {!isToolsExpanded ? (
          /* Initial State in Fullscreen: Small floating [ ✎ Tools ] button */
          <motion.button
            key="tools-pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            type="button"
            onClick={handleToggleTools}
            aria-label="Open Annotation Tools"
            title="Open Annotation Tools"
            className="px-3 py-2 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur-md border border-white/20 shadow-2xl text-white font-bold flex items-center gap-2 transition-all active:scale-95 hover:border-white/40"
          >
            <PenIcon className="w-4 h-4 text-emerald-400" />
            <span>✎ Tools</span>
          </motion.button>
        ) : (
          /* Expanded Fullscreen Toolbar */
          <motion.div
            key="tools-bar"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-950/95 backdrop-blur-md border border-white/20 shadow-2xl"
          >
            {/* INTERACT */}
            <button
              type="button"
              onClick={handleSelectInteractMode}
              aria-label="Interact Mode"
              title="Interact Mode (I)"
              className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs ${
                mode === 'interact'
                  ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10'
              }`}
            >
              <Hand className="w-4 h-4" />
              <span className="hidden sm:inline">Interact</span>
            </button>

            {/* PEN */}
            <button
              type="button"
              onClick={handleSelectPenMode}
              aria-label="Pen Mode"
              title="Digital Pen (P)"
              className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs ${
                mode === 'pen'
                  ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/30 ring-1 ring-blue-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10'
              }`}
            >
              <PenIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Pen</span>
            </button>

            {/* ERASER */}
            <button
              type="button"
              onClick={handleSelectEraserMode}
              aria-label="Eraser Mode"
              title="Stroke Eraser (E)"
              className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs ${
                mode === 'eraser'
                  ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/30 ring-1 ring-amber-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10'
              }`}
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden sm:inline">Eraser</span>
            </button>

            {/* CLEAR ALL */}
            <button
              type="button"
              onClick={onClearAll}
              aria-label="Clear All Annotations"
              title="Clear All Annotations"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 border border-white/10 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-white/15 shrink-0" />

            {/* UNDO / REDO */}
            <UndoRedo canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />

            <div className="h-4 w-[1px] bg-white/15 shrink-0" />

            {/* SNAPSHOT */}
            <SnapshotTool
              containerRef={containerRef}
              experimentId={experimentId}
              onSaveToNotebook={onSaveToNotebook}
            />

            {/* MINIMIZE TOOLBAR BACK TO [ ✎ Tools ] */}
            <button
              type="button"
              onClick={handleToggleTools}
              aria-label="Collapse Tools"
              title="Collapse Tools"
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 border border-white/10 transition-all active:scale-95 ml-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
