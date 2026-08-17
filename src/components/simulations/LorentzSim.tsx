import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const LorentzSim: React.FC = () => {
  const [velocity, setVelocity] = useState<number>(2.5); // x10^6 m/s
  const [bField, setBField] = useState<number>(1.2); // T
  const [chargeSign, setChargeSign] = useState<number>(1); // +1 or -1
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [particleAngle, setParticleAngle] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const q = chargeSign * 1.602e-19;
  const m = 9.109e-31; // electron mass
  const v = velocity * 1e6;
  const B = bField;

  // Orbit radius r = mv / (qB)
  const radiusM = (m * v) / (Math.abs(q) * B);
  const radiusPx = Math.max(30, Math.min(180, radiusM * 2e10));
  const forceN = Math.abs(q) * v * B;

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        const omega = (Math.abs(q) * B) / m;
        const speed = omega * dt * 0.05 * chargeSign;
        setParticleAngle((prev) => (prev + speed) % (Math.PI * 2));
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, q, B, chargeSign]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Magnetic Field Vectors Grid (⊗ Into page)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 50) {
      for (let y = 40; y < h; y += 50) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 4, y - 4);
        ctx.lineTo(x + 4, y + 4);
        ctx.moveTo(x + 4, y - 4);
        ctx.lineTo(x - 4, y + 4);
        ctx.stroke();
      }
    }

    // Circular Trajectory Track
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Charged Particle
    const px = cx + Math.cos(particleAngle) * radiusPx;
    const py = cy + Math.sin(particleAngle) * radiusPx;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Centripetal Force Vector Arrow (pointing to center)
    const fx = (cx - px) * 0.4;
    const fy = (cy - py) * 0.4;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + fx, py + fy);
    ctx.stroke();
  }, [radiusPx, particleAngle]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Lorentz Deflection Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            F = qvB = <span className="underline decoration-white/40">{forceN.toExponential(2)} N</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Orbit Radius r = mv/qB = {(radiusM * 1e3).toFixed(2)} mm | Charge Sign: {chargeSign > 0 ? '+ (Positive)' : '- (Negative)'}
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Lorentz Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Particle Speed (v):</span>
              <span className="text-white font-bold">{velocity} ×10⁶ m/s</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={velocity}
              onChange={(e) => setVelocity(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Magnetic Field (B):</span>
              <span className="text-white font-bold">{bField} T</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={bField}
              onChange={(e) => setBField(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <span className="text-zinc-400 font-mono block">Charge Polarity:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setChargeSign(1)}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                  chargeSign > 0 ? 'bg-white text-black font-bold' : 'border-white/15 text-zinc-400'
                }`}
              >
                + Positive
              </button>
              <button
                onClick={() => setChargeSign(-1)}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                  chargeSign < 0 ? 'bg-white text-black font-bold' : 'border-white/15 text-zinc-400'
                }`}
              >
                - Negative
              </button>
            </div>
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
            onClick={() => setParticleAngle(0)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
