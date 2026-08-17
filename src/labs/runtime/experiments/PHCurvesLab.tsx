import React, { useState, useEffect } from 'react';
import { RotateCcw, Droplet, Gauge } from 'lucide-react';
import type { ExperimentConfig } from '../../types';

interface PHCurvesLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const PHCurvesLab: React.FC<PHCurvesLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {


  const [volAdded, setVolAdded] = useState(0.0);

  // Strong Acid + Strong Base pH Curve Simulation
  const calcPH = (v: number) => {
    if (v < 23.5) return Number((1.0 + (v / 25.0) * 2.0).toFixed(2));
    if (v >= 23.5 && v <= 24.0) return Number((7.0).toFixed(2));
    return Number((12.5 + Math.min(1.2, (v - 24.0) * 0.1)).toFixed(2));
  };

  const currentPH = calcPH(volAdded);

  const handleAddVolume = (ml: number) => {
    setVolAdded((prev) => {
      const next = Number((prev + ml).toFixed(2));
      onUpdateInput('vBaseAdded', next);
      return next;
    });
  };

  useEffect(() => {
    if (volAdded >= 5) onCompleteStep(1);
    if (volAdded >= 23) onCompleteStep(2);
    if (volAdded >= 30) onCompleteStep(3);
  }, [volAdded, onCompleteStep]);

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Top Header */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div><span className="text-zinc-400">Titrant NaOH:</span> <span className="font-bold text-white">0.100 M</span></div>
          <div><span className="text-zinc-400">Analyte HCl:</span> <span className="font-bold text-white">25.00 mL 0.100 M</span></div>
          <div><span className="text-zinc-400">Volume Added:</span> <span className="font-bold text-white">{volAdded.toFixed(2)} mL</span></div>
        </div>

        <button
          onClick={() => setVolAdded(0)}
          className="px-3 py-1.5 bg-zinc-900 border border-white/20 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1.5 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Titration</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        {/* SVG pH Curve Plotter */}
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col justify-between relative shadow-2xl">
          <div className="text-[10px] text-zinc-400 uppercase font-bold">Live pH Inflection Curve</div>

          {/* SVG Graph Plot */}
          <svg className="w-full h-56 overflow-visible" viewBox="0 0 300 180">
            {/* Grid Lines */}
            <line x1="30" y1="20" x2="30" y2="160" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="30" y1="160" x2="280" y2="160" stroke="#ffffff" strokeWidth="1.5" />

            {/* Equivalence Point Line */}
            <line x1="180" y1="20" x2="180" y2="160" stroke="#ffffff" strokeWidth="1" strokeDasharray="4,4" />

            {/* pH S-Curve Path */}
            <path
              d="M 30 150 C 120 145, 170 140, 180 90 C 190 40, 240 35, 280 30"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
            />

            {/* Current Point Dot */}
            <circle
              cx={30 + (volAdded / 35.0) * 250}
              cy={160 - (currentPH / 14.0) * 140}
              r="5"
              fill="#ffffff"
              stroke="#0a0a0a"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Meter */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" /> Digital pH Probe
            </div>
            <div className="text-3xl font-bold text-white">{currentPH.toFixed(2)}</div>
            <div className="text-[10px] text-zinc-400">
              {currentPH < 7 ? 'Acidic Region' : currentPH === 7 ? 'Equivalence Point (pH 7.00)' : 'Basic Region'}
            </div>
          </div>
        </div>
      </div>

      {/* Add Volume Buttons */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-[11px] font-bold text-zinc-300">Add NaOH Titrant:</span>
        <div className="flex items-center gap-2">
          {[0.5, 1.0, 2.0, 5.0].map((ml) => (
            <button
              key={ml}
              onClick={() => handleAddVolume(ml)}
              className="px-4 py-1.5 rounded-lg border font-mono font-bold text-xs transition-all active:scale-95 bg-white text-black border-white"
            >
              +{ml} mL
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
