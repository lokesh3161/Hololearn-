import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { resizeCanvasToDisplaySize } from './canvasHelper';

export const HarmonicMotionSim: React.FC = () => {
  const [amplitude, setAmplitude] = useState<number>(60);
  const [frequency, setFrequency] = useState<number>(1.2);
  const [mass, setMass] = useState<number>(2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const omega = frequency * Math.PI * 2;
  const displacement = amplitude * Math.sin(omega * simTime);

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setSimTime((prev) => {
          const next = prev + dt;
          const disp = amplitude * Math.sin(omega * next);
          setHistory((h) => [...h.slice(-150), disp]);
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, amplitude, omega]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const springAnchorY = 40;
    const eqY = h / 2;
    const massY = eqY + displacement;

    ctx.clearRect(0, 0, w, h);

    // Left Viewport: Spring Mass System
    const springX = 140;

    // Anchor Ceiling
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(springX - 40, springAnchorY);
    ctx.lineTo(springX + 40, springAnchorY);
    ctx.stroke();

    // Spring Coil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(springX, springAnchorY);

    const coils = 12;
    const springLen = massY - 25 - springAnchorY;
    for (let i = 0; i <= coils; i++) {
      const y = springAnchorY + (i / coils) * springLen;
      const x = springX + (i % 2 === 0 ? 12 : -12);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(springX, massY - 25);
    ctx.stroke();

    // Mass Block
    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(springX - 25, massY - 25, 50, 50);
    ctx.strokeRect(springX - 25, massY - 25, 50, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${mass}kg`, springX, massY + 4);

    // Right Viewport: Real-time Displacement-Time Graph
    const graphLeft = 260;
    const graphWidth = w - graphLeft - 40;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(graphLeft, eqY);
    ctx.lineTo(graphLeft + graphWidth, eqY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Graph Line
    if (history.length > 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      history.forEach((d, idx) => {
        const x = graphLeft + (idx / 150) * graphWidth;
        const y = eqY + d;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [displacement, history, mass]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl">
          <div className="text-[11px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
            Harmonic Motion Equation
          </div>
          <div className="text-xl font-mono font-bold text-white">
            x(t) = {amplitude} · sin({(frequency * 2).toFixed(1)}πt) = <span className="underline decoration-white/40">{displacement.toFixed(1)} px</span>
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Oscillator Parameters
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Amplitude (A):</span>
              <span className="text-white font-bold">{amplitude} px</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={amplitude}
              onChange={(e) => setAmplitude(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Frequency (f):</span>
              <span className="text-white font-bold">{frequency.toFixed(1)} Hz</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Mass (m):</span>
              <span className="text-white font-bold">{mass} kg</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={mass}
              onChange={(e) => setMass(Number(e.target.value))}
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
            <span>{isPlaying ? 'Pause Oscillator' : 'Start Oscillator'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
