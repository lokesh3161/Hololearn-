import React, { useState } from 'react';
import {
  MousePointer,
  Pen,
  Highlighter,
  Eraser,
  Type,
  Calculator,
  Square,
  Hand,
  Circle,
  Triangle,
  Minus,
  ArrowRight,
  Box,
  Cylinder,
  Cone,
  FlaskConical,
  Atom,
} from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import type { ToolType, ShapeSubtype } from '../../types/canvas';

const PALETTE_COLORS = [
  '#ffffff', // White
  '#38bdf8', // Light Blue
  '#4ade80', // Mint Green
  '#facc15', // Soft Yellow
  '#f87171', // Coral Red
  '#c084fc', // Light Purple
];

const PEN_WIDTHS = [2, 3.5, 6, 10, 16];
const ERASER_SIZES = [
  { label: 'S', size: 16 },
  { label: 'M', size: 28 },
  { label: 'L', size: 44 },
  { label: 'XL', size: 64 },
];

export const FloatingToolbar: React.FC = () => {
  const {
    activeTool,
    setTool,
    activeShape,
    setShape,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    eraserSize,
    setEraserSize,
    setEquationModalOpen,
    setVirtualLabDashboardOpen,
    openSimulation,
  } = useBoardStore();

  const [showPenMenu, setShowPenMenu] = useState(false);
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);

  const handleToolSelect = (tool: ToolType) => {
    setTool(tool);
    setShowPenMenu(false);
    setShowEraserMenu(false);
    setShowShapeMenu(false);
    if (tool === 'equation') {
      setEquationModalOpen(true);
    }
  };

  const handleShapeSelect = (shape: ShapeSubtype) => {
    setShape(shape);
    setTool('shape');
    setShowShapeMenu(false);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
      {/* Pen Style & Size Popover */}
      {showPenMenu && (
        <div className="pointer-events-auto absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/95 border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 z-40 min-w-[200px]">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider px-1">
            Ink Color
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            {PALETTE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setStrokeColor(c);
                }}
                className={`w-6 h-6 rounded-full border border-white/20 transition-transform ${
                  strokeColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="h-[1px] bg-white/10 my-0.5" />

          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider px-1">
            Pen Thickness
          </div>
          <div className="flex items-center gap-2 justify-between">
            {PEN_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => {
                  setStrokeWidth(w);
                  setShowPenMenu(false);
                }}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                  strokeWidth === w
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: `${Math.max(3, w * 0.75)}px`, height: `${Math.max(3, w * 0.75)}px` }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Eraser Size Popover */}
      {showEraserMenu && (
        <div className="pointer-events-auto absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/95 border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 z-40 min-w-[180px]">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider px-1">
            Eraser Box Size
          </div>
          <div className="flex items-center gap-2 justify-between">
            {ERASER_SIZES.map((item) => (
              <button
                key={item.size}
                onClick={() => {
                  setEraserSize(item.size);
                  setShowEraserMenu(false);
                }}
                className={`flex items-center justify-center w-9 h-9 rounded-lg border text-xs font-mono transition-all ${
                  eraserSize === item.size
                    ? 'bg-white text-black font-bold border-white shadow'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Shapes Menu */}
      {showShapeMenu && (
        <div className="pointer-events-auto absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/95 border border-white/15 rounded-xl p-2 shadow-2xl backdrop-blur-md grid grid-cols-4 gap-1.5 z-40 min-w-[210px]">
          <button
            onClick={() => handleShapeSelect('circle')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] gap-1 transition-colors ${
              activeTool === 'shape' && activeShape === 'circle'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Circle className="w-4 h-4" />
            <span>Circle</span>
          </button>
          <button
            onClick={() => handleShapeSelect('rectangle')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] gap-1 transition-colors ${
              activeTool === 'shape' && activeShape === 'rectangle'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Square className="w-4 h-4" />
            <span>Rect</span>
          </button>
          <button
            onClick={() => handleShapeSelect('triangle')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] gap-1 transition-colors ${
              activeTool === 'shape' && activeShape === 'triangle'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Triangle className="w-4 h-4" />
            <span>Triangle</span>
          </button>
          <button
            onClick={() => handleShapeSelect('line')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] gap-1 transition-colors ${
              activeTool === 'shape' && activeShape === 'line'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Minus className="w-4 h-4" />
            <span>Line</span>
          </button>
          <button
            onClick={() => handleShapeSelect('arrow')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] gap-1 transition-colors ${
              activeTool === 'shape' && activeShape === 'arrow'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>Arrow</span>
          </button>
          <button
            onClick={() => handleShapeSelect('cube')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] gap-1 transition-colors ${
              activeTool === 'shape' && activeShape === 'cube'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Cube</span>
          </button>
          <button
            onClick={() => handleShapeSelect('cylinder')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] gap-1 transition-colors ${
              activeTool === 'shape' && activeShape === 'cylinder'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Cylinder className="w-4 h-4" />
            <span>Cylinder</span>
          </button>
          <button
            onClick={() => handleShapeSelect('cone')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] gap-1 transition-colors ${
              activeTool === 'shape' && activeShape === 'cone'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Cone className="w-4 h-4" />
            <span>Cone</span>
          </button>
        </div>
      )}

      {/* Main Floating Tool Dock */}
      <div className="pointer-events-auto flex items-center gap-1 bg-[#0a0a0a]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15 shadow-2xl">
        {/* Select */}
        <button
          onClick={() => handleToolSelect('select')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'select' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Select Tool"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        {/* Hand / Pan */}
        <button
          onClick={() => handleToolSelect('hand')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'hand' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Hand / Pan Canvas"
        >
          <Hand className="w-4 h-4" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Pen & Size Popover */}
        <div className="relative flex items-center">
          <button
            onClick={() => {
              if (activeTool === 'pen') {
                setShowPenMenu(!showPenMenu);
                setShowEraserMenu(false);
                setShowShapeMenu(false);
              } else {
                handleToolSelect('pen');
              }
            }}
            className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTool === 'pen' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Pen (Click again for style & size menu)"
          >
            <Pen className="w-4 h-4" />
            <div
              className="w-2.5 h-2.5 rounded-full border border-black/30 ml-0.5"
              style={{ backgroundColor: strokeColor }}
            />
          </button>
        </div>

        {/* Highlighter */}
        <button
          onClick={() => handleToolSelect('highlighter')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'highlighter' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Highlighter"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        {/* Eraser & Size Popover */}
        <div className="relative flex items-center">
          <button
            onClick={() => {
              if (activeTool === 'eraser') {
                setShowEraserMenu(!showEraserMenu);
                setShowPenMenu(false);
                setShowShapeMenu(false);
              } else {
                handleToolSelect('eraser');
              }
            }}
            className={`p-2.5 rounded-xl transition-all flex items-center gap-1 ${
              activeTool === 'eraser' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="MS Paint Square Eraser (Click again for size menu)"
          >
            <Eraser className="w-4 h-4" />
            <span className="text-[9px] font-mono opacity-70">
              {eraserSize <= 20 ? 'S' : eraserSize <= 32 ? 'M' : eraserSize <= 50 ? 'L' : 'XL'}
            </span>
          </button>
        </div>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Text */}
        <button
          onClick={() => handleToolSelect('text')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'text' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Text Tool"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Equation */}
        <button
          onClick={() => handleToolSelect('equation')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'equation' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Math Equation Tool"
        >
          <Calculator className="w-4 h-4" />
        </button>

        {/* Shapes Menu */}
        <button
          onClick={() => {
            setShowShapeMenu(!showShapeMenu);
            setShowPenMenu(false);
            setShowEraserMenu(false);
          }}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'shape' || showShapeMenu
              ? 'bg-white text-black font-bold shadow'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Geometric Shapes"
        >
          <Square className="w-4 h-4" />
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Virtual Labs Shortcut */}
        <button
          onClick={() => setVirtualLabDashboardOpen(true)}
          className="p-2.5 rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-white/10 transition-all flex items-center gap-1.5"
          title="Open Virtual Labs Dashboard"
        >
          <FlaskConical className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Physics / Chemistry Simulations Shortcut */}
        <button
          onClick={() => openSimulation('newton')}
          className="p-2.5 rounded-xl text-zinc-400 hover:text-cyan-400 hover:bg-white/10 transition-all flex items-center gap-1.5"
          title="Open Physics & Chemistry Simulations"
        >
          <Atom className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </div>
  );
};
