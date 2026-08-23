import React, { useState, useMemo } from 'react';
import { MathComputationalEngine, type FunctionGraphData } from '../../engines/MathComputationalEngine';
import { ZoomIn, ZoomOut, Move, Sliders, X, Sparkles, Activity } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

interface EmbeddedGraphOnCanvasProps {
  id: string;
  expression: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  onClose?: () => void;
}

export const EmbeddedGraphOnCanvas: React.FC<EmbeddedGraphOnCanvasProps> = ({
  id,
  expression,
  x,
  y,
  width = 380,
  height = 260,
  onClose,
}) => {
  const [domainRange, setDomainRange] = useState<number>(10);
  const [paramC, setParamC] = useState<number>(-3);
  const { addAIMessage } = useBoardStore();

  // Active Expression with parameter adjustment
  const activeExpression = useMemo(() => {
    if (expression.includes('x^2') || expression.includes('x²')) {
      return `y = x² ${paramC >= 0 ? '+' : ''}${paramC}`;
    }
    return expression;
  }, [expression, paramC]);

  // Compute graph plotting data
  const graphData: FunctionGraphData = useMemo(() => {
    return MathComputationalEngine.generateGraphData(activeExpression, -domainRange, domainRange, 150);
  }, [activeExpression, domainRange]);

  const handleZoomIn = () => setDomainRange((prev) => Math.max(3, prev - 2));
  const handleZoomOut = () => setDomainRange((prev) => Math.min(20, prev + 2));

  const handleExplain = () => {
    addAIMessage({
      sender: 'ai',
      text: `📊 [Graph Analysis of ${activeExpression}]:\n• Domain: [${-domainRange}, ${domainRange}]\n• Y-intercept: ${graphData.yIntercept !== null ? `(0, ${graphData.yIntercept})` : 'None'}\n• X-intercepts: ${graphData.xIntercepts.length > 0 ? graphData.xIntercepts.map((val) => `(${val}, 0)`).join(', ') : 'None'}\n• Vertex: ${graphData.vertex ? `(${graphData.vertex.x}, ${graphData.vertex.y})` : 'N/A'}`,
    });
  };

  return (
    <div
      className="absolute z-30 bg-zinc-950/95 border-2 border-cyan-500/50 rounded-2xl p-3 font-mono text-xs shadow-2xl text-white select-none backdrop-blur-md"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-cyan-300 text-xs">{activeExpression}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
              title="Close Graph"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Coordinate Plotter */}
      <div className="relative w-full h-36 bg-black/80 rounded-xl border border-white/15 overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 300 140" className="w-full h-full">
          {/* Grid Lines */}
          {[-8, -4, 0, 4, 8].map((val) => {
            const gx = 150 + (val / domainRange) * 130;
            const gy = 70 - (val / domainRange) * 60;
            return (
              <React.Fragment key={val}>
                <line x1={gx} y1="0" x2={gx} y2="140" stroke="#27272a" strokeWidth="0.8" strokeDasharray="2" />
                <line x1="0" y1={gy} x2="300" y2={gy} stroke="#27272a" strokeWidth="0.8" strokeDasharray="2" />
              </React.Fragment>
            );
          })}

          {/* Coordinate Axes */}
          <line x1="0" y1="70" x2="300" y2="70" stroke="#71717a" strokeWidth="1.5" />
          <line x1="150" y1="0" x2="150" y2="140" stroke="#71717a" strokeWidth="1.5" />

          {/* Axis Labels */}
          <text x="285" y="65" fill="#a1a1aa" fontSize="8">X</text>
          <text x="155" y="12" fill="#a1a1aa" fontSize="8">Y</text>

          {/* Function Curve Path */}
          {graphData.points.length > 1 && (
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              points={graphData.points
                .map((p) => {
                  const cx = 150 + (p.x / domainRange) * 130;
                  const cy = 70 - (p.y / domainRange) * 60;
                  return `${cx.toFixed(1)},${cy.toFixed(1)}`;
                })
                .join(' ')}
            />
          )}

          {/* Intercept Badges */}
          {graphData.xIntercepts.map((xVal, idx) => {
            const cx = 150 + (xVal / domainRange) * 130;
            return <circle key={idx} cx={cx} cy="70" r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />;
          })}

          {graphData.yIntercept !== null && (
            <circle
              cx="150"
              cy={70 - (graphData.yIntercept / domainRange) * 60}
              r="3.5"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="1"
            />
          )}
        </svg>
      </div>

      {/* Parameter Control Slider & Quick Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-zinc-400 font-bold">Parameter c:</span>
          <input
            type="range"
            min="-8"
            max="8"
            step="1"
            value={paramC}
            onChange={(e) => setParamC(Number(e.target.value))}
            className="w-20 accent-cyan-400 cursor-pointer"
          />
          <span className="text-cyan-300 font-bold">{paramC}</span>
        </div>

        <button
          type="button"
          onClick={handleExplain}
          className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" /> Explain Graph
        </button>
      </div>
    </div>
  );
};
