import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const PendulumSim: React.FC = () => {
  const [length, setLength] = useState<number>(1.5); // m
  const [gravity, setGravity] = useState<number>(9.8); // m/s²
  const [initAngleDeg, setInitAngleDeg] = useState<number>(20); // deg
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const omega = Math.sqrt(gravity / length);
  const period = (2 * Math.PI) / omega;
  const thetaRad = (initAngleDeg * Math.PI) / 180;
  const currentAngle = thetaRad * Math.cos(omega * simTime);
  const angularVelocity = -thetaRad * omega * Math.sin(omega * simTime);

  // Energy
  const maxH = length * (1 - Math.cos(thetaRad));
  const curH = length * (1 - Math.cos(currentAngle));
  const peFraction = curH / (maxH || 0.001);
  const keFraction = 1 - peFraction;

  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (isPlaying) {
        setSimTime((prev) => {
          const next = prev + dt;
          const angle = thetaRad * Math.cos(omega * next);
          setHistory((h) => [...h.slice(-150), angle]);
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, omega, thetaRad]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);

    ctx.clearRect(0, 0, w, h);

    // Left Viewport: Pendulum
    const anchorX = 140;
    const anchorY = 40;
    const pxLen = Math.max(80, Math.min(220, length * 80));

    const bobX = anchorX + Math.sin(currentAngle) * pxLen;
    const bobY = anchorY + Math.cos(currentAngle) * pxLen;

    // Anchor Ceiling
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(anchorX - 35, anchorY);
    ctx.lineTo(anchorX + 35, anchorY);
    ctx.stroke();

    // Rod / String
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Pendulum Bob
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(bobX, bobY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Energy Bars on Pendulum Viewport
    const barX = 20;
    const barY = h - 100;
    const barW = 12;
    const barMaxH = 60;

    // KE bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(barX, barY + (1 - keFraction) * barMaxH, barW, keFraction * barMaxH);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(barX, barY, barW, barMaxH);

    // PE bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(barX + 22, barY + (1 - peFraction) * barMaxH, barW, peFraction * barMaxH);
    ctx.strokeRect(barX + 22, barY, barW, barMaxH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('KE', barX - 2, barY + barMaxH + 14);
    ctx.fillText('PE', barX + 20, barY + barMaxH + 14);

    // Right Viewport: Real-time Displacement Graph
    const graphLeft = 260;
    const graphWidth = w - graphLeft - 40;
    const graphCy = h / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(graphLeft, graphCy);
    ctx.lineTo(graphLeft + graphWidth, graphCy);
    ctx.stroke();
    ctx.setLineDash([]);

    if (history.length > 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      history.forEach((ang, idx) => {
        const x = graphLeft + (idx / 150) * graphWidth;
        const y = graphCy - ang * 120;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [length, currentAngle, history, keFraction, peFraction]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Pendulum Period Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            T = 2π√(L/g) = <span className="underline decoration-white/40">{period.toFixed(2)} s</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Current Angle: {((currentAngle * 180) / Math.PI).toFixed(1)}° | KE: {(keFraction * 100).toFixed(0)}% | PE: {(peFraction * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Pendulum Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Length (L):</span>
              <span className="text-white font-bold">{length} m</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="5"
              step="0.1"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Gravity (g):</span>
              <span className="text-white font-bold">{gravity} m/s²</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Initial Angle (θ₀):</span>
              <span className="text-white font-bold">{initAngleDeg}°</span>
            </div>
            <input
              type="range"
              min="5"
              max="45"
              value={initAngleDeg}
              onChange={(e) => setInitAngleDeg(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
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
            onClick={() => setSimTime(0)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
