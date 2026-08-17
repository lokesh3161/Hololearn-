import React, { useEffect, useMemo } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useDataLogger } from '../../hooks/useDataLogger';

interface HookesLawLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const HookesLawLab: React.FC<HookesLawLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  const massGrams = Number(inputs.massGrams || 100);
  const kSpring = 25.0; // N/m

  const forceN = useMemo(
    () => MechanicsEngine.springForce(1, (massGrams / 1000.0) * 9.81),
    [massGrams]
  );

  const isDeformed = massGrams > 350;

  const extensionM = useMemo(
    () => MechanicsEngine.springExtension(forceN, kSpring),
    [forceN, kSpring]
  );

  let extensionCm = extensionM * 100.0;
  if (isDeformed) {
    extensionCm += (massGrams - 350) * 0.15;
  }
  const lengthCm = 15.0 + extensionCm;

  const { record } = useDataLogger(['massGrams', 'forceN', 'extensionCm', 'lengthCm']);

  useEffect(() => {
    if (massGrams >= 50) onCompleteStep(1);
    if (massGrams >= 150) onCompleteStep(2);
    if (massGrams >= 300) onCompleteStep(3);
  }, [massGrams, onCompleteStep]);

  const handleRecord = () => {
    record({
      massGrams,
      forceN: Number(forceN.toFixed(3)),
      extensionCm: Number(extensionCm.toFixed(2)),
      lengthCm: Number(lengthCm.toFixed(2)),
    });
    onRecordDataPoint();
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Top Status Bar */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div><span className="text-zinc-400">Suspended Mass:</span> <span className="font-bold text-white">{massGrams} g</span></div>
          <div><span className="text-zinc-400">Force F:</span> <span className="font-bold text-white">{forceN.toFixed(3)} N</span></div>
          <div><span className="text-zinc-400">Extension x:</span> <span className="font-bold text-white">{extensionCm.toFixed(2)} cm</span></div>
        </div>

        <div className="flex items-center gap-2">
          {isDeformed && (
            <span className="px-2.5 py-1 bg-zinc-900 text-white border border-white rounded-lg font-bold text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-white" /> ELASTIC LIMIT EXCEEDED
            </span>
          )}
          <button
            onClick={handleRecord}
            className="px-3 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95"
          >
            Record Data
          </button>
        </div>
      </div>

      {/* Main Interactive Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex items-center justify-center relative shadow-2xl overflow-hidden">
          {/* Clamp Stand & Spring */}
          <div className="flex flex-col items-center relative h-full">
            <div className="w-48 h-3 bg-white/80 rounded" />
            <div className="w-2 h-44 bg-white/40" />

            {/* Spring Coil SVG */}
            <svg className="w-12 transition-all duration-300" style={{ height: `${lengthCm * 6}px` }} viewBox="0 0 30 100">
              <polyline
                points="15,0 30,10 0,20 30,30 0,40 30,50 0,60 30,70 0,80 30,90 15,100"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </svg>

            {/* Mass Block */}
            <div className="w-12 h-10 bg-zinc-900 border-2 border-white rounded flex items-center justify-center text-[10px] font-bold mt-1">
              {massGrams}g
            </div>
          </div>
        </div>

        {/* Instrument Readout */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Spring Constant k</div>
            <div className="text-2xl font-bold text-white">25.0 N/m</div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Elastic Potential Energy</div>
            <div className="text-xl font-bold text-white">
              {MechanicsEngine.elasticPE(kSpring, extensionM).toFixed(3)} J
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <span className="text-zinc-300">Add Slotted Mass:</span>
        <div className="flex items-center gap-2">
          {[50, 100, 200, 300, 400].map((m) => (
            <button
              key={m}
              onClick={() => onUpdateInput('massGrams', m)}
              className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                massGrams === m ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10'
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
