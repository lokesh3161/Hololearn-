import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const OhmLawSim: React.FC = () => {
  const [voltage, setVoltage] = useState<number>(12); // Volts
  const [resistance, setResistance] = useState<number>(4); // Ohms
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [electronOffset, setElectronOffset] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const safeR = Math.max(0.1, resistance);
  const current = voltage / safeR;
  const power = voltage * current;
  const powerI2R = current * current * safeR;

  // Arrow key controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setVoltage((v) => Math.min(30, v + 1));
      if (e.key === 'ArrowDown') setVoltage((v) => Math.max(1, v - 1));
      if (e.key === 'ArrowRight') setResistance((r) => Math.min(25, r + 1));
      if (e.key === 'ArrowLeft') setResistance((r) => Math.max(1, r - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Animation Loop for flowing electrons
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setElectronOffset((prev) => (prev + current * dt * 40) % 1000);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, current]);

  // Render Circuit Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const cx = w / 2;
    const cy = h / 2;
    const cw = Math.min(w * 0.7, 450);
    const ch = Math.min(h * 0.6, 260);

    const left = cx - cw / 2;
    const right = cx + cw / 2;
    const top = cy - ch / 2;
    const bottom = cy + ch / 2;

    ctx.clearRect(0, 0, w, h);

    // Main Wires
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.strokeRect(left, top, cw, ch);

    // Battery Symbol on Left Wire
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(left - 15, cy - 30, 30, 60);

    // Battery Plates
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(left - 20, cy - 20);
    ctx.lineTo(left + 20, cy - 20);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left - 10, cy + 20);
    ctx.lineTo(left + 10, cy + 20);
    ctx.stroke();

    // Battery Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${voltage}V`, left - 35, cy + 4);

    // Resistor Symbol on Top Wire
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(cx - 40, top - 15, 80, 30);

    // Resistor Zigzag / Box
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 35, top - 12, 70, 24);
    ctx.fillText(`${resistance} Ω`, cx, top - 20);

    // Animated Flowing Electrons (dots along circuit perimeter)
    const perimeter = (cw + ch) * 2;
    const numElectrons = 24;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;

    for (let i = 0; i < numElectrons; i++) {
      const pos = ((i * (perimeter / numElectrons) + electronOffset) % perimeter + perimeter) % perimeter;
      let ex = 0;
      let ey = 0;

      if (pos < cw) {
        // Top edge
        ex = left + pos;
        ey = top;
      } else if (pos < cw + ch) {
        // Right edge
        ex = right;
        ey = top + (pos - cw);
      } else if (pos < cw * 2 + ch) {
        // Bottom edge
        ex = right - (pos - (cw + ch));
        ey = bottom;
      } else {
        // Left edge
        ex = left;
        ey = bottom - (pos - (cw * 2 + ch));
      }

      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [voltage, resistance, current, electronOffset]);

  return (
    <div className="flex-1 flex text-white overflow-hidden select-none">
      {/* Viewport */}
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Live Substituted Formula Display */}
        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-xl p-4 rounded-xl border border-white/15 shadow-2xl space-y-1 font-mono text-xs max-w-sm">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10 pb-1">
            OHM'S LAW LIVE FORMULA SUBSTITUTION
          </div>
          <div>
            <span className="text-zinc-400">V = I × R → </span>
            <span className="text-white font-semibold">{voltage}V = </span>
            <span className="text-white font-bold">{current.toFixed(2)}A × {resistance}Ω</span>
          </div>
          <div>
            <span className="text-zinc-400">P = V × I = </span>
            <span className="text-white font-semibold">{voltage}V × {current.toFixed(2)}A = </span>
            <span className="text-white font-bold">{power.toFixed(1)} W</span>
          </div>
          <div>
            <span className="text-zinc-400">P = I² × R = </span>
            <span className="text-white font-semibold">({current.toFixed(2)})² × {resistance}Ω = </span>
            <span className="text-white font-bold">{powerI2R.toFixed(1)} W</span>
          </div>
        </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400 border-b border-white/10 pb-2">
            Circuit Controls
          </h3>

          {/* Voltage Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Voltage (V):</span>
              <span className="text-white font-bold">{voltage} V</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
            <div className="text-[10px] text-zinc-500 font-mono">Hotkeys: ↑ ↓ Arrow keys</div>
          </div>

          {/* Resistance Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Resistance (R):</span>
              <span className="text-white font-bold">{resistance} Ω</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={resistance}
              onChange={(e) => setResistance(Number(e.target.value))}
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
            onClick={() => {
              setVoltage(12);
              setResistance(4);
            }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
            title="Reset Circuit"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
