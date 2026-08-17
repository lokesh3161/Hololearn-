import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { resizeCanvasToDisplaySize } from './canvasHelper';

export const KineticSim: React.FC = () => {
  const [mass, setMass] = useState<number>(10);
  const [velocity, setVelocity] = useState<number>(12);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [posX, setPosX] = useState<number>(80);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ke = 0.5 * mass * velocity * velocity;

  // Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setVelocity((v) => Math.min(30, v + 1));
      if (e.key === 'ArrowLeft') setVelocity((v) => Math.max(0, v - 1));
      if (e.key === 'ArrowUp') setMass((m) => Math.min(25, m + 1));
      if (e.key === 'ArrowDown') setMass((m) => Math.max(1, m - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Motion animation loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying && velocity > 0) {
        setPosX((prev) => {
          const next = prev + velocity * dt * 35;
          return next > 650 ? 80 : next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, velocity]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const surfaceY = h - 90;

    ctx.clearRect(0, 0, w, h);

    // Track Surface
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, surfaceY);
    ctx.lineTo(w - 30, surfaceY);
    ctx.stroke();

    // Vehicle Body
    const vehicleW = 40 + mass * 2.5;
    const vehicleH = 24 + mass * 1.2;
    const vehicleY = surfaceY - vehicleH - 10;

    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(posX, vehicleY, vehicleW, vehicleH);
    ctx.strokeRect(posX, vehicleY, vehicleW, vehicleH);

    // Vehicle Mass Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${mass}kg`, posX + vehicleW / 2, vehicleY + vehicleH / 2 + 4);

    // Wheels
    ctx.beginPath();
    ctx.arc(posX + 10, surfaceY - 5, 5, 0, Math.PI * 2);
    ctx.arc(posX + vehicleW - 10, surfaceY - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Speed Lines
    if (velocity > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(posX - i * 15, vehicleY + vehicleH / 2);
        ctx.lineTo(posX - i * 15 - velocity * 1.5, vehicleY + vehicleH / 2);
        ctx.stroke();
      }
    }

    // Velocity Vector Arrow
    if (velocity > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(posX + vehicleW, vehicleY + vehicleH / 2);
      ctx.lineTo(posX + vehicleW + velocity * 4, vehicleY + vehicleH / 2);
      ctx.stroke();
    }

    // Visual KE Bar Gauge at Top Right
    const barX = w - 220;
    const barY = 40;
    const barW = 180;
    const barH = 20;
    const fillW = Math.min(barW, (ke / 5625) * barW); // max KE = 0.5 * 25 * 30^2 = 11250

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX, barY, fillW, barH);

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`KE Gauge (v² scaling)`, barX, barY - 8);
  }, [mass, velocity, ke, posX]);

  return (
    <div className="flex-1 flex text-white overflow-hidden select-none">
      {/* Viewport */}
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Live Substituted Formula Banner */}
        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-xl p-4 rounded-xl border border-white/15 shadow-2xl space-y-1 font-mono text-xs max-w-sm">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10 pb-1">
            KINETIC ENERGY LIVE FORMULA SUBSTITUTION
          </div>
          <div className="text-sm text-zinc-300">
            KE = ½ × m × v²
          </div>
          <div className="text-base font-bold text-white">
            KE = ½ × {mass} kg × ({velocity} m/s)² = <span className="underline decoration-white/40">{ke.toFixed(1)} J</span>
          </div>
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400 border-b border-white/10 pb-2">
            Kinetic Parameters
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Mass (m):</span>
              <span className="text-white font-bold">{mass} kg</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={mass}
              onChange={(e) => setMass(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
            <div className="text-[10px] text-zinc-500 font-mono">Hotkeys: ↑ ↓ Arrow keys</div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Velocity (v):</span>
              <span className="text-white font-bold">{velocity} m/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={velocity}
              onChange={(e) => setVelocity(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
            <div className="text-[10px] text-zinc-500 font-mono">Hotkeys: ← → Arrow keys</div>
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
            onClick={() => {
              setMass(10);
              setVelocity(12);
              setPosX(80);
            }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
