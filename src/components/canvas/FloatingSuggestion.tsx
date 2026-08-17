import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Play, HelpCircle, BarChart2, CheckSquare } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import type { DetectionResult, SimulationId } from '../../types/canvas';

import { findLabTrigger } from '../../labs/smartboardTriggers';

interface FloatingSuggestionProps {
  onConvertShape?: (detection?: DetectionResult) => void;
}

export const FloatingSuggestion: React.FC<FloatingSuggestionProps> = ({ onConvertShape }) => {
  const {
    activeDetection,
    dismissDetection,
    openSimulation,
    openVirtualLab,
    addAIMessage,
    setActiveTab,
    toggleAIPanel,
    aiPanelOpen,
    transform,
  } = useBoardStore();

  useEffect(() => {
    if (!activeDetection) return;
    console.log('[Pipeline Step 6] Suggestion card is active on screen for:', activeDetection.detectedName);

    // Stay visible for at least 6 seconds before optional auto-dismiss
    const timer = setTimeout(() => {
      // Keep visible unless dismissed manually or action clicked
    }, 6000);

    return () => clearTimeout(timer);
  }, [activeDetection]);

  if (!activeDetection) return null;

  const { boundingBox, detectedName, confidence, suggestedActions, simulationType, mathFormula } =
    activeDetection;

  // Convert canvas world coordinates to screen DOM coordinates
  const top = Math.max(12, boundingBox.y * transform.zoom + transform.y - 64);
  const left = Math.max(
    12,
    (boundingBox.x + boundingBox.width / 2) * transform.zoom + transform.x - 160
  );

  const handleAction = (action: string) => {
    console.log('[Pipeline Step 7] User clicked action on card:', action);

    if (action === 'Convert' && onConvertShape) {
      onConvertShape(activeDetection);
      dismissDetection();
      return;
    }

    if (action === 'Simulate') {
      const targetSim: SimulationId = simulationType || 'newton';
      console.log('[Pipeline Step 8] Launching simulation:', targetSim);
      openSimulation(targetSim);
      addAIMessage({
        sender: 'ai',
        text: `Launched simulation **${targetSim.toUpperCase()}** for **${detectedName}**. Adjust sliders or press arrow keys to observe live behavior.`,
      });
      dismissDetection();
    } else if (action === 'Explain') {
      if (!aiPanelOpen) toggleAIPanel();
      setActiveTab('Explain');
      addAIMessage({
        sender: 'ai',
        text: `### ${detectedName}\n${
          mathFormula ? `**Formula**: \\(${mathFormula}\\)\n\n` : ''
        }This concept defines core physical behavior. Adjust parameters in the simulator or ask me for step-by-step proofs and JEE problem strategies.`,
      });
      dismissDetection();
    } else if (action === 'Visualize' || action === 'Graph') {
      console.log('[Pipeline Step 8] Launching Function Grapher for:', mathFormula || detectedName);
      openSimulation('graph');
      dismissDetection();
    } else if (action === 'Quiz' || action === 'Practice') {
      if (!aiPanelOpen) toggleAIPanel();
      setActiveTab('Quiz');
      addAIMessage({
        sender: 'ai',
        text: `### Practice Questions for ${detectedName}\n\n` +
          `1. **Conceptual**: How does doubling the primary parameter change the resulting value?\n` +
          `2. **Numerical**: Given $m = 4\\text{ kg}$ and $a = 3\\text{ m/s}^2$, calculate the magnitude of the force.\n` +
          `3. **Application**: Name two real-world applications of this relationship in modern engineering.`,
      });
      dismissDetection();
    } else if (action === 'Open Virtual Lab') {
      const matchedTrigger = findLabTrigger(mathFormula || detectedName);
      const labId = matchedTrigger ? matchedTrigger.labId : 'hookes-law';
      openVirtualLab(labId);
      addAIMessage({
        sender: 'ai',
        text: `Launched Virtual Laboratory **${labId.toUpperCase()}** for **${detectedName}**. Follow the step-by-step procedure in the bottom dock!`,
      });
      dismissDetection();
    } else {
      if (!aiPanelOpen) toggleAIPanel();
      addAIMessage({
        sender: 'ai',
        text: `Action [${action}] processed for ${detectedName}.`,
      });
      dismissDetection();
    }
  };

  const confidencePercent = Math.round(confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 50,
      }}
      className="w-84 bg-[#111111] border border-white/20 rounded-xl shadow-2xl p-3 text-xs text-white backdrop-blur-xl pointer-events-auto select-none"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2 font-medium tracking-wide text-white">
          <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          <span className="truncate max-w-[180px] font-semibold">{detectedName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            {confidencePercent}%
          </span>
          <button
            onClick={dismissDetection}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Dismiss suggestion"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {suggestedActions.map((action) => {
          let Icon = Sparkles;
          if (action === 'Simulate') Icon = Play;
          if (action === 'Explain') Icon = HelpCircle;
          if (action === 'Visualize' || (action as string) === 'Graph') Icon = BarChart2;
          if (action === 'Quiz' || (action as string) === 'Practice') Icon = CheckSquare;

          const isSim = action === 'Simulate';

          return (
            <button
              key={action}
              onClick={() => handleAction(action)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 ${
                isSim
                  ? 'bg-white text-black border-white hover:bg-zinc-200 shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSim ? 'text-black' : 'text-white'}`} />
              <span>{action}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
