import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const GravitationSim: React.FC = () => {
  const [mass1, setMass1] = useState<number>(5.97); // x10^24 kg
  const [mass2, setMass2] = useState<number>(500); // kg
  const [distance, setDistance] = useState<number>(6.7); // x10^6 m
  const [isOrbiting, setIsOrbiting] = useState<boolean>(true);
  const [orbitAngle, setOrbitAngle] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const G = 6.674e-11;
  const m1 = mass1 * 1e24;
  const m2 = mass2;
  const r = distance * 1e6;

  const force = (G * m1 * m2) / (r * r);
  const orbitalVelocity = Math.sqrt((G * m1) / r);
  const escapeVelocity = Math.sqrt((2 * G * m1) / r);

  // Orbit animation loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isOrbiting) {
        const angularVel = orbitalVelocity / r;
        setOrbitAngle((prev) => (prev + angularVel * dt * 2000) % (Math.PI * 2));
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOrbiting, orbitalVelocity, r]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const cx = w / 2;
    const cy = h / 2;

    const orbitRadiusPx = Math.max(60, Math.min(220, distance * 20));

    ctx.clearRect(0, 0, w, h);

    // Orbit Path Circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadiusPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Central Planet M1
    const p1Radius = 25 + mass1 * 1.5;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cx, cy, p1Radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Satellite M2
    const satX = cx + Math.cos(orbitAngle) * orbitRadiusPx;
    const satY = cy + Math.sin(orbitAngle) * orbitRadiusPx;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(satX, satY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Gravitational Force Vector Arrows (pointing towards each other)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;

    // Force arrow on satellite pointing to planet
    const dx = cx - satX;
    const dy = cy - satY;
    const len = Math.hypot(dx, dy);
    const fx = (dx / len) * 35;
    const fy = (dy / len) * 35;

    ctx.beginPath();
    ctx.moveTo(satX, satY);
    ctx.lineTo(satX + fx, satY + fy);
    ctx.stroke();
  }, [mass1, mass2, distance, orbitAngle]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Gravitational Law Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            F = GMm/r² = <span className="underline decoration-white/40">{force.toFixed(1)} N</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Orbital Velocity (v₀): {(orbitalVelocity / 1000).toFixed(2)} km/s | Escape Velocity (vₑ): {(escapeVelocity / 1000).toFixed(2)} km/s
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Gravitational Parameters
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Planet Mass (M₁):</span>
              <span className="text-white font-bold">{mass1} ×10²⁴ kg</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={mass1}
              onChange={(e) => setMass1(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Satellite Mass (m₂):</span>
              <span className="text-white font-bold">{mass2} kg</span>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={mass2}
              onChange={(e) => setMass2(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Distance (r):</span>
              <span className="text-white font-bold">{distance} ×10⁶ m</span>
            </div>
            <input
              type="range"
              min="2"
              max="15"
              step="0.5"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={() => setIsOrbiting(!isOrbiting)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
          >
            {isOrbiting ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isOrbiting ? 'Pause Orbit' : 'Start Orbit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
