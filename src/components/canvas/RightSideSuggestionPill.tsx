import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Activity, Box, HelpCircle, CheckSquare, Play } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

export const RightSideSuggestionPill: React.FC = () => {
  const {
    activeDetection,
    dismissDetection,
    openSimulation,
    addAIMessage,
    setActiveTab,
    toggleAIPanel,
    aiPanelOpen,
    addObject,
  } = useBoardStore();

  if (!activeDetection) return null;

  const { detectedName, confidence, mathFormula } = activeDetection;

  const handleAction = (action: string) => {
    if (action === 'Plot Graph' || action === 'Plot' || action === 'Visualize') {
      const eqObj = {
        id: `eq-suggest-${Date.now()}`,
        type: 'equation' as const,
        points: [{ x: 320, y: 200 }],
        x: 320,
        y: 200,
        width: 220,
        height: 60,
        strokeColor: '#06b6d4',
        strokeWidth: 2,
        opacity: 1,
        mathLatex: mathFormula || detectedName || 'y = x^2 - 3',
        zIndex: 2,
        isGlowing: true,
      };
      addObject(eqObj);
      addAIMessage({
        sender: 'ai',
        text: `📊 Plotted interactive function graph for **${mathFormula || detectedName}** directly on Smart Board!`,
      });
      dismissDetection();
    } else if (action === 'Convert 3D' || action === '3D') {
      const shapeObj = {
        id: `shape-suggest-${Date.now()}`,
        type: 'shape' as const,
        shapeSubtype: 'cube' as const,
        points: [{ x: 380, y: 220 }],
        x: 380,
        y: 220,
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
        text: `🧊 Converted **${detectedName}** into 3D Solid Viewer on Smart Board!`,
      });
      dismissDetection();
    } else if (action === 'Explain') {
      if (!aiPanelOpen) toggleAIPanel();
      setActiveTab('Explain');
      addAIMessage({
        sender: 'ai',
        text: `### Contextual Analysis: ${detectedName}\n${
          mathFormula ? `**Formula**: \\(${mathFormula}\\)\n\n` : ''
        }This relation defines core physics and calculus behavior. Adjust parameters or request step-by-step JEE proofs.`,
      });
      dismissDetection();
    } else if (action === 'Simulate') {
      openSimulation('newton');
      addAIMessage({
        sender: 'ai',
        text: `Launched simulation for **${detectedName}**.`,
      });
      dismissDetection();
    } else {
      dismissDetection();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-16 right-6 z-40 w-80 bg-zinc-950/95 border-2 border-cyan-500/60 rounded-2xl shadow-2xl p-3.5 text-white font-mono text-xs backdrop-blur-xl pointer-events-auto select-none"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-cyan-300 text-xs truncate max-w-[170px]">{detectedName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
              {Math.round(confidence * 100)}% CONF
            </span>
            <button
              onClick={dismissDetection}
              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Math Formula / Description */}
        {mathFormula && (
          <div className="bg-black/60 p-2 rounded-xl border border-white/10 text-cyan-300 font-bold text-center mb-2.5">
            {mathFormula}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => handleAction('Plot Graph')}
            className="px-2.5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs flex items-center justify-center gap-1 hover:bg-cyan-400 transition-all shadow-md active:scale-95"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Plot Graph</span>
          </button>
          <button
            onClick={() => handleAction('Convert 3D')}
            className="px-2.5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-1 hover:bg-emerald-400 transition-all shadow-md active:scale-95"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Convert 3D</span>
          </button>
          <button
            onClick={() => handleAction('Explain')}
            className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Explain</span>
          </button>
          <button
            onClick={() => handleAction('Simulate')}
            className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 text-white" />
            <span>Simulate</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
