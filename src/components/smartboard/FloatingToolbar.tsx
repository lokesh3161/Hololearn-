import React from 'react';
import { useBoardStore } from '../../store/boardStore';
import {
  PenTool,
  Highlighter,
  Eraser,
  MousePointer,
  Square,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import type { ToolType } from '../../types/canvas';

interface FloatingToolbarProps {
  onToggleAIPopover: () => void;
  isAIPopoverOpen: boolean;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onToggleAIPopover,
  isAIPopoverOpen,
}) => {
  const { activeTool, setTool, undo, redo, clearCanvas, strokeWidth, setStrokeWidth } = useBoardStore();

  const tools: { id: ToolType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'select', label: 'Select', icon: MousePointer },
    { id: 'pen', label: 'Pen', icon: PenTool },
    { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'shape', label: 'Shapes', icon: Square },
    { id: 'text', label: 'Text', icon: Type },
  ];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 border border-white/15 p-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xl shadow-2xl text-white select-none pointer-events-auto font-mono text-xs">
      {/* Drawing Tools */}
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            className={`p-2.5 rounded-full transition-all flex items-center justify-center active:scale-95 ${
              isActive
                ? 'bg-white text-black shadow-lg font-bold scale-105'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title={t.label}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="h-5 w-[1px] bg-white/15 mx-1" />

      {/* Stroke Width Selector (Compact) */}
      <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-full border border-white/10 text-[10px]">
        {[2, 4, 8].map((w) => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
              strokeWidth === w ? 'bg-cyan-400 text-black font-bold scale-110' : 'text-zinc-400 hover:text-white'
            }`}
          >
            •
          </button>
        ))}
      </div>

      <div className="h-5 w-[1px] bg-white/15 mx-1" />

      {/* Undo & Redo & Clear */}
      <button
        type="button"
        onClick={undo}
        className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={redo}
        className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Redo"
      >
        <Redo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={clearCanvas}
        className="p-2 rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Clear Board"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="h-5 w-[1px] bg-white/15 mx-1" />

      {/* Ephemeral ✦ AI Launcher Button */}
      <button
        type="button"
        onClick={onToggleAIPopover}
        className={`px-3.5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 ${
          isAIPopoverOpen
            ? 'bg-cyan-400 text-black border border-cyan-300 scale-105'
            : 'bg-zinc-900 text-cyan-300 border border-cyan-500/40 hover:bg-zinc-800'
        }`}
        title="Toggle Ephemeral AI Tutor Assistant"
      >
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <span>✦ AI</span>
      </button>
    </div>
  );
};
