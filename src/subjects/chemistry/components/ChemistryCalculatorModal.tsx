import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, Zap, CheckCircle2, ChevronRight } from 'lucide-react';
import { phCalculationEngine } from '../engine/PHCalculationEngine';
import { stoichiometryEngine } from '../engine/StoichiometryEngine';
import { gasLawEngine } from '../engine/GasLawEngine';

interface ChemistryCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CalcMode = 'moles' | 'molarity' | 'dilution' | 'ph' | 'gas';

export const ChemistryCalculatorModal: React.FC<ChemistryCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [calcMode, setCalcMode] = useState<CalcMode>('moles');

  // Input states
  const [massGrams, setMassGrams] = useState<number>(18.0);
  const [molarMass, setMolarMass] = useState<number>(18.015);
  const [hConc, setHConc] = useState<number>(0.001);
  const [volLiters, setVolLiters] = useState<number>(2.0);
  const [molesGas, setMolesGas] = useState<number>(1.0);
  const [tempGasK, setTempGasK] = useState<number>(300);

  if (!isOpen) return null;

  // Perform Calculations
  const molesRes = stoichiometryEngine.calculateMoles(massGrams, molarMass);
  const phRes = phCalculationEngine.calculateFromHConc(hConc);
  const gasRes = gasLawEngine.calculateIdealGasPressure(molesGas, tempGasK, volLiters);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg select-none font-mono text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-[90vw] max-w-4xl bg-[#0c0c0c] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-white" />
              <h2 className="text-base font-bold tracking-wide">INTELLIGENT CHEMISTRY CALCULATOR</h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center border-b border-white/10 bg-zinc-950 p-2 gap-2 overflow-x-auto text-xs">
            {(['moles', 'molarity', 'dilution', 'ph', 'gas'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCalcMode(m)}
                className={`px-3 py-1.5 rounded-lg uppercase transition-all font-bold ${
                  calcMode === m ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Calculator Content */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Controls */}
            <div className="space-y-4 bg-zinc-900/60 border border-white/10 p-5 rounded-xl">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Input Parameters</h4>

              {calcMode === 'moles' && (
                <>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Mass (grams):</label>
                    <input
                      type="number"
                      value={massGrams}
                      onChange={(e) => setMassGrams(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Molar Mass (g/mol):</label>
                    <input
                      type="number"
                      value={molarMass}
                      onChange={(e) => setMolarMass(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-bold"
                    />
                  </div>
                </>
              )}

              {calcMode === 'ph' && (
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Hydronium Ion Concentration [H⁺] (M):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={hConc}
                    onChange={(e) => setHConc(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-bold"
                  />
                </div>
              )}

              {calcMode === 'gas' && (
                <>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Moles n (mol):</label>
                    <input
                      type="number"
                      value={molesGas}
                      onChange={(e) => setMolesGas(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Temperature T (K):</label>
                    <input
                      type="number"
                      value={tempGasK}
                      onChange={(e) => setTempGasK(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Volume V (L):</label>
                    <input
                      type="number"
                      value={volLiters}
                      onChange={(e) => setVolLiters(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-bold"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Step-by-Step Explanation Output */}
            <div className="bg-zinc-950 border border-white/15 p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Step-by-Step Solution & Substitution
              </h4>

              <div className="space-y-2 text-xs text-zinc-300">
                {calcMode === 'moles' && (
                  <>
                    <div className="text-2xl font-extrabold text-white">{molesRes.moles} mol</div>
                    <div className="text-[11px] text-zinc-400">Total Particles: {molesRes.particles} molecules</div>
                    <div className="space-y-1 pt-3 border-t border-white/10 text-[11px]">
                      {molesRes.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-zinc-300">
                          <ChevronRight className="w-3 h-3 text-emerald-400" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {calcMode === 'ph' && (
                  <>
                    <div className="text-2xl font-extrabold text-white">pH: {phRes.pH}</div>
                    <div className="text-xs text-emerald-400 font-bold">pOH: {phRes.pOH} · {phRes.classification}</div>
                    <div className="space-y-1 pt-3 border-t border-white/10 text-[11px]">
                      {phRes.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-zinc-300">
                          <ChevronRight className="w-3 h-3 text-emerald-400" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {calcMode === 'gas' && (
                  <>
                    <div className="text-2xl font-extrabold text-white">{gasRes.P_atm} atm</div>
                    <div className="space-y-1 pt-3 border-t border-white/10 text-[11px]">
                      {gasRes.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-zinc-300">
                          <ChevronRight className="w-3 h-3 text-emerald-400" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
