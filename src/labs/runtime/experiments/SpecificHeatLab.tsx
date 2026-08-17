import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flame } from 'lucide-react';
import type { ExperimentConfig } from '../../types';

interface SpecificHeatLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const SpecificHeatLab: React.FC<SpecificHeatLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {


  const [isHeaterOn, setIsHeaterOn] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const massGrams = Number(inputs.massGrams || 200); // water mass in grams
  const voltage = 12.0; // V
  const current = 2.5; // A
  const powerW = voltage * current; // 30 W
  const cWater = 4184; // J/(kg*K)

  // Temperature rise: Q = VIt = m c ΔT => ΔT = (VIt) / (m c)
  const initialTempC = 20.0;
  const deltaT = (powerW * elapsedSec) / ((massGrams / 1000.0) * cWater);
  const currentTempC = initialTempC + deltaT;

  useEffect(() => {
    if (!isHeaterOn) return;

    const timer = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isHeaterOn]);

  useEffect(() => {
    if (isHeaterOn) onCompleteStep(1);
    if (elapsedSec >= 60) onCompleteStep(2);
    if (elapsedSec >= 180) onCompleteStep(3);
  }, [isHeaterOn, elapsedSec, onCompleteStep]);

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Top Bar */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div><span className="text-zinc-400">Water Mass m:</span> <span className="font-bold text-white">{massGrams} g</span></div>
          <div><span className="text-zinc-400">Heater Power:</span> <span className="font-bold text-white">{powerW.toFixed(1)} W (12V, 2.5A)</span></div>
          <div><span className="text-zinc-400">Heat Energy Q:</span> <span className="font-bold text-white">{(powerW * elapsedSec).toFixed(0)} J</span></div>
        </div>

        <button
          onClick={() => setIsHeaterOn(!isHeaterOn)}
          className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Flame className="w-3.5 h-3.5 fill-black" />
          <span>{isHeaterOn ? 'Turn Off Heater' : 'Turn On Immersion Heater'}</span>
        </button>
      </div>

      {/* Main Canvas Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-2xl">
          {/* Calorimeter Cup SVG */}
          <div className="w-48 h-56 border-2 border-white/60 bg-white/5 rounded-b-3xl relative overflow-hidden flex flex-col justify-end p-2">
            {/* Water Fill */}
            <div
              className="w-full bg-zinc-800/80 rounded-b-2xl transition-all duration-500 border-t border-white/40 flex items-center justify-center"
              style={{ height: `${Math.min(90, (massGrams / 300) * 80)}%` }}
            >
              {isHeaterOn && <div className="w-4 h-4 rounded-full bg-white/30 animate-ping" />}
            </div>

            {/* Heater Coil Dip */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-40 border-x-2 border-white/60 flex flex-col justify-end">
              <div className="w-8 -ml-2 h-8 rounded-full border-2 border-white" />
            </div>
          </div>
        </div>

        {/* Instruments Readout */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Digital Thermometer</div>
            <div className="text-2xl font-bold text-white">{currentTempC.toFixed(2)} °C</div>
            <div className="text-[10px] text-zinc-400">Initial: 20.00 °C (ΔT = {deltaT.toFixed(2)} °C)</div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Calculated Specific Heat c</div>
            <div className="text-xl font-bold text-white">
              {elapsedSec > 0 ? (((powerW * elapsedSec) / ((massGrams / 1000) * deltaT)).toFixed(0)) : '4184'} J/(kg·K)
            </div>
          </div>
        </div>
      </div>

      {/* Water Mass Selection */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-[11px] font-bold text-zinc-300 font-mono">Select Water Mass:</span>
        <div className="flex items-center gap-2">
          {[100, 150, 200, 250, 300].map((m) => (
            <button
              key={m}
              onClick={() => onUpdateInput('massGrams', m)}
              className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-xs transition-all active:scale-95 ${
                massGrams === m ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
              }`}
            >
              {m}g
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
