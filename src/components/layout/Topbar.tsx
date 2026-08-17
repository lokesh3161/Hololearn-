import React, { useState } from 'react';
import { Sparkles, Edit3, Shield, UserCheck, Play, ChevronDown, Search } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { searchSimulations } from '../../registry/simulationRegistry';
import type { SimulationId } from '../../types/canvas';

export const Topbar: React.FC = () => {
  const {
    lessonTitle,
    setLessonTitle,
    mode,
    setMode,
    openSimulation,
    autoConvertShape,
    toggleAutoConvertShape,
    activeSubject,
    setActiveSubject,
    setPeriodicTableOpen,
    setChemistryCalcOpen,
    setVirtualLabDashboardOpen,
  } = useBoardStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(lessonTitle);
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [simSearchQuery, setSimSearchQuery] = useState('');

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLessonTitle(tempTitle || 'Untitled Smartboard Lesson');
    setIsEditingTitle(false);
  };

  const filteredSims = searchSimulations(activeSubject, simSearchQuery);

  // Group filtered simulations by category
  const categories = Array.from(new Set(filteredSims.map((s) => s.category)));

  return (
    <header className="h-12 bg-black border-b border-white/10 px-4 flex items-center justify-between text-white select-none z-30 font-sans">
      {/* Left: Brand Wordmark & Subject Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs shadow-lg ai-glow">
            H
          </div>
          <span className="font-bold tracking-tight text-sm text-white">
            HoloLearn<span className="text-zinc-400 font-normal ml-1">AI</span>
          </span>
        </div>
        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        {/* Subject Switcher Pills */}
        <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-white/10 text-xs">
          {(['physics', 'chemistry', 'mathematics'] as const).map((subj) => (
            <button
              key={subj}
              onClick={() => {
                setActiveSubject(subj);
                setSimSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-all ${
                activeSubject === subj
                  ? 'bg-white text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Inline Editable Lesson Name */}
      <div className="flex items-center gap-2">
        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit}>
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              autoFocus
              className="bg-zinc-900 border border-white/20 rounded px-2.5 py-0.5 text-xs text-white focus:outline-none focus:border-white font-medium font-mono"
            />
          </form>
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate max-w-xs">
              {lessonTitle}
            </span>
            <Edit3 className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Right: Actions & Mode Toggle Switch */}
      <div className="flex items-center gap-3">
        {activeSubject === 'chemistry' && (
          <>
            <button
              onClick={() => setPeriodicTableOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono border border-white/15 text-white transition-all active:scale-95"
              title="Open Interactive Periodic Table"
            >
              <span>⚛️ Periodic Table</span>
            </button>
            <button
              onClick={() => setChemistryCalcOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono border border-white/15 text-emerald-400 transition-all active:scale-95 font-bold"
              title="Open Chemistry Calculator"
            >
              <span>🧮 Chemistry Calc</span>
            </button>
          </>
        )}

        {/* Auto-Convert Shapes Toggle Button */}
        <button
          onClick={toggleAutoConvertShape}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all active:scale-95 ${
            autoConvertShape
              ? 'bg-white text-black font-semibold border-white shadow-md'
              : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
          }`}
          title="Toggle Automatic Shape Conversion"
        >
          <Sparkles className={`w-3.5 h-3.5 ${autoConvertShape ? 'text-black' : 'text-zinc-400'}`} />
          <span>Auto-Shape: {autoConvertShape ? 'ON' : 'OFF'}</span>
        </button>

        {/* Virtual Laboratory Platform Launcher */}
        <button
          onClick={() => setVirtualLabDashboardOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs transition-all font-bold font-mono active:scale-95 shadow-md"
          title="Open Virtual Laboratory Dashboard"
        >
          <span>🧪 Virtual Labs</span>
        </button>

        {/* Subject-Aware Simulation Launcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSimMenu(!showSimMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white border border-white/15 transition-all font-medium active:scale-95"
          >
            <Play className="w-3.5 h-3.5 text-white" />
            <span className="capitalize font-bold">{activeSubject} Sims</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {showSimMenu && (
            <div className="absolute right-0 mt-2 w-84 max-h-[32rem] overflow-y-auto bg-[#0d0d0d] border border-white/20 rounded-xl shadow-2xl p-3 z-50 font-mono text-xs text-white select-none">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <div className="font-bold uppercase tracking-wider text-[11px] text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>{activeSubject} SIMULATION LAB</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {filteredSims.length} SIMS
                </span>
              </div>

              {/* Search input */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={simSearchQuery}
                  onChange={(e) => setSimSearchQuery(e.target.value)}
                  placeholder={`Search ${activeSubject} simulations...`}
                  className="w-full bg-zinc-900 border border-white/15 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Categorized List */}
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
                              className="w-full text-left p-2 rounded-lg bg-zinc-900/60 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all flex items-start justify-between group"
                            >
                              <div>
                                <div className="font-semibold text-white group-hover:text-emerald-400 text-xs flex items-center gap-1.5">
                                  <span>{sim.name}</span>
                                </div>
                                {sim.formula && (
                                  <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
                                    {sim.formula}
                                  </div>
                                )}
                                <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                                  {sim.description}
                                </div>
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

        {/* Mode Toggle Switch */}
        <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => setMode('teacher')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'teacher'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Teacher</span>
          </button>
          <button
            onClick={() => setMode('student')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'student'
                ? 'bg-white text-black shadow-md font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>
        </div>
      </div>
    </header>
  );
};
