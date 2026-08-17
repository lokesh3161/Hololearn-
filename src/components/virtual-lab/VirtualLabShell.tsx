import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Trash2, Minimize2, X } from 'lucide-react';
import { useAnnotations } from '../../hooks/virtual-lab/useAnnotations';
import { AnnotationCanvas } from './AnnotationCanvas';
import { LabToolbar } from './LabToolbar';
import { labSound } from '../../labs/utils/LabSoundManager';

export interface VirtualLabShellProps {
  experimentId?: string;
  title?: string;
  enableAnnotation?: boolean;
  enableFullscreen?: boolean;
  enableSnapshot?: boolean;
  onResetPhysics?: () => void;
  onSaveSnapshotToNotebook?: (dataUrl: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const VirtualLabShell: React.FC<VirtualLabShellProps> = ({
  experimentId = 'virtual-lab',
  title = 'Virtual Laboratory',
  enableAnnotation = true,
  enableFullscreen = true,
  enableSnapshot = true,
  onResetPhysics,
  onSaveSnapshotToNotebook,
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [simulatedFullscreen, setSimulatedFullscreen] = useState(false);

  const isFullscreen = nativeFullscreen || simulatedFullscreen;

  // Annotation Hook
  const {
    mode,
    setMode,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    strokes,
    startStroke,
    addPointToStroke,
    endStroke,
    eraseStrokeAt,
    undo,
    redo,
    canUndo,
    canRedo,
    clearAll,
  } = useAnnotations();

  // Confirmation Modals State
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Track Native Fullscreen State
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setNativeFullscreen(isFull);
      if (!isFull) {
        setSimulatedFullscreen(false);
        setMode('interact');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [setMode]);

  // Keyboard Shortcuts Listener (Scoped to Fullscreen for P/E/I/Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // F key toggles fullscreen anytime
      if (key === 'f' && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const targetElem = containerRef.current || document.documentElement;
        if (!isFullscreen) {
          setSimulatedFullscreen(true);
          targetElem.requestFullscreen?.().catch(() => {});
        } else {
          setSimulatedFullscreen(false);
          document.exitFullscreen?.().catch(() => {});
        }
        return;
      }

      // Annotation tool shortcuts strictly work ONLY while in Fullscreen mode!
      if (!isFullscreen) return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
        return;
      }

      switch (key) {
        case 'p':
          e.preventDefault();
          setMode('pen');
          break;
        case 'e':
          e.preventDefault();
          setMode('eraser');
          break;
        case 'i':
          e.preventDefault();
          setMode('interact');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, setMode, undo, redo, canUndo, canRedo]);

  const handleExitFullscreen = async () => {
    setSimulatedFullscreen(false);
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  };

  const handleConfirmClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
  };

  const handleResetPhysicsOnly = () => {
    if (onResetPhysics) onResetPhysics();
    setShowResetConfirm(false);
    labSound.playReset();
  };

  const handleResetEverything = () => {
    if (onResetPhysics) onResetPhysics();
    clearAll();
    setShowResetConfirm(false);
    labSound.playReset();
  };

  return (
    <div
      ref={containerRef}
      className={`${
        isFullscreen ? 'fixed inset-0 z-[100]' : 'relative w-full h-full'
      } flex flex-col bg-black text-white font-sans overflow-hidden select-none ${className}`}
    >
      {/* Immersive Fullscreen Top Header (Visible ONLY when in Fullscreen Mode) */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.header
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="h-10 bg-zinc-950/90 backdrop-blur-md border-b border-white/15 px-4 flex items-center justify-between z-50 shrink-0 font-mono text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white tracking-wide">{title}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase ml-2">
                Immersive Lab Mode
              </span>
            </div>

            <button
              type="button"
              onClick={handleExitFullscreen}
              aria-label="Exit Fullscreen (Esc)"
              title="Exit Fullscreen (Esc)"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/20 transition-all active:scale-95 text-xs font-mono"
            >
              <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exit Fullscreen</span>
            </button>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Simulation / Experiment Body */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        {children}

        {/* Universal Annotation Canvas Overlay */}
        {enableAnnotation && (
          <AnnotationCanvas
            mode={isFullscreen ? mode : 'interact'}
            strokes={strokes}
            color={color}
            strokeWidth={strokeWidth}
            onStartStroke={startStroke}
            onAddPoint={addPointToStroke}
            onEndStroke={endStroke}
            onEraseAt={eraseStrokeAt}
            containerRef={containerRef}
          />
        )}

        {/* Floating Progressive Disclosure Toolbar (Fullscreen Only) */}
        {enableAnnotation && (
          <LabToolbar
            isFullscreen={isFullscreen}
            mode={mode}
            onSetMode={setMode}
            color={color}
            onSetColor={setColor}
            strokeWidth={strokeWidth}
            onSetStrokeWidth={setStrokeWidth}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onClearAll={() => setShowClearConfirm(true)}
            containerRef={containerRef}
            experimentId={experimentId}
            onSaveToNotebook={onSaveSnapshotToNotebook}
          />
        )}
      </div>

      {/* Clear Annotations Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/20 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl font-mono text-xs"
            >
              <div className="flex items-center gap-3 text-amber-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">Clear All Annotations?</h3>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                This action will erase all drawings from the current experiment canvas.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold font-mono"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Lab Options Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/20 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl font-mono text-xs"
            >
              <div className="flex items-center gap-3 text-emerald-400">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">Reset Experiment</h3>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Choose how you want to reset your laboratory workspace:
              </p>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetPhysicsOnly}
                  className="w-full p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-left font-semibold border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <div className="text-emerald-400 font-bold">Reset Physics Only</div>
                    <div className="text-[10px] text-zinc-400 font-normal">
                      Reset apparatus position & parameters, preserve your drawn notes.
                    </div>
                  </div>
                  <span className="text-xs">➔</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetEverything}
                  className="w-full p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-white text-left font-semibold border border-red-500/30 flex items-center justify-between"
                >
                  <div>
                    <div className="text-red-400 font-bold">Reset Everything</div>
                    <div className="text-[10px] text-zinc-400 font-normal">
                      Reset physics simulation AND clear all screen annotations.
                    </div>
                  </div>
                  <span className="text-xs">➔</span>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
