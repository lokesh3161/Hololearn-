import React, { useState } from 'react';
import { RotateCcw, Flame, Layers, BarChart2 } from 'lucide-react';

export const EquilibriumSim: React.FC = () => {
  const [tempK, setTempK] = useState<number>(300);
  const [n2Moles, setN2Moles] = useState<number>(1.0);
  const [h2Moles, setH2Moles] = useState<number>(3.0);

  // Reaction: N2 + 3H2 <=> 2NH3 (Exothermic ΔH < 0)
  // Higher T shifts equilibrium left to reactants (Le Chatelier)
  const shiftRatio = Math.max(0.1, Math.min(0.9, 0.5 - (tempK - 300) * 0.0015));
  const nh3Moles = Number((2 * shiftRatio * Math.min(n2Moles, h2Moles / 3)).toFixed(2));
  const remN2 = Number((n2Moles - shiftRatio * Math.min(n2Moles, h2Moles / 3)).toFixed(2));
  const remH2 = Number((h2Moles - 3 * shiftRatio * Math.min(n2Moles, h2Moles / 3)).toFixed(2));

  const Kc = Number(((nh3Moles * nh3Moles) / Math.max(0.001, remN2 * Math.pow(remH2, 3))).toFixed(3));

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0a0a0a] text-white select-none font-mono">
      {/* Visual Simulation Display */}
      <div className="flex-1 p-8 flex flex-col justify-center items-center space-y-6">
        <div className="text-xl font-bold border border-white/20 px-6 py-3 rounded-2xl bg-zinc-900 shadow-2xl flex items-center gap-3">
          <span>N₂ + 3H₂</span>
          <span className="text-emerald-400 font-extrabold text-2xl">⇌</span>
          <span>2NH₃</span>
          <span className="text-xs text-amber-400 bg-white/10 px-2 py-0.5 rounded">(Exothermic ΔH &lt; 0)</span>
        </div>

        {/* Dynamic Concentration Bars */}
        <div className="w-full max-w-md bg-zinc-900 border border-white/15 p-6 rounded-2xl space-y-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Equilibrium Concentrations:</div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>[N₂] Reactant:</span>
                <span className="font-bold text-cyan-400">{remN2} M</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${(remN2 / 2) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>[H₂] Reactant:</span>
                <span className="font-bold text-cyan-400">{remH2} M</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${(remH2 / 6) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>[NH₃] Product:</span>
                <span className="font-bold text-emerald-400">{nh3Moles} M</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${(nh3Moles / 2) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-88 bg-zinc-950 border-l border-white/10 p-5 space-y-5 text-xs overflow-y-auto">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
          <Flame className="w-4 h-4 text-white" /> Le Chatelier Equilibrium Simulator
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Temperature (T):</span>
              <span className="text-amber-400 font-bold">{tempK} K</span>
            </div>
            <input
              type="range"
              min="200"
              max="600"
              step="10"
              value={tempK}
              onChange={(e) => setTempK(Number(e.target.value))}
              className="w-full accent-amber-400 bg-zinc-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Initial N₂ Moles:</span>
              <span className="text-cyan-400 font-bold">{n2Moles} mol</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={n2Moles}
              onChange={(e) => setN2Moles(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-zinc-800"
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-white" /> Equilibrium Constant:
          </div>
          <div className="text-white text-xs space-y-1">
            <div>K_c = <span className="font-bold text-emerald-400">{Kc}</span></div>
            <div className="text-[10px] text-zinc-400 pt-1">
              {tempK > 400 ? '⚠️ High temperature shifts equilibrium LEFT (Less NH₃).' : '✓ Moderate temperature favors product formation.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
