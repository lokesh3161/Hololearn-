import React, { useState, useCallback, useMemo } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { useDataLogger } from '../../hooks/useDataLogger';

interface SimplePendulumLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const SimplePendulumLab: React.FC<SimplePendulumLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  const [lengthM, setLengthM] = useState<number>(1.0);
  const [angleDeg, setAngleDeg] = useState<number>(10);
  const [isOscillating, setIsOscillating] = useState<boolean>(false);
  const [simTime, setSimTime] = useState<number>(0);

  const period = useMemo(() => MechanicsEngine.pendulumPeriod(lengthM), [lengthM]);
  const gCalculated = useMemo(() => MechanicsEngine.pendulumG(period, lengthM), [period, lengthM]);

  const { record } = useDataLogger(['lengthM', 'period', 'gCalculated']);

  const tick = useCallback(
    (dt: number) => {
      if (!isOscillating) return;
      setSimTime((t) => t + dt);
    },
    [isOscillating]
  );

  useExperimentLoop(tick, isOscillating);

  const handleStart = () => {
    setIsOscillating(true);
    setSimTime(0);

    record({
      lengthM,
      period: Number(period.toFixed(2)),
      gCalculated: Number(gCalculated.toFixed(2)),
    });

    onCompleteStep(1);
  };

  const handleReset = () => {
    setIsOscillating(false);
    setSimTime(0);
  };

  const currentAngle = isOscillating ? angleDeg * Math.cos((2 * Math.PI * simTime) / period) : angleDeg;

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Status Bar */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div><span className="text-zinc-400">String Length L:</span> <span className="font-bold text-white">{lengthM.toFixed(2)} m</span></div>
          <div><span className="text-zinc-400">Theoretical Period T:</span> <span className="font-bold text-white">{period.toFixed(2)} s</span></div>
          <div><span className="text-zinc-400">Calculated g:</span> <span className="font-bold text-white">{gCalculated.toFixed(2)} m/s²</span></div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStart}
            disabled={isOscillating}
            className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Release Pendulum</span>
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

      {/* Main Swing Canvas */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col items-center justify-start relative shadow-2xl overflow-hidden">
          <div className="w-16 h-3 bg-white rounded mb-2" />
          <svg className="w-full h-64 overflow-visible" viewBox="0 0 200 200">
            <g transform="translate(100, 0)">
              <g transform={`rotate(${currentAngle})`}>
                <line x1="0" y1="0" x2="0" y2={lengthM * 140} stroke="#ffffff" strokeWidth="2" />
                <circle cx="0" cy={lengthM * 140} r="12" fill="#18181b" stroke="#ffffff" strokeWidth="2.5" />
              </g>
            </g>
          </svg>
        </div>

        {/* Readout */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Pendulum Formula</div>
            <div className="text-sm font-bold text-white">T = 2π √(L / g)</div>
          </div>
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Timer Readout</div>
            <div className="text-2xl font-bold text-white">{simTime.toFixed(2)} s</div>
          </div>
        </div>
      </div>

      {/* Adjusters */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-zinc-300">String Length L:</span>
        <div className="flex items-center gap-2">
          {[0.5, 0.75, 1.0, 1.25, 1.5].map((l) => (
            <button
              key={l}
              onClick={() => {
                setLengthM(l);
                handleReset();
              }}
              className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                lengthM === l ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10'
              }`}
            >
              {l}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
