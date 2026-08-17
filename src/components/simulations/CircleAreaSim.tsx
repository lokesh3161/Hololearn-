import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';

export const CircleAreaSim: React.FC = () => {
  const [radius, setRadius] = useState<number>(10); // cm / units

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const area = Math.PI * radius * radius;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const cx = w / 2;
    const cy = h / 2;

    const scale = 12; // 12 pixels per radius unit
    const pxRadius = radius * scale;

    ctx.clearRect(0, 0, w, h);

    // Subtle radial sector grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * pxRadius, cy + Math.sin(angle) * pxRadius);
      ctx.stroke();
    }

    // Concentric Guide Rings
    for (let r = 2; r <= 20; r += 4) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Main Dynamic Circle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center Origin Point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Radius Dimension Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + pxRadius, cy);
    ctx.stroke();

    // Radius Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`r = ${radius} cm`, cx + pxRadius / 2, cy - 8);
  }, [radius]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Circle Area Formula
          </div>
          <div className="text-xl font-mono font-bold text-white">
            A = π × {radius}² = <span className="underline decoration-white/40">{area.toFixed(2)} cm²</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Circumference (C = 2πr): {circumference.toFixed(2)} cm
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Circle Radius Control
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Radius (r):</span>
              <span className="text-white font-bold">{radius} cm</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
