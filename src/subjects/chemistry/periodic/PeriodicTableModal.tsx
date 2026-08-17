import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Sparkles, Zap, Layers, BarChart2 } from 'lucide-react';
import { periodicTableElements, type ElementDetail } from './PeriodicTableData';

interface PeriodicTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DisplayMode = 'normal' | 'category' | 'electronegativity' | 'radius' | 'ionization';

export const PeriodicTableModal: React.FC<PeriodicTableModalProps> = ({ isOpen, onClose }) => {
  const [selectedElement, setSelectedElement] = useState<ElementDetail>(periodicTableElements[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('normal');

  if (!isOpen) return null;

  const filteredElements = periodicTableElements.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.number.toString() === searchQuery
  );

  const getHeatmapColor = (elem: ElementDetail): string => {
    if (displayMode === 'category') {
      switch (elem.category) {
        case 'alkali': return '#FF3366';
        case 'alkaline': return '#FF9900';
        case 'transition': return '#3399FF';
        case 'post-transition': return '#00CC99';
        case 'metalloid': return '#9966FF';
        case 'nonmetal': return '#00FF88';
        case 'halogen': return '#FFCC00';
        case 'noble': return '#FF00AA';
        default: return '#555555';
      }
    }
    if (displayMode === 'electronegativity') {
      const en = elem.electronegativity || 0;
      const ratio = Math.min(1, en / 4.0);
      return `rgb(${Math.round(255 * ratio)}, ${Math.round(100 * (1 - ratio))}, ${Math.round(255 * (1 - ratio))})`;
    }
    if (displayMode === 'radius') {
      const r = elem.atomicRadius || 50;
      const ratio = Math.min(1, r / 230);
      return `rgb(${Math.round(100 * (1 - ratio))}, ${Math.round(200 * ratio)}, 255)`;
    }
    if (displayMode === 'ionization') {
      const ie = elem.ionizationEnergy || 400;
      const ratio = Math.min(1, ie / 2400);
      return `rgb(255, ${Math.round(255 * (1 - ratio))}, ${Math.round(100 * (1 - ratio))})`;
    }
    return '#1a1a1a';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg select-none font-mono">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-[92vw] max-w-6xl h-[85vh] bg-[#0c0c0c] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
              <h2 className="text-base font-bold tracking-wide flex items-center gap-2">
                PERIODIC TABLE OF ELEMENTS
                <span className="text-[10px] font-mono text-zinc-400 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                  118 ELEMENTS DATASET
                </span>
              </h2>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-white/10 text-xs">
              {(['normal', 'category', 'electronegativity', 'radius', 'ionization'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDisplayMode(m)}
                  className={`px-3 py-1 rounded-md text-[11px] uppercase transition-all ${
                    displayMode === m ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Grid View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Grid Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {/* Search Bar */}
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search element by name, symbol (H, Na, Fe)..."
                  className="w-full bg-zinc-900 border border-white/15 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Element Cards Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                {filteredElements.map((elem) => {
                  const isSelected = selectedElement.number === elem.number;
                  const customBg = getHeatmapColor(elem);

                  return (
                    <button
                      key={elem.number}
                      onClick={() => setSelectedElement(elem)}
                      style={{ backgroundColor: displayMode === 'normal' ? undefined : customBg }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-24 transition-all relative group ${
                        isSelected
                          ? 'border-white bg-white/20 shadow-xl scale-105 font-bold z-10'
                          : displayMode === 'normal'
                          ? 'bg-zinc-900/80 border-white/10 hover:border-white/40 hover:bg-zinc-800'
                          : 'border-white/20 text-black font-bold hover:brightness-125'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] opacity-70">
                        <span>{elem.number}</span>
                        <span>{elem.period}P</span>
                      </div>
                      <div className="text-xl font-bold text-center my-0.5">{elem.symbol}</div>
                      <div className="text-[9px] truncate text-center opacity-80">{elem.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Element Detail Panel */}
            <div className="w-88 bg-zinc-950 border-l border-white/10 p-6 space-y-5 overflow-y-auto text-xs">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-14 h-14 rounded-2xl bg-white text-black font-bold text-2xl flex items-center justify-center shadow-2xl">
                  {selectedElement.symbol}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedElement.name}</h3>
                  <p className="text-zinc-400 text-xs">Atomic Number: {selectedElement.number}</p>
                </div>
              </div>

              <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
                <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-white" /> Electron Configuration & Orbitals:
                </div>
                <div className="text-base font-bold text-emerald-400">{selectedElement.electronConfig}</div>
                <div className="text-[11px] text-zinc-300 pt-1">
                  Subshell orbitals filled according to Aufbau & Pauli exclusion principles.
                </div>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-400">Atomic Mass:</span>
                  <span className="font-bold text-white">{selectedElement.mass} u</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-400">Electronegativity:</span>
                  <span className="font-bold text-emerald-400">{selectedElement.electronegativity || 'N/A'} (Pauling)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-400">Atomic Radius:</span>
                  <span className="font-bold text-white">{selectedElement.atomicRadius} pm</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-400">Ionization Energy:</span>
                  <span className="font-bold text-white">{selectedElement.ionizationEnergy} kJ/mol</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-400">Oxidation States:</span>
                  <span className="font-bold text-white">{selectedElement.oxidationStates}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-400">Block / Category:</span>
                  <span className="font-bold text-white uppercase">{selectedElement.block}-block · {selectedElement.category}</span>
                </div>
              </div>

              <p className="text-zinc-400 text-xs leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-white/10">
                {selectedElement.summary}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
