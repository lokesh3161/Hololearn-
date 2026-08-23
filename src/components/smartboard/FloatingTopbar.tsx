import React, { useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { searchSimulations } from '../../registry/simulationRegistry';
import type { SimulationId } from '../../types/canvas';
import { ChevronDown, Sparkles, TestTube, Atom, Clock, Shield, UserCheck, Play, Search } from 'lucide-react';

interface FloatingTopbarProps {
  onOpenTimeline?: () => void;
}

export const FloatingTopbar: React.FC<FloatingTopbarProps> = ({ onOpenTimeline }) => {
  const {
    lessonTitle,
    activeSubject,
    setActiveSubject,
    mode,
    setMode,
    openSimulation,
    autoConvertShape,
    toggleAutoConvertShape,
    setPeriodicTableOpen,
    setChemistryCalcOpen,
    setVirtualLabDashboardOpen,
  } = useBoardStore();

  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [simSearchQuery, setSimSearchQuery] = useState('');

  const filteredSims = searchSimulations(activeSubject, simSearchQuery);
  const categories = Array.from(new Set(filteredSims.map((s) => s.category)));

  return (
    <header className="fixed top-3 left-4 z-40 flex items-center gap-2.5 select-none font-sans">
      {/* Minimal Brand & Breadcrumb Pill */}
      <div className="h-10 bg-zinc-950/90 border border-white/15 px-3.5 rounded-full flex items-center gap-2.5 backdrop-blur-md shadow-xl text-white">
        <div className="w-5 h-5 rounded-md bg-white text-black font-bold text-[10px] flex items-center justify-center">
          H
        </div>
        <span className="font-bold text-xs tracking-tight">HoloLearn</span>
        <span className="text-zinc-500 text-xs">/</span>
        <span className="text-zinc-400 text-xs font-mono capitalize">{activeSubject}</span>
        <span className="text-zinc-600 text-xs">&gt;</span>
        <span className="text-zinc-300 text-xs truncate max-w-[130px] font-medium">{lessonTitle}</span>
      </div>

      {/* Subject Simulations Launcher Button & Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            setShowSimMenu(!showSimMenu);
            setShowToolsMenu(false);
          }}
          className="h-10 bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 rounded-full flex items-center gap-1.5 backdrop-blur-md shadow-xl text-xs font-mono font-bold text-white transition-all active:scale-95"
        >
          <Play className="w-3.5 h-3.5 text-cyan-400" />
          <span className="capitalize">{activeSubject} Sims</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>

        {/* Categorized Simulation Menu Dropdown */}
        {showSimMenu && (
          <div className="absolute top-12 left-0 w-84 max-h-[32rem] overflow-y-auto bg-[#0d0d0d] border border-white/20 rounded-2xl shadow-2xl p-3 z-50 font-mono text-xs text-white backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="font-bold uppercase tracking-wider text-[11px] text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>{activeSubject} SIMULATIONS</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">{filteredSims.length} SIMS</span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={simSearchQuery}
                onChange={(e) => setSimSearchQuery(e.target.value)}
                placeholder={`Search ${activeSubject} simulations...`}
                className="w-full bg-zinc-900 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Simulation List */}
            {categories.length === 0 ? (
              <div className="text-[11px] text-zinc-500 py-4 text-center">
                No {activeSubject} simulations found matching "{simSearchQuery}".
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((cat) => {
                  const catSims = filteredSims.filter((s) => s.category === cat);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide px-1">
                        ▾ {cat}
                      </div>
                      <div className="space-y-1 pl-1">
                        {catSims.map((sim) => (
                          <button
                            key={sim.id}
                            onClick={() => {
                              openSimulation(sim.id as SimulationId);
                              setShowSimMenu(false);
                            }}
                            className="w-full text-left p-2 rounded-xl bg-zinc-900/80 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all flex items-start justify-between group"
                          >
                            <div>
                              <div className="font-semibold text-white group-hover:text-cyan-400 text-xs flex items-center gap-1.5">
                                <span>{sim.name}</span>
                              </div>
                              {sim.formula && (
                                <div className="text-[10px] text-cyan-400/90 font-mono mt-0.5">
                                  {sim.formula}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* "More Tools" Compact Dropdown Button */}
      <div className="relative">
        <button
          onClick={() => {
            setShowToolsMenu(!showToolsMenu);
            setShowSimMenu(false);
          }}
          className="h-10 bg-zinc-950/90 hover:bg-zinc-900 border border-white/15 px-3.5 rounded-full flex items-center gap-1.5 backdrop-blur-md shadow-xl text-xs font-mono font-semibold text-zinc-200 transition-all active:scale-95"
        >
          <span>Tools</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>

        {/* More Tools Dropdown Menu */}
        {showToolsMenu && (
          <div className="absolute top-12 left-0 w-64 bg-zinc-950/95 border border-white/20 rounded-2xl p-2.5 shadow-2xl z-50 font-mono text-xs text-white backdrop-blur-xl space-y-1.5">
            <div className="text-[10px] text-zinc-500 font-bold uppercase px-2 py-1">Subject Switcher</div>
            <div className="grid grid-cols-3 gap-1 px-1">
              {(['physics', 'chemistry', 'mathematics'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setActiveSubject(s);
                    setShowToolsMenu(false);
                  }}
                  className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${
                    activeSubject === s ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="h-[1px] bg-white/10 my-1" />

            <button
              onClick={() => {
                setVirtualLabDashboardOpen(true);
                setShowToolsMenu(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-2 text-white font-medium"
            >
              <TestTube className="w-4 h-4 text-emerald-400" />
              <span>Virtual Physics Labs</span>
            </button>

            {activeSubject === 'chemistry' && (
              <>
                <button
                  onClick={() => {
                    setPeriodicTableOpen(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-2 text-white font-medium"
                >
                  <Atom className="w-4 h-4 text-cyan-400" />
                  <span>Periodic Table</span>
                </button>
                <button
                  onClick={() => {
                    setChemistryCalcOpen(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-2 text-emerald-400 font-medium"
                >
                  <span>🧮 Chemistry Calculator</span>
                </button>
              </>
            )}

            {onOpenTimeline && (
              <button
                onClick={() => {
                  onOpenTimeline();
                  setShowToolsMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-2 text-amber-300 font-medium"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Searchable Timeline</span>
              </button>
            )}

            <button
              onClick={() => {
                toggleAutoConvertShape();
                setShowToolsMenu(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 flex items-center justify-between text-zinc-300 font-medium"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Auto-Shape Recognition
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10">{autoConvertShape ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mode Switcher Pill */}
      <div className="h-10 bg-zinc-950/90 border border-white/15 p-1 rounded-full flex items-center backdrop-blur-md shadow-xl text-xs">
        <button
          onClick={() => setMode('teacher')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all ${
            mode === 'teacher' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Shield className="w-3 h-3" />
          <span>Teacher</span>
        </button>
        <button
          onClick={() => setMode('student')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all ${
            mode === 'student' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-3 h-3" />
          <span>Student</span>
        </button>
      </div>
    </header>
  );
};
