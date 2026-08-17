import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const ThermodynamicSim: React.FC = () => {
  const [mass, setMass] = useState<number>(2); // kg
  const [specHeat, setSpecHeat] = useState<number>(4186); // J/kgK (Water = 4186)
  const [tempChange, setTempChange] = useState<number>(25); // K
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [tempHistory, setTempHistory] = useState<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalHeatJoules = mass * specHeat * tempChange;

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setSimTime((prev) => {
          const next = prev + dt;
          const currentT = 293 + (tempChange * Math.min(next / 5, 1));
          setTempHistory((h) => [...h.slice(-150), currentT]);
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, tempChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);

    ctx.clearRect(0, 0, w, h);

    // Left Viewport: Vessel & Burner
    const vesselX = 140;
    const vesselBottom = h - 90;
    const vesselW = 100;
    const vesselH = 120;

    // Beaker Vessel
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(vesselX - vesselW / 2, vesselBottom - vesselH, vesselW, vesselH);

    // Fluid Fill
    const fillH = vesselH * 0.7;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(vesselX - vesselW / 2 + 2, vesselBottom - fillH, vesselW - 4, fillH - 2);

    // Flame / Heat Source
    if (isPlaying && simTime < 5) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(vesselX, vesselBottom + 20, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right Viewport: Temperature vs Time Graph
    const graphLeft = 280;
    const graphWidth = w - graphLeft - 40;
    const graphBottom = h - 60;
    const graphTop = 50;
    const graphH = graphBottom - graphTop;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(graphLeft, graphTop);
    ctx.lineTo(graphLeft, graphBottom);
    ctx.lineTo(graphLeft + graphWidth, graphBottom);
    ctx.stroke();

    if (tempHistory.length > 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      tempHistory.forEach((tVal, idx) => {
        const x = graphLeft + (idx / 150) * graphWidth;
        const y = graphBottom - ((tVal - 290) / 100) * graphH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [mass, tempChange, simTime, tempHistory, isPlaying]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Heat Transfer Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            Q = mcΔT = <span className="underline decoration-white/40">{(totalHeatJoules / 1000).toFixed(1)} kJ</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Mass: {mass} kg | c: {specHeat} J/(kg·K) | ΔT: {tempChange} K
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Thermal Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Mass (m):</span>
              <span className="text-white font-bold">{mass} kg</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              value={mass}
              onChange={(e) => setMass(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Specific Heat (c):</span>
              <span className="text-white font-bold">{specHeat} J/kgK</span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={specHeat}
              onChange={(e) => setSpecHeat(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Temp Change (ΔT):</span>
              <span className="text-white font-bold">{tempChange} K</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={tempChange}
              onChange={(e) => setTempChange(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause Heating' : 'Start Heating'}</span>
          </button>
          <button
            onClick={() => setSimTime(0)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
