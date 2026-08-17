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
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import type { EDTAExperimentConfig } from '../../chemistry/waterHardnessEdta';
import { waterHardnessEdtaConfig } from '../../chemistry/waterHardnessEdta';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { labSound } from '../../utils/LabSoundManager';

interface WaterHardnessEdtaLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export interface EDTATrialResult {
  trialNumber: number;
  initialReadingMl: number;
  finalReadingMl: number;
  titreMl: number;
  calculatedHardnessPpm: number;
  colorLabel: string;
  isConcordant: boolean;
  timestamp: string;
}

export const WaterHardnessEdtaLab: React.FC<WaterHardnessEdtaLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. APPARATUS & PREPARATION STATE ─────────────────────
  const [buretteFilled, setBuretteFilled] = useState<boolean>(false);
  const [samplePipetted, setSamplePipetted] = useState<boolean>(false);
  const [hasBuffer, setHasBuffer] = useState<boolean>(false);
  const [hasIndicator, setHasIndicator] = useState<boolean>(false);
  const [bufferAfterIndicator, setBufferAfterIndicator] = useState<boolean>(false);

  // ── 2. LIVE TITRATION FLOW STATE ────────────────────────
  const [stopcockMode, setStopcockMode] = useState<'closed' | 'slow' | 'fast'>('closed');
  const [vEdtaAdded, setVEdtaAdded] = useState<number>(Number(inputs.vEdtaAdded || 0.0));
  const [droplets, setDroplets] = useState<Array<{ id: number; y: number }>>([]);
  const [isSwirling, setIsSwirling] = useState<boolean>(false);

  // ── 3. TRIAL LOGS & SYSTEM DATA ─────────────────────────
  const [trialNumber, setTrialNumber] = useState<number>(1);
  const [trials, setTrials] = useState<EDTATrialResult[]>([]);
  const [activeTab, setActiveTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'FORMULAS' | 'AI_MENTOR' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // AI Mentor Chat Messages
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '👋 Welcome to the EDTA Complexometric Titration Laboratory! Prepare your burette, pipette 25 mL water sample, add ammonia buffer (pH 10) and EBT indicator, then titrate to the steel blue endpoint!',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // ── 4. CHEMICAL STATE & REACTION ENGINE ─────────────────
  const sampleVolumeMl = 25.0;
  const edtaMolarity = 0.010;
  const groundTruthHardnessPpm = 240.0; // mg/L CaCO3 equivalent

  // Theoretical Equivalence Volume = 240 / (0.010 * 100.08 * 40.0) = 5.995 mL ~ 6.00 mL
  const vEquivalence = useMemo(() => {
    return groundTruthHardnessPpm / (edtaMolarity * 100.08 * 40.0); // 5.995 mL
  }, [groundTruthHardnessPpm, edtaMolarity]);

  const equivalenceFraction = useMemo(() => {
    return vEdtaAdded / vEquivalence;
  }, [vEdtaAdded, vEquivalence]);

  // Derived Chemical State & Color View
  const chemicalState = useMemo(() => {
    let label = 'Colorless Solution';
    let hex = '#ffffff';
    let isEndpoint = false;
    let isOvershot = false;

    if (!samplePipetted) {
      label = 'Empty Conical Flask';
      hex = 'rgba(255, 255, 255, 0.05)';
    } else if (!hasIndicator) {
      label = 'Clear Colorless Water Sample (No Indicator)';
      hex = 'rgba(255, 255, 255, 0.15)';
    } else if (!hasBuffer) {
      label = 'Reddish-Brown Precipitate (pH < 10, Unbuffered)';
      hex = '#9a3412';
    } else if (bufferAfterIndicator) {
      label = 'Turbid Wine-Red (Buffer Added Late)';
      hex = '#881337';
    } else if (equivalenceFraction < 0.88) {
      label = 'Wine-Red (Mg/Ca-EBT Complex)';
      hex = '#991b1b';
    } else if (equivalenceFraction < 0.98) {
      label = 'Reddish-Purple (Near Endpoint Transition)';
      hex = '#7e22ce';
    } else if (equivalenceFraction <= 1.04) {
      label = 'Steel Blue (True Endpoint - Free EBT at pH 10)';
      hex = '#1d4ed8';
      isEndpoint = true;
    } else {
      label = 'Deep Blue (Overshot Titration)';
      hex = '#1e3a8a';
      isOvershot = true;
    }

    const calculatedPpm = (vEdtaAdded * edtaMolarity * 100.08 * 1000) / sampleVolumeMl;

    return {
      equivalenceFraction,
      colorLabel: label,
      colorHex: hex,
      calculatedHardnessPpm: Number(calculatedPpm.toFixed(1)),
      isEndpoint,
      isOvershoot: isOvershot,
      pH: hasBuffer ? 10.0 : 6.8,
    };
  }, [samplePipetted, hasIndicator, hasBuffer, bufferAfterIndicator, equivalenceFraction, vEdtaAdded, edtaMolarity, sampleVolumeMl]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('vEdtaAdded', vEdtaAdded);
    onUpdateInput('calculatedHardnessPpm', chemicalState.calculatedHardnessPpm);
    onUpdateInput('hasBuffer', hasBuffer);
    onUpdateInput('hasIndicator', hasIndicator);
  }, [vEdtaAdded, chemicalState.calculatedHardnessPpm, hasBuffer, hasIndicator, onUpdateInput]);

  // ── 5. TITRATION DRIPPING TICK LOOP ───────────────────────
  useEffect(() => {
    if (stopcockMode === 'closed' || !buretteFilled) {
      setDroplets([]);
      return;
    }

    const intervalMs = stopcockMode === 'slow' ? 350 : 90;
    const dropIncrement = stopcockMode === 'slow' ? 0.05 : 0.25;

    const timer = setInterval(() => {
      setVEdtaAdded((prev) => {
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
  }, [stopcockMode, buretteFilled, soundEnabled]);

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
    if (buretteFilled) onCompleteStep(1);
    if (samplePipetted) onCompleteStep(2);
    if (hasBuffer) onCompleteStep(3);
    if (hasIndicator) onCompleteStep(4);
    if (chemicalState.isEndpoint) onCompleteStep(5);
  }, [buretteFilled, samplePipetted, hasBuffer, hasIndicator, chemicalState.isEndpoint, onCompleteStep]);

  // ── 6. ACTIONS & HANDLERS ────────────────────────────────
  const handleFillBurette = () => {
    setBuretteFilled(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handlePipetteSample = () => {
    setSamplePipetted(true);
    if (soundEnabled) labSound.playLensDrag();
  };

  const handleAddBuffer = () => {
    if (!samplePipetted) return;
    if (hasIndicator && !hasBuffer) {
      setBufferAfterIndicator(true);
    }
    setHasBuffer(true);
    if (soundEnabled) labSound.playLensDrag();
  };

  const handleAddIndicator = () => {
    if (!samplePipetted) return;
    setHasIndicator(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleToggleStopcock = (mode: 'closed' | 'slow' | 'fast') => {
    if (!buretteFilled) return;
    setStopcockMode(mode);
  };

  const handleRecordTrial = () => {
    if (vEdtaAdded < 0.1) return;
    const calcHardness = (vEdtaAdded * edtaMolarity * 100.08 * 1000) / sampleVolumeMl;
    const isConcord = Math.abs(vEdtaAdded - vEquivalence) <= 0.10;

    const newTrial: EDTATrialResult = {
      trialNumber: trials.length + 1,
      initialReadingMl: 0.00,
      finalReadingMl: Number(vEdtaAdded.toFixed(2)),
      titreMl: Number(vEdtaAdded.toFixed(2)),
      calculatedHardnessPpm: Number(calcHardness.toFixed(1)),
      colorLabel: chemicalState.colorLabel,
      isConcordant: isConcord,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setTrials((prev) => [...prev, newTrial]);
    onRecordDataPoint();
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleResetTrial = () => {
    setStopcockMode('closed');
    setVEdtaAdded(0.0);
    setSamplePipetted(true);
    setHasBuffer(true);
    setHasIndicator(true);
    setBufferAfterIndicator(false);
    setTrialNumber((t) => t + 1);
    if (soundEnabled) labSound.playReset();
  };

  const handleExportCSV = () => {
    if (trials.length === 0) return;
    const headers = ['Trial', 'Initial_Reading_mL', 'Final_Reading_mL', 'Titre_EDTA_mL', 'Hardness_ppm_CaCO3', 'Color_Observation', 'Concordant'];
    const rows = trials.map((t) => [t.trialNumber, t.initialReadingMl, t.finalReadingMl, t.titreMl, t.calculatedHardnessPpm, t.colorLabel, t.isConcordant ? 'Yes' : 'No']);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EDTA_Water_Hardness_Titration_${Date.now()}.csv`;
    link.click();
  };

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userQ = aiInputText;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAiInputText('');

    setTimeout(() => {
      let botReply = `With ${vEdtaAdded.toFixed(2)} mL EDTA added, the calculated hardness is ${chemicalState.calculatedHardnessPpm.toFixed(1)} ppm as CaCO3. The current color is ${chemicalState.colorLabel}.`;

      if (userQ.toLowerCase().includes('buffer') || userQ.toLowerCase().includes('ph')) {
        botReply = 'Ammonia buffer (pH 10) is mandatory because Mg-EBT indicator complex is only stable at pH 10. Below pH 10, the complex dissociates prematurely; above pH 12, Mg(OH)2 precipitates!';
      } else if (userQ.toLowerCase().includes('color') || userQ.toLowerCase().includes('blue')) {
        botReply = 'Before titration, EBT binds Mg2+ to form a Wine-Red complex (Mg-EBT). As EDTA is added, EDTA binds Ca2+ and Mg2+ more strongly. At the endpoint, EDTA displaces EBT from Mg2+, releasing Free EBT which is pure Steel Blue at pH 10!';
      } else if (userQ.toLowerCase().includes('ppm') || userQ.toLowerCase().includes('formula')) {
        botReply = 'Hardness (ppm CaCO3) = (V_EDTA × M_EDTA × 100.08 × 1000) / V_sample. For a 25 mL sample and 0.01M EDTA, Hardness (ppm) = V_EDTA × 40.032!';
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
            25.00 mL Hard Water
          </span>

          <span className="text-zinc-400 font-bold">Titrant:</span>
          <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            0.010 M EDTA
          </span>

          <span className="text-zinc-400 font-bold">Indicator:</span>
          <span className="font-bold text-amber-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            EBT at pH 10
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-zinc-300">
            Trial: <span className="font-bold text-white">#{trialNumber}</span>
          </div>

          <button
            onClick={handleRecordTrial}
            disabled={vEdtaAdded < 0.1}
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

      {/* ── REAL-TIME ALERTS BANNER ────────────────────────────── */}
      <AnimatePresence>
        {!hasBuffer && samplePipetted && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-1.5 text-[11px] font-mono text-amber-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>⚠️ MANDATORY STEP: Add 5.0 mL Ammonia Buffer (pH 10) before adding EBT indicator drops!</span>
          </motion.div>
        )}

        {chemicalState.isEndpoint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-1.5 text-[11px] font-mono text-emerald-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>✓ EQUIVALENCE ENDPOINT REACHED — Solution turned pure Steel Blue! Record your final EDTA titre now.</span>
          </motion.div>
        )}

        {chemicalState.isOvershoot && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border-b border-red-500/30 px-6 py-1.5 text-[11px] font-mono text-red-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>⚠️ OVERSHOOT ALERT: Passed steel-blue endpoint ({vEquivalence.toFixed(2)} mL). Record as overshot trial.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN 3-ZONE WORKSTATION LAYOUT ──────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT ZONE: REAGENT & APPARATUS CONTROLS (~20% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-r border-white/10 flex flex-col p-4 space-y-4 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Reagent Actions
          </div>

          {/* Action 1: Fill Burette */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-300">1. Burette Status:</span>
              <span className={`font-bold ${buretteFilled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {buretteFilled ? 'Filled 0.00mL' : 'Empty'}
              </span>
            </div>
            <button
              onClick={handleFillBurette}
              disabled={buretteFilled}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Droplet className="w-3.5 h-3.5 text-blue-400" />
              <span>Fill Burette with EDTA</span>
            </button>
          </div>

          {/* Action 2: Pipette Sample */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-300">2. Water Sample:</span>
              <span className={`font-bold ${samplePipetted ? 'text-emerald-400' : 'text-amber-400'}`}>
                {samplePipetted ? '25.00 mL in Flask' : 'Not Added'}
              </span>
            </div>
            <button
              onClick={handlePipetteSample}
              disabled={samplePipetted}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Beaker className="w-3.5 h-3.5 text-sky-400" />
              <span>Pipette 25 mL Sample</span>
            </button>
          </div>

          {/* Action 3: Add Buffer */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-300">3. Ammonia Buffer:</span>
              <span className={`font-bold ${hasBuffer ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasBuffer ? 'Added (pH 10)' : 'Missing'}
              </span>
            </div>
            <button
              onClick={handleAddBuffer}
              disabled={!samplePipetted || hasBuffer}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
              <span>Add 5 mL Buffer (pH 10)</span>
            </button>
          </div>

          {/* Action 4: Add Indicator */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-300">4. EBT Indicator:</span>
              <span className={`font-bold ${hasIndicator ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasIndicator ? 'Wine-Red Formed' : 'Missing'}
              </span>
            </div>
            <button
              onClick={handleAddIndicator}
              disabled={!samplePipetted || hasIndicator}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[11px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Droplet className="w-3.5 h-3.5 text-red-400" />
              <span>Add 3 Drops EBT</span>
            </button>
          </div>

          {/* Stopcock Control Valve Buttons */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="text-[10px] text-zinc-400 uppercase font-bold">Stopcock Valve Control</div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => handleToggleStopcock('closed')}
                className={`py-1.5 rounded-lg border font-bold text-[11px] transition-all ${
                  stopcockMode === 'closed' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
                }`}
              >
                ⏹ Closed (0.00 mL/s)
              </button>
              <button
                onClick={() => handleToggleStopcock('slow')}
                className={`py-1.5 rounded-lg border font-bold text-[11px] transition-all ${
                  stopcockMode === 'slow' ? 'bg-blue-500 text-white border-blue-400' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
                }`}
              >
                💧 Dropwise (0.05 mL/s)
              </button>
              <button
                onClick={() => handleToggleStopcock('fast')}
                className={`py-1.5 rounded-lg border font-bold text-[11px] transition-all ${
                  stopcockMode === 'fast' ? 'bg-blue-600 text-white border-blue-400' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
                }`}
              >
                ⚡ Fast Stream (0.50 mL/s)
              </button>
            </div>
          </div>
        </aside>

        {/* CENTER ZONE: HERO APPARATUS VISUALIZATION (~65% Width) */}
        <main className="flex-1 min-h-0 flex flex-col bg-black relative overflow-hidden items-center justify-center p-6 select-none">
          <div className="relative flex flex-col items-center">
            {/* Top Clamp Stand Beam */}
            <div className="w-48 h-3 bg-zinc-800 rounded-full mb-1 border border-white/20" />

            {/* Vertical Stand Rod */}
            <div className="absolute top-0 right-8 w-3 h-[380px] bg-zinc-800 border-x border-white/20 -z-10" />

            {/* Horizontal Clamp holding Burette */}
            <div className="w-32 h-4 bg-zinc-700 border border-white/30 rounded mb-1" />

            {/* Burette Glass Tube */}
            <div className="w-12 h-64 border-2 border-white/70 bg-white/5 rounded-t relative overflow-hidden flex flex-col justify-end">
              {/* EDTA Liquid Level */}
              <div
                className="w-full bg-blue-500/30 border-t-2 border-blue-400 transition-all duration-200"
                style={{ height: buretteFilled ? `${Math.max(0, 100 - (vEdtaAdded / 50.0) * 100)}%` : '0%' }}
              />

              {/* Graduations Marks */}
              <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-60 text-[8px] pointer-events-none select-none font-mono">
                <span>0.00 mL</span>
                <span>10.00 mL</span>
                <span>20.00 mL</span>
                <span>30.00 mL</span>
                <span>40.00 mL</span>
                <span>50.00 mL</span>
              </div>
            </div>

            {/* Interactive Stopcock Valve Handle */}
            <div
              onClick={() => handleToggleStopcock(stopcockMode === 'closed' ? 'slow' : stopcockMode === 'slow' ? 'fast' : 'closed')}
              className="w-16 h-8 bg-zinc-900 border-2 border-white/80 rounded-lg flex items-center justify-center my-1 cursor-pointer hover:border-white transition-all shadow-lg relative group"
              title="Click to toggle stopcock (Closed -> Dropwise -> Fast)"
            >
              <div
                className={`w-10 h-2 bg-white rounded transition-transform duration-300 ${
                  stopcockMode === 'closed' ? 'rotate-0' : stopcockMode === 'slow' ? 'rotate-45' : 'rotate-90'
                }`}
              />
              <span className="absolute -right-32 text-[10px] bg-zinc-900 border border-white/20 px-2 py-0.5 rounded font-mono text-zinc-300">
                {stopcockMode === 'closed' ? 'Closed' : stopcockMode === 'slow' ? 'Dropwise' : 'Fast Stream'}
              </span>
            </div>

            {/* Falling Droplets Animation */}
            <div className="h-16 w-3 relative flex justify-center items-start overflow-hidden">
              {droplets.map((d) => (
                <div
                  key={d.id}
                  className="w-2 h-3.5 rounded-full bg-blue-400 absolute shadow-sm"
                  style={{ top: `${d.y}%` }}
                />
              ))}
            </div>

            {/* Erlenmeyer Conical Flask */}
            <div className="w-44 h-48 relative flex flex-col items-center justify-end">
              {/* Flask Neck */}
              <div className="w-14 h-12 border-x-2 border-t-2 border-white/70 bg-white/5" />

              {/* Flask Body */}
              <div className="w-44 h-36 border-2 border-white/70 rounded-b-3xl relative overflow-hidden flex flex-col justify-end bg-white/5 p-1">
                {/* Solution Fill Level with Dynamic Reaction Color */}
                <div
                  className="w-full rounded-b-2xl transition-colors duration-500 flex items-center justify-center border-t border-white/40 relative"
                  style={{
                    height: samplePipetted ? `${Math.min(90, 45 + (vEdtaAdded / 25.0) * 20)}%` : '0%',
                    backgroundColor: chemicalState.colorHex,
                  }}
                >
                  {stopcockMode !== 'closed' && (
                    <div className="w-6 h-6 rounded-full bg-white/30 animate-ping" />
                  )}
                </div>
              </div>

              {/* Ceramic White Tile Base */}
              <div className="w-56 h-5 bg-zinc-900 border-2 border-white/50 rounded shadow-2xl mt-1 flex items-center justify-center">
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">White Tile Contrast Base</span>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT ZONE: LIVE MEASUREMENTS TELEMETRY (~18% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-l border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Live Telemetry
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">EDTA Titre Added V</div>
            <div className="font-bold text-white text-sm">{vEdtaAdded.toFixed(2)} mL</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Current Solution pH</div>
            <div className="font-bold text-emerald-400 text-sm">{chemicalState.pH.toFixed(1)}</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Indicator Observation</div>
            <div className="font-bold text-sky-400 text-[11px] truncate" title={chemicalState.colorLabel}>
              {chemicalState.colorLabel}
            </div>
          </div>

          {/* Calculated Hardness Card */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-1">
            <div className="text-[10px] text-blue-400 font-bold uppercase">Calculated Total Hardness</div>
            <div className="text-lg font-bold text-white">{chemicalState.calculatedHardnessPpm.toFixed(1)} ppm</div>
            <div className="text-[9px] text-zinc-400">(mg/L as CaCO3 equivalent)</div>
          </div>

          {/* Concordant Summary */}
          {trials.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-1 text-[10px]">
              <div className="font-bold text-white uppercase text-[9px]">Completed Trials ({trials.length})</div>
              {trials.slice(-3).map((t) => (
                <div key={t.trialNumber} className="flex justify-between text-zinc-300">
                  <span>Trial #{t.trialNumber}:</span>
                  <span className="font-bold">{t.titreMl.toFixed(2)} mL {t.isConcordant ? '(Concordant)' : ''}</span>
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
          {(['NONE', 'PROCEDURE', 'DATA', 'GRAPH', 'FORMULAS', 'AI_MENTOR', 'REPORT', 'ASSESSMENT'] as const).map((tab) => (
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
                <div className="font-bold text-white text-xs">Step-by-Step Procedure Checklist:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">1. Prepare Apparatus</div>
                    <div className="text-zinc-400">Fill burette with 0.01M EDTA. Pipette 25.00 mL hard water sample into conical flask.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">2. Buffer & Indicator</div>
                    <div className="text-zinc-400">Add 5.0 mL Ammonia buffer (pH 10) FIRST, then add 3 drops EBT until wine-red color forms.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">3. Titrate to Steel Blue</div>
                    <div className="text-zinc-400">Titrate with EDTA dropwise near endpoint until wine-red turns pure steel blue. Record titre V.</div>
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
                    <button onClick={handleRecordTrial} disabled={vEdtaAdded < 0.1} className="px-2.5 py-1 bg-blue-500 text-white rounded font-bold text-[10px]">
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
                    No trials recorded yet. Titrate to steel blue endpoint and click '+ Record Trial'.
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
                          <th className="p-1.5">Hardness (ppm)</th>
                          <th className="p-1.5">Observation Color</th>
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
                            <td className="p-1.5 text-sky-400 font-bold">{t.calculatedHardnessPpm.toFixed(1)}</td>
                            <td className="p-1.5 text-zinc-300">{t.colorLabel}</td>
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
                  <div className="font-bold text-white text-xs">Complexometric Titration Curve: Free [Mg²⁺] vs Volume EDTA</div>
                  <div className="text-emerald-400 text-[10px]">Sharp Drop in Free Metal Concentration at Equivalence Point V = 6.00 mL</div>
                  <div className="text-zinc-400 text-[10px]">Calculated Hardness = 240.0 ppm CaCO3</div>
                </div>

                <div className="w-80 h-28 bg-zinc-900 border border-white/15 rounded-xl p-3 flex flex-col justify-between text-[10px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Free [Mg²⁺] (mM)</span>
                    <span>V_eq = 6.00 mL</span>
                  </div>
                  <div className="h-16 w-full border-b border-l border-white/30 relative flex items-end px-2 pb-1">
                    <span className="text-[9px] text-blue-300 font-bold">Steel Blue Endpoint Inflection</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>0.0 mL</span>
                    <span>Volume EDTA Added (mL) ➔</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FORMULAS TAB */}
            {activeTab === 'FORMULAS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">EDTA Reaction</div>
                  <div className="text-xs font-bold text-white">Ca²⁺ + H₂Y²⁻ ➔ CaY²⁻ + 2H⁺</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Total Hardness Formula</div>
                  <div className="text-xs font-bold text-emerald-400">Hardness = (V_EDTA × M_EDTA × 100.08 × 1000) / V_sample</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Simplified Factor</div>
                  <div className="text-xs font-bold text-sky-400">Hardness (ppm) = V_EDTA × 40.032</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Indicator Equilibrium</div>
                  <div className="text-xs font-bold text-purple-400">Mg-EBT (Wine Red) + EDTA ➔ Mg-EDTA + EBT (Steel Blue)</div>
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
                    placeholder="Ask why ammonia buffer (pH 10) is mandatory or how steel blue endpoint forms..."
                    className="w-full bg-zinc-900 border border-white/20 rounded-xl pl-3 pr-8 py-1.5 text-[10px] text-white focus:outline-none"
                  />
                  <button type="submit" className="absolute right-2 top-2.5 text-zinc-400 hover:text-white">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* 6. REPORT TAB */}
            {activeTab === 'REPORT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs">Automated Chemistry Laboratory Report Draft</div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-white/15 space-y-1 leading-relaxed">
                  <div><strong>Experiment:</strong> Determination of Hardness of Water by EDTA Complexometric Titration</div>
                  <div><strong>Sample Volume:</strong> 25.00 mL Hard Water</div>
                  <div><strong>Standard Titrant:</strong> 0.010 M Disodium EDTA</div>
                  <div><strong>Buffer System:</strong> Ammonia-Ammonium Chloride (pH 10.0)</div>
                  <div><strong>Indicator:</strong> Eriochrome Black T (EBT)</div>
                  <div><strong>Average EDTA Titre:</strong> {vEdtaAdded.toFixed(2)} mL</div>
                  <div><strong>Calculated Total Hardness:</strong> {chemicalState.calculatedHardnessPpm.toFixed(1)} ppm as CaCO3</div>
                </div>
              </div>
            )}

            {/* 7. ASSESSMENT TAB */}
            {activeTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs font-mono font-bold">Assessment Checkpoints:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>1. Buffer Added Before Indicator</span>
                    <span className="font-bold">+35 pts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>2. Titrated to Steel Blue Endpoint</span>
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
