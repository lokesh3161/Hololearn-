import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Droplet, Gauge, Activity, CheckCircle2, AlertTriangle, Sparkles, HelpCircle } from 'lucide-react';
import type { ExperimentConfig } from '../../types';

interface TitrationResult {
  trial: number;
  vInitial: number;
  vFinal: number;
  vTitre: number;
  isConcordant: boolean;
}

interface AcidBaseTitrationLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const AcidBaseTitrationLab: React.FC<AcidBaseTitrationLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {


  // Setup state
  const [analyteType, setAnalyteType] = useState<'HCl' | 'CH3COOH'>('HCl');
  const [indicator, setIndicator] = useState<'phenolphthalein' | 'methyl-orange' | 'litmus'>('phenolphthalein');
  const [indicatorAdded, setIndicatorAdded] = useState<boolean>(true);
  const [phProbeActive, setPhProbeActive] = useState<boolean>(true);

  // Live titration flow state
  const [stopcockMode, setStopcockMode] = useState<'closed' | 'slow' | 'fast'>('closed');
  const [flowRate, setFlowRate] = useState<number>(0); // 0, 0.1, or 1.0 mL/s

  // Trial history & results
  const [trialNumber, setTrialNumber] = useState<number>(1);
  const [results, setResults] = useState<TitrationResult[]>([]);
  const [droplets, setDroplets] = useState<Array<{ id: number; y: number }>>([]);

  const vAcid = 25.00; // mL
  const cAcid = 0.095; // mol/L unknown
  const cBase = 0.100; // mol/L standard NaOH
  const vBaseAdded = Number(inputs.vBaseAdded || 0.0);

  // Equivalence volume
  const equivalenceVolume = (cAcid * vAcid) / cBase; // 23.75 mL

  // Scientifically accurate pH calculation engine
  const { pH, indicatorLabel, indicatorIntensity, isEndpoint, isOvershoot } = useMemo(() => {
    const Va = vAcid / 1000.0;
    const Ca = cAcid;
    const Vb = vBaseAdded / 1000.0;
    const Cb = cBase;

    const molesAcid = Va * Ca;
    const molesBase = Vb * Cb;
    const totalVolume = Va + Vb;

    let calcPH = 7.0;

    if (analyteType === 'HCl') {
      const excess = molesBase - molesAcid;
      if (Math.abs(excess) < 1e-7) {
        calcPH = 7.0;
      } else if (excess < 0) {
        const remainingAcid = -excess;
        const H_conc = remainingAcid / totalVolume;
        calcPH = -Math.log10(Math.max(1e-14, H_conc));
      } else {
        const OH_conc = excess / totalVolume;
        const pOH = -Math.log10(Math.max(1e-14, OH_conc));
        calcPH = 14.0 - pOH;
      }
    } else {
      // Weak acid CH3COOH (pKa = 4.76)
      const pKa = 4.76;
      if (vBaseAdded <= 0.01) {
        // Pure weak acid solution: pH = 0.5 * (pKa - log(Ca))
        calcPH = 0.5 * (pKa - Math.log10(Ca));
      } else if (molesBase < molesAcid) {
        // Buffer region
        const ratio = molesBase / (molesAcid - molesBase);
        calcPH = pKa + Math.log10(ratio);
      } else if (Math.abs(molesBase - molesAcid) < 1e-7) {
        // Equivalence point salt hydrolysis
        const C_salt = molesAcid / totalVolume;
        const Ka = Math.pow(10, -pKa);
        const Kb = 1e-14 / Ka;
        const OH_conc = Math.sqrt(Kb * C_salt);
        const pOH = -Math.log10(OH_conc);
        calcPH = 14.0 - pOH; // ~8.72
      } else {
        const excessBase = molesBase - molesAcid;
        const OH_conc = excessBase / totalVolume;
        const pOH = -Math.log10(Math.max(1e-14, OH_conc));
        calcPH = 14.0 - pOH;
      }
    }

    // Indicator Engine
    let label = 'colorless';
    let intensity = 0;

    if (!indicatorAdded) {
      label = 'no indicator added (colorless)';
      intensity = 0;
    } else if (indicator === 'phenolphthalein') {
      if (calcPH < 8.2) {
        label = 'colorless';
        intensity = 0;
      } else if (calcPH < 10.0) {
        label = 'pale pink';
        intensity = (calcPH - 8.2) / 1.8;
      } else {
        label = 'deep pink / magenta';
        intensity = 1.0;
      }
    } else if (indicator === 'methyl-orange') {
      if (calcPH < 3.1) {
        label = 'red';
        intensity = 1.0;
      } else if (calcPH < 4.4) {
        label = 'orange';
        intensity = (calcPH - 3.1) / 1.3;
      } else {
        label = 'yellow';
        intensity = 0;
      }
    } else {
      // Litmus
      if (calcPH < 6.0) {
        label = 'red';
        intensity = 1.0;
      } else if (calcPH < 8.0) {
        label = 'purple';
        intensity = 0.5;
      } else {
        label = 'blue';
        intensity = 1.0;
      }
    }

    const endpoint = Math.abs(vBaseAdded - equivalenceVolume) <= 0.15;
    const overshot = vBaseAdded > equivalenceVolume + 0.50;

    return {
      pH: Number(calcPH.toFixed(2)),
      indicatorLabel: label,
      indicatorIntensity: intensity,
      isEndpoint: endpoint,
      isOvershoot: overshot,
    };
  }, [vBaseAdded, analyteType, indicator, indicatorAdded, equivalenceVolume]);

  // Tick interval for liquid dripping
  useEffect(() => {
    if (stopcockMode === 'closed') {
      setFlowRate(0);
      setDroplets([]);
      return;
    }

    const rate = stopcockMode === 'slow' ? 0.1 : 1.0; // mL/s
    setFlowRate(rate);

    const intervalMs = stopcockMode === 'slow' ? 300 : 80;
    const increment = stopcockMode === 'slow' ? 0.05 : 0.25;

    const timer = setInterval(() => {
      const nextVol = Number((vBaseAdded + increment).toFixed(2));
      onUpdateInput('vBaseAdded', nextVol);

      // Trigger falling droplet animation
      setDroplets((prev) => [...prev.slice(-4), { id: Date.now(), y: 0 }]);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [stopcockMode, vBaseAdded, onUpdateInput]);

  // Animate falling droplets
  useEffect(() => {
    if (droplets.length === 0) return;
    const dropTimer = setInterval(() => {
      setDroplets((prev) =>
        prev
          .map((d) => ({ ...d, y: d.y + 12 }))
          .filter((d) => d.y < 90)
      );
    }, 40);
    return () => clearInterval(dropTimer);
  }, [droplets]);

  // Automatic procedure step checks & mistake alerts
  useEffect(() => {
    if (vBaseAdded > 0) onCompleteStep(1);
    if (vBaseAdded >= 5) onCompleteStep(2);
    if (isEndpoint) onCompleteStep(3);
    if (vBaseAdded >= equivalenceVolume) onCompleteStep(4);
  }, [vBaseAdded, isEndpoint, equivalenceVolume, onCompleteStep]);

  const handleToggleStopcock = (mode: 'closed' | 'slow' | 'fast') => {
    setStopcockMode(mode);
  };

  const handleResetTrial = () => {
    if (vBaseAdded > 1) {
      const newResult: TitrationResult = {
        trial: trialNumber,
        vInitial: 0.00,
        vFinal: Number(vBaseAdded.toFixed(2)),
        vTitre: Number(vBaseAdded.toFixed(2)),
        isConcordant: Math.abs(vBaseAdded - equivalenceVolume) <= 0.10,
      };
      setResults((prev) => [...prev, newResult]);
      setTrialNumber((t) => t + 1);
    }
    setStopcockMode('closed');
    onUpdateInput('vBaseAdded', 0.0);
  };

  // Concordant results check (within 0.10 mL)
  const concordantCount = useMemo(() => {
    return results.filter((r) => r.isConcordant).length;
  }, [results]);

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* Top Controls & Status Bar */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/10 p-3 rounded-xl text-xs gap-3">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-400">Analyte Acid:</span>{' '}
            <select
              value={analyteType}
              onChange={(e) => setAnalyteType(e.target.value as any)}
              className="bg-zinc-900 border border-white/20 rounded px-2 py-0.5 text-white font-bold font-mono focus:outline-none"
            >
              <option value="HCl">HCl (Strong Acid)</option>
              <option value="CH3COOH">CH3COOH (Weak Acid)</option>
            </select>
          </div>

          <div>
            <span className="text-zinc-400">Indicator:</span>{' '}
            <select
              value={indicator}
              onChange={(e) => setIndicator(e.target.value as any)}
              className="bg-zinc-900 border border-white/20 rounded px-2 py-0.5 text-white font-bold font-mono focus:outline-none"
            >
              <option value="phenolphthalein">Phenolphthalein</option>
              <option value="methyl-orange">Methyl Orange</option>
              <option value="litmus">Litmus</option>
            </select>
          </div>

          <button
            onClick={() => setIndicatorAdded(!indicatorAdded)}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[10px] transition-all ${
              indicatorAdded ? 'bg-white/10 border-white/30 text-white' : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            }`}
          >
            {indicatorAdded ? '✓ Indicator Added' : '➕ Add Indicator Drops'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-zinc-300">
            Trial: <span className="font-bold text-white">#{trialNumber}</span>
          </div>

          <button
            onClick={handleResetTrial}
            className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/20 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset / Next Trial</span>
          </button>
        </div>
      </div>

      {/* Warnings & Real-Time Alerts Bar */}
      {!indicatorAdded && stopcockMode !== 'closed' && (
        <div className="w-full mt-2 p-2 bg-zinc-900 border-2 border-white rounded-xl text-xs text-white flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          <span>⚠ WARNING: No indicator added — you will not observe a color change at the endpoint!</span>
        </div>
      )}

      {flowRate > 0.5 && pH > 6.0 && !isEndpoint && (
        <div className="w-full mt-2 p-2 bg-zinc-900 border border-white/40 rounded-xl text-xs text-white flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          <span>⚠ CAUTION: High flow rate near pH inflection point — switch to dropwise mode to prevent overshoot!</span>
        </div>
      )}

      {isEndpoint && (
        <div className="w-full mt-2 p-2 bg-zinc-900 border-2 border-white rounded-xl text-xs text-white flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>✓ ENDPOINT REACHED — Pale pink color detected! Record your final burette reading now.</span>
        </div>
      )}

      {isOvershoot && (
        <div className="w-full mt-2 p-2 bg-zinc-900 border-2 border-white rounded-xl text-xs text-white flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          <span>⚠ OVERSHOOT ALERT: Passed equivalence volume ({equivalenceVolume.toFixed(2)} mL). Record as overshot trial.</span>
        </div>
      )}

      {/* Main Interactive Apparatus Canvas (Strict Monochrome outline + monochrome liquid fill) */}
      <div className="flex-1 w-full max-w-3xl my-2 flex items-center justify-between gap-6 relative">
        {/* Left Side: Apparatus Graphic */}
        <div className="flex-1 flex justify-center items-center relative py-4">
          <div className="relative flex flex-col items-center">
            {/* Clamp Stand Top */}
            <div className="w-40 h-2 bg-zinc-700 rounded-full mb-1" />

            {/* Vertical Stand Rod */}
            <div className="absolute top-0 right-6 w-3 h-[340px] bg-zinc-800 border-x border-white/20 -z-10" />

            {/* Horizontal Clamp holding Burette */}
            <div className="w-28 h-3 bg-zinc-700 border border-white/30 rounded mb-1" />

            {/* Burette Glass Tube */}
            <div className="w-10 h-64 border-2 border-white/60 bg-white/5 rounded-t relative overflow-hidden flex flex-col justify-end">
              {/* Titrant Liquid Level */}
              <div
                className="w-full bg-zinc-700/60 border-t border-white/80 transition-all duration-200"
                style={{ height: `${Math.max(0, 100 - (vBaseAdded / 50.0) * 100)}%` }}
              />

              {/* Graduations */}
              <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-50 text-[7px] pointer-events-none select-none font-mono">
                <span>0.00 mL</span>
                <span>10.00 mL</span>
                <span>20.00 mL</span>
                <span>30.00 mL</span>
                <span>40.00 mL</span>
                <span>50.00 mL</span>
              </div>
            </div>

            {/* Clickable Stopcock Handle */}
            <div
              onClick={() => handleToggleStopcock(stopcockMode === 'closed' ? 'slow' : stopcockMode === 'slow' ? 'fast' : 'closed')}
              className="w-14 h-7 bg-zinc-900 border-2 border-white/80 rounded-lg flex items-center justify-center my-1 cursor-pointer hover:border-white transition-all shadow-lg group relative"
              title="Click to toggle stopcock valve (Closed -> Dropwise -> Fast Stream)"
            >
              <div
                className={`w-9 h-2 bg-white rounded transition-transform duration-300 ${
                  stopcockMode === 'closed' ? 'rotate-0' : stopcockMode === 'slow' ? 'rotate-45' : 'rotate-90'
                }`}
              />
              <span className="absolute -right-24 text-[9px] bg-zinc-900 border border-white/20 px-2 py-0.5 rounded font-mono text-zinc-300">
                {stopcockMode === 'closed' ? 'Closed' : stopcockMode === 'slow' ? 'Slow (0.1mL/s)' : 'Fast (1.0mL/s)'}
              </span>
            </div>

            {/* Falling Droplet Animations */}
            <div className="h-14 w-2 relative flex justify-center items-start overflow-hidden">
              {droplets.map((d) => (
                <div
                  key={d.id}
                  className="w-2 h-3 rounded-full bg-white/90 absolute"
                  style={{ top: `${d.y}%` }}
                />
              ))}
            </div>

            {/* Erlenmeyer Conical Flask */}
            <div className="w-36 h-40 relative flex flex-col items-center justify-end">
              {/* Flask Neck */}
              <div className="w-12 h-10 border-x-2 border-t-2 border-white/60 bg-white/5" />

              {/* Flask Body */}
              <div className="w-36 h-30 border-2 border-white/60 rounded-b-3xl relative overflow-hidden flex flex-col justify-end bg-white/5 p-1">
                {/* Solution Fill Level */}
                <div
                  className="w-full rounded-b-2xl transition-all duration-300 flex items-center justify-center border-t border-white/40"
                  style={{
                    height: `${Math.min(90, 40 + (vBaseAdded / 25.0) * 20)}%`,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {stopcockMode !== 'closed' && (
                    <div className="w-5 h-5 rounded-full bg-white/30 animate-ping" />
                  )}
                </div>
              </div>

              {/* Ceramic White Tile Base */}
              <div className="w-48 h-4 bg-zinc-900 border-2 border-white/40 rounded shadow-2xl mt-1 flex items-center justify-center">
                <span className="text-[8px] text-zinc-400 uppercase tracking-widest font-mono">White Tile Base</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Digital Instruments Panel */}
        <div className="w-64 flex flex-col gap-3">
          <div className="p-3 bg-zinc-950 border border-white/15 rounded-xl space-y-2">
            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-white" /> Digital pH Meter</span>
              <button onClick={() => setPhProbeActive(!phProbeActive)} className="text-[9px] text-zinc-400 hover:text-white underline">
                {phProbeActive ? 'Probe On' : 'Probe Off'}
              </button>
            </div>

            {phProbeActive ? (
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">{pH.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-300 font-mono mt-1">
                  Indicator State: <span className="font-bold border-b border-white/30">{indicatorLabel}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-2">[ pH Probe Offline ]</div>
            )}
          </div>

          <div className="p-3 bg-zinc-950 border border-white/15 rounded-xl space-y-1 font-mono text-xs">
            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5 text-white" /> Live Readings
            </div>
            <div className="flex justify-between py-1 border-b border-white/10">
              <span className="text-zinc-400">Volume Added:</span>
              <span className="font-bold text-white">{vBaseAdded.toFixed(2)} mL</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/10">
              <span className="text-zinc-400">Burette Reading:</span>
              <span className="font-bold text-white">{vBaseAdded.toFixed(2)} mL</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/10">
              <span className="text-zinc-400">Temperature:</span>
              <span className="font-bold text-white">24.1 °C</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Equivalence Vol:</span>
              <span className="font-bold text-zinc-300">{equivalenceVolume.toFixed(2)} mL</span>
            </div>
          </div>

          {/* Trial Concordance Summary */}
          {results.length > 0 && (
            <div className="p-3 bg-zinc-950 border border-white/15 rounded-xl space-y-1 text-[10px] font-mono">
              <div className="font-bold text-white uppercase text-[9px]">Completed Trials ({results.length})</div>
              {results.slice(-3).map((r) => (
                <div key={r.trial} className="flex justify-between text-zinc-300">
                  <span>Trial {r.trial}:</span>
                  <span className="font-bold">{r.vTitre.toFixed(2)} mL {r.isConcordant ? '(Concordant)' : ''}</span>
                </div>
              ))}
              <div className="text-[9px] text-emerald-400 font-bold pt-1">
                Concordant Count: {concordantCount} / 3 required
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Stopcock Control Bar */}
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
        <span className="text-[11px] font-bold text-zinc-300 font-mono">Stopcock Valve Mode:</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleStopcock('closed')}
            className={`px-4 py-2 rounded-xl font-mono font-bold text-xs transition-all active:scale-95 border ${
              stopcockMode === 'closed' ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            ⏹ Closed (0.00 mL/s)
          </button>
          <button
            onClick={() => handleToggleStopcock('slow')}
            className={`px-4 py-2 rounded-xl font-mono font-bold text-xs transition-all active:scale-95 border ${
              stopcockMode === 'slow' ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            💧 Dropwise (0.10 mL/s)
          </button>
          <button
            onClick={() => handleToggleStopcock('fast')}
            className={`px-4 py-2 rounded-xl font-mono font-bold text-xs transition-all active:scale-95 border ${
              stopcockMode === 'fast' ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            ⚡ Fast Flow (1.00 mL/s)
          </button>
        </div>
      </div>
    </div>
  );
};
