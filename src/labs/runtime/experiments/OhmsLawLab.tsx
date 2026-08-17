import React, { useState, useEffect, useMemo } from 'react';
import { Play, RotateCcw, AlertTriangle, CheckCircle2, Zap, Activity, HelpCircle } from 'lucide-react';
import type { ExperimentConfig } from '../../types';

interface OhmsLawLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const OhmsLawLab: React.FC<OhmsLawLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {


  // Circuit state
  const [voltage, setVoltage] = useState<number>(Number(inputs.voltageSet || 6.0));
  const [resistance, setResistance] = useState<number>(Number(inputs.massGrams || 100)); // 100 ohms
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);
  const [ammeterMode, setAmmeterMode] = useState<'series' | 'parallel'>('series');
  const [voltmeterMode, setVoltmeterMode] = useState<'parallel' | 'series'>('parallel');

  // Sync inputs
  useEffect(() => {
    onUpdateInput('voltageSet', voltage);
  }, [voltage, onUpdateInput]);

  // Circuit calculation engine
  const circuitAnalysis = useMemo(() => {
    if (!switchClosed) {
      return {
        currentA: 0,
        currentMA: 0,
        vResistor: 0,
        isShort: false,
        isComplete: false,
        warning: 'Circuit is open (switch open). Close switch to permit current flow.',
      };
    }

    if (ammeterMode === 'parallel') {
      return {
        currentA: 0.05,
        currentMA: 50,
        vResistor: 0,
        isShort: true,
        isComplete: true,
        warning: '⚠ Ammeter placed in parallel! Low resistance ammeter bypasses resistor (short circuit). Move to series position.',
      };
    }

    if (voltmeterMode === 'series') {
      return {
        currentA: 0.00001,
        currentMA: 0.01,
        vResistor: voltage,
        isShort: false,
        isComplete: true,
        warning: '⚠ Voltmeter placed in series! Extremely high internal resistance blocks current flow. Move to parallel across resistor.',
      };
    }

    // Normal series ammeter, parallel voltmeter configuration
    const trueCurrent = voltage / resistance; // Amperes
    const noise = (Math.random() - 0.5) * 0.001; // ±0.1% measurement noise
    const measuredCurrentA = Math.max(0, trueCurrent + noise);
    const measuredCurrentMA = measuredCurrentA * 1000.0;
    const measuredVResistor = voltage;

    return {
      currentA: measuredCurrentA,
      currentMA: measuredCurrentMA,
      vResistor: measuredVResistor,
      isShort: false,
      isComplete: true,
      warning: null,
    };
  }, [voltage, resistance, switchClosed, ammeterMode, voltmeterMode]);

  // Auto procedure steps
  useEffect(() => {
    if (switchClosed && circuitAnalysis.isComplete) onCompleteStep(1);
    if (voltage >= 2.0) onCompleteStep(2);
    if (voltage >= 6.0) onCompleteStep(3);
    if (voltage >= 10.0) onCompleteStep(4);
  }, [switchClosed, circuitAnalysis.isComplete, voltage, onCompleteStep]);

  const handleResetCircuit = () => {
    setVoltage(6.0);
    setResistance(100);
    setSwitchClosed(true);
    setAmmeterMode('series');
    setVoltmeterMode('parallel');
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Top Controls Bar */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Power Supply (V):</span>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value))}
              className="w-28 accent-white bg-zinc-800"
            />
            <span className="font-bold text-white w-12">{voltage.toFixed(1)} V</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono">Load Resistance (R):</span>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={resistance}
              onChange={(e) => setResistance(Number(e.target.value))}
              className="w-28 accent-white bg-zinc-800"
            />
            <span className="font-bold text-white w-14">{resistance} Ω</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSwitchClosed(!switchClosed)}
            className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all active:scale-95 ${
              switchClosed ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-white/20'
            }`}
          >
            Switch: {switchClosed ? 'CLOSED (ON)' : 'OPEN (OFF)'}
          </button>

          <button
            onClick={handleResetCircuit}
            className="px-3 py-1.5 bg-zinc-900 border border-white/20 hover:bg-zinc-800 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Circuit</span>
          </button>
        </div>
      </div>

      {/* Warnings & Alerts */}
      {circuitAnalysis.warning && (
        <div className="w-full mt-2 p-2.5 bg-zinc-950 border-2 border-white rounded-xl text-xs text-white flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          <span>{circuitAnalysis.warning}</span>
        </div>
      )}

      {/* Interactive Circuit Schematic Canvas (Monochrome SVG) */}
      <div className="flex-1 w-full max-w-4xl my-2 flex items-center justify-between gap-6 relative">
        {/* Left Side: Circuit Schematic Board */}
        <div className="flex-1 h-full min-h-[320px] bg-zinc-950 border border-white/15 rounded-2xl p-6 relative flex items-center justify-center">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Circuit Loop Outline SVG */}
          <svg className="w-full h-full max-w-xl max-h-[280px] overflow-visible" viewBox="0 0 500 280">
            {/* Wires rectangle loop */}
            <rect
              x="60"
              y="40"
              width="380"
              height="200"
              rx="12"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeDasharray={!switchClosed ? '8,8' : 'none'}
            />

            {/* Current Flow Dots Animation */}
            {switchClosed && circuitAnalysis.currentMA > 0 && !circuitAnalysis.isShort && (
              <circle r="4" fill="#ffffff">
                <animateMotion
                  path="M 60 40 L 440 40 L 440 240 L 60 240 Z"
                  dur={`${Math.max(0.4, 4 / (circuitAnalysis.currentMA / 20))}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* BATTERY / POWER SUPPLY Symbol (Left Branch) */}
            <g transform="translate(60, 140)">
              <circle r="22" fill="#0a0a0a" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="-4" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                DC
              </text>
              <text x="0" y="10" fill="#ffffff" fontSize="10" textAnchor="middle" fontFamily="monospace">
                {voltage.toFixed(1)}V
              </text>
              <text x="-32" y="4" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
                +
              </text>
              <text x="24" y="4" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
                -
              </text>
            </g>

            {/* SWITCH Symbol (Top Branch) */}
            <g transform="translate(250, 40)" className="cursor-pointer" onClick={() => setSwitchClosed(!switchClosed)}>
              <rect x="-35" y="-14" width="70" height="28" fill="#0a0a0a" stroke="#ffffff" strokeWidth="1" rx="6" />
              <circle cx="-20" cy="0" r="3" fill="#ffffff" />
              <circle cx="20" cy="0" r="3" fill="#ffffff" />
              <line
                x1="-20"
                y1="0"
                x2={switchClosed ? '20' : '15'}
                y2={switchClosed ? '0' : '-16'}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <text x="0" y="24" fill="#888888" fontSize="9" textAnchor="middle" fontFamily="monospace">
                Switch {switchClosed ? '(Closed)' : '(Open)'}
              </text>
            </g>

            {/* RESISTOR Symbol (Right Branch) */}
            <g transform="translate(440, 140)">
              <rect x="-14" y="-30" width="28" height="60" fill="#0a0a0a" stroke="#ffffff" strokeWidth="2" rx="4" />
              {/* Zigzag lines inside */}
              <path d="M 0 -22 L -8 -14 L 8 -6 L -8 2 L 8 10 L 0 18" fill="none" stroke="#ffffff" strokeWidth="1.5" />
              <text x="32" y="4" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace">
                {resistance}Ω
              </text>
              <text x="32" y="16" fill="#888888" fontSize="9" fontFamily="monospace">
                Resistor
              </text>
            </g>

            {/* AMMETER Symbol (Top-Right Series Branch) */}
            <g
              transform="translate(370, 40)"
              className="cursor-pointer"
              onClick={() => setAmmeterMode(ammeterMode === 'series' ? 'parallel' : 'series')}
            >
              <title>Click to toggle Ammeter placement (Series vs Parallel)</title>
              <circle r="16" fill="#0a0a0a" stroke="#ffffff" strokeWidth="2" />
              <text x="0" y="4" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                A
              </text>
              <text x="0" y="-22" fill="#888888" fontSize="8" textAnchor="middle" fontFamily="monospace">
                Ammeter ({ammeterMode})
              </text>
            </g>

            {/* VOLTMETER Symbol (Parallel Branch across Resistor) */}
            <g
              transform="translate(440, 240)"
              className="cursor-pointer"
              onClick={() => setVoltmeterMode(voltmeterMode === 'parallel' ? 'series' : 'parallel')}
            >
              <title>Click to toggle Voltmeter placement (Parallel vs Series)</title>
              {/* Parallel jumper wires */}
              <path d="M 390 240 L 440 240" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3,3" />
              <circle cx="440" cy="240" r="16" fill="#0a0a0a" stroke="#ffffff" strokeWidth="2" />
              <text x="440" y="244" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                V
              </text>
              <text x="440" y="268" fill="#888888" fontSize="8" textAnchor="middle" fontFamily="monospace">
                Voltmeter ({voltmeterMode})
              </text>
            </g>

            {/* DEMO BULB Symbol (Bottom Branch) */}
            <g transform="translate(250, 240)">
              <circle r="14" fill="#0a0a0a" stroke="#ffffff" strokeWidth="2" />
              <path d="M -8 -6 L 0 6 L 8 -6" fill="none" stroke="#ffffff" strokeWidth="1.5" />
              {switchClosed && circuitAnalysis.currentMA > 0 && (
                <circle r="18" fill="rgba(255, 255, 255, 0.15)" className="animate-pulse" />
              )}
            </g>
          </svg>
        </div>

        {/* Right Side: Digital Instruments Readout */}
        <div className="w-64 flex flex-col gap-3">
          {/* Digital Ammeter Display */}
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center justify-between">
              <span>Digital Ammeter</span>
              <span className="text-[9px] text-zinc-500">{ammeterMode}</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {circuitAnalysis.currentMA.toFixed(1)} mA
            </div>
            <div className="text-[10px] text-zinc-400">
              ({circuitAnalysis.currentA.toFixed(4)} A)
            </div>
          </div>

          {/* Digital Voltmeter Display */}
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-1 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center justify-between">
              <span>Digital Voltmeter</span>
              <span className="text-[9px] text-zinc-500">{voltmeterMode}</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {circuitAnalysis.vResistor.toFixed(2)} V
            </div>
            <div className="text-[10px] text-zinc-400">
              Voltage across Resistor
            </div>
          </div>

          {/* Theoretical Formula Verification Box */}
          <div className="p-4 bg-zinc-950 border border-white/15 rounded-xl space-y-2 font-mono text-xs">
            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-white" /> Ohm's Law Verification
            </div>
            <div className="bg-black/60 p-2 rounded border border-white/10 text-[11px]">
              V = I × R<br />
              {voltage.toFixed(1)}V = ({(circuitAnalysis.currentMA / 1000).toFixed(3)}A) × ({resistance}Ω)
            </div>
            <div className="text-[10px] text-zinc-300">
              Calculated R = V / I ={' '}
              <span className="font-bold text-white">
                {circuitAnalysis.currentA > 0 ? (voltage / circuitAnalysis.currentA).toFixed(1) : '---'} Ω
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Preset Voltage Action Bar */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono">
        <span className="text-[11px] font-bold text-zinc-300">Preset Voltages:</span>
        <div className="flex items-center gap-2">
          {[1.0, 2.0, 4.0, 6.0, 8.0, 10.0, 12.0].map((v) => (
            <button
              key={v}
              onClick={() => setVoltage(v)}
              className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-xs transition-all active:scale-95 ${
                voltage === v ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
              }`}
            >
              {v}V
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
