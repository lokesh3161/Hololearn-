import React, { useState, useCallback, useMemo } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { useDataLogger } from '../../hooks/useDataLogger';

interface EnergyLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const EnergyLab: React.FC<EnergyLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  const [mass, setMass] = useState<number>(0.5); // kg
  const [startHeight, setStartHeight] = useState<number>(5.0); // m
  const [currentHeight, setCurrentHeight] = useState<number>(5.0); // m
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState<boolean>(false);

  const totalEnergyInitial = useMemo(
    () => MechanicsEngine.potentialEnergy(mass, startHeight),
    [mass, startHeight]
  );

  const potentialEnergyCurrent = useMemo(
    () => MechanicsEngine.potentialEnergy(mass, currentHeight),
    [mass, currentHeight]
  );

  const kineticEnergyCurrent = useMemo(
    () => Math.max(0, totalEnergyInitial - potentialEnergyCurrent),
    [totalEnergyInitial, potentialEnergyCurrent]
  );

  const currentVelocity = useMemo(
    () => Math.sqrt((2 * kineticEnergyCurrent) / mass),
    [kineticEnergyCurrent, mass]
  );

  const { record } = useDataLogger(['height', 'velocity', 'pe', 'ke', 'totalEnergy']);

  const tick = useCallback(
    (dt: number) => {
      if (!isRolling || hasFinished) return;

      const nextHeight = currentHeight - 1.5 * dt;

      if (nextHeight <= 0) {
        setCurrentHeight(0);
        setIsRolling(false);
        setHasFinished(true);

        record({
          height: 0,
          velocity: Number(Math.sqrt((2 * totalEnergyInitial) / mass).toFixed(2)),
          pe: 0,
          ke: Number(totalEnergyInitial.toFixed(2)),
          totalEnergy: Number(totalEnergyInitial.toFixed(2)),
        });

        onCompleteStep(2);
      } else {
        setCurrentHeight(nextHeight);
      }
    },
    [isRolling, hasFinished, currentHeight, totalEnergyInitial, mass, record, onCompleteStep]
  );

  useExperimentLoop(tick, isRolling && !hasFinished);

  const handleRelease = () => {
    setIsRolling(true);
    setHasFinished(false);
    onCompleteStep(1);
  };

  const handleReset = () => {
    setIsRolling(false);
    setHasFinished(false);
    setCurrentHeight(startHeight);
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Top Bar */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-400">Initial Height h₀:</span>{' '}
            <span className="font-bold text-white">{startHeight.toFixed(1)} m</span>
          </div>
          <div>
            <span className="text-zinc-400">Total Mechanical Energy E:</span>{' '}
            <span className="font-bold text-white">{totalEnergyInitial.toFixed(1)} J</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRelease}
            disabled={isRolling}
            className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Release Ball</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-zinc-900 border border-white/20 hover:bg-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Track</span>
          </button>
        </div>
      </div>

      {/* Main Track Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col justify-end items-start relative shadow-2xl overflow-hidden">
          {/* Curved Ramp Path */}
          <svg className="w-full h-64 overflow-visible" viewBox="0 0 300 180">
            <path d="M 30 20 Q 80 160, 270 160" fill="none" stroke="#ffffff" strokeWidth="3" />

            {/* Ball */}
            <circle
              cx={30 + ((startHeight - currentHeight) / startHeight) * 240}
              cy={20 + ((startHeight - currentHeight) / startHeight) * 140}
              r="8"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Live Energy Readouts */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Potential Energy (PE = mgh)</div>
            <div className="text-xl font-bold text-white">{potentialEnergyCurrent.toFixed(1)} J</div>
            <div className="text-[10px] text-zinc-400">Current Height: {currentHeight.toFixed(2)} m</div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Kinetic Energy (KE = ½mv²)</div>
            <div className="text-xl font-bold text-white">{kineticEnergyCurrent.toFixed(1)} J</div>
            <div className="text-[10px] text-zinc-400">Velocity: {currentVelocity.toFixed(2)} m/s</div>
          </div>
        </div>
      </div>

      {/* Preset Height Slider */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-zinc-300">Start Height:</span>
        <input
          type="range"
          min="2.0"
          max="10.0"
          step="0.5"
          value={startHeight}
          onChange={(e) => {
            setStartHeight(Number(e.target.value));
            handleReset();
          }}
          className="flex-1 accent-white"
        />
        <span className="font-bold text-white w-14 text-right">{startHeight.toFixed(1)} m</span>
      </div>
    </div>
  );
};
