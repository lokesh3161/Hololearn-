import React, { useState, useMemo } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useDataLogger } from '../../hooks/useDataLogger';

interface CentripetalLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const CentripetalLab: React.FC<CentripetalLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  const [mass, setMass] = useState<number>(0.2); // kg
  const [radius, setRadius] = useState<number>(0.5); // m
  const [rpm, setRpm] = useState<number>(60); // RPM

  const omega = useMemo(() => (rpm * 2 * Math.PI) / 60, [rpm]); // rad/s
  const vLinear = useMemo(() => MechanicsEngine.velocityFinal(0, 0, 0) + omega * radius, [omega, radius]); // m/s

  const centripetalForce = useMemo(
    () => MechanicsEngine.centripetalForce(mass, vLinear, radius),
    [mass, vLinear, radius]
  );

  const centripetalAccel = useMemo(
    () => MechanicsEngine.centripetalAcceleration(vLinear, radius),
    [vLinear, radius]
  );

  const { record } = useDataLogger(['mass', 'radius', 'rpm', 'vLinear', 'force', 'accel']);

  const handleRecord = () => {
    record({
      mass,
      radius,
      rpm,
      vLinear: Number(vLinear.toFixed(2)),
      force: Number(centripetalForce.toFixed(2)),
      accel: Number(centripetalAccel.toFixed(2)),
    });
    onCompleteStep(1);
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Header */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-400">Rotation Speed:</span>{' '}
            <span className="font-bold text-white">{rpm} RPM</span> (ω = {omega.toFixed(2)} rad/s)
          </div>
          <div>
            <span className="text-zinc-400">Linear Speed v:</span>{' '}
            <span className="font-bold text-white">{vLinear.toFixed(2)} m/s</span>
          </div>
          <div>
            <span className="text-zinc-400">Centripetal Force F_c:</span>{' '}
            <span className="font-bold text-white">{centripetalForce.toFixed(2)} N</span>
          </div>
        </div>

        <button
          onClick={handleRecord}
          className="px-4 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95"
        >
          Record Readings
        </button>
      </div>

      {/* Main Top-Down Circular Motion Viewport */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 flex flex-col justify-center items-center relative shadow-2xl">
          {/* Top-Down Circular Path */}
          <svg className="w-64 h-64 overflow-visible" viewBox="0 0 200 200">
            {/* Center Pivot Sensor */}
            <circle cx="100" cy="100" r="10" fill="#18181b" stroke="#ffffff" strokeWidth="2" />

            {/* Orbit Path */}
            <circle cx="100" cy="100" r={radius * 80} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4,4" />

            {/* Rotating Arm & Mass */}
            <g transform="translate(100, 100)" className="animate-spin" style={{ animationDuration: `${60 / rpm}s` }}>
              <line x1="0" y1="0" x2={radius * 80} y2="0" stroke="#ffffff" strokeWidth="2" />
              <circle cx={radius * 80} cy="0" r="10" fill="#ffffff" />
            </g>
          </svg>
        </div>

        {/* Readouts */}
        <div className="w-64 flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Centripetal Formula</div>
            <div className="text-base font-bold text-white">F_c = m · v² / r</div>
          </div>

          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Centripetal Acceleration</div>
            <div className="text-2xl font-bold text-white">{centripetalAccel.toFixed(2)} m/s²</div>
          </div>
        </div>
      </div>

      {/* Adjusters */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-300">RPM:</span>
          <input
            type="range"
            min="30"
            max="180"
            step="10"
            value={rpm}
            onChange={(e) => setRpm(Number(e.target.value))}
            className="w-28 accent-white"
          />
          <span className="font-bold text-white">{rpm}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-300">Radius r:</span>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.1"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-28 accent-white"
          />
          <span className="font-bold text-white">{radius.toFixed(1)}m</span>
        </div>
      </div>
    </div>
  );
};
