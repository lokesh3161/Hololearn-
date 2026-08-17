import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const DecaySim: React.FC = () => {
  const [initNuclei, setInitNuclei] = useState<number>(400);
  const [halfLifeSec, setHalfLifeSec] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const lambda = Math.LN2 / halfLifeSec;
  const currentNuclei = initNuclei * Math.exp(-lambda * simTime);

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setSimTime((prev) => {
          const next = prev + dt;
          const remaining = initNuclei * Math.exp(-lambda * next);
          setHistory((h) => [...h.slice(-150), remaining]);
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, lambda, initNuclei]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);

    ctx.clearRect(0, 0, w, h);

    // Left Viewport: Nuclei Grid Matrix
    const gridLeft = 30;
    const gridTop = 40;
    const cols = 20;
    const rows = 20;
    const totalGrid = cols * rows;
    const activeCount = Math.round((currentNuclei / initNuclei) * totalGrid);

    for (let i = 0; i < totalGrid; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gridLeft + col * 10;
      const y = gridTop + row * 10;

      if (i < activeCount) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Right Viewport: Exponential Decay Curve Graph
    const graphLeft = 260;
    const graphWidth = w - graphLeft - 40;
    const graphBottom = h - 50;
    const graphTop = 40;
    const graphH = graphBottom - graphTop;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(graphLeft, graphTop);
    ctx.lineTo(graphLeft, graphBottom);
    ctx.lineTo(graphLeft + graphWidth, graphBottom);
    ctx.stroke();

    if (history.length > 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      history.forEach((nVal, idx) => {
        const x = graphLeft + (idx / 150) * graphWidth;
        const y = graphBottom - (nVal / initNuclei) * graphH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [initNuclei, currentNuclei, history]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Nuclear Decay Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            N(t) = N₀ e^-λt = <span className="underline decoration-white/40">{Math.round(currentNuclei)} nuclei</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Half-life t½ = {halfLifeSec} s | Elapsed Time: {simTime.toFixed(1)} s
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Decay Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Initial Nuclei (N₀):</span>
              <span className="text-white font-bold">{initNuclei}</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={initNuclei}
              onChange={(e) => setInitNuclei(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Half-Life (t½):</span>
              <span className="text-white font-bold">{halfLifeSec} s</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={halfLifeSec}
              onChange={(e) => setHalfLifeSec(Number(e.target.value))}
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
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
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
