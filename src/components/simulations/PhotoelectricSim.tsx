import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause } from 'lucide-react';

export const PhotoelectricSim: React.FC = () => {
  const [freq14, setFreq14] = useState<number>(7.5); // x10^14 Hz
  const [workFuncEv, setWorkFuncEv] = useState<number>(2.3); // eV (Potassium = 2.3 eV)
  const [intensity, setIntensity] = useState<number>(80); // %
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [electronOffset, setElectronOffset] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const h = 4.135667e-15; // eV·s
  const photonEnergyEv = h * (freq14 * 1e14);
  const keMaxEv = Math.max(0, photonEnergyEv - workFuncEv);
  const stoppingVolts = keMaxEv;

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying && keMaxEv > 0) {
        setElectronOffset((prev) => (prev + Math.sqrt(keMaxEv) * dt * 150) % 200);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, keMaxEv]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);

    ctx.clearRect(0, 0, w, h);

    // Emitter Plate (left)
    const plateX = 120;
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.fillRect(plateX - 10, 60, 20, h - 120);
    ctx.strokeRect(plateX - 10, 60, 20, h - 120);

    // Collector Plate (right)
    const collectorX = w - 140;
    ctx.fillRect(collectorX - 10, 60, 20, h - 120);
    ctx.strokeRect(collectorX - 10, 60, 20, h - 120);

    // Incident Light Ray Rays (from top-left to emitter plate)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = Math.max(1, intensity / 25);

    for (let y = 80; y < h - 100; y += 30) {
      ctx.beginPath();
      ctx.moveTo(30, y - 40);
      ctx.lineTo(plateX - 10, y);
      ctx.stroke();
    }

    // Ejected Photoelectrons (if photon energy > work function)
    if (keMaxEv > 0 && isPlaying) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;

      const count = Math.floor(intensity / 10);
      for (let i = 0; i < count; i++) {
        const ey = 80 + i * 22;
        const ex = plateX + 10 + ((i * 30 + electronOffset) % (collectorX - plateX - 20));

        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
  }, [freq14, workFuncEv, intensity, keMaxEv, electronOffset, isPlaying]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Photoelectric Quantum Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            E_photon = {photonEnergyEv.toFixed(2)} eV | KE_max = <span className="underline decoration-white/40">{keMaxEv.toFixed(2)} eV</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Work Function Φ = {workFuncEv} eV | Stopping Voltage V_s = {stoppingVolts.toFixed(2)} V
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Quantum Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Light Frequency (f):</span>
              <span className="text-white font-bold">{freq14} ×10¹⁴ Hz</span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              step="0.2"
              value={freq14}
              onChange={(e) => setFreq14(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Metal Work Function (Φ):</span>
              <span className="text-white font-bold">{workFuncEv} eV</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="0.1"
              value={workFuncEv}
              onChange={(e) => setWorkFuncEv(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Light Intensity:</span>
              <span className="text-white font-bold">{intensity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
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
            <span>{isPlaying ? 'Pause Light' : 'Emit Light'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
