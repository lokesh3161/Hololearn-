import React, { useState, useEffect, useRef } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';

export const LensSim: React.FC = () => {
  const [focalLength, setFocalLength] = useState<number>(20); // cm
  const [objectDist, setObjectDist] = useState<number>(40); // cm (u)
  const [objectHeight, setObjectHeight] = useState<number>(15); // cm

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lens Equation: 1/f = 1/v - 1/u (using cartesian sign convention u is -objectDist)
  const u = -objectDist;
  const f = focalLength;
  const v = (u * f) / (u + f);
  const magnification = v / u;
  const imageHeight = objectHeight * magnification;

  const isReal = v > 0;
  const isInverted = magnification < 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = resizeCanvasToDisplaySize(canvas);
    const cx = w / 2;
    const cy = h / 2;
    const scale = 5; // 5 pixels per cm

    ctx.clearRect(0, 0, w, h);

    // Principal Optical Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, cy);
    ctx.lineTo(w - 20, cy);
    ctx.stroke();

    // Convex Lens Vertical Axis
    const lensH = 160;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - lensH / 2);
    ctx.lineTo(cx, cy + lensH / 2);
    ctx.stroke();

    // Lens Arc curves
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.quadraticCurveTo(cx - 15, cy, cx, cy - lensH / 2);
    ctx.quadraticCurveTo(cx + 15, cy, cx, cy + lensH / 2);
    ctx.stroke();

    // Focal Points F1 and F2
    const fPx = f * scale;
    ctx.fillStyle = '#ffffff';
    [cx - fPx, cx + fPx].forEach((fX, idx) => {
      ctx.beginPath();
      ctx.arc(fX, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(idx === 0 ? 'F₁' : 'F₂', fX - 5, cy + 16);
    });

    // Object Arrow (left side)
    const objX = cx - objectDist * scale;
    const objY = cy - objectHeight * scale;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(objX, cy);
    ctx.lineTo(objX, objY);
    ctx.stroke();
    // Object Arrowhead
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(objX, objY - 6);
    ctx.lineTo(objX - 5, objY + 4);
    ctx.lineTo(objX + 5, objY + 4);
    ctx.closePath();
    ctx.fill();

    // Image Arrow (right side if real)
    const imgX = cx + v * scale;
    const imgY = cy - imageHeight * scale;

    if (Math.abs(v) < 200) {
      ctx.strokeStyle = isReal ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2.5;
      if (!isReal) ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(imgX, cy);
      ctx.lineTo(imgX, imgY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(imgX, imgY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Principal Rays
    // Ray 1: Parallel to axis -> passes through F2
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(objX, objY);
    ctx.lineTo(cx, objY);
    ctx.lineTo(cx + fPx * 2, cy + (objY - cy) * 2);
    ctx.stroke();

    // Ray 2: Passes straight through Optical Center (cx, cy)
    ctx.beginPath();
    ctx.moveTo(objX, objY);
    ctx.lineTo(cx + (cx - objX), cy + (cy - objY));
    ctx.stroke();
  }, [focalLength, objectDist, objectHeight, v, imageHeight, isReal, f]);

  return (
    <div className="flex-1 flex text-white overflow-hidden">
      <div className="flex-1 relative bg-black/60 p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-4 left-4 bg-black/85 backdrop-blur p-4 rounded-xl border border-white/15 shadow-2xl space-y-1">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Lens Formula Readout
          </div>
          <div className="text-xl font-mono font-bold text-white">
            1/f = 1/v - 1/u ⟹ v = <span className="underline decoration-white/40">{v.toFixed(1)} cm</span>
          </div>
          <div className="text-xs font-mono text-zinc-300">
            Magnification m = {magnification.toFixed(2)} | Image Type: {isReal ? 'Real' : 'Virtual'}, {isInverted ? 'Inverted' : 'Erect'}
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-950 border-l border-white/10 p-5 flex flex-col justify-between text-xs">
        <div className="space-y-6">
          <h3 className="font-semibold text-white tracking-wide uppercase text-[11px] text-zinc-400">
            Optics Controls
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Focal Length (f):</span>
              <span className="text-white font-bold">{focalLength} cm</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              value={focalLength}
              onChange={(e) => setFocalLength(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Object Distance (u):</span>
              <span className="text-white font-bold">{objectDist} cm</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              value={objectDist}
              onChange={(e) => setObjectDist(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Object Height:</span>
              <span className="text-white font-bold">{objectHeight} cm</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={objectHeight}
              onChange={(e) => setObjectHeight(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
