import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause } from 'lucide-react';

export const FluidSim: React.FC = () => {
  const [v1, setV1] = useState<number>(2); // m/s
  const [areaRatio, setAreaRatio] = useState<number>(3); // A1 / A2 ratio
  const [density, setDensity] = useState<number>(1000); // kg/m³
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [particleOffset, setParticleOffset] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const v2 = v1 * areaRatio;
  const deltaP = 0.5 * density * (v2 * v2 - v1 * v1);

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setParticleOffset((prev) => (prev + dt * 60) % 1000);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const section1W = 160;
    const constrW = 140;

    const h1 = 120;
    const h2 = h1 / areaRatio;

    // Draw Constricted Pipe Outlines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    // Top wall
    ctx.beginPath();
    ctx.moveTo(40, cy - h1 / 2);
    ctx.lineTo(40 + section1W, cy - h1 / 2);
    ctx.lineTo(40 + section1W + 60, cy - h2 / 2);
    ctx.lineTo(40 + section1W + 60 + constrW, cy - h2 / 2);
    ctx.lineTo(w - 40, cy - h1 / 2);
    ctx.stroke();

    // Bottom wall
    ctx.beginPath();
    ctx.moveTo(40, cy + h1 / 2);
    ctx.lineTo(40 + section1W, cy + h1 / 2);
    ctx.lineTo(40 + section1W + 60, cy + h2 / 2);
    ctx.lineTo(40 + section1W + 60 + constrW, cy + h2 / 2);
    ctx.lineTo(w - 40, cy + h1 / 2);
    ctx.stroke();

    // Fluid Particles moving through pipe
    const numParticles = 50;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;

    for (let i = 0; i < numParticles; i++) {
      const startX = ((i * 15 + particleOffset * v1) % (w - 80)) + 40;
      let currentH = h1;
      let speedFactor = v1;

      if (startX > 40 + section1W && startX < 40 + section1W + 60 + constrW) {
        currentH = h2;
        speedFactor = v2;
      }

      const py = cy + (Math.sin(i * 1.7) * (currentH / 2 - 10));

      ctx.beginPath();
      ctx.arc(startX, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [v1, areaRatio, v2, particleOffset]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Bernoulli Fluid Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            Pressure Drop ΔP = <span className="underline decoration-white/40">{(deltaP / 1000).toFixed(2)} kPa</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Inlet Speed v₁ = {v1} m/s | Throat Speed v₂ = {v2.toFixed(1)} m/s | Ratio A₁/A₂ = {areaRatio}
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Fluid Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Inlet Speed (v₁):</span>
              <span className="text-white font-bold">{v1} m/s</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={v1}
              onChange={(e) => setV1(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Constriction Ratio (A₁/A₂):</span>
              <span className="text-white font-bold">{areaRatio}×</span>
            </div>
            <input
              type="range"
              min="1.2"
              max="6"
              step="0.2"
              value={areaRatio}
              onChange={(e) => setAreaRatio(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Fluid Density (ρ):</span>
              <span className="text-white font-bold">{density} kg/m³</span>
            </div>
            <input
              type="range"
              min="500"
              max="2000"
              step="100"
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause Flow' : 'Start Flow'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
