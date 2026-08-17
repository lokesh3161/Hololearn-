import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

type FunctionPreset = 'quadratic' | 'linear' | 'sine' | 'cosine' | 'tangent' | 'cubic' | 'reciprocal' | 'exp' | 'log' | 'abs' | 'circle';

export const QuadraticGraphSim: React.FC = () => {
  const [preset, setPreset] = useState<FunctionPreset>('quadratic');
  const [paramA, setParamA] = useState<number>(1);
  const [paramB, setParamB] = useState<number>(-2);
  const [paramC, setParamC] = useState<number>(-3);
  const [zoomScale, setZoomScale] = useState<number>(35); // pixels per unit
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Vertex & Roots for quadratic
  const vertexX = -paramB / (2 * (paramA || 0.001));
  const vertexY = paramC - (paramB * paramB) / (4 * (paramA || 0.001));
  const disc = paramB * paramB - 4 * paramA * paramC;
  const root1 = disc >= 0 ? (-paramB + Math.sqrt(disc)) / (2 * (paramA || 0.001)) : null;
  const root2 = disc >= 0 ? (-paramB - Math.sqrt(disc)) / (2 * (paramA || 0.001)) : null;

  // Keyboard controls for sliders
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a') setParamA((a) => Math.min(5, a + 0.25));
      if (key === 'z') setParamA((a) => Math.max(-5, a - 0.25));
      if (key === 's') setParamB((b) => Math.min(10, b + 0.5));
      if (key === 'x') setParamB((b) => Math.max(-10, b - 0.5));
      if (key === 'd') setParamC((c) => Math.min(10, c + 0.5));
      if (key === 'c') setParamC((c) => Math.max(-10, c - 0.5));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Evaluate function y = f(x)
  const evalY = (x: number): number | null => {
    switch (preset) {
      case 'quadratic':
        return paramA * x * x + paramB * x + paramC;
      case 'linear':
        return 2 * x + 3;
      case 'sine':
        return Math.sin(x);
      case 'cosine':
        return Math.cos(x);
      case 'tangent':
        const t = Math.tan(x);
        return Math.abs(t) > 20 ? null : t;
      case 'cubic':
        return x * x * x - 3 * x;
      case 'reciprocal':
        return Math.abs(x) < 0.05 ? null : 1 / x;
      case 'exp':
        return Math.exp(x);
      case 'log':
        return x <= 0 ? null : Math.log(x);
      case 'abs':
        return Math.abs(x);
      default:
        return paramA * x * x + paramB * x + paramC;
    }
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const originX = w / 2 + pan.x;
    const originY = h / 2 + pan.y;
    const scale = zoomScale;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    const startX = Math.floor((-originX) / scale);
    const endX = Math.ceil((w - originX) / scale);
    const startY = Math.floor((-originY) / scale);
    const endY = Math.ceil((h - originY) / scale);

    for (let gx = startX; gx <= endX; gx++) {
      const px = originX + gx * scale;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
    for (let gy = startY; gy <= endY; gy++) {
      const py = originY - gy * scale;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }

    // Main Axes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(w, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, h);
    ctx.stroke();

    // Axis Numbers
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px "JetBrains Mono", monospace';
    for (let gx = startX; gx <= endX; gx++) {
      if (gx === 0) continue;
      const px = originX + gx * scale;
      ctx.fillText(`${gx}`, px - 4, originY + 14);
    }

    // Plot Circle equation x² + y² = r² separately
    if (preset === 'circle') {
      const r = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(originX, originY, r * scale, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    // Axis of Symmetry for Quadratic
    if (preset === 'quadratic') {
      const axisPx = originX + vertexX * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(axisPx, 0);
      ctx.lineTo(axisPx, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Plot Function with 800+ sample points
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();

    let isDrawing = false;
    const numPoints = 800;
    const dx = w / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const px = i * dx;
      const graphX = (px - originX) / scale;
      const graphY = evalY(graphX);

      if (graphY === null || isNaN(graphY)) {
        isDrawing = false;
        continue;
      }

      const py = originY - graphY * scale;

      if (py >= -500 && py <= h + 500) {
        if (!isDrawing) {
          ctx.moveTo(px, py);
          isDrawing = true;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        isDrawing = false;
      }
    }
    ctx.stroke();

    // Quadratic Features Highlights
    if (preset === 'quadratic') {
      const vPx = originX + vertexX * scale;
      const vPy = originY - vertexY * scale;

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(vPx, vPy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText(`Vertex (${vertexX.toFixed(1)}, ${vertexY.toFixed(1)})`, vPx + 10, vPy - 8);

      if (root1 !== null && root2 !== null) {
        [root1, root2].forEach((r) => {
          const rPx = originX + r * scale;
          const rPy = originY;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(rPx, rPy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText(`Root: ${r.toFixed(2)}`, rPx - 25, rPy + 18);
        });
      }
    }
  }, [preset, paramA, paramB, paramC, zoomScale, pan, vertexX, vertexY, root1, root2]);

  // Mouse Drag / Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const formulaDisplayMap: Record<FunctionPreset, string> = {
    quadratic: `y = ${paramA}x² ${paramB >= 0 ? `+ ${paramB}` : `- ${Math.abs(paramB)}`}x ${paramC >= 0 ? `+ ${paramC}` : `- ${Math.abs(paramC)}`}`,
    linear: 'y = 2x + 3',
    sine: 'y = sin(x)',
    cosine: 'y = cos(x)',
    tangent: 'y = tan(x)',
    cubic: 'y = x³ - 3x',
    reciprocal: 'y = 1 / x',
    exp: 'y = e^x',
    log: 'y = log(x)',
    abs: 'y = |x|',
    circle: 'x² + y² = 3²',
  };

  return (
    <div className="flex-1 flex text-white overflow-hidden select-none">
      {/* Interactive Plotting Canvas */}
      <div
        className="flex-1 relative bg-black/60 p-4 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Live Equation Banner */}
        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-xl p-4 rounded-xl border border-white/15 shadow-2xl space-y-1 max-w-sm">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            FUNCTION PLOTTER ENGINE
          </div>
          <div className="text-xl font-mono font-bold text-white tracking-wide">
            {formulaDisplayMap[preset]}
          </div>
        </div>

        {/* Zoom & Reset Toolbar */}
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur p-1.5 rounded-xl border border-white/15 flex items-center gap-1">
          <button
            onClick={() => setZoomScale((z) => Math.min(100, z * 1.25))}
            className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomScale((z) => Math.max(10, z / 1.25))}
            className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoomScale(35);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400 border-b border-white/10 pb-2">
            Function Select & Parameters
          </h3>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <div className="text-zinc-400 font-mono text-[11px]">Select Function Type:</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['quadratic', 'y = ax² + bx + c'],
                  ['linear', 'y = 2x + 3'],
                  ['sine', 'y = sin(x)'],
                  ['cosine', 'y = cos(x)'],
                  ['tangent', 'y = tan(x)'],
                  ['cubic', 'y = x³ - 3x'],
                  ['reciprocal', 'y = 1/x'],
                  ['exp', 'y = e^x'],
                  ['log', 'y = log(x)'],
                  ['abs', 'y = |x|'],
                  ['circle', 'x² + y² = r²'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPreset(id)}
                  className={`px-2 py-1.5 rounded border text-[11px] font-mono transition-colors text-left truncate ${
                    preset === id
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quadratic Sliders */}
          {preset === 'quadratic' && (
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">a (Opening/Curvature):</span>
                  <span className="text-white font-bold">{paramA}</span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.25"
                  value={paramA}
                  onChange={(e) => setParamA(Number(e.target.value))}
                  className="w-full accent-white bg-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">b (Linear Slope):</span>
                  <span className="text-white font-bold">{paramB}</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={paramB}
                  onChange={(e) => setParamB(Number(e.target.value))}
                  className="w-full accent-white bg-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-400">c (Y-Intercept):</span>
                  <span className="text-white font-bold">{paramC}</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={paramC}
                  onChange={(e) => setParamC(Number(e.target.value))}
                  className="w-full accent-white bg-zinc-800"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10 text-[11px] font-mono text-zinc-500">
          💡 Drag plane to pan, use zoom buttons to adjust scale.
        </div>
      </div>
    </div>
  );
};
