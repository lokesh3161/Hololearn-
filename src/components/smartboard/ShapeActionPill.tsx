import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Box, CheckCircle2 } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import type { ShapeClassificationResult } from '../../recognition/ShapeClassifierEngine';

interface ShapeActionPillProps {
  result?: ShapeClassificationResult | null;
  onMount3DModel?: (shapeType: string) => void;
  onCleanVector?: () => void;
  onDismiss?: () => void;
}

export const ShapeActionPill: React.FC<ShapeActionPillProps> = ({
  result,
  onMount3DModel,
  onCleanVector,
  onDismiss,
}) => {
  const { activeDetection, dismissDetection, addObject, addAIMessage } = useBoardStore();

  const currentResult = result || (activeDetection?.recognitionResult as ShapeClassificationResult);
  if (!activeDetection && !currentResult) return null;

  const boundingBox = activeDetection?.boundingBox || currentResult?.boundingBox || { x: 200, y: 150, width: 200, height: 200 };
  const detectedName = currentResult ? `${currentResult.kind || '2D'} ${(currentResult.shapeType || 'SHAPE').toUpperCase()}` : activeDetection?.detectedName || 'SHAPE';
  const shapeType = currentResult?.shapeType || 'rectangle';
  const is3DSketch = currentResult?.kind === '3D';

  const top = Math.max(16, boundingBox.y - 36);
  const left = Math.max(16, boundingBox.x);

  const handleExtrude = (target3D: string) => {
    if (onMount3DModel) {
      onMount3DModel(target3D);
    } else {
      const modelObj = {
        id: `3d-model-${Date.now()}`,
        type: 'shape' as const,
        shapeSubtype: (target3D as any) || 'cube',
        points: [{ x: boundingBox.x + boundingBox.width + 40, y: boundingBox.y }],
        x: boundingBox.x + boundingBox.width + 40,
        y: boundingBox.y,
        width: 260,
        height: 240,
        strokeColor: '#10b981',
        strokeWidth: 2,
        opacity: 1,
        zIndex: 3,
      };
      addObject(modelObj);
      addAIMessage({
        sender: 'ai',
        text: `🧊 Extruded **${detectedName}** into Interactive **3D ${target3D.toUpperCase()}** directly on board surface!`,
      });
    }
    if (onDismiss) onDismiss();
    else dismissDetection();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed z-40 bg-zinc-950/95 border border-emerald-500/60 rounded-full px-3.5 py-1.5 shadow-2xl flex items-center gap-2 text-xs font-mono text-white backdrop-blur-xl select-none pointer-events-auto"
        style={{
          top: `${top}px`,
          left: `${left}px`,
        }}
      >
        <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>{detectedName}</span>
        </div>

        <span className="text-zinc-600 text-xs">•</span>

        {is3DSketch ? (
          <button
            type="button"
            onClick={() => handleExtrude(shapeType)}
            className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-black font-bold text-[10px] hover:bg-emerald-400 transition-all flex items-center gap-1 active:scale-95 shadow"
          >
            <Box className="w-3 h-3" />
            <span>Convert to Interactive 3D Model</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={onCleanVector}
              className="px-2 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all active:scale-95 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              <span>Clean Vector</span>
            </button>

            {shapeType === 'circle' && (
              <>
                <button
                  type="button"
                  onClick={() => handleExtrude('cylinder')}
                  className="px-2 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all active:scale-95"
                >
                  Extrude to Cylinder
                </button>
                <button
                  type="button"
                  onClick={() => handleExtrude('sphere')}
                  className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all active:scale-95 shadow"
                >
                  3D Sphere
                </button>
              </>
            )}

            {shapeType === 'triangle' && (
              <>
                <button
                  type="button"
                  onClick={() => handleExtrude('prism')}
                  className="px-2 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all active:scale-95"
                >
                  Extrude to Prism
                </button>
                <button
                  type="button"
                  onClick={() => handleExtrude('cone')}
                  className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all active:scale-95 shadow"
                >
                  3D Cone
                </button>
              </>
            )}

            {shapeType === 'rectangle' && (
              <button
                type="button"
                onClick={() => handleExtrude('cube')}
                className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all active:scale-95 shadow flex items-center gap-1"
              >
                <Box className="w-3 h-3" />
                <span>Extrude to Cube</span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onDismiss || dismissDetection}
          className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
