import React, { useState } from 'react';
import {
  MousePointer,
  PenTool,
  Highlighter,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Minus,
  ArrowUpRight,
  Type,
  Binary,
  Eraser,
  Hand,
  ZoomIn,
  ZoomOut,
  ChevronRight,
} from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import type { ToolType, ShapeSubtype } from '../../types/canvas';

export const LeftToolbar: React.FC = () => {
  const { activeTool, setTool, activeShape, setShape, setZoom, transform, mode, setEquationModalOpen } =
    useBoardStore();
  const [showShapeMenu, setShowShapeMenu] = useState(false);

  const tools: { type: ToolType; label: string; icon: React.ReactNode }[] = [
    { type: 'select', label: 'Select (V)', icon: <MousePointer className="w-4 h-4" /> },
    { type: 'pen', label: 'Pen Draw (P)', icon: <PenTool className="w-4 h-4" /> },
    { type: 'highlighter', label: 'Highlighter (H)', icon: <Highlighter className="w-4 h-4" /> },
    { type: 'text', label: 'Text (T)', icon: <Type className="w-4 h-4" /> },
    { type: 'equation', label: 'Equation LaTeX (E)', icon: <Binary className="w-4 h-4" /> },
    { type: 'eraser', label: 'Eraser (E)', icon: <Eraser className="w-4 h-4" /> },
  ];

  const shapes: { type: ShapeSubtype; label: string; icon: React.ReactNode }[] = [
    { type: 'circle', label: 'Circle', icon: <CircleIcon className="w-4 h-4" /> },
    { type: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" /> },
    { type: 'triangle', label: 'Triangle', icon: <TriangleIcon className="w-4 h-4" /> },
    { type: 'line', label: 'Line', icon: <Minus className="w-4 h-4" /> },
    { type: 'arrow', label: 'Vector Arrow', icon: <ArrowUpRight className="w-4 h-4" /> },
  ];

  if (mode === 'student') return null; // Hide drawing tools in read-only Student Mode

  return (
    <aside className="w-14 bg-black border-r border-white/10 flex flex-col items-center py-3 justify-between select-none z-20">
      <div className="flex flex-col items-center gap-1.5 w-full px-2">
        {tools.map((t) => {
          const isActive = activeTool === t.type;
          return (
            <button
              key={t.type}
              onClick={() => {
                if (t.type === 'equation') {
                  setEquationModalOpen(true);
                } else {
                  setTool(t.type);
                }
              }}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group ${
                isActive
                  ? 'bg-white text-black shadow-lg scale-105 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={t.label}
            >
              {t.icon}
              {/* Tooltip */}
              <div className="absolute left-14 bg-zinc-900 border border-white/15 px-2.5 py-1 rounded-md text-[11px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                {t.label}
              </div>
            </button>
          );
        })}

        {/* Shapes Dropdown Tool */}
        <div className="relative w-full flex justify-center">
          <button
            onClick={() => {
              setTool('shape');
              setShowShapeMenu(!showShapeMenu);
            }}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group ${
              activeTool === 'shape'
                ? 'bg-white text-black shadow-lg scale-105 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Shapes & Vectors"
          >
            {activeShape === 'circle' && <CircleIcon className="w-4 h-4" />}
            {activeShape === 'rectangle' && <Square className="w-4 h-4" />}
            {activeShape === 'triangle' && <TriangleIcon className="w-4 h-4" />}
            {activeShape === 'line' && <Minus className="w-4 h-4" />}
            {activeShape === 'arrow' && <ArrowUpRight className="w-4 h-4" />}
            <ChevronRight className="w-2.5 h-2.5 absolute right-1 bottom-1 text-current opacity-70" />
          </button>

          {/* Shape Submenu */}
          {showShapeMenu && (
            <div className="absolute left-14 top-0 bg-zinc-900 border border-white/15 p-1.5 rounded-xl shadow-2xl flex flex-col gap-1 z-50">
              {shapes.map((s) => (
                <button
                  key={s.type}
                  onClick={() => {
                    setShape(s.type);
                    setShowShapeMenu(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    activeShape === s.type
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {s.icon}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-6 h-[1px] bg-white/10 my-1" />

        {/* Hand Pan Tool */}
        <button
          onClick={() => setTool('hand')}
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group ${
            activeTool === 'hand'
              ? 'bg-white text-black shadow-lg scale-105'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Pan Canvas (Hand)"
        >
          <Hand className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Controls: Zoom In / Zoom Out */}
      <div className="flex flex-col items-center gap-1.5 w-full px-2">
        <button
          onClick={() => setZoom(transform.zoom * 1.15)}
          className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(transform.zoom / 1.15)}
          className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
