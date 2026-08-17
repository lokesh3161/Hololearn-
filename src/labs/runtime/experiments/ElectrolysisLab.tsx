import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';
import type { ExperimentConfig } from '../../types';

interface ElectrolysisLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const ElectrolysisLab: React.FC<ElectrolysisLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {


  const [isPowerOn, setIsPowerOn] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const currentAmps = 1.5; // DC Current A
  const molarMassCu = 63.55; // g/mol
  const faradayConst = 96485; // C/mol
  const z = 2; // Cu2+ + 2e- -> Cu

  // Faraday's First Law: m = (I * t * M) / (z * F)
  const massDepositedGrams = (currentAmps * elapsedSec * molarMassCu) / (z * faradayConst);

  useEffect(() => {
    if (!isPowerOn) return;
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isPowerOn]);

  useEffect(() => {
    if (isPowerOn) onCompleteStep(1);
    if (elapsedSec >= 60) onCompleteStep(2);
    if (elapsedSec >= 300) onCompleteStep(3);
  }, [isPowerOn, elapsedSec, onCompleteStep]);

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Top Header */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div><span className="text-zinc-400">Electrolyte:</span> <span className="font-bold text-white">0.5M CuSO₄ Solution</span></div>
          <div><span className="text-zinc-400">DC Current:</span> <span className="font-bold text-white">{currentAmps.toFixed(2)} A</span></div>
          <div><span className="text-zinc-400">Charge Q = I·t:</span> <span className="font-bold text-white">{(currentAmps * elapsedSec).toFixed(1)} C</span></div>
        </div>

        <button
          onClick={() => setIsPowerOn(!isPowerOn)}
          className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5 fill-black" />
          <span>{isPowerOn ? 'Turn Off Power' : 'Turn On DC Power Supply'}</span>
        </button>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-2xl">
          {/* Electrolytic Cell Beaker */}
          <div className="w-56 h-56 border-2 border-white/60 bg-white/5 rounded-b-3xl relative overflow-hidden flex flex-col justify-end p-2">
            {/* CuSO4 Liquid */}
            <div className="w-full h-[75%] bg-zinc-800/80 rounded-b-2xl border-t border-white/40 flex items-center justify-between px-8 relative">
              {/* Cathode (-) Copper Plate */}
              <div className="w-6 h-40 bg-zinc-700 border-2 border-white rounded flex flex-col justify-end items-center text-[7px] font-bold">
                <span className="mb-1 text-white">(-)</span>
              </div>

              {/* Anode (+) Copper Plate */}
              <div className="w-6 h-40 bg-zinc-700 border-2 border-white rounded flex flex-col justify-end items-center text-[7px] font-bold">
                <span className="mb-1 text-white">(+)</span>
              </div>

              {/* Bubbles / Ions moving */}
              {isPowerOn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4 h-4 rounded-full bg-white/30 animate-ping" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Digital Readings */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Cathode Mass Increase</div>
            <div className="text-2xl font-bold text-white">{massDepositedGrams.toFixed(4)} g</div>
            <div className="text-[10px] text-zinc-400">Faraday's Law: m = (I·t·M)/(z·F)</div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Elapsed Electrolysis Time</div>
            <div className="text-xl font-bold text-white">{elapsedSec} s</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-[11px] font-bold text-zinc-300">Cell Controls:</span>
        <button
          onClick={() => {
            setIsPowerOn(false);
            setElapsedSec(0);
          }}
          className="px-4 py-1.5 bg-zinc-900 border border-white/20 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1.5 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Cell & Electrodes</span>
        </button>
      </div>
    </div>
  );
};
