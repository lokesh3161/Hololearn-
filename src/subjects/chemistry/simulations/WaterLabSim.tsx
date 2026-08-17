import React, { useRef, useEffect, useState } from 'react';
import { resizeCanvasToDisplaySize } from '../../../components/simulations/canvasHelper';
import { RotateCcw, Droplets, Zap, Eye } from 'lucide-react';
import { geometry3DEngine } from '../../../engines/Geometry3DEngine';

export const WaterLabSim: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTopic, setActiveTopic] = useState<'polarity' | 'h-bonding' | 'electrolysis'>('polarity');
  const [voltage, setVoltage] = useState<number>(12); // Volts for electrolysis
  const [rotX, setRotX] = useState<number>(15);
  const [rotY, setRotY] = useState<number>(30);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

      if (activeTopic === 'polarity' || activeTopic === 'h-bonding') {
        // Render 3D Water Molecules with Hydrogen Bonds
        const molecules =
          activeTopic === 'polarity'
            ? [{ center: { x: 0, y: 0, z: 0 } }]
            : [
                { center: { x: -70, y: -40, z: 0 } },
                { center: { x: 70, y: -40, z: 0 } },
                { center: { x: 0, y: 60, z: 0 } },
              ];

        for (const mol of molecules) {
          const oxygen = { x: mol.center.x, y: mol.center.y, z: mol.center.z };
          const h1 = { x: mol.center.x - 45, y: mol.center.y - 35, z: mol.center.z };
          const h2 = { x: mol.center.x + 45, y: mol.center.y - 35, z: mol.center.z };

          const rotO = geometry3DEngine.rotatePoint(oxygen, rotX, rotY);
          const rotH1 = geometry3DEngine.rotatePoint(h1, rotX, rotY);
          const rotH2 = geometry3DEngine.rotatePoint(h2, rotX, rotY);

          const projO = geometry3DEngine.project3D(rotO, width, height, 320, 450);
          const projH1 = geometry3DEngine.project3D(rotH1, width, height, 320, 450);
          const projH2 = geometry3DEngine.project3D(rotH2, width, height, 320, 450);

          // Covalent O-H Bonds
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(projO.x, projO.y);
          ctx.lineTo(projH1.x, projH1.y);
          ctx.moveTo(projO.x, projO.y);
          ctx.lineTo(projH2.x, projH2.y);
          ctx.stroke();

          // Oxygen Atom (Partial Negative δ-)
          ctx.fillStyle = '#FF0055';
          ctx.beginPath();
          ctx.arc(projO.x, projO.y, 22 * projO.scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('O (δ-)', projO.x - 14, projO.y + 4);

          // Hydrogen Atoms (Partial Positive δ+)
          [projH1, projH2].forEach((proj) => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 14 * proj.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.fillText('H (δ+)', proj.x - 12, proj.y + 4);
          });
        }

        // Render Intermolecular Hydrogen Bond Lines (Dotted)
        if (activeTopic === 'h-bonding') {
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(width / 2 - 50, height / 2 - 30);
          ctx.lineTo(width / 2 + 50, height / 2 - 30);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (activeTopic === 'electrolysis') {
        // Water Electrolysis: 2H2O -> 2H2 + O2 (2:1 Gas Ratio)
        const centerX = width / 2;
        const centerY = height / 2;

        // Electrolysis Beaker
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - 120, centerY - 80, 240, 160);

        // Electrodes
        ctx.fillStyle = '#444444';
        ctx.fillRect(centerX - 70, centerY - 60, 20, 120); // Cathode (- H2)
        ctx.fillRect(centerX + 50, centerY - 60, 20, 120); // Anode (+ O2)

        ctx.fillStyle = '#00FF88';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('Cathode (-): 2H₂ Gas', centerX - 100, centerY + 80);
        ctx.fillStyle = '#FF0055';
        ctx.fillText('Anode (+): O₂ Gas', centerX + 30, centerY + 80);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeTopic, voltage, rotX, rotY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotY((prev) => prev + dx * 0.5);
    setRotX((prev) => prev - dy * 0.5);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0a0a0a] text-white select-none">
      {/* 3D Water Laboratory Viewport */}
      <div
        className="flex-1 relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur border border-white/10 p-3 rounded-xl font-mono text-xs space-y-1">
          <div className="text-zinc-400 uppercase text-[10px] flex items-center gap-1">
            <Eye className="w-3 h-3 text-white" /> Drag mouse to rotate 3D view
          </div>
          <div className="text-white font-bold">Water (H₂O) Dedicated Module</div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-88 bg-zinc-950 border-l border-white/10 p-5 space-y-5 font-mono text-xs overflow-y-auto">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
          <Droplets className="w-4 h-4 text-white" /> Water Chemistry Module
        </h3>

        {/* Topic Selector */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-[10px] uppercase">Select Demonstration</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['polarity', 'h-bonding', 'electrolysis'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTopic(t)}
                className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                  activeTopic === t ? 'bg-white text-black' : 'border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Parameter Info */}
        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase">Physical & Molecular Properties:</div>
          <div className="text-white text-xs space-y-1">
            <div>Structure: <span className="font-bold text-white">Bent VSEPR (104.5°)</span></div>
            <div>Polarity: <span className="font-bold text-emerald-400">Dipole Moment (1.85 D)</span></div>
            <div>Specific Heat: <span className="font-bold text-amber-400">4.184 J/g·°C</span></div>
            <div>Ice Density Anomaly: <span className="font-bold text-cyan-400">Ice floats (0.917 g/cm³)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
