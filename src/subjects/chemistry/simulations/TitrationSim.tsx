import React, { useRef, useEffect, useState } from 'react';
import { resizeCanvasToDisplaySize } from '../../../components/simulations/canvasHelper';
import { RotateCcw, Play, Pause, FlaskConical, BarChart2 } from 'lucide-react';

export const TitrationSim: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [vTitrant, setVTitrant] = useState<number>(0); // Volume added in mL
  const [cAcid, setCAcid] = useState<number>(0.1); // Molar concentration of HCl
  const [vAcid, setVAcid] = useState<number>(25.0); // Volume of HCl in flask mL
  const [cBase, setCBase] = useState<number>(0.1); // Molar concentration of NaOH titrant
  const [isTitrating, setIsTitrating] = useState<boolean>(false);

  useEffect(() => {
    let animId: number;

    if (isTitrating) {
      animId = requestAnimationFrame(() => {
        setVTitrant((prev) => (prev >= 50 ? 50 : Number((prev + 0.2).toFixed(1))));
      });
    }

    return () => cancelAnimationFrame(animId);
  }, [isTitrating, vTitrant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Calculate pH curve: HCl vs NaOH
    const nAcid = (cAcid * vAcid) / 1000;
    const nBase = (cBase * vTitrant) / 1000;
    const vTotal = (vAcid + vTitrant) / 1000;

    let pH = 7.0;
    if (nAcid > nBase) {
      const hConc = (nAcid - nBase) / vTotal;
      pH = -Math.log10(Math.max(1e-14, hConc));
    } else if (nBase > nAcid) {
      const ohConc = (nBase - nAcid) / vTotal;
      const pOH = -Math.log10(Math.max(1e-14, ohConc));
      pH = 14.0 - pOH;
    } else {
      pH = 7.0;
    }
    pH = Number(Math.max(0, Math.min(14, pH)).toFixed(2));

    // Render Titration Apparatus (Burette & Flask)
    const centerX = width * 0.35;
    const centerY = height * 0.45;

    // Burette Tube
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - 15, centerY - 140, 30, 160);

    // Burette Liquid
    const liquidHeight = Math.max(0, 160 - (vTitrant / 50) * 160);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(centerX - 13, centerY - 140 + (160 - liquidHeight), 26, liquidHeight);

    // Conical Flask
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY + 30);
    ctx.lineTo(centerX + 10, centerY + 30);
    ctx.lineTo(centerX + 60, centerY + 130);
    ctx.lineTo(centerX - 60, centerY + 130);
    ctx.closePath();
    ctx.stroke();

    // Flask Solution Color based on Indicator (Phenolphthalein: colorless < 8.2, pink > 8.2)
    const indicatorColor =
      pH < 8.2 ? 'rgba(255, 255, 255, 0.15)' : `rgba(255, 0, 128, ${Math.min(0.8, (pH - 8.2) * 0.3 + 0.2)})`;
    ctx.fillStyle = indicatorColor;
    ctx.fill();

    // Render pH Meter Digital Readout
    ctx.fillStyle = '#111111';
    ctx.fillRect(centerX - 50, centerY + 140, 100, 32);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - 50, centerY + 140, 100, 32);

    ctx.fillStyle = pH < 7 ? '#FF3366' : pH > 7 ? '#00FF88' : '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`pH: ${pH}`, centerX, centerY + 161);

    // Render Live pH Curve Graph (Right Half of Viewport)
    const graphLeft = width * 0.58;
    const graphTop = 50;
    const graphWidth = width * 0.38;
    const graphHeight = height - 100;

    // Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(graphLeft, graphTop);
    ctx.lineTo(graphLeft, graphTop + graphHeight);
    ctx.lineTo(graphLeft + graphWidth, graphTop + graphHeight);
    ctx.stroke();

    // Grid lines for pH 0 .. 14
    for (let p = 0; p <= 14; p += 2) {
      const y = graphTop + graphHeight - (p / 14) * graphHeight;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(graphLeft, y);
      ctx.lineTo(graphLeft + graphWidth, y);
      ctx.stroke();

      ctx.fillStyle = '#888888';
      ctx.font = '10px monospace';
      ctx.fillText(`${p}`, graphLeft - 15, y + 3);
    }

    // Plot pH Curve
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let v = 0; v <= 50; v += 0.5) {
      const na = (cAcid * vAcid) / 1000;
      const nb = (cBase * v) / 1000;
      const vt = (vAcid + v) / 1000;
      let pVal = 7;
      if (na > nb) pVal = -Math.log10(Math.max(1e-14, (na - nb) / vt));
      else if (nb > na) pVal = 14 - -Math.log10(Math.max(1e-14, (nb - na) / vt));
      pVal = Math.max(0, Math.min(14, pVal));

      const px = graphLeft + (v / 50) * graphWidth;
      const py = graphTop + graphHeight - (pVal / 14) * graphHeight;

      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Current Titration Point Marker
    const currX = graphLeft + (vTitrant / 50) * graphWidth;
    const currY = graphTop + graphHeight - (pH / 14) * graphHeight;
    ctx.fillStyle = '#FF0055';
    ctx.beginPath();
    ctx.arc(currX, currY, 6, 0, Math.PI * 2);
    ctx.fill();

  }, [vTitrant, cAcid, vAcid, cBase]);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0a0a0a] text-white select-none">
      {/* Interactive Titration Apparatus Viewport */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-88 bg-zinc-950 border-l border-white/10 p-5 space-y-5 font-mono text-xs overflow-y-auto">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
          <FlaskConical className="w-4 h-4 text-white" /> Acid-Base Titration Laboratory
        </h3>

        {/* Action Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsTitrating(!isTitrating)}
            className={`flex-1 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isTitrating ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' : 'bg-white text-black border-white hover:bg-zinc-200'
            }`}
          >
            {isTitrating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isTitrating ? 'Pause Titration' : 'Add NaOH Titrant'}</span>
          </button>
          <button
            onClick={() => {
              setIsTitrating(false);
              setVTitrant(0);
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors"
            title="Reset Experiment"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Volume Added (V_base):</span>
              <span className="text-white font-bold">{vTitrant} mL</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={vTitrant}
              onChange={(e) => setVTitrant(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>HCl Concentration:</span>
              <span className="text-white font-bold">{cAcid} M</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={cAcid}
              onChange={(e) => setCAcid(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>NaOH Concentration:</span>
              <span className="text-white font-bold">{cBase} M</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={cBase}
              onChange={(e) => setCBase(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>
        </div>

        {/* Live Equivalence Point Data */}
        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-white" /> Equivalence Point Analysis:
          </div>
          <div className="text-white text-xs space-y-1">
            <div>Theoretical Equivalence: <span className="font-bold text-emerald-400">{((cAcid * vAcid) / cBase).toFixed(1)} mL</span></div>
            <div>Indicator: <span className="font-bold text-pink-400">Phenolphthalein (8.2 - 10.0)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
