import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { resizeCanvasToDisplaySize } from './canvasHelper';

export const WaveEquationSim: React.FC = () => {
  const [amplitude, setAmplitude] = useState<number>(40);
  const [frequency, setFrequency] = useState<number>(1.5);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [phaseOffset, setPhaseOffset] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const wavelength = 200 / frequency;
  const speed = frequency * wavelength;

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setPhaseOffset((prev) => prev + frequency * dt * Math.PI * 2);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, frequency]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Equilibrium Center Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Primary Sine Wave (v = fλ)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const k = (Math.PI * 2) / wavelength;

    for (let x = 0; x <= w; x += 2) {
      const y = cy - amplitude * Math.sin(k * x - phaseOffset);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary Cosine Phase Comparison Wave (dashed gray)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = cy - amplitude * Math.cos(k * x - phaseOffset);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Wavelength Markers λ
    const crest1X = (phaseOffset / k) % wavelength;
    const crest2X = crest1X + wavelength;

    if (crest2X < w) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(crest1X, cy - amplitude - 15);
      ctx.lineTo(crest2X, cy - amplitude - 15);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Wavelength λ = ${wavelength.toFixed(0)}px`, (crest1X + crest2X) / 2, cy - amplitude - 22);
    }
  }, [amplitude, frequency, phaseOffset, wavelength]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl">
          <div className="text-[11px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
            Wave Speed Equation (v = fλ)
          </div>
          <div className="text-xl font-mono font-bold text-white">
            v = {frequency.toFixed(1)} Hz × {wavelength.toFixed(0)} px = <span className="underline decoration-white/40">{speed.toFixed(0)} px/s</span>
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Wave Parameters
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Amplitude (A):</span>
              <span className="text-white font-bold">{amplitude} px</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={amplitude}
              onChange={(e) => setAmplitude(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Frequency (f):</span>
              <span className="text-white font-bold">{frequency.toFixed(1)} Hz</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.1"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
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
            <span>{isPlaying ? 'Pause Wave' : 'Propagate Wave'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
