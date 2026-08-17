import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Flame } from 'lucide-react';
import type { ExperimentConfig } from '../../types';

interface CalorimetryLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const CalorimetryLab: React.FC<CalorimetryLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {


  const [isReactionStarted, setIsReactionStarted] = useState(false);
  const [reactionTime, setReactionTime] = useState(0);

  const massSolutionG = 100; // 50 mL HCl + 50 mL NaOH
  const initialTemp = 21.0;
  const maxTempRise = 6.5; // Exothermic neutralization

  const currentTemp = isReactionStarted
    ? initialTemp + maxTempRise * (1 - Math.exp(-reactionTime / 15))
    : initialTemp;

  const heatReleasedJ = (massSolutionG / 1000) * 4184 * (currentTemp - initialTemp);

  useEffect(() => {
    if (!isReactionStarted) return;
    const timer = setInterval(() => setReactionTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isReactionStarted]);

  useEffect(() => {
    if (isReactionStarted) onCompleteStep(1);
    if (reactionTime >= 10) onCompleteStep(2);
    if (reactionTime >= 30) onCompleteStep(3);
  }, [isReactionStarted, reactionTime, onCompleteStep]);

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Top Status Header */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div><span className="text-zinc-400">Reactants:</span> <span className="font-bold text-white">50 mL 1.0M HCl + 50 mL 1.0M NaOH</span></div>
          <div><span className="text-zinc-400">Heat Released Q:</span> <span className="font-bold text-white">{heatReleasedJ.toFixed(1)} J</span></div>
          <div><span className="text-zinc-400">Enthalpy ΔH:</span> <span className="font-bold text-white">-57.1 kJ/mol</span></div>
        </div>

        <button
          onClick={() => {
            setIsReactionStarted(true);
            setReactionTime(0);
          }}
          disabled={isReactionStarted}
          className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Flame className="w-3.5 h-3.5 fill-black" />
          <span>Mix Reactants in Calorimeter</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-2xl">
          {/* Polystyrene Coffee Cup Calorimeter Container */}
          <div className="w-48 h-56 border-2 border-white/60 bg-white/5 rounded-b-3xl relative overflow-hidden flex flex-col justify-end p-2">
            <div
              className="w-full bg-zinc-800/90 rounded-b-2xl transition-all duration-300 border-t border-white/40 flex items-center justify-center"
              style={{ height: '70%' }}
            >
              {isReactionStarted && <div className="w-6 h-6 rounded-full bg-white/20 animate-ping" />}
            </div>
            {/* Lid */}
            <div className="absolute top-8 left-0 right-0 h-4 bg-zinc-800 border-b-2 border-white/60" />
            {/* Thermometer Probe */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-44 bg-zinc-700 border-x border-white/40" />
          </div>
        </div>

        {/* Readings */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Temperature Sensor</div>
            <div className="text-2xl font-bold text-white">{currentTemp.toFixed(2)} °C</div>
            <div className="text-[10px] text-zinc-400">Initial: 21.00 °C</div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Molar Enthalpy of Neutralization</div>
            <div className="text-xl font-bold text-white">-57.1 kJ/mol</div>
          </div>
        </div>
      </div>

      {/* Control Footer */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-[11px] font-bold text-zinc-300">Reaction Controls:</span>
        <button
          onClick={() => {
            setIsReactionStarted(false);
            setReactionTime(0);
          }}
          className="px-4 py-1.5 bg-zinc-900 border border-white/20 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1.5 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Calorimeter</span>
        </button>
      </div>
    </div>
  );
};
