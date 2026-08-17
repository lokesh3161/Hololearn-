import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { resizeCanvasToDisplaySize } from './canvasHelper';

export const NewtonForceSim: React.FC = () => {
  const [mass, setMass] = useState<number>(8); // kg
  const [accel, setAccel] = useState<number>(3); // m/s²
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [boxPosX, setBoxPosX] = useState<number>(100);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const force = mass * accel;

  // Arrow key shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setMass((m) => Math.min(25, m + 1));
      if (e.key === 'ArrowDown') setMass((m) => Math.max(1, m - 1));
      if (e.key === 'ArrowRight') setAccel((a) => Math.min(20, a + 0.5));
      if (e.key === 'ArrowLeft') setAccel((a) => Math.max(0.5, a - 0.5));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Motion animation
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setBoxPosX((prev) => {
          const next = prev + accel * dt * 25;
          return next > 700 ? 100 : next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, accel]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const surfaceY = h - 100;

    ctx.clearRect(0, 0, w, h);

    // Ground Surface
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, surfaceY);
    ctx.lineTo(w - 40, surfaceY);
    ctx.stroke();

    // Ground Hatching
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w - 40; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, surfaceY);
      ctx.lineTo(x - 10, surfaceY + 12);
      ctx.stroke();
    }

    // Box dimensions proportional to mass
    const boxSize = 50 + mass * 2.5;
    const boxY = surfaceY - boxSize;

    // Draw Box
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(boxPosX, boxY, boxSize, boxSize);
    ctx.strokeRect(boxPosX, boxY, boxSize, boxSize);

    // Mass Label Inside Box
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${mass} kg`, boxPosX + boxSize / 2, boxY + boxSize / 2 + 5);

    // Applied Force Vector Arrow
    const arrowStartX = boxPosX + boxSize;
    const arrowStartY = boxY + boxSize / 2;
    const arrowLength = Math.min(force * 2.5, w - arrowStartX - 50);

    if (arrowLength > 5) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowStartY);
      ctx.lineTo(arrowStartX + arrowLength, arrowStartY);
      ctx.stroke();

      // Arrow Tip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(arrowStartX + arrowLength + 10, arrowStartY);
      ctx.lineTo(arrowStartX + arrowLength - 5, arrowStartY - 8);
      ctx.lineTo(arrowStartX + arrowLength - 5, arrowStartY + 8);
      ctx.closePath();
      ctx.fill();

      // Force Label above arrow
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.fillText(`F = ${force.toFixed(1)} N`, arrowStartX + arrowLength / 2, arrowStartY - 14);
    }
  }, [mass, accel, force, boxPosX]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      {/* Simulation Viewport */}
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Live Calculation Formula Display */}
        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl">
          <div className="text-[11px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
            Newton's 2nd Law Formula
          </div>
          <div className="text-xl font-mono font-bold text-white tracking-wide">
            F = {mass} kg × {accel} m/s² = <span className="underline decoration-white/40">{force.toFixed(1)} N</span>
          </div>
        </div>
      </div>

      {/* Controls Sidebar */}
      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Force Controls
          </h3>

          {/* Mass Slider */}
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

          {/* Acceleration Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Acceleration (a):</span>
              <span className="text-white font-bold">{accel} m/s²</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              value={accel}
              onChange={(e) => setAccel(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
            <div className="text-[10px] text-zinc-500 font-mono">Hotkeys: ← → Arrow keys</div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={() => setBoxPosX(100)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
            title="Reset Position"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
