import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause } from 'lucide-react';

export const CircuitSim: React.FC = () => {
  const [voltage, setVoltage] = useState<number>(12); // V
  const [r1, setR1] = useState<number>(4); // Ω
  const [r2, setR2] = useState<number>(6); // Ω
  const [r3, setR3] = useState<number>(12); // Ω
  const [isSeries, setIsSeries] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [electronOffset, setElectronOffset] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Total Resistance & Total Current calculation
  const rTotal = isSeries ? r1 + r2 + r3 : 1 / (1 / r1 + 1 / r2 + 1 / r3);
  const iTotal = voltage / rTotal;
  const pTotal = voltage * iTotal;

  // Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setElectronOffset((prev) => (prev + iTotal * dt * 35) % 1000);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, iTotal]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    if (isSeries) {
      // Series Circuit Diagram
      const cw = Math.min(w * 0.75, 480);
      const ch = Math.min(h * 0.55, 240);
      const left = cx - cw / 2;
      const right = cx + cw / 2;
      const top = cy - ch / 2;
      const bottom = cy + ch / 2;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(left, top, cw, ch);

      // Battery on Left
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(left - 15, cy - 25, 30, 50);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left - 18, cy - 15);
      ctx.lineTo(left + 18, cy - 15);
      ctx.moveTo(left - 10, cy + 15);
      ctx.lineTo(left + 10, cy + 15);
      ctx.stroke();

      // 3 Resistors on Top Wire
      const resW = 55;
      const spacing = cw / 4;

      [r1, r2, r3].forEach((rVal, idx) => {
        const rx = left + spacing * (idx + 1) - resW / 2;
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(rx, top - 12, resW, 24);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, top - 10, resW, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`R${idx + 1}:${rVal}Ω`, rx + resW / 2, top - 16);
      });

      // Flowing Electrons
      const perimeter = (cw + ch) * 2;
      const numElectrons = 28;

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;

      for (let i = 0; i < numElectrons; i++) {
        const pos = ((i * (perimeter / numElectrons) + electronOffset) % perimeter + perimeter) % perimeter;
        let ex = 0;
        let ey = 0;
        if (pos < cw) {
          ex = left + pos;
          ey = top;
        } else if (pos < cw + ch) {
          ex = right;
          ey = top + (pos - cw);
        } else if (pos < cw * 2 + ch) {
          ex = right - (pos - (cw + ch));
          ey = bottom;
        } else {
          ex = left;
          ey = bottom - (pos - (cw * 2 + ch));
        }

        ctx.beginPath();
        ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else {
      // Parallel Circuit Diagram
      const cw = Math.min(w * 0.7, 440);
      const left = cx - cw / 2;
      const right = cx + cw / 2;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;

      // 3 Parallel Branches
      const yBranches = [cy - 80, cy, cy + 80];

      // Vertical side rails
      ctx.beginPath();
      ctx.moveTo(left, yBranches[0]);
      ctx.lineTo(left, yBranches[2]);
      ctx.moveTo(right, yBranches[0]);
      ctx.lineTo(right, yBranches[2]);
      ctx.stroke();

      yBranches.forEach((y, idx) => {
        const rVal = [r1, r2, r3][idx];
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();

        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(cx - 30, y - 10, 60, 20);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 28, y - 8, 56, 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`R${idx + 1}:${rVal}Ω`, cx, y - 14);
      });
    }
  }, [voltage, r1, r2, r3, isSeries, iTotal, electronOffset]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Circuit Readouts ({isSeries ? 'Series' : 'Parallel'})
          </div>
          <div className="text-lg font-mono font-bold text-white space-y-0.5">
            <div>R_total: {rTotal.toFixed(2)} Ω | I_total: <span className="underline decoration-white/40">{iTotal.toFixed(2)} A</span></div>
            <div className="text-xs font-normal text-zinc-300">Total Power P = VI = {pTotal.toFixed(1)} W</div>
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
              Circuit Config
            </h3>
            <button
              onClick={() => setIsSeries(!isSeries)}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-mono text-white transition-colors"
            >
              {isSeries ? 'Switch to Parallel' : 'Switch to Series'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Voltage (V):</span>
              <span className="text-white font-bold">{voltage} V</span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Resistor 1 (R₁):</span>
              <span className="text-white font-bold">{r1} Ω</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={r1}
              onChange={(e) => setR1(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Resistor 2 (R₂):</span>
              <span className="text-white font-bold">{r2} Ω</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={r2}
              onChange={(e) => setR2(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Resistor 3 (R₃):</span>
              <span className="text-white font-bold">{r3} Ω</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={r3}
              onChange={(e) => setR3(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause Current' : 'Flow Current'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
