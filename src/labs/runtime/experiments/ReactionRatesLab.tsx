import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Clock, EyeOff } from 'lucide-react';
import type { ExperimentConfig } from '../../types';

interface ReactionRatesLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const ReactionRatesLab: React.FC<ReactionRatesLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {


  const [isReactionActive, setIsReactionActive] = useState(false);
  const [reactionTimeSec, setReactionTimeSec] = useState(0);
  const [concentrationM, setConcentrationM] = useState(0.20); // Na2S2O3 conc

  // Turbidity increases: X on paper disappears at threshold time
  const timeToDisappear = 45 / (concentrationM / 0.10); // seconds
  const isXDisappeared = reactionTimeSec >= timeToDisappear;
  const turbidity = Math.min(100, (reactionTimeSec / timeToDisappear) * 100);

  useEffect(() => {
    if (!isReactionActive || isXDisappeared) return;

    const timer = setInterval(() => {
      setReactionTimeSec((t) => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isReactionActive, isXDisappeared]);

  useEffect(() => {
    if (isReactionActive) onCompleteStep(1);
    if (isXDisappeared) onCompleteStep(2);
  }, [isReactionActive, isXDisappeared, onCompleteStep]);

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Header */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div><span className="text-zinc-400">[Na₂S₂O₃] Conc:</span> <span className="font-bold text-white">{concentrationM.toFixed(2)} M</span></div>
          <div><span className="text-zinc-400">Stopwatch t:</span> <span className="font-bold text-white">{reactionTimeSec} s</span></div>
          <div><span className="text-zinc-400">Rate (1/t):</span> <span className="font-bold text-white">{reactionTimeSec > 0 ? (1 / reactionTimeSec).toFixed(4) : '---'} s⁻¹</span></div>
        </div>

        <button
          onClick={() => {
            setIsReactionActive(true);
            setReactionTimeSec(0);
          }}
          disabled={isReactionActive && !isXDisappeared}
          className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-black" />
          <span>Mix HCl with Na₂S₂O₃</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-2xl">
          {/* Flask on Paper with X */}
          <div className="relative flex flex-col items-center">
            {/* Erlenmeyer Flask */}
            <div className="w-36 h-40 border-2 border-white/60 rounded-b-3xl relative overflow-hidden flex flex-col justify-end bg-white/5 p-1">
              {/* Solution Turbidity Fill */}
              <div
                className="w-full rounded-b-2xl transition-all duration-500 flex items-center justify-center border-t border-white/40"
                style={{
                  height: '60%',
                  backgroundColor: `rgba(255, 255, 255, ${0.05 + (turbidity / 100) * 0.7})`,
                }}
              >
                {isReactionActive && !isXDisappeared && <div className="w-4 h-4 rounded-full bg-white/40 animate-ping" />}
              </div>
            </div>

            {/* Paper beneath with 'X' mark */}
            <div className="w-48 h-12 bg-zinc-900 border-2 border-white/40 rounded mt-2 flex items-center justify-center relative">
              <span
                className="font-bold text-2xl text-white transition-opacity duration-500"
                style={{ opacity: Math.max(0, 1 - turbidity / 90) }}
              >
                ✖
              </span>
            </div>
          </div>
        </div>

        {/* Readings */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Precipitate Turbidity</div>
            <div className="text-2xl font-bold text-white">{turbidity.toFixed(0)}%</div>
            <div className="text-[10px] text-zinc-400">{isXDisappeared ? '✖ Disappeared!' : '✖ Visible through solution'}</div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Disappearance Time</div>
            <div className="text-xl font-bold text-white">{timeToDisappear.toFixed(1)} s</div>
          </div>
        </div>
      </div>

      {/* Preset Concentration Buttons */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-[11px] font-bold text-zinc-300">Select Concentration [Na₂S₂O₃]:</span>
        <div className="flex items-center gap-2">
          {[0.05, 0.10, 0.15, 0.20, 0.25].map((c) => (
            <button
              key={c}
              onClick={() => {
                setConcentrationM(c);
                setIsReactionActive(false);
                setReactionTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-xs transition-all active:scale-95 ${
                concentrationM === c ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
              }`}
            >
              {c.toFixed(2)} M
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
