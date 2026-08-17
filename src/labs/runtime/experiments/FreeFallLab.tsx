import React, { useState, useCallback, useMemo } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { useDataLogger } from '../../hooks/useDataLogger';

interface FreeFallLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const FreeFallLab: React.FC<FreeFallLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  const [heightM, setHeightM] = useState<number>(1.0);
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [fallTime, setFallTime] = useState<number>(0);
  const [hasLanded, setHasLanded] = useState<boolean>(false);

  const theoreticalTime = useMemo(() => MechanicsEngine.freeFallTime(heightM), [heightM]);
  const calculatedG = useMemo(() => MechanicsEngine.gFromFall(heightM, fallTime || theoreticalTime), [heightM, fallTime, theoreticalTime]);

  const { record } = useDataLogger(['heightM', 'fallTime', 'calculatedG']);

  const tick = useCallback(
    (dt: number) => {
      if (!isDropping || hasLanded) return;
      const nextTime = fallTime + dt;
      if (nextTime >= theoreticalTime) {
        setFallTime(theoreticalTime);
        setIsDropping(false);
        setHasLanded(true);

        const measuredT = MechanicsEngine.addNoise(theoreticalTime, 0.5);
        const gExp = MechanicsEngine.gFromFall(heightM, measuredT);

        record({
          heightM,
          fallTime: Number((measuredT * 1000).toFixed(1)), // ms
          calculatedG: Number(gExp.toFixed(2)),
        });

        onCompleteStep(2);
      } else {
        setFallTime(nextTime);
      }
    },
    [isDropping, hasLanded, fallTime, theoreticalTime, heightM, record, onCompleteStep]
  );

  useExperimentLoop(tick, isDropping && !hasLanded);

  const handleDrop = () => {
    setIsDropping(true);
    setHasLanded(false);
    setFallTime(0);
    onCompleteStep(1);
  };

  const handleReset = () => {
    setIsDropping(false);
    setHasLanded(false);
    setFallTime(0);
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Header */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div><span className="text-zinc-400">Drop Height h:</span> <span className="font-bold text-white">{heightM.toFixed(2)} m</span></div>
          <div><span className="text-zinc-400">Theoretical Time:</span> <span className="font-bold text-white">{(theoreticalTime * 1000).toFixed(1)} ms</span></div>
          <div><span className="text-zinc-400">Calculated g:</span> <span className="font-bold text-white">{calculatedG.toFixed(2)} m/s²</span></div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDrop}
            disabled={isDropping}
            className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Trigger Gate</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-zinc-900 border border-white/20 hover:bg-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Gate Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex items-center justify-center relative shadow-2xl">
          <div className="flex items-center gap-12 h-64 border-l-2 border-white/40 pl-6 relative">
            {/* Electromagnet Top */}
            <div className="absolute top-0 -left-4 w-8 h-4 bg-zinc-800 border-2 border-white rounded" />

            {/* Falling Ball */}
            <div
              className="w-5 h-5 rounded-full bg-white border border-zinc-400 absolute transition-all duration-75"
              style={{
                top: `${(fallTime / theoreticalTime) * 85}%`,
                left: '-9px',
              }}
            />

            {/* Trapdoor Sensor Bottom */}
            <div className="absolute bottom-0 -left-6 w-12 h-3 bg-zinc-800 border-2 border-white rounded" />
          </div>
        </div>

        {/* Readouts */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Free Fall Equation</div>
            <div className="text-sm font-bold text-white">g = 2h / t²</div>
          </div>
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Electronic Gate Timer</div>
            <div className="text-2xl font-bold text-white font-mono">{(fallTime * 1000).toFixed(1)} ms</div>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-zinc-300">Gate Height h:</span>
        <div className="flex items-center gap-2">
          {[0.5, 1.0, 1.5, 2.0].map((h) => (
            <button
              key={h}
              onClick={() => {
                setHeightM(h);
                handleReset();
              }}
              className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                heightM === h ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10'
              }`}
            >
              {h}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
