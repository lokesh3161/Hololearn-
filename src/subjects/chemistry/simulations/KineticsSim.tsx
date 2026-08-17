import React, { useRef, useEffect, useState } from 'react';
import { resizeCanvasToDisplaySize } from '../../../components/simulations/canvasHelper';
import { Zap, RotateCcw, BarChart2 } from 'lucide-react';

export const KineticsSim: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tempK, setTempK] = useState<number>(300); // Kelvin
  const [hasCatalyst, setHasCatalyst] = useState<boolean>(false);
  const [eaUncatalyzed, setEaUncatalyzed] = useState<number>(75); // kJ/mol

  const eaEffective = hasCatalyst ? eaUncatalyzed - 30 : eaUncatalyzed;

  // Rate constant k = A * exp(-Ea / RT)
  const R = 0.008314; // kJ/(mol K)
  const kRate = 1e8 * Math.exp(-eaEffective / (R * tempK));

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

      // Energy Profile Coordinate Diagram (Left/Center)
      const graphLeft = width * 0.1;
      const graphTop = 50;
      const graphWidth = width * 0.5;
      const graphHeight = height - 100;

      // Axes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(graphLeft, graphTop);
      ctx.lineTo(graphLeft, graphTop + graphHeight);
      ctx.lineTo(graphLeft + graphWidth, graphTop + graphHeight);
      ctx.stroke();

      // Energy Curve: Reactants -> Transition State -> Products
      const rEnergy = graphTop + graphHeight - 0.3 * graphHeight;
      const pEnergy = graphTop + graphHeight - 0.15 * graphHeight;
      const tsEnergyUncat = graphTop + graphHeight - (0.3 + eaUncatalyzed / 120) * graphHeight;
      const tsEnergyCat = graphTop + graphHeight - (0.3 + (eaUncatalyzed - 30) / 120) * graphHeight;

      // Draw Uncatalyzed Pathway (White Line)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(graphLeft, rEnergy);
      ctx.bezierCurveTo(
        graphLeft + graphWidth * 0.3,
        tsEnergyUncat,
        graphLeft + graphWidth * 0.7,
        tsEnergyUncat,
        graphLeft + graphWidth,
        pEnergy
      );
      ctx.stroke();

      // Draw Catalyzed Pathway (Dotted Green Line if Catalyst enabled)
      if (hasCatalyst) {
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(graphLeft, rEnergy);
        ctx.bezierCurveTo(
          graphLeft + graphWidth * 0.3,
          tsEnergyCat,
          graphLeft + graphWidth * 0.7,
          tsEnergyCat,
          graphLeft + graphWidth,
          pEnergy
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Labels
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('Reactants', graphLeft + 10, rEnergy - 10);
      ctx.fillText('Products', graphLeft + graphWidth - 60, pEnergy - 10);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [tempK, hasCatalyst, eaUncatalyzed]);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0a0a0a] text-white select-none font-mono">
      {/* Viewport */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-88 bg-zinc-950 border-l border-white/10 p-5 space-y-5 text-xs overflow-y-auto">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
          <Zap className="w-4 h-4 text-white" /> Chemical Kinetics & Energy Profile
        </h3>

        {/* Catalyst Toggle */}
        <button
          onClick={() => setHasCatalyst(!hasCatalyst)}
          className={`w-full py-2.5 rounded-xl border font-bold transition-all ${
            hasCatalyst
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg'
              : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
          }`}
        >
          {hasCatalyst ? '✨ Catalyst Active (-30 kJ/mol E_a)' : 'Add Catalyst'}
        </button>

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Temperature (T):</span>
              <span className="text-white font-bold">{tempK} K</span>
            </div>
            <input
              type="range"
              min="250"
              max="500"
              step="10"
              value={tempK}
              onChange={(e) => setTempK(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Activation Energy (E_a):</span>
              <span className="text-amber-400 font-bold">{eaUncatalyzed} kJ/mol</span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="5"
              value={eaUncatalyzed}
              onChange={(e) => setEaUncatalyzed(Number(e.target.value))}
              className="w-full accent-amber-400 bg-zinc-800"
            />
          </div>
        </div>

        {/* Arrhenius Rate Display */}
        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-white" /> Arrhenius Rate Constant (k):
          </div>
          <div className="text-emerald-400 text-sm font-bold">
            k = {kRate.toExponential(3)} s⁻¹
          </div>
          <div className="text-[10px] text-zinc-400 pt-1">
            Effective E_a = {eaEffective} kJ/mol | T = {tempK} K
          </div>
        </div>
      </div>
    </div>
  );
};
