import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { resizeCanvasToDisplaySize } from './canvasHelper';

export const InterferenceSim: React.FC = () => {
  const [wavelengthNm, setWavelengthNm] = useState<number>(550); // nm
  const [slitSeparationMm, setSlitSeparationMm] = useState<number>(0.5); // mm
  const [screenDistanceM, setScreenDistanceM] = useState<number>(1.5); // m
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [phaseOffset, setPhaseOffset] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const lambda = wavelengthNm * 1e-9;
  const d = slitSeparationMm * 1e-3;
  const D = screenDistanceM;

  const fringeWidthMm = ((lambda * D) / d) * 1000;

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setPhaseOffset((prev) => prev + dt * 10);
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

    const sourceX = 80;
    const s1Y = h / 2 - slitSeparationMm * 40;
    const s2Y = h / 2 + slitSeparationMm * 40;

    ctx.clearRect(0, 0, w, h);

    // Double Slit Barrier
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(sourceX, 0);
    ctx.lineTo(sourceX, s1Y - 6);
    ctx.moveTo(sourceX, s1Y + 6);
    ctx.lineTo(sourceX, s2Y - 6);
    ctx.moveTo(sourceX, s2Y + 6);
    ctx.lineTo(sourceX, h);
    ctx.stroke();

    // 2D Interference Ripples
    ctx.lineWidth = 1;

    for (let radius = 10; radius < w - sourceX; radius += 15) {
      const alpha = Math.max(0.1, 1 - radius / w);

      // S1 Wavefront
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(sourceX, s1Y, radius, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      // S2 Wavefront
      ctx.beginPath();
      ctx.arc(sourceX, s2Y, radius, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }

    // Screen (right edge)
    const screenX = w - 40;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, 20);
    ctx.lineTo(screenX, h - 20);
    ctx.stroke();

    // Intensity Fringes on Screen
    for (let y = 20; y < h - 20; y += 2) {
      const dy1 = y - s1Y;
      const dy2 = y - s2Y;
      const r1 = Math.hypot(screenX - sourceX, dy1);
      const r2 = Math.hypot(screenX - sourceX, dy2);
      const pathDiff = Math.abs(r1 - r2);
      const phaseDiff = (2 * Math.PI * pathDiff) / (wavelengthNm * 0.5);

      const intensity = 0.5 * (1 + Math.cos(phaseDiff + phaseOffset));
      ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
      ctx.fillRect(screenX + 5, y, 20, 2);
    }
  }, [wavelengthNm, slitSeparationMm, screenDistanceM, phaseOffset]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Double Slit Fringe Width
          </div>
          <div className="text-xl font-mono font-bold text-white">
            β = λD / d = <span className="underline decoration-white/40">{fringeWidthMm.toFixed(2)} mm</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            λ = {wavelengthNm} nm | d = {slitSeparationMm} mm | D = {screenDistanceM} m
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Interference Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Wavelength (λ):</span>
              <span className="text-white font-bold">{wavelengthNm} nm</span>
            </div>
            <input
              type="range"
              min="400"
              max="700"
              value={wavelengthNm}
              onChange={(e) => setWavelengthNm(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Slit Separation (d):</span>
              <span className="text-white font-bold">{slitSeparationMm} mm</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.05"
              value={slitSeparationMm}
              onChange={(e) => setSlitSeparationMm(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Screen Distance (D):</span>
              <span className="text-white font-bold">{screenDistanceM} m</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={screenDistanceM}
              onChange={(e) => setScreenDistanceM(Number(e.target.value))}
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
            <span>{isPlaying ? 'Pause Waves' : 'Propagate Waves'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
