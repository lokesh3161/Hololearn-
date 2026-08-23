import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Activity, Box } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

export const ContextualSuggestionPill: React.FC = () => {
  const { activeDetection, dismissDetection, addObject, addAIMessage } = useBoardStore();

  if (!activeDetection) return null;

  const { detectedName, boundingBox, mathFormula } = activeDetection;

  const top = Math.max(16, (boundingBox?.y || 100) - 42);
  const left = Math.max(16, (boundingBox?.x || 100) + (boundingBox?.width || 100) / 2 - 140);

  const isShape = (detectedName || '').toLowerCase().includes('triangle') ||
    (detectedName || '').toLowerCase().includes('circle') ||
    (detectedName || '').toLowerCase().includes('square') ||
    (detectedName || '').toLowerCase().includes('rectangle');

  const handlePlot = () => {
    const graphObj = {
      id: `graph-frameless-${Date.now()}`,
      type: 'equation' as const,
      points: [{ x: (boundingBox?.x || 100) + (boundingBox?.width || 100) + 40, y: boundingBox?.y || 100 }],
      x: (boundingBox?.x || 100) + (boundingBox?.width || 100) + 40,
      y: boundingBox?.y || 100,
      width: 360,
      height: 240,
      strokeColor: '#38bdf8',
      strokeWidth: 2,
      opacity: 1,
      mathLatex: mathFormula || detectedName || 'y = x^2 - 3',
      zIndex: 2,
    };

    addObject(graphObj);
    addAIMessage({
      sender: 'ai',
      text: `📊 Plotted frameless graph for **${mathFormula || detectedName}** directly on board surface!`,
    });
    dismissDetection();
  };

  const handleConvert3D = () => {
    const shapeObj = {
      id: `shape-3d-${Date.now()}`,
      type: 'shape' as const,
      shapeSubtype: 'cube' as const,
      points: [{ x: (boundingBox?.x || 100) + (boundingBox?.width || 100) + 40, y: boundingBox?.y || 100 }],
      x: (boundingBox?.x || 100) + (boundingBox?.width || 100) + 40,
      y: boundingBox?.y || 100,
      width: 180,
      height: 180,
      strokeColor: '#10b981',
      strokeWidth: 2,
      opacity: 1,
      zIndex: 2,
    };

    addObject(shapeObj);
    addAIMessage({
      sender: 'ai',
      text: `🧊 Converted **${detectedName}** into 3D Solid Prism on board surface!`,
    });
    dismissDetection();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed z-40 bg-zinc-950/95 border border-cyan-500/50 rounded-full px-3.5 py-1.5 shadow-2xl flex items-center gap-2.5 text-xs font-mono text-white backdrop-blur-md select-none pointer-events-auto"
        style={{
          top: `${top}px`,
          left: `${left}px`,
        }}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold text-cyan-200 text-[11px] truncate max-w-[150px]">
            {detectedName}
          </span>
        </div>

        <span className="text-zinc-600 text-xs">•</span>

        {isShape ? (
          <button
            type="button"
            onClick={handleConvert3D}
            className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-black font-bold text-[10px] hover:bg-emerald-400 transition-all flex items-center gap-1 active:scale-95"
          >
            <Box className="w-3 h-3" />
            <span>Convert 3D Prism</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlot}
            className="px-2.5 py-0.5 rounded-full bg-cyan-500 text-black font-bold text-[10px] hover:bg-cyan-400 transition-all flex items-center gap-1 active:scale-95"
          >
            <Activity className="w-3 h-3" />
            <span>Plot</span>
          </button>
        )}

        <button
          type="button"
          onClick={dismissDetection}
          className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
