import React, { useRef, useEffect, useState } from 'react';
import { resizeCanvasToDisplaySize } from '../../../components/simulations/canvasHelper';
import { gasLawEngine } from '../engine/GasLawEngine';
import { RotateCcw, Flame, Maximize2, BarChart2 } from 'lucide-react';

export const GasLawSim: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tempK, setTempK] = useState<number>(300); // Kelvin
  const [volumeL, setVolumeL] = useState<number>(5.0); // Liters
  const [nMoles, setNMoles] = useState<number>(1.0); // Moles

  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);

  // Initialize gas particles
  useEffect(() => {
    const count = Math.round(nMoles * 40);
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.sqrt(tempK / 300) * (2 + Math.random() * 2);
      newParticles.push({
        x: Math.random() * 180 + 20,
        y: Math.random() * 180 + 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }
    particlesRef.current = newParticles;
  }, [nMoles, tempK]);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      resizeCanvasToDisplaySize(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Piston Container (Left side)
      const containerLeft = width * 0.1;
      const containerTop = height * 0.2;
      const containerWidth = 220;
      const pistonHeight = Math.max(80, Math.min(260, volumeL * 30));

      // Container Box
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(containerLeft, containerTop, containerWidth, pistonHeight);

      // Piston Top Bar
      ctx.fillStyle = '#444444';
      ctx.fillRect(containerLeft - 5, containerTop - 12, containerWidth + 10, 12);

      // Gas Particles Animation
      const speedMult = Math.sqrt(tempK / 300);
      ctx.fillStyle = '#00FF88';

      particlesRef.current.forEach((p) => {
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        // Bounce walls
        if (p.x < 10 || p.x > containerWidth - 10) p.vx *= -1;
        if (p.y < 10 || p.y > pistonHeight - 10) p.vy *= -1;

        const posX = containerLeft + Math.max(10, Math.min(containerWidth - 10, p.x));
        const posY = containerTop + Math.max(10, Math.min(pistonHeight - 10, p.y));

        ctx.beginPath();
        ctx.arc(posX, posY, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Calculate P from Engine
      const res = gasLawEngine.calculateIdealGasPressure(nMoles, tempK, volumeL);

      // Live P-V Graph (Right Side)
      const graphLeft = width * 0.55;
      const graphTop = 40;
      const graphWidth = width * 0.4;
      const graphHeight = height - 80;

      // Axes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(graphLeft, graphTop);
      ctx.lineTo(graphLeft, graphTop + graphHeight);
      ctx.lineTo(graphLeft + graphWidth, graphTop + graphHeight);
      ctx.stroke();

      // Plot Ideal Gas Isotherm P = nRT/V
      ctx.strokeStyle = '#FF3366';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (let v = 1; v <= 15; v += 0.2) {
        const pVal = (nMoles * gasLawEngine.R_ATM * tempK) / v;
        const px = graphLeft + (v / 15) * graphWidth;
        const py = graphTop + graphHeight - (pVal / 10) * graphHeight;

        if (v === 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Current State Point
      const currX = graphLeft + (volumeL / 15) * graphWidth;
      const currY = graphTop + graphHeight - (res.P_atm / 10) * graphHeight;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(currX, currY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 12px monospace';
      ctx.fillText(`P = ${res.P_atm} atm`, currX + 10, currY - 10);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [tempK, volumeL, nMoles]);

  const pRes = gasLawEngine.calculateIdealGasPressure(nMoles, tempK, volumeL);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0a0a0a] text-white select-none font-mono">
      {/* 2D Piston & Particle Viewport */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-88 bg-zinc-950 border-l border-white/10 p-5 space-y-5 text-xs overflow-y-auto">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
          <Flame className="w-4 h-4 text-white" /> Ideal Gas Law Simulator (PV = nRT)
        </h3>

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Temperature (T):</span>
              <span className="text-amber-400 font-bold">{tempK} K</span>
            </div>
            <input
              type="range"
              min="100"
              max="600"
              step="10"
              value={tempK}
              onChange={(e) => setTempK(Number(e.target.value))}
              className="w-full accent-amber-400 bg-zinc-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Volume (V):</span>
              <span className="text-emerald-400 font-bold">{volumeL} L</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="15.0"
              step="0.5"
              value={volumeL}
              onChange={(e) => setVolumeL(Number(e.target.value))}
              className="w-full accent-emerald-400 bg-zinc-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Moles (n):</span>
              <span className="text-cyan-400 font-bold">{nMoles} mol</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={nMoles}
              onChange={(e) => setNMoles(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-zinc-800"
            />
          </div>
        </div>

        {/* Calculated Output Card */}
        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-white" /> Gas Law Calculation:
          </div>
          <div className="text-white text-xs space-y-1">
            <div>Calculated Pressure: <span className="font-bold text-white text-sm">{pRes.P_atm} atm</span></div>
            <div className="text-[10px] text-zinc-400 pt-1">
              Formula: P = nRT / V = ({nMoles} × 0.0821 × {tempK}) / {volumeL}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
