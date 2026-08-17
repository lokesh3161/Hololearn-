import React, { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useDataLogger } from '../../hooks/useDataLogger';

interface TorqueLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const TorqueLab: React.FC<TorqueLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  const [massLeft, setMassLeft] = useState<number>(0.5); // kg
  const [distLeft, setDistLeft] = useState<number>(0.4); // m

  const [massRight, setMassRight] = useState<number>(0.5); // kg
  const [distRight, setDistRight] = useState<number>(0.4); // m

  const torqueLeft = useMemo(
    () => MechanicsEngine.torque(massLeft * 9.81, distLeft),
    [massLeft, distLeft]
  );
  const torqueRight = useMemo(
    () => MechanicsEngine.torque(massRight * 9.81, distRight),
    [massRight, distRight]
  );

  const netTorque = torqueRight - torqueLeft;
  const isBalanced = Math.abs(netTorque) < 0.05;

  const beamAngle = useMemo(
    () => Math.max(-25, Math.min(25, netTorque * 15)),
    [netTorque]
  );

  const { record } = useDataLogger(['mL', 'dL', 'tL', 'mR', 'dR', 'tR', 'netTorque']);

  const handleRecord = () => {
    record({
      mL: massLeft,
      dL: distLeft,
      tL: Number(torqueLeft.toFixed(2)),
      mR: massRight,
      dR: distRight,
      tR: Number(torqueRight.toFixed(2)),
      netTorque: Number(netTorque.toFixed(2)),
    });

    if (isBalanced) onCompleteStep(2);
    else onCompleteStep(1);
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Header */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-400">Anticlockwise Torque (Left):</span>{' '}
            <span className="font-bold text-white">{torqueLeft.toFixed(2)} N·m</span>
          </div>
          <div>
            <span className="text-zinc-400">Clockwise Torque (Right):</span>{' '}
            <span className="font-bold text-white">{torqueRight.toFixed(2)} N·m</span>
          </div>
          <div>
            <span className="text-zinc-400">Status:</span>{' '}
            <span className={`font-bold ${isBalanced ? 'text-white' : 'text-zinc-400'}`}>
              {isBalanced ? '✓ PERFECTLY BALANCED' : 'UNBALANCED TIPPING'}
            </span>
          </div>
        </div>

        <button
          onClick={handleRecord}
          className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95"
        >
          Record Trial Data
        </button>
      </div>

      {/* Main Lever Beam Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col justify-center items-center relative shadow-2xl">
          {/* Fulcrum Triangle */}
          <div className="w-12 h-12 border-b-[24px] border-b-white border-x-[16px] border-x-transparent z-10" />

          {/* Seesaw Beam */}
          <div
            className="w-full max-w-md h-4 bg-zinc-800 border-2 border-white rounded-full transition-transform duration-300 relative flex items-center justify-between px-4 -mt-3"
            style={{ transform: `rotate(${beamAngle}deg)` }}
          >
            {/* Left Mass */}
            <div className="absolute top-4 left-6 flex flex-col items-center">
              <div className="w-0.5 h-8 bg-white" />
              <div className="w-8 h-8 bg-zinc-900 border-2 border-white rounded flex items-center justify-center text-[8px] font-bold">
                {massLeft}kg
              </div>
            </div>

            {/* Right Mass */}
            <div className="absolute top-4 right-6 flex flex-col items-center">
              <div className="w-0.5 h-8 bg-white" />
              <div className="w-8 h-8 bg-zinc-900 border-2 border-white rounded flex items-center justify-center text-[8px] font-bold">
                {massRight}kg
              </div>
            </div>
          </div>
        </div>

        {/* Readouts */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Torque Equation</div>
            <div className="text-base font-bold text-white">τ = F × r = m·g·r</div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Net Torque Στ</div>
            <div className="text-2xl font-bold text-white">{netTorque.toFixed(2)} N·m</div>
          </div>
        </div>
      </div>

      {/* Adjusters */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-300">Left Distance (r_L):</span>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={distLeft}
            onChange={(e) => setDistLeft(Number(e.target.value))}
            className="w-24 accent-white"
          />
          <span className="font-bold text-white">{distLeft.toFixed(2)}m</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-300">Right Distance (r_R):</span>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={distRight}
            onChange={(e) => setDistRight(Number(e.target.value))}
            className="w-24 accent-white"
          />
          <span className="font-bold text-white">{distRight.toFixed(2)}m</span>
        </div>
      </div>
    </div>
  );
};
