import React, { useRef, useEffect, useState } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { chemistryEngine, type Molecule3D } from '../../engines/ChemistryEngine';
import { geometry3DEngine } from '../../engines/Geometry3DEngine';
import { FlaskConical, Atom, Eye, Sparkles } from 'lucide-react';

export const ChemistrySim: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedMoleculeKey, setSelectedMoleculeKey] = useState<string>('H2O');
  const [inputReaction, setInputReaction] = useState<string>('H2 + O2 -> H2O');
  const [balancedOutput, setBalancedOutput] = useState<string>('2H₂ + O₂  ⟶  2H₂O');
  const [rotX, setRotX] = useState<number>(15);
  const [rotY, setRotY] = useState<number>(30);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const molecule: Molecule3D = chemistryEngine.getMolecule(selectedMoleculeKey);

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

      // Render Bonds in 3D
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';

      for (const bond of molecule.bonds) {
        const atom1 = molecule.atoms[bond.from];
        const atom2 = molecule.atoms[bond.to];
        if (!atom1 || !atom2) continue;

        const rot1 = geometry3DEngine.rotatePoint(atom1.position, rotX, rotY);
        const rot2 = geometry3DEngine.rotatePoint(atom2.position, rotX, rotY);

        const proj1 = geometry3DEngine.project3D(rot1, width, height, 320, 450);
        const proj2 = geometry3DEngine.project3D(rot2, width, height, 320, 450);

        ctx.beginPath();
        ctx.moveTo(proj1.x, proj1.y);
        ctx.lineTo(proj2.x, proj2.y);
        ctx.stroke();
      }

      // Render 3D Atoms (Sorted by Z for depth buffering)
      const projectedAtoms = molecule.atoms.map((atom) => {
        const rot = geometry3DEngine.rotatePoint(atom.position, rotX, rotY);
        const proj = geometry3DEngine.project3D(rot, width, height, 320, 450);
        return { ...atom, proj, z: rot.z };
      });

      projectedAtoms.sort((a, b) => a.z - b.z);

      for (const atom of projectedAtoms) {
        const radius = atom.radius * atom.proj.scale;

        // Atom Sphere Gradient
        const grad = ctx.createRadialGradient(
          atom.proj.x - radius * 0.3,
          atom.proj.y - radius * 0.3,
          radius * 0.1,
          atom.proj.x,
          atom.proj.y,
          radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, atom.color);
        grad.addColorStop(1, '#000000');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(atom.proj.x, atom.proj.y, Math.max(4, radius), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(atom.symbol, atom.proj.x, atom.proj.y);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [molecule, rotX, rotY]);

  const handleBalance = () => {
    const res = chemistryEngine.balanceEquation(inputReaction);
    setBalancedOutput(res.balanced);
  };

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
      {/* 3D Molecule Viewport */}
      <div
        className="flex-1 relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur border border-white/10 p-3 rounded-xl font-mono text-xs space-y-1">
          <div className="text-zinc-400 uppercase text-[10px] flex items-center gap-1">
            <Eye className="w-3 h-3 text-white" /> Drag mouse to rotate 3D molecular bonds
          </div>
          <div className="text-white font-bold">{molecule.name} ({molecule.formula})</div>
          <div className="text-zinc-400 text-[11px]">Geometry: {molecule.geometryName} | Bond Angle: {molecule.bondAngle}</div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-88 bg-zinc-950 border-l border-white/10 p-5 space-y-5 font-mono text-xs overflow-y-auto">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
          <FlaskConical className="w-4 h-4 text-white" /> Chemistry & Molecular Engine
        </h3>

        {/* 3D Molecule Selector */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-[10px] uppercase">Select 3D Molecule</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['H2O', 'CO2', 'CH4', 'NH3'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMoleculeKey(m)}
                className={`py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                  selectedMoleculeKey === m ? 'bg-white text-black' : 'border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Lewis Structure & Valence Information */}
        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
            <Atom className="w-3 h-3 text-white" /> Lewis Structure & Valence:
          </div>
          <div className="text-white text-xs space-y-1">
            <div>Total Valence Electrons: <span className="font-bold text-white">{molecule.lewisInfo.totalValence} e⁻</span></div>
            <div>Bonding Pairs: <span className="font-bold text-emerald-400">{molecule.lewisInfo.bondingPairs}</span></div>
            <div>Lone Pairs: <span className="font-bold text-amber-400">{molecule.lewisInfo.lonePairs}</span></div>
            <div>Formal Charges: <span className="font-bold text-zinc-300">{molecule.lewisInfo.formalCharges}</span></div>
          </div>
        </div>

        {/* Chemical Equation Balancer */}
        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-3">
          <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-white" /> Chemical Reaction Balancer:
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputReaction}
              onChange={(e) => setInputReaction(e.target.value)}
              className="flex-1 bg-black border border-white/20 px-2.5 py-1.5 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-white"
              placeholder="e.g. H2 + O2 -> H2O"
            />
            <button
              onClick={handleBalance}
              className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors"
            >
              Balance
            </button>
          </div>
          <div className="p-2 bg-black border border-white/10 rounded-lg text-emerald-400 font-mono text-xs font-bold text-center">
            {balancedOutput}
          </div>
        </div>
      </div>
    </div>
  );
};
