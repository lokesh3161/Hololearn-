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
  Layers,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import type { FerrousDichromateConfig } from '../../chemistry/ferrousDichromate';
import { ferrousDichromateConfig } from '../../chemistry/ferrousDichromate';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { labSound } from '../../utils/LabSoundManager';

interface FerrousIronDichromateLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export interface FerrousTrialResult {
  trialNumber: number;
  initialReadingMl: number;
  finalReadingMl: number;
  titreMl: number;
  calculatedMolarity: number;
  calculatedStrengthGPerL: number;
  colorObservation: string;
  isConcordant: boolean;
  timestamp: string;
}

export const FerrousIronDichromateLab: React.FC<FerrousIronDichromateLabProps> = ({
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
  const [acidAdded, setAcidAdded] = useState<boolean>(false);
  const [hasIndicator, setHasIndicator] = useState<boolean>(false);

  // ── 2. LIVE TITRATION FLOW STATE ────────────────────────
  const [stopcockMode, setStopcockMode] = useState<'closed' | 'slow' | 'fast'>('closed');
  const [vDichromateAdded, setVDichromateAdded] = useState<number>(Number(inputs.vDichromateAdded || 0.0));
  const [droplets, setDroplets] = useState<Array<{ id: number; y: number }>>([]);

  // ── 3. TRIAL LOGS & SYSTEM DATA ─────────────────────────
  const [trialNumber, setTrialNumber] = useState<number>(1);
  const [trials, setTrials] = useState<FerrousTrialResult[]>([]);
  const [activeTab, setActiveTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'FORMULAS' | 'AI_MENTOR' | 'ADVANCED_CHEMISTRY' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // AI Mentor Chat Messages
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '👋 Welcome to Experiment 04: Estimation of Ferrous Iron by Dichromate Titration! Pipette 20.00 mL Fe2+ sample, add H2SO4+H3PO4 acid mixture, add sodium diphenylamine sulfonate indicator, and titrate with standard K2Cr2O7 to intense blue-violet/purple!',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // ── 4. REDOX CHEMICAL STATE & STOICHIOMETRIC ENGINE ───────
  const sampleVolumeMl = 20.00;
  const dichromateMolarity = 0.01667; // 0.01667 M = 0.100 N
  const atomicWeightFe = 55.85;
  const groundTruthFe2Molar = 0.100; // 0.100 M Fe2+

  // Theoretical Equivalence Volume V_eq = (0.100 * 20.00) / (6 * 0.01667) = 20.00 mL
  const vEquivalence = useMemo(() => {
    return (groundTruthFe2Molar * sampleVolumeMl) / (6.0 * dichromateMolarity); // 20.00 mL
  }, [groundTruthFe2Molar, sampleVolumeMl, dichromateMolarity]);

  const redoxFraction = useMemo(() => {
    return vDichromateAdded / vEquivalence;
  }, [vDichromateAdded, vEquivalence]);

  // Derived Chemical State & Indicator Color View
  const chemicalState = useMemo(() => {
    let label = 'Pale Light Green Solution (Fe2+ Present)';
    let hex = '#a7f3d0';
    let isEndpoint = false;
    let isOvershoot = false;

    if (!samplePipetted) {
      label = 'Empty Conical Flask';
      hex = 'rgba(255, 255, 255, 0.05)';
    } else if (!acidAdded) {
      label = 'Cloudy Solution (Missing H2SO4+H3PO4 Acid Mixture)';
      hex = '#d1d5db';
    } else if (!hasIndicator) {
      label = 'Light Green Solution (No Indicator Added)';
      hex = '#86efac';
    } else if (redoxFraction < 0.95) {
      label = 'Pale Light Green Solution (Fe2+ / Cr3+ Mixture)';
      hex = '#a7f3d0';
    } else if (redoxFraction < 0.99) {
      label = 'Grayish Violet Transition Region (Near Endpoint)';
      hex = '#a855f7';
    } else if (redoxFraction <= 1.02) {
      label = 'Intense Blue-Violet / Purple (True Redox Endpoint)';
      hex = '#7e22ce';
      isEndpoint = true;
    } else {
      label = 'Deep Royal Violet (Overshot Dichromate Titration)';
      hex = '#4c1d95';
      isOvershoot = true;
    }

    // 1 mol Cr2O72- = 6 mol Fe2+ -> M_Fe = (6 * M_dichromate * V_dichromate) / V_Fe
    const calculatedMolarity = (6.0 * dichromateMolarity * vDichromateAdded) / sampleVolumeMl;
    const calculatedStrengthGPerL = calculatedMolarity * atomicWeightFe;

    return {
      redoxFraction,
      colorLabel: label,
      colorHex: hex,
      calculatedMolarity: Number(calculatedMolarity.toFixed(3)),
      calculatedStrengthGPerL: Number(calculatedStrengthGPerL.toFixed(2)),
      isEndpoint,
      isOvershoot,
    };
  }, [samplePipetted, acidAdded, hasIndicator, redoxFraction, vDichromateAdded, dichromateMolarity, sampleVolumeMl, atomicWeightFe]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('vDichromateAdded', vDichromateAdded);
    onUpdateInput('calculatedMolarity', chemicalState.calculatedMolarity);
    onUpdateInput('calculatedStrengthGPerL', chemicalState.calculatedStrengthGPerL);
    onUpdateInput('acidConditionMet', acidAdded);
    onUpdateInput('hasIndicator', hasIndicator);
  }, [vDichromateAdded, chemicalState.calculatedMolarity, chemicalState.calculatedStrengthGPerL, acidAdded, hasIndicator, onUpdateInput]);

  // ── 5. TITRATION DRIPPING TICK LOOP ───────────────────────
  useEffect(() => {
    if (stopcockMode === 'closed' || !buretteFilled || !samplePipetted) {
      setDroplets([]);
      return;
    }

    const intervalMs = stopcockMode === 'slow' ? 350 : 90;
    const dropIncrement = stopcockMode === 'slow' ? 0.05 : 0.25;

    const timer = setInterval(() => {
      setVDichromateAdded((prev) => {
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
    if (acidAdded) onCompleteStep(5);
    if (hasIndicator) onCompleteStep(6);
    if (chemicalState.isEndpoint) onCompleteStep(7);
  }, [safetyReviewed, buretteFilled, airInTipCleared, samplePipetted, acidAdded, hasIndicator, chemicalState.isEndpoint, onCompleteStep]);

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
    if (soundEnabled) labSound.playPause();
  };

  const handlePipetteSample = () => {
    setSamplePipetted(true);
    if (soundEnabled) labSound.playLensDrag();
  };

  const handleAddAcidMix = () => {
    if (!samplePipetted) return;
    setAcidAdded(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleAddIndicator = () => {
    if (!acidAdded) return;
    setHasIndicator(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleToggleStopcock = (mode: 'closed' | 'slow' | 'fast') => {
    if (!buretteFilled || !samplePipetted) return;
    setStopcockMode(mode);
  };

  const handleRecordTrial = () => {
    if (vDichromateAdded < 0.1) return;
    const calcMolar = (6.0 * dichromateMolarity * vDichromateAdded) / sampleVolumeMl;
    const calcStrength = calcMolar * atomicWeightFe;
    const isConcord = Math.abs(vDichromateAdded - vEquivalence) <= 0.10;

    const newTrial: FerrousTrialResult = {
      trialNumber: trials.length + 1,
      initialReadingMl: 0.00,
      finalReadingMl: Number(vDichromateAdded.toFixed(2)),
      titreMl: Number(vDichromateAdded.toFixed(2)),
      calculatedMolarity: Number(calcMolar.toFixed(3)),
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
    setVDichromateAdded(0.0);
    setSamplePipetted(true);
    setBuretteFilled(true);
    setAcidAdded(true);
    setHasIndicator(true);
    setTrialNumber((t) => t + 1);
    if (soundEnabled) labSound.playReset();
  };

  const handleExportCSV = () => {
    if (trials.length === 0) return;
    const headers = ['Trial', 'Initial_Reading_mL', 'Final_Reading_mL', 'Titre_K2Cr2O7_mL', 'Molarity_M', 'Strength_g_L', 'Color_Observation', 'Concordant'];
    const rows = trials.map((t) => [t.trialNumber, t.initialReadingMl, t.finalReadingMl, t.titreMl, t.calculatedMolarity, t.calculatedStrengthGPerL, t.colorObservation, t.isConcordant ? 'Yes' : 'No']);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ferrous_Iron_Dichromate_Titration_${Date.now()}.csv`;
    link.click();
  };

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userQ = aiInputText;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAiInputText('');

    setTimeout(() => {
      let botReply = `With ${vDichromateAdded.toFixed(2)} mL 0.01667 M K2Cr2O7 added, calculated Fe2+ Molarity is ${chemicalState.calculatedMolarity.toFixed(3)} M and Strength is ${chemicalState.calculatedStrengthGPerL.toFixed(2)} g/L Fe.`;

      if (userQ.toLowerCase().includes('ratio') || userQ.toLowerCase().includes('stoichiometry') || userQ.toLowerCase().includes('6:1')) {
        botReply = 'The balanced redox equation is Cr2O7(2-) + 14H(+) + 6Fe(2+) ➔ 2Cr(3+) + 7H2O + 6Fe(3+). Each mole of dichromate oxidizes 6 moles of Fe2+ ions!';
      } else if (userQ.toLowerCase().includes('phosphoric') || userQ.toLowerCase().includes('h3po4') || userQ.toLowerCase().includes('acid')) {
        botReply = 'H3PO4 complexes the Fe3+ formed during titration into colorless [Fe(HPO4)]+, lowering the reduction potential of Fe3+/Fe2+ so that sodium diphenylamine sulfonate changes sharply to intense blue-violet!';
      } else if (userQ.toLowerCase().includes('indicator') || userQ.toLowerCase().includes('violet') || userQ.toLowerCase().includes('purple')) {
        botReply = 'Sodium diphenylamine sulfonate indicator is oxidized by the first excess drop of dichromate at the equivalence point, turning from pale green to an intense blue-violet / purple!';
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
            20.00 mL Fe2+ Solution
          </span>

          <span className="text-zinc-400 font-bold">Titrant:</span>
          <span className="font-bold text-amber-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            0.01667 M (0.100 N) K2Cr2O7
          </span>

          <span className="text-zinc-400 font-bold">Indicator:</span>
          <span className="font-bold text-purple-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            Diphenylamine Sulfonate
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-zinc-300">
            Trial: <span className="font-bold text-white">#{trialNumber}</span>
          </div>

          <button
            onClick={handleRecordTrial}
            disabled={vDichromateAdded < 0.1}
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
              <span>⚠️ VIRTUAL LAB SAFETY: Potassium dichromate is a strong oxidizing agent. Wear gloves and eye protection.</span>
            </div>
            <button onClick={handleReviewSafety} className="px-2 py-0.5 bg-amber-500 text-black font-bold rounded text-[10px]">
              Acknowledge & Proceed
            </button>
          </motion.div>
        )}

        {chemicalState.isEndpoint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-purple-500/10 border-b border-purple-500/30 px-6 py-1.5 text-[11px] font-mono text-purple-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>✓ REDOX ENDPOINT REACHED — Solution turned intense blue-violet / purple! Record your final burette reading now.</span>
          </motion.div>
        )}

        {chemicalState.isOvershoot && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border-b border-red-500/30 px-6 py-1.5 text-[11px] font-mono text-red-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>⚠️ OVERSHOOT ALERT: Passed blue-violet endpoint ({vEquivalence.toFixed(2)} mL). Record as overshot trial.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN 3-ZONE WORKSTATION LAYOUT ──────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT ZONE: APPARATUS CONTROLS (~20% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-r border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Redox Lab Actions
          </div>

          {/* Action 1: Fill Burette */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">1. K2Cr2O7 Titrant:</span>
              <span className={`font-bold ${buretteFilled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {buretteFilled ? 'Filled 0.00mL' : 'Empty'}
              </span>
            </div>
            <button
              onClick={handleFillBurette}
              disabled={buretteFilled}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Droplet className="w-3.5 h-3.5 text-amber-500" />
              <span>Fill Burette with K2Cr2O7</span>
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

          {/* Action 3: Pipette Fe2+ Sample */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">3. Fe2+ Sample:</span>
              <span className={`font-bold ${samplePipetted ? 'text-emerald-400' : 'text-amber-400'}`}>
                {samplePipetted ? '20.00 mL in Flask' : 'Not Pipetted'}
              </span>
            </div>
            <button
              onClick={handlePipetteSample}
              disabled={samplePipetted}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Beaker className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pipette 20 mL Fe2+ Sample</span>
            </button>
          </div>

          {/* Action 4: Add H2SO4 + H3PO4 Acid */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">4. Acid Mixture:</span>
              <span className={`font-bold ${acidAdded ? 'text-emerald-400' : 'text-amber-400'}`}>
                {acidAdded ? '10 mL H2SO4+H3PO4' : 'Missing Acid'}
              </span>
            </div>
            <button
              onClick={handleAddAcidMix}
              disabled={!samplePipetted || acidAdded}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Add 10 mL Acid Mixture</span>
            </button>
          </div>

          {/* Action 5: Add Diphenylamine Sulfonate */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">5. Indicator Drops:</span>
              <span className={`font-bold ${hasIndicator ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasIndicator ? 'Diphenylamine Added' : 'Missing'}
              </span>
            </div>
            <button
              onClick={handleAddIndicator}
              disabled={!acidAdded || hasIndicator}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Droplet className="w-3.5 h-3.5 text-purple-400" />
              <span>Add Diphenylamine Indicator</span>
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
                  stopcockMode === 'slow' ? 'bg-amber-500 text-black border-amber-400' : 'bg-zinc-900 text-zinc-300 border-white/10'
                }`}
              >
                💧 Dropwise (0.05 mL/s)
              </button>
              <button
                onClick={() => handleToggleStopcock('fast')}
                className={`py-1 rounded border font-bold text-[10px] transition-all ${
                  stopcockMode === 'fast' ? 'bg-amber-600 text-white border-amber-400' : 'bg-zinc-900 text-zinc-300 border-white/10'
                }`}
              >
                ⚡ Fast Stream (0.50 mL/s)
              </button>
            </div>
          </div>
        </aside>

        {/* CENTER ZONE: HERO APPARATUS VISUALIZATION (~65% Width) */}
        <main className="flex-1 min-h-0 flex bg-black relative overflow-hidden items-center justify-evenly p-6 select-none">
          {/* Left Graphic: Unknown Ferrous Iron Reagent Bottle */}
          <div className="flex flex-col items-center relative">
            <div className="text-[10px] text-zinc-400 font-mono mb-2 font-bold uppercase">Unknown Fe2+ Sample</div>
            <div className="w-32 h-44 border-2 border-white/70 bg-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-end p-1 shadow-2xl">
              <div className="w-full h-4/5 bg-emerald-950/60 border-t border-emerald-500/30 rounded-xl flex flex-col items-center justify-center p-2 text-center">
                <Layers className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-[9px] text-white font-bold font-mono">FERROUS IRON</span>
                <span className="text-[8px] text-emerald-300 font-mono">Fe²⁺ Solution</span>
              </div>
            </div>
            <div className="w-12 h-6 bg-zinc-700 border-2 border-white/60 rounded-t-lg -mt-48 mb-42 z-10" />
          </div>

          {/* Right Graphic: Volumetric Titration Stand */}
          <div className="flex flex-col items-center relative">
            <div className="text-[10px] text-zinc-400 font-mono mb-2 font-bold uppercase">Redox Titration Workstation</div>
            <div className="relative flex flex-col items-center">
              <div className="w-44 h-3 bg-zinc-800 rounded-full mb-1 border border-white/20" />
              <div className="absolute top-0 right-6 w-3 h-[360px] bg-zinc-800 border-x border-white/20 -z-10" />
              <div className="w-30 h-4 bg-zinc-700 border border-white/30 rounded mb-1" />

              {/* Burette Tube filled with Orange K2Cr2O7 */}
              <div className="w-12 h-60 border-2 border-white/70 bg-white/5 rounded-t relative overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full bg-amber-600/60 border-t-2 border-amber-500 transition-all duration-200"
                  style={{ height: buretteFilled ? `${Math.max(0, 100 - (vDichromateAdded / 50.0) * 100)}%` : '0%' }}
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

              {/* Falling Orange Droplets Animation */}
              <div className="h-14 w-3 relative flex justify-center items-start overflow-hidden">
                {droplets.map((d) => (
                  <div key={d.id} className="w-2 h-3.5 rounded-full bg-amber-500 absolute shadow-sm" style={{ top: `${d.y}%` }} />
                ))}
              </div>

              {/* Conical Flask */}
              <div className="w-40 h-44 relative flex flex-col items-center justify-end">
                <div className="w-14 h-10 border-x-2 border-t-2 border-white/70 bg-white/5" />
                <div className="w-40 h-34 border-2 border-white/70 rounded-b-3xl relative overflow-hidden flex flex-col justify-end bg-white/5 p-1">
                  <div
                    className="w-full rounded-b-2xl transition-colors duration-500 flex items-center justify-center border-t border-white/40 relative"
                    style={{
                      height: samplePipetted ? `${Math.min(90, 45 + (vDichromateAdded / 20.0) * 20)}%` : '0%',
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
            <div className="text-[10px] text-zinc-400">Dichromate Added V</div>
            <div className="font-bold text-white text-sm">{vDichromateAdded.toFixed(2)} mL</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Color Observation</div>
            <div className="font-bold text-purple-400 text-[11px] truncate" title={chemicalState.colorLabel}>
              {chemicalState.colorLabel}
            </div>
          </div>

          {/* Calculated Fe2+ Molarity Card */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Calculated Fe2+ Molarity</div>
            <div className="text-base font-bold text-white">{chemicalState.calculatedMolarity.toFixed(3)} M</div>
          </div>

          {/* Calculated Fe2+ Strength Card */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-1">
            <div className="text-[10px] text-blue-400 font-bold uppercase">Calculated Fe2+ Strength</div>
            <div className="text-lg font-bold text-white">{chemicalState.calculatedStrengthGPerL.toFixed(2)} g/L</div>
            <div className="text-[9px] text-zinc-400">(g/L Fe = M_Fe × 55.85)</div>
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
                <div className="font-bold text-white text-xs">Ferrous Iron Dichromate Titration Checklist:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">1. Prepare Sample & Acid</div>
                    <div className="text-zinc-400">Fill burette with 0.01667 M K2Cr2O7. Pipette 20 mL Fe2+ sample & add 10 mL H2SO4+H3PO4 acid.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">2. Indicator & Titration</div>
                    <div className="text-zinc-400">Add diphenylamine sulfonate indicator (turns light green). Titrate to intense blue-violet/purple!</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">3. Calculate Fe2+</div>
                    <div className="text-zinc-400">Calculate M_Fe = (6 * M_dichromate * V_dichromate) / V_Fe and Strength (g/L) = M_Fe * 55.85!</div>
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
                    <button onClick={handleRecordTrial} disabled={vDichromateAdded < 0.1} className="px-2.5 py-1 bg-blue-500 text-white rounded font-bold text-[10px]">
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
                    No trials recorded yet. Titrate to intense blue-violet endpoint and click '+ Record Trial'.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/20 text-zinc-400 uppercase font-mono">
                          <th className="p-1.5">Trial #</th>
                          <th className="p-1.5">Initial (mL)</th>
                          <th className="p-1.5">Final (mL)</th>
                          <th className="p-1.5">K2Cr2O7 Titre (mL)</th>
                          <th className="p-1.5">Fe2+ Molarity M</th>
                          <th className="p-1.5">Fe2+ Strength (g/L)</th>
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
                            <td className="p-1.5 text-amber-400 font-bold">{t.titreMl.toFixed(2)}</td>
                            <td className="p-1.5 text-emerald-400 font-bold">{t.calculatedMolarity.toFixed(3)}</td>
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
                  <div className="font-bold text-white text-xs">Redox Oxidation Curve: Fe2+ Consumed vs Volume K2Cr2O7</div>
                  <div className="text-emerald-400 text-[10px]">Sharp Diphenylamine Sulfonate Inflection at Equivalence Point V = 20.00 mL</div>
                  <div className="text-zinc-400 text-[10px]">Calculated Fe2+ Strength = 5.59 g/L Fe</div>
                </div>

                <div className="w-80 h-28 bg-zinc-900 border border-white/15 rounded-xl p-3 flex flex-col justify-between text-[10px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Oxidation Fraction</span>
                    <span>V_eq = 20.00 mL</span>
                  </div>
                  <div className="h-16 w-full border-b border-l border-white/30 relative flex items-end px-2 pb-1">
                    <span className="text-[9px] text-purple-300 font-bold">Blue-Violet Redox Endpoint</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>0.0 mL</span>
                    <span>Volume K2Cr2O7 Added (mL) ➔</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FORMULAS TAB */}
            {activeTab === 'FORMULAS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">1. Redox Ionic Equation</div>
                  <div className="text-[10px] font-bold text-white">Cr₂O₇²⁻ + 14H⁺ + 6Fe²⁺ ➔ 2Cr³⁺ + 7H₂O + 6Fe³⁺</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">2. Stoichiometry Ratio</div>
                  <div className="text-xs font-bold text-amber-400">1 mol Cr₂O₇²⁻ ≡ 6 mol Fe²⁺</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">3. Fe2+ Molarity</div>
                  <div className="text-xs font-bold text-emerald-400">M_Fe = (6 × M_dichromate × V_dichromate) / V_Fe</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">4. Fe2+ Strength (g/L)</div>
                  <div className="text-xs font-bold text-sky-400">Strength (g/L Fe) = M_Fe × 55.85 g/mol</div>
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
                    placeholder="Ask why 1 mol dichromate oxidizes 6 mol Fe2+ or why H3PO4 acid is added..."
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
                  <div className="text-zinc-400 font-bold">Fe2+ Sample Volume</div>
                  <div className="text-sm font-bold text-emerald-400">20.00 mL</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Standard Dichromate Molarity</div>
                  <div className="text-sm font-bold text-amber-400">0.01667 M K2Cr2O7</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Dichromate Titre Volume</div>
                  <div className="text-sm font-bold text-sky-400">{vDichromateAdded.toFixed(2)} mL</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Fe2+ Oxidation Progress</div>
                  <div className="text-sm font-bold text-purple-400">{(redoxFraction * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* 7. REPORT TAB */}
            {activeTab === 'REPORT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs">Automated Chemistry Laboratory Report Draft</div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-white/15 space-y-1 leading-relaxed">
                  <div><strong>Experiment:</strong> Estimation of Ferrous Iron by Dichromate Titration</div>
                  <div><strong>Sample Volume:</strong> 20.00 mL Ferrous Iron (Fe2+) Solution</div>
                  <div><strong>Standard Titrant:</strong> 0.01667 M (0.100 N) Potassium Dichromate (K2Cr2O7)</div>
                  <div><strong>Acid Medium:</strong> 10 mL Dilute H2SO4 + H3PO4 Acid Mixture</div>
                  <div><strong>Indicator:</strong> Sodium Diphenylamine Sulfonate</div>
                  <div><strong>Average K2Cr2O7 Titre:</strong> {vDichromateAdded.toFixed(2)} mL</div>
                  <div><strong>Calculated Fe2+ Molarity:</strong> {chemicalState.calculatedMolarity.toFixed(3)} M</div>
                  <div><strong>Calculated Fe2+ Strength:</strong> {chemicalState.calculatedStrengthGPerL.toFixed(2)} g/L Fe</div>
                </div>
              </div>
            )}

            {/* 8. ASSESSMENT TAB */}
            {activeTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs font-mono font-bold">Assessment Checkpoints:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>1. Acidified Sample with H2SO4+H3PO4 Mixture</span>
                    <span className="font-bold">+35 pts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>2. Titrated to Intense Blue-Violet Redox Endpoint</span>
                    <span className="font-bold">+40 pts</span>
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
