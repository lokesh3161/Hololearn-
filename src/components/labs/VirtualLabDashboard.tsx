import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Beaker, Zap, Play, CheckCircle2, ShieldAlert, BookOpen, Clock, Award, Sliders, Atom } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { getExperimentsBySubject, getAllExperiments } from '../../labs';
import type { ExperimentConfig } from '../../labs/types';

export const VirtualLabDashboard: React.FC = () => {
  const {
    activeSubject,
    setActiveSubject,
    isVirtualLabDashboardOpen,
    setVirtualLabDashboardOpen,
    openVirtualLab,
    activeLabMode,
  } = useBoardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<'guided' | 'practice' | 'challenge' | 'free' | 'research'>(activeLabMode || 'guided');

  if (!isVirtualLabDashboardOpen) return null;

  const isMath = activeSubject === 'mathematics';
  const effectiveSubject = isMath ? 'physics' : activeSubject;
  const labs: ExperimentConfig[] = getExperimentsBySubject(effectiveSubject);

  const filteredLabs = labs.filter((lab) => {
    return (
      lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleLaunchLab = (labId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    console.log('[VIRTUAL LAB] Launching lab:', labId);
    openVirtualLab(labId, selectedMode);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md pointer-events-auto select-none font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-[92vw] max-w-6xl h-[85vh] bg-[#0c0c0c] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/80">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xl shadow-lg">
                🧪
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wide uppercase font-mono flex items-center gap-2">
                  <span>HOLOLEARN VIRTUAL LABORATORY</span>
                  <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold uppercase">
                    Interactive Workbench
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Select an experiment below to enter the live full-screen laboratory.
                </p>
              </div>
            </div>

            {/* Subject Selector Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-white/15 text-xs font-mono">
                <button
                  onClick={() => setActiveSubject('physics')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeSubject === 'physics' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ⚡ Physics Labs ({getExperimentsBySubject('physics').length})
                </button>
                <button
                  onClick={() => setActiveSubject('chemistry')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeSubject === 'chemistry' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🧪 Chemistry Labs ({getExperimentsBySubject('chemistry').length})
                </button>
              </div>

              <button
                onClick={() => setVirtualLabDashboardOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls Bar: Search & Mode Selectors */}
          <div className="p-4 bg-zinc-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${effectiveSubject} experiments...`}
                className="w-full bg-zinc-900 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-white/10 text-xs">
              <span className="text-[10px] font-mono uppercase text-zinc-400 px-2 font-bold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-white" /> Mode:
              </span>
              {(['guided', 'practice', 'challenge', 'free', 'research'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMode(m)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono capitalize transition-all ${
                    selectedMode === m ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Main Experiments Grid */}
          <div className="flex-1 min-h-0 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-max">
            {filteredLabs.map((lab) => (
              <motion.div
                key={lab.id}
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={(e) => handleLaunchLab(lab.id, e)}
                className="bg-zinc-900/80 border border-white/15 hover:border-white/50 rounded-xl p-5 flex flex-col justify-between transition-all shadow-xl group cursor-pointer relative overflow-hidden"
              >
                {/* Header info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-white/10 text-white px-2 py-0.5 rounded border border-white/15 font-bold">
                      {lab.subject}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>~25 min</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 font-mono">
                    {lab.title}
                  </h3>

                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                    {lab.objective}
                  </p>

                  {/* Apparatus badges */}
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center gap-1">
                      <Beaker className="w-3 h-3 text-zinc-300" /> Apparatus Required:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {lab.apparatus.slice(0, 4).map((app) => (
                        <span
                          key={app.id}
                          className="text-[9px] bg-black/60 border border-white/10 text-zinc-300 px-1.5 py-0.5 rounded font-mono"
                        >
                          {app.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Launch Action Footer */}
                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-zinc-400">
                    {lab.assessment.length} Checkpoints
                  </div>

                  <button
                    onClick={(e) => handleLaunchLab(lab.id, e)}
                    className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all flex items-center gap-1.5 active:scale-95 shadow-md font-mono"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>START EXPERIMENT</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
