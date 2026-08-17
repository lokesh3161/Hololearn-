import React, { useState } from 'react';
import { X, Binary, Check } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import type { CanvasObject } from '../../types/canvas';
import { scheduleDetection } from '../../services/detectionService';
import { equationRegistry } from '../../registry/equationRegistry';

export const EquationModal: React.FC = () => {
  const { isEquationModalOpen, setEquationModalOpen, addObject, setActiveDetection, objects } =
    useBoardStore();
  const [equationText, setEquationText] = useState('F = ma');
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'physics' | 'mathematics'>('all');

  if (!isEquationModalOpen) return null;

  const filteredEntries = equationRegistry.filter(
    (e) => selectedSubject === 'all' || e.subject === selectedSubject
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equationText.trim()) return;

    const newObj: CanvasObject = {
      id: `eq-${Date.now()}`,
      type: 'equation',
      points: [{ x: 300, y: 220 }],
      x: 300,
      y: 220,
      width: Math.max(equationText.length * 15, 120),
      height: 40,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      opacity: 1,
      mathLatex: equationText,
      zIndex: objects.length + 1,
      isGlowing: true,
    };

    addObject(newObj);
    scheduleDetection(newObj, setActiveDetection);
    setEquationModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-lg bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 text-white glass-panel-elevated">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Binary className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-sm tracking-wide">Insert STEM Formula / Equation</h3>
          </div>
          <button
            onClick={() => setEquationModalOpen(false)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Enter LaTeX or Plain Formula String:
            </label>
            <input
              type="text"
              value={equationText}
              onChange={(e) => setEquationText(e.target.value)}
              placeholder="e.g. F = ma or V = IR or PV = nRT"
              autoFocus
              className="w-full bg-zinc-900 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-white shadow-inner"
            />
          </div>

          {/* Subject Filter Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Registry Equation Presets:
              </span>
              <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/10 text-[10px]">
                {(['all', 'physics', 'mathematics'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-2 py-0.5 rounded capitalize transition-all ${
                      selectedSubject === sub ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredEntries.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setEquationText(p.latex)}
                  className="text-left p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 transition-all text-xs"
                >
                  <div className="font-medium text-white text-[11px] truncate">{p.displayName}</div>
                  <div className="font-mono text-[10px] text-zinc-400 truncate">{p.latex}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setEquationModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors active:scale-95 shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Place on Smartboard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
