import React, { useState } from 'react';
import { Zap, RotateCcw, BarChart2 } from 'lucide-react';

export const ElectrochemistrySim: React.FC = () => {
  const [znConc, setZnConc] = useState<number>(1.0); // Molar Zn2+
  const [cuConc, setCuConc] = useState<number>(1.0); // Molar Cu2+

  // E_cell = E°_cell - (0.0592 / 2) * log10([Zn2+] / [Cu2+])
  const e0Cell = 1.10; // Volts (Zn | Zn2+ || Cu2+ | Cu)
  const Q = znConc / cuConc;
  const eCell = Number((e0Cell - (0.0592 / 2) * Math.log10(Q)).toFixed(3));

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0a0a0a] text-white select-none font-mono">
      {/* 2D Galvanic Cell Apparatus View */}
      <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-6">
        <div className="text-xl font-bold border border-white/20 px-6 py-3 rounded-2xl bg-zinc-900 shadow-2xl flex items-center gap-3">
          <span>Zn(s) | Zn²⁺(aq) || Cu²⁺(aq) | Cu(s)</span>
          <span className="text-xs text-emerald-400 bg-white/10 px-2 py-0.5 rounded">Galvanic Cell</span>
        </div>

        {/* Digital Voltmeter Readout */}
        <div className="w-48 bg-black border-2 border-emerald-400 rounded-2xl p-4 text-center shadow-2xl">
          <div className="text-[10px] text-zinc-400 uppercase">Cell Potential E_cell</div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-1">{eCell} V</div>
        </div>

        {/* Cell Half-Beakers */}
        <div className="flex items-center gap-8">
          {/* Anode Zn */}
          <div className="w-36 h-40 bg-zinc-900/80 border-2 border-zinc-500 rounded-b-2xl p-3 flex flex-col justify-between items-center relative">
            <div className="w-6 h-28 bg-zinc-400 absolute -top-10 font-bold text-[10px] text-black flex items-center justify-center">
              Zn(s)
            </div>
            <div className="text-[10px] text-zinc-400 mt-16 font-bold">Anode (-) Oxidation</div>
            <div className="text-xs text-white font-bold">[Zn²⁺] = {znConc} M</div>
          </div>

          {/* Salt Bridge */}
          <div className="w-16 h-12 border-t-4 border-l-4 border-r-4 border-amber-400/80 rounded-t-xl text-[9px] text-amber-400 text-center pt-1 font-bold">
            KNO₃ Salt Bridge
          </div>

          {/* Cathode Cu */}
          <div className="w-36 h-40 bg-zinc-900/80 border-2 border-amber-600 rounded-b-2xl p-3 flex flex-col justify-between items-center relative">
            <div className="w-6 h-28 bg-amber-700 absolute -top-10 font-bold text-[10px] text-white flex items-center justify-center">
              Cu(s)
            </div>
            <div className="text-[10px] text-zinc-400 mt-16 font-bold">Cathode (+) Reduction</div>
            <div className="text-xs text-white font-bold">[Cu²⁺] = {cuConc} M</div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-88 bg-zinc-950 border-l border-white/10 p-5 space-y-5 text-xs overflow-y-auto">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
          <Zap className="w-4 h-4 text-white" /> Galvanic Cell & Nernst Equation
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Anode [Zn²⁺] Concentration:</span>
              <span className="text-white font-bold">{znConc} M</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="2.0"
              step="0.05"
              value={znConc}
              onChange={(e) => setZnConc(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Cathode [Cu²⁺] Concentration:</span>
              <span className="text-amber-400 font-bold">{cuConc} M</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="2.0"
              step="0.05"
              value={cuConc}
              onChange={(e) => setCuConc(Number(e.target.value))}
              className="w-full accent-amber-400 bg-zinc-800"
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-white" /> Nernst Calculation:
          </div>
          <div className="text-white text-xs space-y-1">
            <div>Standard Cell Potential E°: <span className="font-bold text-white">1.10 V</span></div>
            <div>Reaction Quotient Q: <span className="font-bold text-cyan-400">{Q.toFixed(2)}</span></div>
            <div className="text-[10px] text-zinc-400 pt-1">
              Formula: E = E° - (0.0592 / 2) log₁₀([Zn²⁺] / [Cu²⁺])
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
