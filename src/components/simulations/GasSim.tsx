import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const GasSim: React.FC = () => {
  const [temperature, setTemperature] = useState<number>(300); // K
  const [volume, setVolume] = useState<number>(5); // L
  const [moles, setMoles] = useState<number>(1); // mol
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const R = 8.314;
  // P = nRT / V (P in kPa for display)
  const pressure = (moles * R * temperature) / volume;

  // Initialize particles
  useEffect(() => {
    const numParticles = 40;
    const pts: Particle[] = [];
    for (let i = 0; i < numParticles; i++) {
      pts.push({
        x: 40 + Math.random() * 140,
        y: 60 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      });
    }
    particlesRef.current = pts;
  }, []);

  // Particle motion animation
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        const speedScale = Math.sqrt(temperature / 300) * 80;
        const pts = particlesRef.current;

        const boxLeft = 40;
        const boxRight = 240;
        const boxBottom = 260;
        const boxTop = boxBottom - volume * 25;

        pts.forEach((p) => {
          p.x += p.vx * speedScale * dt;
          p.y += p.vy * speedScale * dt;

          if (p.x <= boxLeft + 5) {
            p.x = boxLeft + 5;
            p.vx *= -1;
          }
          if (p.x >= boxRight - 5) {
            p.x = boxRight - 5;
            p.vx *= -1;
          }
          if (p.y <= boxTop + 5) {
            p.y = boxTop + 5;
            p.vy *= -1;
          }
          if (p.y >= boxBottom - 5) {
            p.y = boxBottom - 5;
            p.vy *= -1;
          }
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, temperature, volume]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);

    ctx.clearRect(0, 0, w, h);

    // Gas Container Cylinder
    const boxLeft = 40;
    const boxRight = 240;
    const boxBottom = 260;
    const boxTop = boxBottom - volume * 25;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(boxLeft, 40);
    ctx.lineTo(boxLeft, boxBottom);
    ctx.lineTo(boxRight, boxBottom);
    ctx.lineTo(boxRight, 40);
    ctx.stroke();

    // Movable Piston Top
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxLeft + 2, boxTop - 12, boxRight - boxLeft - 4, 14);

    // Piston Handle
    ctx.fillRect((boxLeft + boxRight) / 2 - 4, 20, 8, boxTop - 32);

    // Gas Particles
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    particlesRef.current.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, Math.max(boxTop + 4, Math.min(boxBottom - 4, p.y)), 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Real-time P-V Graph on right side
    const graphLeft = 320;
    const graphWidth = w - graphLeft - 40;
    const graphTop = 50;
    const graphHeight = 220;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    // Axes
    ctx.beginPath();
    ctx.moveTo(graphLeft, graphTop);
    ctx.lineTo(graphLeft, graphTop + graphHeight);
    ctx.lineTo(graphLeft + graphWidth, graphTop + graphHeight);
    ctx.stroke();

    // Isotherm P-V Curve
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let vVal = 1; vVal <= 15; vVal += 0.2) {
      const pVal = (moles * R * temperature) / vVal;
      const gx = graphLeft + (vVal / 15) * graphWidth;
      const gy = graphTop + graphHeight - (pVal / 800) * graphHeight;
      if (vVal === 1) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    }
    ctx.stroke();

    // Current State Dot on Graph
    const curGx = graphLeft + (volume / 15) * graphWidth;
    const curGy = graphTop + graphHeight - (pressure / 800) * graphHeight;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(curGx, curGy, 6, 0, Math.PI * 2);
    ctx.fill();
  }, [volume, temperature, moles, pressure]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Ideal Gas Law Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            P = nRT / V = <span className="underline decoration-white/40">{pressure.toFixed(1)} kPa</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            T = {temperature} K | V = {volume} L | n = {moles} mol
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Gas Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Temperature (T):</span>
              <span className="text-white font-bold">{temperature} K</span>
            </div>
            <input
              type="range"
              min="50"
              max="800"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Piston Volume (V):</span>
              <span className="text-white font-bold">{volume} L</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Moles (n):</span>
              <span className="text-white font-bold">{moles} mol</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="5"
              step="0.2"
              value={moles}
              onChange={(e) => setMoles(Number(e.target.value))}
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
            <span>{isPlaying ? 'Pause Particles' : 'Start Particles'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
