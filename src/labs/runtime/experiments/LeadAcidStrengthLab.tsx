import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Download,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  BookOpen,
  FileText,
  Award,
  CheckCircle2,
  AlertTriangle,
  Droplet,
  Beaker,
  FlaskConical,
  Flame,
  Info,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import type { LeadAcidStrengthConfig } from '../../chemistry/leadAcidStrength';
import { leadAcidStrengthConfig } from '../../chemistry/leadAcidStrength';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { labSound } from '../../utils/LabSoundManager';

interface LeadAcidStrengthLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export interface LeadAcidTrialResult {
  trialNumber: number;
  initialReadingMl: number;
  finalReadingMl: number;
  titreMl: number;
  calculatedNormality: number;
  calculatedStrengthGPerL: number;
  colorObservation: string;
  isConcordant: boolean;
  timestamp: string;
}

export const LeadAcidStrengthLab: React.FC<LeadAcidStrengthLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. APPARATUS & WORKFLOW STAGE STATE ───────────────────
  const [safetyReviewed, setSafetyReviewed] = useState<boolean>(false);
  const [buretteFilled, setBuretteFilled] = useState<boolean>(false);
  const [airInTipCleared, setAirInTipCleared] = useState<boolean>(false);
  const [samplePipetted, setSamplePipetted] = useState<boolean>(false);
  const [hasIndicator, setHasIndicator] = useState<boolean>(false);

  // ── 2. LIVE TITRATION FLOW STATE ────────────────────────
  const [stopcockMode, setStopcockMode] = useState<'closed' | 'slow' | 'fast'>('closed');
  const [vNaohAdded, setVNaohAdded] = useState<number>(Number(inputs.vNaohAdded || 0.0));
  const [droplets, setDroplets] = useState<Array<{ id: number; y: number }>>([]);
  const [airInTip, setAirInTip] = useState<boolean>(false);

  // ── 3. TRIAL LOGS & SYSTEM DATA ─────────────────────────
  const [trialNumber, setTrialNumber] = useState<number>(1);
  const [trials, setTrials] = useState<LeadAcidTrialResult[]>([]);
  const [activeTab, setActiveTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'FORMULAS' | 'AI_MENTOR' | 'ADVANCED_CHEMISTRY' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // AI Mentor Chat Messages
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '👋 Welcome to Experiment 03: Determination of Strength of Acid in a Lead-Acid Battery! Pipette 20.00 mL battery electrolyte into a conical flask, add phenolphthalein indicator, and titrate with standard 0.500 N NaOH to faint pale pink!',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // ── 4. CHEMICAL STATE & NEUTRALIZATION ENGINE ────────────
  const sampleVolumeMl = 20.00;
  const naohNormality = 0.500;
  const eqWeightH2SO4 = 49.04;
  const groundTruthNormality = 0.500; // 0.500 N H2SO4

  // Theoretical Equivalence Volume V_eq = (0.500 * 20.00) / 0.500 = 20.00 mL
  const vEquivalence = useMemo(() => {
    return (groundTruthNormality * sampleVolumeMl) / naohNormality; // 20.00 mL
  }, [groundTruthNormality, sampleVolumeMl, naohNormality]);

  const neutralizedFraction = useMemo(() => {
    return vNaohAdded / vEquivalence;
  }, [vNaohAdded, vEquivalence]);

  // Derived Chemical State & Indicator Color View
  const chemicalState = useMemo(() => {
    let label = 'Clear Colorless Acidic Solution';
    let hex = 'rgba(255, 255, 255, 0.15)';
    let isEndpoint = false;
    let isOvershoot = false;

    if (!samplePipetted) {
      label = 'Empty Conical Flask';
      hex = 'rgba(255, 255, 255, 0.05)';
    } else if (!hasIndicator) {
      label = 'Clear Colorless Solution (No Indicator Added)';
      hex = 'rgba(255, 255, 255, 0.15)';
    } else if (neutralizedFraction < 0.98) {
      label = 'Clear Colorless (Acidic pH < 8.2)';
      hex = 'rgba(255, 255, 255, 0.15)';
    } else if (neutralizedFraction <= 1.02) {
      label = 'Faint Pale Pink (True Neutralization Endpoint)';
      hex = '#f472b6';
      isEndpoint = true;
    } else {
      label = 'Deep Pink / Magenta (Overshot Alkaline pH > 10)';
      hex = '#db2777';
      isOvershoot = true;
    }

    const calculatedNormality = (naohNormality * vNaohAdded) / sampleVolumeMl;
    const calculatedStrengthGPerL = calculatedNormality * eqWeightH2SO4;

    return {
      neutralizedFraction,
      colorLabel: label,
      colorHex: hex,
      calculatedNormality: Number(calculatedNormality.toFixed(3)),
      calculatedStrengthGPerL: Number(calculatedStrengthGPerL.toFixed(2)),
      isEndpoint,
      isOvershoot,
    };
  }, [samplePipetted, hasIndicator, neutralizedFraction, vNaohAdded, naohNormality, sampleVolumeMl, eqWeightH2SO4]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('vNaohAdded', vNaohAdded);
    onUpdateInput('calculatedNormality', chemicalState.calculatedNormality);
    onUpdateInput('calculatedStrengthGPerL', chemicalState.calculatedStrengthGPerL);
    onUpdateInput('hasIndicator', hasIndicator);
    onUpdateInput('airInTip', airInTip);
  }, [vNaohAdded, chemicalState.calculatedNormality, chemicalState.calculatedStrengthGPerL, hasIndicator, airInTip, onUpdateInput]);

  // ── 5. TITRATION DRIPPING TICK LOOP ───────────────────────
  useEffect(() => {
    if (stopcockMode === 'closed' || !buretteFilled || !samplePipetted) {
      setDroplets([]);
      return;
    }

    const intervalMs = stopcockMode === 'slow' ? 350 : 90;
    const dropIncrement = stopcockMode === 'slow' ? 0.05 : 0.25;

    const timer = setInterval(() => {
      setVNaohAdded((prev) => {
        const next = Number((prev + dropIncrement).toFixed(2));
        if (next > 50.0) {
          setStopcockMode('closed');
          return 50.0;
        }
        return next;
      });

      setDroplets((prev) => [...prev.slice(-4), { id: Date.now(), y: 0 }]);
      if (soundEnabled && stopcockMode === 'slow') {
        labSound.playPause();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [stopcockMode, buretteFilled, samplePipetted, soundEnabled]);

  // Falling droplets position animation
  useEffect(() => {
    if (droplets.length === 0) return;
    const animTimer = setInterval(() => {
      setDroplets((prev) =>
        prev
          .map((d) => ({ ...d, y: d.y + 14 }))
          .filter((d) => d.y < 95)
      );
    }, 35);
    return () => clearInterval(animTimer);
  }, [droplets]);

  // Automatic Step Completion Check
  useEffect(() => {
    if (safetyReviewed) onCompleteStep(1);
    if (buretteFilled) onCompleteStep(2);
    if (airInTipCleared) onCompleteStep(3);
    if (samplePipetted) onCompleteStep(4);
    if (hasIndicator) onCompleteStep(5);
    if (chemicalState.isEndpoint) onCompleteStep(6);
  }, [safetyReviewed, buretteFilled, airInTipCleared, samplePipetted, hasIndicator, chemicalState.isEndpoint, onCompleteStep]);

  // ── 6. ACTIONS & HANDLERS ────────────────────────────────
  const handleReviewSafety = () => {
    setSafetyReviewed(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleFillBurette = () => {
    setBuretteFilled(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleClearAirTip = () => {
    setAirInTipCleared(true);
    setAirInTip(false);
    if (soundEnabled) labSound.playPause();
  };

  const handlePipetteSample = () => {
    setSamplePipetted(true);
    if (soundEnabled) labSound.playLensDrag();
  };

  const handleAddIndicator = () => {
    if (!samplePipetted) return;
    setHasIndicator(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleToggleStopcock = (mode: 'closed' | 'slow' | 'fast') => {
    if (!buretteFilled || !samplePipetted) return;
    setStopcockMode(mode);
  };

  const handleRecordTrial = () => {
    if (vNaohAdded < 0.1) return;
    const calcNorm = (naohNormality * vNaohAdded) / sampleVolumeMl;
    const calcStrength = calcNorm * eqWeightH2SO4;
    const isConcord = Math.abs(vNaohAdded - vEquivalence) <= 0.10;

    const newTrial: LeadAcidTrialResult = {
      trialNumber: trials.length + 1,
      initialReadingMl: 0.00,
      finalReadingMl: Number(vNaohAdded.toFixed(2)),
      titreMl: Number(vNaohAdded.toFixed(2)),
      calculatedNormality: Number(calcNorm.toFixed(3)),
      calculatedStrengthGPerL: Number(calcStrength.toFixed(2)),
      colorObservation: chemicalState.colorLabel,
      isConcordant: isConcord,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setTrials((prev) => [...prev, newTrial]);
    onRecordDataPoint();
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleResetTrial = () => {
    setStopcockMode('closed');
    setVNaohAdded(0.0);
    setSamplePipetted(true);
    setBuretteFilled(true);
    setHasIndicator(true);
    setTrialNumber((t) => t + 1);
    if (soundEnabled) labSound.playReset();
  };

  const handleExportCSV = () => {
    if (trials.length === 0) return;
    const headers = ['Trial', 'Initial_Reading_mL', 'Final_Reading_mL', 'Titre_NaOH_mL', 'Normality_N', 'Strength_g_L', 'Color_Observation', 'Concordant'];
    const rows = trials.map((t) => [t.trialNumber, t.initialReadingMl, t.finalReadingMl, t.titreMl, t.calculatedNormality, t.calculatedStrengthGPerL, t.colorObservation, t.isConcordant ? 'Yes' : 'No']);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lead_Acid_Strength_Titration_${Date.now()}.csv`;
    link.click();
  };

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userQ = aiInputText;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAiInputText('');

    setTimeout(() => {
      let botReply = `With ${vNaohAdded.toFixed(2)} mL 0.500 N NaOH added, calculated Acid Normality is ${chemicalState.calculatedNormality.toFixed(3)} N and Strength is ${chemicalState.calculatedStrengthGPerL.toFixed(2)} g/L H2SO4.`;

      if (userQ.toLowerCase().includes('normality') || userQ.toLowerCase().includes('equivalent')) {
        botReply = 'Normality N = (N_base × V_base) / V_acid. For sulfuric acid, equivalent weight = 49.04 g/eq (half of molecular weight 98.08 g/mol because H2SO4 is diprotic). Strength (g/L) = Normality × 49.04!';
      } else if (userQ.toLowerCase().includes('indicator') || userQ.toLowerCase().includes('pink')) {
        botReply = 'Phenolphthalein remains colorless in acidic battery electrolyte (pH < 8.2). At the exact neutralization endpoint, the first permanent faint pale-pink color appears as pH rises above 8.2!';
      } else if (userQ.toLowerCase().includes('battery') || userQ.toLowerCase().includes('safety')) {
        botReply = 'Lead-acid battery electrolyte contains concentrated sulfuric acid (H2SO4). In real laboratories, always wear safety goggles and gloves. This digital simulation uses a prepared virtual sample for safe learning!';
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    }, 400);
  };

  const concordantCount = useMemo(() => {
    return trials.filter((t) => t.isConcordant).length;
  }, [trials]);

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-white font-sans select-none relative overflow-hidden">
      {/* ── TOP ESSENTIAL PARAMETER HEADER ─────────────────────── */}
      <header className="h-12 bg-zinc-950 border-b border-white/15 px-6 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 font-bold">Sample:</span>
          <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            20.00 mL Battery Acid (H2SO4)
          </span>

          <span className="text-zinc-400 font-bold">Titrant:</span>
          <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            0.500 N NaOH Standard
          </span>

          <span className="text-zinc-400 font-bold">Indicator:</span>
          <span className="font-bold text-amber-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            Phenolphthalein
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-zinc-300">
            Trial: <span className="font-bold text-white">#{trialNumber}</span>
          </div>

          <button
            onClick={handleRecordTrial}
            disabled={vNaohAdded < 0.1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Trial</span>
          </button>

          <button
            onClick={handleResetTrial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/15 transition-all active:scale-95"
            title="Reset for next trial"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset / Next Trial</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/10 transition-all"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ── SAFETY BANNER & REAL-TIME ALERTS ──────────────────── */}
      <AnimatePresence>
        {!safetyReviewed && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-1.5 text-[11px] font-mono text-amber-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>⚠️ VIRTUAL LAB SAFETY: Battery acid (H2SO4) is corrosive. Wear PPE in laboratory environments.</span>
            </div>
            <button onClick={handleReviewSafety} className="px-2 py-0.5 bg-amber-500 text-black font-bold rounded text-[10px]">
              Acknowledge & Proceed
            </button>
          </motion.div>
        )}

        {chemicalState.isEndpoint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-1.5 text-[11px] font-mono text-emerald-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>✓ NEUTRALIZATION ENDPOINT REACHED — Solution turned faint pale pink! Record your final burette reading now.</span>
          </motion.div>
        )}

        {chemicalState.isOvershoot && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border-b border-red-500/30 px-6 py-1.5 text-[11px] font-mono text-red-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>⚠️ OVERSHOOT ALERT: Passed pale-pink endpoint ({vEquivalence.toFixed(2)} mL). Record as overshot trial.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN 3-ZONE WORKSTATION LAYOUT ──────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT ZONE: APPARATUS CONTROLS (~20% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-r border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Reagent & Lab Actions
          </div>

          {/* Action 1: Fill Burette */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">1. NaOH Titrant:</span>
              <span className={`font-bold ${buretteFilled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {buretteFilled ? 'Filled 0.00mL' : 'Empty'}
              </span>
            </div>
            <button
              onClick={handleFillBurette}
              disabled={buretteFilled}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Droplet className="w-3.5 h-3.5 text-blue-400" />
              <span>Fill Burette with 0.500N NaOH</span>
            </button>
          </div>

          {/* Action 2: Clear Air Tip */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">2. Burette Tip:</span>
              <span className={`font-bold ${airInTipCleared ? 'text-emerald-400' : 'text-amber-400'}`}>
                {airInTipCleared ? 'Air Cleared' : 'Check Tip'}
              </span>
            </div>
            <button
              onClick={handleClearAirTip}
              disabled={!buretteFilled || airInTipCleared}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Clear Air Bubble from Tip</span>
            </button>
          </div>

          {/* Action 3: Pipette Battery Acid */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">3. Battery Acid Sample:</span>
              <span className={`font-bold ${samplePipetted ? 'text-emerald-400' : 'text-amber-400'}`}>
                {samplePipetted ? '20.00 mL in Flask' : 'Not Pipetted'}
              </span>
            </div>
            <button
              onClick={handlePipetteSample}
              disabled={samplePipetted}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Beaker className="w-3.5 h-3.5 text-purple-400" />
              <span>Pipette 20 mL Battery Acid</span>
            </button>
          </div>

          {/* Action 4: Add Phenolphthalein */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">4. Indicator Drops:</span>
              <span className={`font-bold ${hasIndicator ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasIndicator ? 'Added (Colorless)' : 'Missing'}
              </span>
            </div>
            <button
              onClick={handleAddIndicator}
              disabled={!samplePipetted || hasIndicator}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Droplet className="w-3.5 h-3.5 text-pink-400" />
              <span>Add Phenolphthalein Drops</span>
            </button>
          </div>

          {/* Stopcock Controls */}
          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Stopcock Valve Control</div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleToggleStopcock('closed')}
                className={`py-1 rounded border font-bold text-[10px] transition-all ${
                  stopcockMode === 'closed' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10'
                }`}
              >
                ⏹ Closed (0.00 mL/s)
              </button>
              <button
                onClick={() => handleToggleStopcock('slow')}
                className={`py-1 rounded border font-bold text-[10px] transition-all ${
                  stopcockMode === 'slow' ? 'bg-blue-500 text-white border-blue-400' : 'bg-zinc-900 text-zinc-300 border-white/10'
                }`}
              >
                💧 Dropwise (0.05 mL/s)
              </button>
              <button
                onClick={() => handleToggleStopcock('fast')}
                className={`py-1 rounded border font-bold text-[10px] transition-all ${
                  stopcockMode === 'fast' ? 'bg-blue-600 text-white border-blue-400' : 'bg-zinc-900 text-zinc-300 border-white/10'
                }`}
              >
                ⚡ Fast Stream (0.50 mL/s)
              </button>
            </div>
          </div>
        </aside>

        {/* CENTER ZONE: HERO APPARATUS VISUALIZATION (~65% Width) */}
        <main className="flex-1 min-h-0 flex bg-black relative overflow-hidden items-center justify-evenly p-6 select-none">
          {/* Left Graphic: Lead-Acid Battery Electrolyte Reagent Bottle */}
          <div className="flex flex-col items-center relative">
            <div className="text-[10px] text-zinc-400 font-mono mb-2 font-bold uppercase">Battery Electrolyte Sample</div>
            <div className="w-32 h-44 border-2 border-white/70 bg-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-end p-1 shadow-2xl">
              <div className="w-full h-4/5 bg-zinc-800/80 rounded-xl border-t border-white/30 flex flex-col items-center justify-center p-2 text-center">
                <ShieldAlert className="w-6 h-6 text-amber-400 mb-1" />
                <span className="text-[9px] text-white font-bold font-mono">LEAD-ACID BATTERY</span>
                <span className="text-[8px] text-zinc-400 font-mono">H₂SO₄ Electrolyte</span>
              </div>
            </div>
            <div className="w-12 h-6 bg-zinc-700 border-2 border-white/60 rounded-t-lg -mt-48 mb-42 z-10" />
          </div>

          {/* Right Graphic: Volumetric Titration Stand */}
          <div className="flex flex-col items-center relative">
            <div className="text-[10px] text-zinc-400 font-mono mb-2 font-bold uppercase">Titration Workstation</div>
            <div className="relative flex flex-col items-center">
              <div className="w-44 h-3 bg-zinc-800 rounded-full mb-1 border border-white/20" />
              <div className="absolute top-0 right-6 w-3 h-[360px] bg-zinc-800 border-x border-white/20 -z-10" />
              <div className="w-30 h-4 bg-zinc-700 border border-white/30 rounded mb-1" />

              {/* Burette Tube */}
              <div className="w-12 h-60 border-2 border-white/70 bg-white/5 rounded-t relative overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full bg-blue-500/30 border-t-2 border-blue-400 transition-all duration-200"
                  style={{ height: buretteFilled ? `${Math.max(0, 100 - (vNaohAdded / 50.0) * 100)}%` : '0%' }}
                />
                <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-60 text-[8px] pointer-events-none select-none font-mono">
                  <span>0.00 mL</span>
                  <span>10.00 mL</span>
                  <span>20.00 mL</span>
                  <span>30.00 mL</span>
                  <span>40.00 mL</span>
                  <span>50.00 mL</span>
                </div>
              </div>

              {/* Stopcock Valve */}
              <div
                onClick={() => handleToggleStopcock(stopcockMode === 'closed' ? 'slow' : stopcockMode === 'slow' ? 'fast' : 'closed')}
                className="w-16 h-8 bg-zinc-900 border-2 border-white/80 rounded-lg flex items-center justify-center my-1 cursor-pointer hover:border-white transition-all shadow-lg relative group"
                title="Toggle Stopcock Valve"
              >
                <div
                  className={`w-10 h-2 bg-white rounded transition-transform duration-300 ${
                    stopcockMode === 'closed' ? 'rotate-0' : stopcockMode === 'slow' ? 'rotate-45' : 'rotate-90'
                  }`}
                />
              </div>

              {/* Falling Droplets Animation */}
              <div className="h-14 w-3 relative flex justify-center items-start overflow-hidden">
                {droplets.map((d) => (
                  <div key={d.id} className="w-2 h-3.5 rounded-full bg-blue-400 absolute shadow-sm" style={{ top: `${d.y}%` }} />
                ))}
              </div>

              {/* Conical Flask */}
              <div className="w-40 h-44 relative flex flex-col items-center justify-end">
                <div className="w-14 h-10 border-x-2 border-t-2 border-white/70 bg-white/5" />
                <div className="w-40 h-34 border-2 border-white/70 rounded-b-3xl relative overflow-hidden flex flex-col justify-end bg-white/5 p-1">
                  <div
                    className="w-full rounded-b-2xl transition-colors duration-500 flex items-center justify-center border-t border-white/40 relative"
                    style={{
                      height: samplePipetted ? `${Math.min(90, 45 + (vNaohAdded / 20.0) * 20)}%` : '0%',
                      backgroundColor: chemicalState.colorHex,
                    }}
                  >
                    {stopcockMode !== 'closed' && <div className="w-6 h-6 rounded-full bg-white/30 animate-ping" />}
                  </div>
                </div>
                <div className="w-52 h-5 bg-zinc-900 border-2 border-white/50 rounded shadow-2xl mt-1 flex items-center justify-center">
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">White Tile Contrast Base</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT ZONE: LIVE TELEMETRY (~18% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-l border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Live Telemetry
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">NaOH Titre Added V</div>
            <div className="font-bold text-white text-sm">{vNaohAdded.toFixed(2)} mL</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Color Observation</div>
            <div className="font-bold text-pink-400 text-[11px] truncate" title={chemicalState.colorLabel}>
              {chemicalState.colorLabel}
            </div>
          </div>

          {/* Calculated Acid Normality Card */}
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-0.5">
            <div className="text-[10px] text-purple-400 font-bold uppercase">Calculated Acid Normality</div>
            <div className="text-base font-bold text-white">{chemicalState.calculatedNormality.toFixed(3)} N</div>
          </div>

          {/* Calculated Acid Strength Card */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Calculated Acid Strength</div>
            <div className="text-lg font-bold text-white">{chemicalState.calculatedStrengthGPerL.toFixed(2)} g/L</div>
            <div className="text-[9px] text-zinc-400">(g/L H2SO4 = N_acid × 49.04)</div>
          </div>

          {/* Concordant Summary */}
          {trials.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-1 text-[10px]">
              <div className="font-bold text-white uppercase text-[9px]">Completed Trials ({trials.length})</div>
              {trials.slice(-3).map((t) => (
                <div key={t.trialNumber} className="flex justify-between text-zinc-300">
                  <span>Trial #{t.trialNumber}:</span>
                  <span className="font-bold">{t.titreMl.toFixed(2)} mL ({t.calculatedStrengthGPerL.toFixed(1)} g/L)</span>
                </div>
              ))}
              <div className="text-[9px] text-emerald-400 font-bold pt-1">
                Concordant Count: {concordantCount} / 3 required
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── BOTTOM PROGRESSIVE DISCLOSURE DOCK ───────────────────── */}
      <div className="h-44 shrink-0 bg-zinc-950 border-t border-white/15 flex flex-col font-mono text-xs min-h-0">
        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-1 px-4 py-1.5 bg-black border-b border-white/10 text-xs shrink-0 overflow-x-auto">
          {(['NONE', 'PROCEDURE', 'DATA', 'GRAPH', 'FORMULAS', 'AI_MENTOR', 'ADVANCED_CHEMISTRY', 'REPORT', 'ASSESSMENT'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab((prev) => (prev === tab ? 'NONE' : tab))}
              className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all uppercase ${
                activeTab === tab ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'NONE' ? 'Hide Panel' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        {activeTab !== 'NONE' && (
          <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-zinc-950">
            {/* 1. PROCEDURE TAB */}
            {activeTab === 'PROCEDURE' && (
              <div className="space-y-2 text-[11px]">
                <div className="font-bold text-white text-xs">Battery Acid Strength Procedure Checklist:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">1. Prepare Apparatus</div>
                    <div className="text-zinc-400">Fill burette with 0.500 N NaOH. Clear air bubble from tip. Pipette 20.00 mL battery acid into flask.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">2. Indicator & Titration</div>
                    <div className="text-zinc-400">Add 2-3 drops phenolphthalein indicator. Titrate with NaOH dropwise near endpoint until faint pale pink.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">3. Calculate Strength</div>
                    <div className="text-zinc-400">Calculate N_acid = (N_base * V_base) / V_acid and Strength (g/L) = N_acid * 49.04 g/eq!</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DATA TABLE TAB */}
            {activeTab === 'DATA' && (
              <div className="space-y-3 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs font-mono">Recorded Titration Trials ({trials.length})</div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleRecordTrial} disabled={vNaohAdded < 0.1} className="px-2.5 py-1 bg-blue-500 text-white rounded font-bold text-[10px]">
                      + Record Trial
                    </button>
                    <button onClick={() => setTrials([])} className="text-[10px] text-zinc-400 hover:text-white underline">
                      Clear Log
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-1 px-2.5 py-1 bg-white text-black font-bold rounded text-[10px]">
                      <Download className="w-3 h-3" /> Export CSV
                    </button>
                  </div>
                </div>

                {trials.length === 0 ? (
                  <div className="text-zinc-500 text-[10px] py-4 text-center">
                    No trials recorded yet. Titrate to faint pale pink endpoint and click '+ Record Trial'.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/20 text-zinc-400 uppercase font-mono">
                          <th className="p-1.5">Trial #</th>
                          <th className="p-1.5">Initial (mL)</th>
                          <th className="p-1.5">Final (mL)</th>
                          <th className="p-1.5">Titre V (mL)</th>
                          <th className="p-1.5">Normality N</th>
                          <th className="p-1.5">Strength (g/L)</th>
                          <th className="p-1.5">Color Observation</th>
                          <th className="p-1.5">Concordant?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trials.map((t) => (
                          <tr key={t.trialNumber} className="border-b border-white/10 hover:bg-white/5 font-mono">
                            <td className="p-1.5 text-zinc-500">#{t.trialNumber}</td>
                            <td className="p-1.5 text-white">{t.initialReadingMl.toFixed(2)}</td>
                            <td className="p-1.5 text-white">{t.finalReadingMl.toFixed(2)}</td>
                            <td className="p-1.5 text-emerald-400 font-bold">{t.titreMl.toFixed(2)}</td>
                            <td className="p-1.5 text-purple-400 font-bold">{t.calculatedNormality.toFixed(3)}</td>
                            <td className="p-1.5 text-sky-400 font-bold">{t.calculatedStrengthGPerL.toFixed(2)}</td>
                            <td className="p-1.5 text-zinc-300">{t.colorObservation}</td>
                            <td className="p-1.5 text-zinc-400">{t.isConcordant ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. GRAPH TAB */}
            {activeTab === 'GRAPH' && (
              <div className="h-full flex items-center justify-between p-2 font-mono text-[11px]">
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">Neutralization Inflection Curve: pH vs Volume 0.500 N NaOH</div>
                  <div className="text-emerald-400 text-[10px]">Sharp Neutralization Inflection at Equivalence Point V = 20.00 mL</div>
                  <div className="text-zinc-400 text-[10px]">Calculated Acid Strength = 24.52 g/L H₂SO₄</div>
                </div>

                <div className="w-80 h-28 bg-zinc-900 border border-white/15 rounded-xl p-3 flex flex-col justify-between text-[10px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>pH Inflection</span>
                    <span>V_eq = 20.00 mL</span>
                  </div>
                  <div className="h-16 w-full border-b border-l border-white/30 relative flex items-end px-2 pb-1">
                    <span className="text-[9px] text-pink-300 font-bold">Phenolphthalein Pink Endpoint</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>0.0 mL</span>
                    <span>Volume 0.500 N NaOH Added (mL) ➔</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FORMULAS TAB */}
            {activeTab === 'FORMULAS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Neutralization Relation</div>
                  <div className="text-xs font-bold text-white">N₁V₁ = N₂V₂</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Acid Normality N</div>
                  <div className="text-xs font-bold text-emerald-400">N_acid = (N_base × V_base) / V_acid</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Acid Strength (g/L)</div>
                  <div className="text-xs font-bold text-sky-400">Strength (g/L) = N_acid × 49.04 g/eq</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Equivalent Weight H2SO4</div>
                  <div className="text-xs font-bold text-purple-400">Eq. Weight = 98.08 / 2 = 49.04 g/eq</div>
                </div>
              </div>
            )}

            {/* 5. AI MENTOR TAB */}
            {activeTab === 'AI_MENTOR' && (
              <div className="h-full flex flex-col font-mono text-[10px]">
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl border max-w-xl ${
                        msg.sender === 'bot' ? 'bg-zinc-900 border-white/10 text-zinc-300' : 'bg-blue-500/20 border-blue-500/40 text-blue-200 ml-auto'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAskAI} className="relative pt-2 shrink-0">
                  <input
                    type="text"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    placeholder="Ask why equivalent weight 49.04 is used or why battery acid is sulfuric acid..."
                    className="w-full bg-zinc-900 border border-white/20 rounded-xl pl-3 pr-8 py-1.5 text-[10px] text-white focus:outline-none"
                  />
                  <button type="submit" className="absolute right-2 top-2.5 text-zinc-400 hover:text-white">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* 6. ADVANCED CHEMISTRY TAB */}
            {activeTab === 'ADVANCED_CHEMISTRY' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Acid Sample Volume</div>
                  <div className="text-sm font-bold text-emerald-400">20.00 mL</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Standard Alkali Normality</div>
                  <div className="text-sm font-bold text-amber-400">0.500 N NaOH</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">NaOH Titre Volume</div>
                  <div className="text-sm font-bold text-sky-400">{vNaohAdded.toFixed(2)} mL</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Neutralization Progress</div>
                  <div className="text-sm font-bold text-purple-400">{(neutralizedFraction * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* 7. REPORT TAB */}
            {activeTab === 'REPORT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs">Automated Chemistry Laboratory Report Draft</div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-white/15 space-y-1 leading-relaxed">
                  <div><strong>Experiment:</strong> Determination of Strength of Acid in a Lead-Acid Battery</div>
                  <div><strong>Sample Volume:</strong> 20.00 mL Battery Acid (H2SO4)</div>
                  <div><strong>Standard Titrant:</strong> 0.500 N Sodium Hydroxide (NaOH)</div>
                  <div><strong>Indicator:</strong> Phenolphthalein Solution</div>
                  <div><strong>Average NaOH Titre:</strong> {vNaohAdded.toFixed(2)} mL</div>
                  <div><strong>Calculated Acid Normality:</strong> {chemicalState.calculatedNormality.toFixed(3)} N</div>
                  <div><strong>Calculated Acid Strength:</strong> {chemicalState.calculatedStrengthGPerL.toFixed(2)} g/L H2SO4</div>
                </div>
              </div>
            )}

            {/* 8. ASSESSMENT TAB */}
            {activeTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs font-mono font-bold">Assessment Checkpoints:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>1. Cleared Air Bubble from Burette Tip</span>
                    <span className="font-bold">+30 pts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>2. Titrated to Faint Pale Pink Endpoint</span>
                    <span className="font-bold">+45 pts</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
