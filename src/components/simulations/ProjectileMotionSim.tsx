import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { resizeCanvasToDisplaySize } from './canvasHelper';

export const ProjectileMotionSim: React.FC = () => {
  const [angle, setAngle] = useState<number>(45); // degrees
  const [velocity, setVelocity] = useState<number>(20); // m/s
  const [gravity, setGravity] = useState<number>(9.8); // m/s²
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Derived physics values with division guards
  const safeG = Math.max(0.1, gravity);
  const rad = (angle * Math.PI) / 180;
  const vx = velocity * Math.cos(rad);
  const vy0 = velocity * Math.sin(rad);
  const flightTime = Math.max(0.1, (2 * vy0) / safeG);
  const maxHeight = (vy0 * vy0) / (2 * safeG);
  const range = (velocity * velocity * Math.sin(2 * rad)) / safeG;

  // Arrow key & G key controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setAngle((prev) => Math.max(5, prev - 2));
      if (e.key === 'ArrowRight') setAngle((prev) => Math.min(85, prev + 2));
      if (e.key === 'ArrowUp') setVelocity((prev) => Math.min(50, prev + 1));
      if (e.key === 'ArrowDown') setVelocity((prev) => Math.max(2, prev - 1));
      if (e.key === 'g' || e.key === 'G') {
        setGravity((prev) => {
          if (Math.abs(prev - 9.8) < 0.5) return 1.6; // Moon
          if (Math.abs(prev - 1.6) < 0.5) return 24.8; // Jupiter
          return 9.8; // Earth
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setSimTime((prev) => {
          const next = prev + dt * 1.5;
          return next > flightTime ? 0 : next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, flightTime]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const padding = 60;
    const originX = padding;
    const originY = h - padding;

    const scaleX = (w - padding * 2) / Math.max(range * 1.25, 30);
    const scaleY = (h - padding * 2) / Math.max(maxHeight * 1.35, 15);

    ctx.clearRect(0, 0, w, h);

    // Ground line & Y-axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(w, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, h);
    ctx.stroke();

    // Trajectory Arc
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    const step = flightTime / 100;
    for (let t = 0; t <= flightTime; t += step) {
      const x = vx * t;
      const y = vy0 * t - 0.5 * safeG * t * t;
      const px = originX + x * scaleX;
      const py = originY - y * scaleY;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Max Height Dashed Line
    const maxHx = originX + (range / 2) * scaleX;
    const maxHy = originY - maxHeight * scaleY;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(maxHx, originY);
    ctx.lineTo(maxHx, maxHy);
    ctx.lineTo(originX, maxHy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`H_max = ${maxHeight.toFixed(1)}m`, maxHx + 6, maxHy + 12);
    ctx.fillText(`Range = ${range.toFixed(1)}m`, originX + range * scaleX - 40, originY + 20);

    // Current Projectile Position
    const curX = vx * simTime;
    const curY = Math.max(0, vy0 * simTime - 0.5 * safeG * simTime * simTime);
    const px = originX + curX * scaleX;
    const py = originY - curY * scaleY;

    // Projectile Ball Glow
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Velocity Vector Arrows (vx and vy)
    const curVy = vy0 - safeG * simTime;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    // Horizontal vx arrow
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + vx * 2, py);
    ctx.stroke();

    // Vertical vy arrow
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - curVy * 2);
    ctx.stroke();
  }, [angle, velocity, safeG, simTime, range, maxHeight, flightTime, vx, vy0]);

  const gravityName =
    Math.abs(gravity - 9.8) < 0.5
      ? 'Earth (9.8 m/s²)'
      : Math.abs(gravity - 1.6) < 0.5
      ? 'Moon (1.6 m/s²)'
      : 'Jupiter (24.8 m/s²)';

  return (
    <div className="flex-1 flex text-white overflow-hidden select-none">
      {/* Interactive Canvas Viewport */}
      <div className="flex-1 relative bg-black/60 p-4 flex flex-col">
        <canvas ref={canvasRef} className="w-full flex-1 block" />

        {/* Live Substituted Formula Box */}
        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-xl p-3.5 rounded-xl border border-white/15 text-xs font-mono space-y-1.5 shadow-2xl max-w-sm">
          <div className="text-[10px] text-zinc-400 font-bold tracking-wide uppercase border-b border-white/10 pb-1">
            LIVE FORMULA SUBSTITUTION
          </div>
          <div>
            <span className="text-zinc-400">R = v₀² sin2θ / g = </span>
            <span className="text-white font-semibold">
              ({velocity})² × sin({2 * angle}°) / {safeG} ={' '}
            </span>
            <span className="text-white font-bold">{range.toFixed(2)} m</span>
          </div>
          <div>
            <span className="text-zinc-400">H = v₀² sin²θ / 2g = </span>
            <span className="text-white font-semibold">
              ({velocity})² × sin²({angle}°) / (2 × {safeG}) ={' '}
            </span>
            <span className="text-white font-bold">{maxHeight.toFixed(2)} m</span>
          </div>
          <div>
            <span className="text-zinc-400">T = 2v₀ sinθ / g = </span>
            <span className="text-white font-semibold">
              2 × {velocity} × sin({angle}°) / {safeG} ={' '}
            </span>
            <span className="text-white font-bold">{flightTime.toFixed(2)} s</span>
          </div>
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400 border-b border-white/10 pb-2">
            Simulation Parameters
          </h3>

          {/* Launch Angle Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Launch Angle (θ):</span>
              <span className="text-white font-bold">{angle}°</span>
            </div>
            <input
              type="range"
              min="5"
              max="85"
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
            <div className="text-[10px] text-zinc-500 font-mono">Hotkeys: ← → Arrow keys</div>
          </div>

          {/* Velocity Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Initial Velocity (v₀):</span>
              <span className="text-white font-bold">{velocity} m/s</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              value={velocity}
              onChange={(e) => setVelocity(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
            <div className="text-[10px] text-zinc-500 font-mono">Hotkeys: ↑ ↓ Arrow keys</div>
          </div>

          {/* Gravity Preset Button */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Environment (g):</span>
              <span className="text-white font-bold">{gravityName}</span>
            </div>
            <button
              onClick={() => {
                if (Math.abs(gravity - 9.8) < 0.5) setGravity(1.6);
                else if (Math.abs(gravity - 1.6) < 0.5) setGravity(24.8);
                else setGravity(9.8);
              }}
              className="w-full py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-xs font-semibold transition-colors"
            >
              Cycle Gravity (Press G)
            </button>
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
            onClick={() => setSimTime(0)}
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
