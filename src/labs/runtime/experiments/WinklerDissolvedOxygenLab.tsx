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
  Waves,
  ShieldAlert,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import type { WinklerExperimentConfig } from '../../chemistry/winklerDissolvedOxygen';
import { winklerDissolvedOxygenConfig } from '../../chemistry/winklerDissolvedOxygen';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { labSound } from '../../utils/LabSoundManager';

interface WinklerDissolvedOxygenLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export interface WinklerTrialResult {
  trialNumber: number;
  initialReadingMl: number;
  finalReadingMl: number;
  titreMl: number;
  calculatedDoMgL: number;
  colorObservation: string;
  isConcordant: boolean;
  timestamp: string;
}

export const WinklerDissolvedOxygenLab: React.FC<WinklerDissolvedOxygenLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. APPARATUS & WORKFLOW STAGE STATE ───────────────────
  const [sampleCollected, setSampleCollected] = useState<boolean>(false);
  const [airBubblePresent, setAirBubblePresent] = useState<boolean>(false);
  const [mnso4Added, setMnso4Added] = useState<boolean>(false);
  const [alkIodideAdded, setAlkIodideAdded] = useState<boolean>(false);
  const [fixed, setFixed] = useState<boolean>(false);
  const [acidified, setAcidified] = useState<boolean>(false);
  const [aliquotTransferred, setAliquotTransferred] = useState<boolean>(false);
  const [buretteFilled, setBuretteFilled] = useState<boolean>(false);
  const [starchAdded, setStarchAdded] = useState<boolean>(false);
  const [starchAddedEarly, setStarchAddedEarly] = useState<boolean>(false);

  // ── 2. LIVE TITRATION FLOW STATE ────────────────────────
  const [stopcockMode, setStopcockMode] = useState<'closed' | 'slow' | 'fast'>('closed');
  const [vThioAdded, setVThioAdded] = useState<number>(Number(inputs.vThioAdded || 0.0));
  const [droplets, setDroplets] = useState<Array<{ id: number; y: number }>>([]);

  // ── 3. TRIAL LOGS & SYSTEM DATA ─────────────────────────
  const [trialNumber, setTrialNumber] = useState<number>(1);
  const [trials, setTrials] = useState<WinklerTrialResult[]>([]);
  const [activeTab, setActiveTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'FORMULAS' | 'AI_MENTOR' | 'ADVANCED_CHEMISTRY' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // AI Mentor Chat Messages
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to Experiment 02: Estimation of Dissolved Oxygen by Winkler's Method! Collect your water sample in the BOD bottle without trapping air bubbles, fix oxygen, acidify to liberate iodine, and titrate with sodium thiosulfate!",
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // ── 4. CHEMICAL STATE & STOICHIOMETRIC ENGINE ────────────
  const sampleAliquotMl = 200.0;
  const thioMolarity = 0.025;
  const groundTruthDoMgL = 7.50; // mg/L O2 ground truth

  // Theoretical Equivalence Volume V_eq = (7.50 * 200.0) / (0.025 * 8000.0) = 7.50 mL
  const vEquivalence = useMemo(() => {
    return (groundTruthDoMgL * sampleAliquotMl) / (thioMolarity * 8000.0); // 7.50 mL
  }, [groundTruthDoMgL, sampleAliquotMl, thioMolarity]);

  const iodineConsumedFraction = useMemo(() => {
    return Math.min(1.0, vThioAdded / vEquivalence);
  }, [vThioAdded, vEquivalence]);

  // Derived Chemical State & Color Rendering View
  const chemicalState = useMemo(() => {
    let label = 'Clear Water Sample';
    let hex = 'rgba(255, 255, 255, 0.15)';
    let isEndpoint = false;
    let isOvershoot = false;

    if (!sampleCollected) {
      label = 'Empty BOD Bottle';
      hex = 'rgba(255, 255, 255, 0.05)';
    } else if (!fixed) {
      if (mnso4Added || alkIodideAdded) {
        label = 'Cloudy White/Pinkish Precipitate (Unmixed)';
        hex = '#fecdd3';
      } else {
        label = 'Clear Water Sample (Unfixed)';
        hex = 'rgba(255, 255, 255, 0.15)';
      }
    } else if (!acidified) {
      label = 'Brownish-Yellow Flocculent Precipitate [MnO(OH)2]';
      hex = '#b45309';
    } else if (!aliquotTransferred) {
      label = 'Golden-Brown Acidified Iodine Solution (I2 Liberated)';
      hex = '#92400e';
    } else if (!starchAdded) {
      if (iodineConsumedFraction < 0.70) {
        label = 'Golden-Brown Iodine Solution (I2 Liberated)';
        hex = '#92400e';
      } else {
        label = 'Pale Straw Yellow (Near Starch Addition Point)';
        hex = '#fde047';
      }
    } else {
      // Starch Added
      if (iodineConsumedFraction < 0.98) {
        label = 'Intense Dark Blue (Iodine-Starch Complex)';
        hex = '#1e1b4b';
      } else if (iodineConsumedFraction <= 1.04) {
        label = 'Crystal Clear / Colourless (True Endpoint)';
        hex = 'rgba(255, 255, 255, 0.15)';
        isEndpoint = true;
      } else {
        label = 'Colourless Solution (Overshot Titration)';
        hex = 'rgba(255, 255, 255, 0.10)';
        isOvershoot = true;
      }
    }

    // DO calculation from thiosulfate volume: DO (mg/L) = V_thio * 1.00
    const calculatedDoMgL = (vThioAdded * thioMolarity * 8000.0) / sampleAliquotMl;

    return {
      iodineConsumedFraction,
      colorLabel: label,
      colorHex: hex,
      calculatedDoMgL: Number(calculatedDoMgL.toFixed(2)),
      isEndpoint,
      isOvershoot,
    };
  }, [sampleCollected, fixed, mnso4Added, alkIodideAdded, acidified, aliquotTransferred, starchAdded, iodineConsumedFraction, vThioAdded, thioMolarity, sampleAliquotMl]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('vThioAdded', vThioAdded);
    onUpdateInput('calculatedDoMgL', chemicalState.calculatedDoMgL);
    onUpdateInput('sampleCollected', sampleCollected);
    onUpdateInput('fixed', fixed);
    onUpdateInput('acidified', acidified);
    onUpdateInput('airBubblePresent', airBubblePresent);
  }, [vThioAdded, chemicalState.calculatedDoMgL, sampleCollected, fixed, acidified, airBubblePresent, onUpdateInput]);

  // ── 5. TITRATION DRIPPING TICK LOOP ───────────────────────
  useEffect(() => {
    if (stopcockMode === 'closed' || !buretteFilled || !aliquotTransferred) {
      setDroplets([]);
      return;
    }

    const intervalMs = stopcockMode === 'slow' ? 350 : 90;
    const dropIncrement = stopcockMode === 'slow' ? 0.05 : 0.25;

    const timer = setInterval(() => {
      setVThioAdded((prev) => {
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
  }, [stopcockMode, buretteFilled, aliquotTransferred, soundEnabled]);

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
    if (sampleCollected) onCompleteStep(1);
    if (mnso4Added && alkIodideAdded) onCompleteStep(2);
    if (fixed) onCompleteStep(3);
    if (acidified) onCompleteStep(4);
    if (aliquotTransferred) onCompleteStep(5);
    if (buretteFilled) onCompleteStep(6);
    if (starchAdded) onCompleteStep(7);
    if (chemicalState.isEndpoint) onCompleteStep(8);
  }, [sampleCollected, mnso4Added, alkIodideAdded, fixed, acidified, aliquotTransferred, buretteFilled, starchAdded, chemicalState.isEndpoint, onCompleteStep]);

  // ── 6. ACTIONS & HANDLERS ────────────────────────────────
  const handleCollectSample = () => {
    setSampleCollected(true);
    if (soundEnabled) labSound.playLensDrag();
  };

  const handleAddMnSO4 = () => {
    if (!sampleCollected) return;
    setMnso4Added(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleAddAlkIodide = () => {
    if (!sampleCollected) return;
    setAlkIodideAdded(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleStopperAndInvert = () => {
    if (!mnso4Added || !alkIodideAdded) return;
    setFixed(true);
    if (soundEnabled) labSound.playProcedureCompleted();
  };

  const handleAddH2SO4 = () => {
    if (!fixed) return;
    setAcidified(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleTransferAliquot = () => {
    if (!acidified) return;
    setAliquotTransferred(true);
    if (soundEnabled) labSound.playLensDrag();
  };

  const handleFillBurette = () => {
    setBuretteFilled(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleAddStarch = () => {
    if (!aliquotTransferred) return;
    if (iodineConsumedFraction < 0.5) {
      setStarchAddedEarly(true);
    }
    setStarchAdded(true);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleToggleStopcock = (mode: 'closed' | 'slow' | 'fast') => {
    if (!buretteFilled || !aliquotTransferred) return;
    setStopcockMode(mode);
  };

  const handleRecordTrial = () => {
    if (vThioAdded < 0.1) return;
    const calcDo = (vThioAdded * thioMolarity * 8000.0) / sampleAliquotMl;
    const isConcord = Math.abs(vThioAdded - vEquivalence) <= 0.10;

    const newTrial: WinklerTrialResult = {
      trialNumber: trials.length + 1,
      initialReadingMl: 0.00,
      finalReadingMl: Number(vThioAdded.toFixed(2)),
      titreMl: Number(vThioAdded.toFixed(2)),
      calculatedDoMgL: Number(calcDo.toFixed(2)),
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
    setVThioAdded(0.0);
    setAliquotTransferred(true);
    setBuretteFilled(true);
    setStarchAdded(false);
    setStarchAddedEarly(false);
    setTrialNumber((t) => t + 1);
    if (soundEnabled) labSound.playReset();
  };

  const handleExportCSV = () => {
    if (trials.length === 0) return;
    const headers = ['Trial', 'Initial_Reading_mL', 'Final_Reading_mL', 'Titre_Na2S2O3_mL', 'Dissolved_Oxygen_mg_L_O2', 'Observation_Color', 'Concordant'];
    const rows = trials.map((t) => [t.trialNumber, t.initialReadingMl, t.finalReadingMl, t.titreMl, t.calculatedDoMgL, t.colorObservation, t.isConcordant ? 'Yes' : 'No']);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Winkler_Dissolved_Oxygen_Data_${Date.now()}.csv`;
    link.click();
  };

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userQ = aiInputText;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAiInputText('');

    setTimeout(() => {
      let botReply = `With ${vThioAdded.toFixed(2)} mL Na2S2O3 added, calculated Dissolved Oxygen is ${chemicalState.calculatedDoMgL.toFixed(2)} mg/L O2. Current color observation: ${chemicalState.colorLabel}.`;

      if (userQ.toLowerCase().includes('bubble') || userQ.toLowerCase().includes('air')) {
        botReply = 'Avoiding trapped air bubbles in the BOD bottle is essential because oxygen from trapped air will dissolve into the water sample during mixing, leading to an artificially high DO measurement!';
      } else if (userQ.toLowerCase().includes('starch') || userQ.toLowerCase().includes('blue')) {
        botReply = 'Starch indicator forms an intense blue-black complex with free iodine (I2). Starch MUST be added near the endpoint (when golden brown turns pale straw yellow) because adding it early binds iodine too strongly, preventing quantitative titration!';
      } else if (userQ.toLowerCase().includes('formula') || userQ.toLowerCase().includes('calculation')) {
        botReply = 'DO (mg/L O2) = (V_thiosulfate × M_thiosulfate × 8000) / V_sample. For 200 mL aliquot and 0.025 M thiosulfate, DO (mg/L) = V_thiosulfate × 1.00!';
      } else if (userQ.toLowerCase().includes('acid') || userQ.toLowerCase().includes('precipitate')) {
        botReply = 'Manganous sulfate + alkaline iodide fixes O2 into brown MnO(OH)2 precipitate. H2SO4 acidifies the solution, dissolving the precipitate and liberating I2 in exact 1:2 stoichiometric ratio to original dissolved oxygen!';
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
          <span className="text-zinc-400 font-bold">Aliquot:</span>
          <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            200.0 mL Sample
          </span>

          <span className="text-zinc-400 font-bold">Titrant:</span>
          <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            0.025 M Na2S2O3
          </span>

          <span className="text-zinc-400 font-bold">Indicator:</span>
          <span className="font-bold text-amber-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            Starch (Near Endpoint)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-zinc-300">
            Trial: <span className="font-bold text-white">#{trialNumber}</span>
          </div>

          <button
            onClick={handleRecordTrial}
            disabled={vThioAdded < 0.1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Trial</span>
          </button>

          <button
            onClick={handleResetTrial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/15 transition-all active:scale-95"
            title="Reset for next titration trial"
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
        {airBubblePresent && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-1.5 text-[11px] font-mono text-amber-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>⚠️ AIR BUBBLE WARNING: Trapped air bubble detected in BOD bottle — atmospheric O2 may introduce positive measurement bias!</span>
          </motion.div>
        )}

        {chemicalState.isEndpoint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-1.5 text-[11px] font-mono text-emerald-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>✓ ENDPOINT REACHED — Dark blue starch complex turned crystal clear! Record your final burette reading now.</span>
          </motion.div>
        )}

        {chemicalState.isOvershoot && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border-b border-red-500/30 px-6 py-1.5 text-[11px] font-mono text-red-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>⚠️ OVERSHOOT ALERT: Passed colourless endpoint ({vEquivalence.toFixed(2)} mL). Record as overshot trial.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN 3-ZONE WORKSTATION LAYOUT ──────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT ZONE: WINKLER REAGENT ACTIONS (~20% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-r border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10 flex items-center justify-between">
            <span>Winkler Procedure</span>
          </div>

          {/* Action 1: Collect BOD Sample */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">1. BOD Sample:</span>
              <span className={`font-bold ${sampleCollected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {sampleCollected ? 'Collected 300mL' : 'Empty'}
              </span>
            </div>
            <button
              onClick={handleCollectSample}
              disabled={sampleCollected}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Waves className="w-3.5 h-3.5 text-sky-400" />
              <span>Fill BOD Bottle</span>
            </button>
            <label className="flex items-center gap-1.5 text-[9px] text-zinc-400 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={airBubblePresent}
                onChange={(e) => setAirBubblePresent(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>Simulate Trapped Air Bubble</span>
            </label>
          </div>

          {/* Action 2: Add MnSO4 */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">2. MnSO4 Reagent:</span>
              <span className={`font-bold ${mnso4Added ? 'text-emerald-400' : 'text-amber-400'}`}>
                {mnso4Added ? '2 mL Added' : 'Missing'}
              </span>
            </div>
            <button
              onClick={handleAddMnSO4}
              disabled={!sampleCollected || mnso4Added}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Droplet className="w-3.5 h-3.5 text-amber-400" />
              <span>Add 2.0 mL MnSO4</span>
            </button>
          </div>

          {/* Action 3: Add Alk-Iodide-Azide */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">3. Alk-Iodide-Azide:</span>
              <span className={`font-bold ${alkIodideAdded ? 'text-emerald-400' : 'text-amber-400'}`}>
                {alkIodideAdded ? '2 mL Added' : 'Missing'}
              </span>
            </div>
            <button
              onClick={handleAddAlkIodide}
              disabled={!sampleCollected || alkIodideAdded}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
              <span>Add 2.0 mL Alk-Iodide</span>
            </button>
          </div>

          {/* Action 4: Stopper & Invert */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">4. Oxygen Fixation:</span>
              <span className={`font-bold ${fixed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fixed ? 'O2 Fixed' : 'Unfixed'}
              </span>
            </div>
            <button
              onClick={handleStopperAndInvert}
              disabled={!mnso4Added || !alkIodideAdded || fixed}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stopper & Invert BOD Bottle</span>
            </button>
          </div>

          {/* Action 5: Acidify with H2SO4 */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">5. Conc. H2SO4:</span>
              <span className={`font-bold ${acidified ? 'text-emerald-400' : 'text-amber-400'}`}>
                {acidified ? 'I2 Liberated' : 'Unacidified'}
              </span>
            </div>
            <button
              onClick={handleAddH2SO4}
              disabled={!fixed || acidified}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Add 2.0 mL H2SO4 Acid</span>
            </button>
          </div>

          {/* Action 6: Transfer 200 mL Aliquot & Fill Burette */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">6. Titration Prep:</span>
              <span className={`font-bold ${aliquotTransferred && buretteFilled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {aliquotTransferred && buretteFilled ? 'Ready' : 'Pending'}
              </span>
            </div>
            <button
              onClick={handleTransferAliquot}
              disabled={!acidified || aliquotTransferred}
              className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded text-[9px] border border-white/10 transition-all"
            >
              Transfer 200 mL to Flask
            </button>
            <button
              onClick={handleFillBurette}
              disabled={buretteFilled}
              className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded text-[9px] border border-white/10 transition-all"
            >
              Fill Burette with 0.025M Na2S2O3
            </button>
          </div>

          {/* Action 7: Add Starch */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">7. Starch Indicator:</span>
              <span className={`font-bold ${starchAdded ? 'text-emerald-400' : 'text-amber-400'}`}>
                {starchAdded ? 'Dark Blue Complex' : 'Not Added'}
              </span>
            </div>
            <button
              onClick={handleAddStarch}
              disabled={!aliquotTransferred || starchAdded}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Droplet className="w-3.5 h-3.5 text-blue-500" />
              <span>Add Starch Indicator</span>
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
          {/* Left Hero Graphic: Glass BOD Bottle with Precipitate / Solution Color */}
          <div className="flex flex-col items-center relative">
            <div className="text-[10px] text-zinc-400 font-mono mb-2 font-bold uppercase">300 mL Glass BOD Bottle</div>
            <div className="w-32 h-44 border-2 border-white/70 bg-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-end p-1">
              {/* Water / Fixation Precipitate Fill */}
              <div
                className="w-full rounded-xl transition-all duration-500 flex flex-col items-center justify-end relative"
                style={{
                  height: sampleCollected ? '95%' : '0%',
                  backgroundColor: fixed && !acidified ? '#b45309' : 'rgba(255, 255, 255, 0.15)',
                }}
              >
                {/* Precipitate settling effect */}
                {fixed && !acidified && (
                  <div className="w-full h-1/2 bg-amber-800/80 rounded-b-xl border-t border-amber-600/40 animate-pulse flex items-center justify-center">
                    <span className="text-[8px] text-amber-200 font-mono font-bold">MnO(OH)₂ Precipitate</span>
                  </div>
                )}
                {acidified && !aliquotTransferred && (
                  <div className="w-full h-full bg-amber-700/90 rounded-xl flex items-center justify-center">
                    <span className="text-[8px] text-amber-100 font-mono font-bold">I₂ Liberated (Golden)</span>
                  </div>
                )}
              </div>

              {/* Trapped Air Bubble visual indicator */}
              {airBubblePresent && sampleCollected && (
                <div className="absolute top-2 right-4 w-4 h-4 rounded-full bg-white/80 border border-sky-300 animate-bounce" title="Trapped Air Bubble!" />
              )}
            </div>
            {/* Ground Glass Stopper */}
            <div className="w-12 h-6 bg-zinc-700 border-2 border-white/60 rounded-t-lg -mt-48 mb-42 z-10" />
          </div>

          {/* Right Hero Graphic: Titration Stand & Flask */}
          <div className="flex flex-col items-center relative">
            <div className="text-[10px] text-zinc-400 font-mono mb-2 font-bold uppercase">Titration Workstation</div>
            <div className="relative flex flex-col items-center">
              {/* Clamp Stand Top */}
              <div className="w-44 h-3 bg-zinc-800 rounded-full mb-1 border border-white/20" />
              <div className="absolute top-0 right-6 w-3 h-[360px] bg-zinc-800 border-x border-white/20 -z-10" />
              <div className="w-30 h-4 bg-zinc-700 border border-white/30 rounded mb-1" />

              {/* Burette Tube */}
              <div className="w-12 h-60 border-2 border-white/70 bg-white/5 rounded-t relative overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full bg-blue-500/30 border-t-2 border-blue-400 transition-all duration-200"
                  style={{ height: buretteFilled ? `${Math.max(0, 100 - (vThioAdded / 50.0) * 100)}%` : '0%' }}
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
                      height: aliquotTransferred ? `${Math.min(90, 45 + (vThioAdded / 25.0) * 20)}%` : '0%',
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
            <div className="text-[10px] text-zinc-400">Thiosulfate Added V</div>
            <div className="font-bold text-white text-sm">{vThioAdded.toFixed(2)} mL</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Color Observation</div>
            <div className="font-bold text-amber-400 text-[11px] truncate" title={chemicalState.colorLabel}>
              {chemicalState.colorLabel}
            </div>
          </div>

          {/* Calculated DO Card */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-1">
            <div className="text-[10px] text-blue-400 font-bold uppercase">Calculated Dissolved Oxygen</div>
            <div className="text-lg font-bold text-white">{chemicalState.calculatedDoMgL.toFixed(2)} mg/L</div>
            <div className="text-[9px] text-zinc-400">(mg/L O2 = V_thiosulfate × 1.00)</div>
          </div>

          {/* Concordant Summary */}
          {trials.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-1 text-[10px]">
              <div className="font-bold text-white uppercase text-[9px]">Completed Trials ({trials.length})</div>
              {trials.slice(-3).map((t) => (
                <div key={t.trialNumber} className="flex justify-between text-zinc-300">
                  <span>Trial #{t.trialNumber}:</span>
                  <span className="font-bold">{t.titreMl.toFixed(2)} mL ({t.calculatedDoMgL.toFixed(2)} mg/L)</span>
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
                <div className="font-bold text-white text-xs">Winkler Iodometric Procedure Checklist:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">1. Oxygen Fixation</div>
                    <div className="text-zinc-400">Fill BOD bottle without air bubbles. Add MnSO4 + Alk-Iodide-Azide and invert to form brown MnO(OH)2.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">2. Acidification</div>
                    <div className="text-zinc-400">Add conc. H2SO4 to dissolve precipitate and liberate golden I2. Transfer 200 mL aliquot to flask.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">3. Titration & Starch Endpoint</div>
                    <div className="text-zinc-400">Titrate I2 with Na2S2O3 to pale yellow. Add starch (turns dark blue). Titrate dropwise to colourless!</div>
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
                    <button onClick={handleRecordTrial} disabled={vThioAdded < 0.1} className="px-2.5 py-1 bg-blue-500 text-white rounded font-bold text-[10px]">
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
                    No trials recorded yet. Titrate to colourless endpoint and click '+ Record Trial'.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/20 text-zinc-400 uppercase font-mono">
                          <th className="p-1.5">Trial #</th>
                          <th className="p-1.5">Initial (mL)</th>
                          <th className="p-1.5">Final (mL)</th>
                          <th className="p-1.5">Thiosulfate V (mL)</th>
                          <th className="p-1.5">DO (mg/L O2)</th>
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
                            <td className="p-1.5 text-sky-400 font-bold">{t.calculatedDoMgL.toFixed(2)}</td>
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
                  <div className="font-bold text-white text-xs">Redox Titration Curve: Free Iodine [I₂] vs Volume Na₂S₂O₃</div>
                  <div className="text-emerald-400 text-[10px]">Starch-Iodine Complex Disappearance at Equivalence Point V = 7.50 mL</div>
                  <div className="text-zinc-400 text-[10px]">Calculated DO = 7.50 mg/L O₂</div>
                </div>

                <div className="w-80 h-28 bg-zinc-900 border border-white/15 rounded-xl p-3 flex flex-col justify-between text-[10px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Free [I₂] (mM)</span>
                    <span>V_eq = 7.50 mL</span>
                  </div>
                  <div className="h-16 w-full border-b border-l border-white/30 relative flex items-end px-2 pb-1">
                    <span className="text-[9px] text-blue-300 font-bold">Colourless Endpoint Drop</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>0.0 mL</span>
                    <span>Volume Na₂S₂O₃ Added (mL) ➔</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FORMULAS TAB */}
            {activeTab === 'FORMULAS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">1. Fixation Reaction</div>
                  <div className="text-xs font-bold text-white">2Mn(OH)₂ + O₂ ➔ 2MnO(OH)₂ ↓</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">2. Acidification</div>
                  <div className="text-xs font-bold text-amber-400">MnO(OH)₂ + 2I⁻ + 4H⁺ ➔ Mn²⁺ + I₂ + 3H₂O</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">3. Titration Stoichiometry</div>
                  <div className="text-xs font-bold text-emerald-400">I₂ + 2S₂O₃²⁻ ➔ 2I⁻ + S₄O₆²⁻</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">DO Formula</div>
                  <div className="text-xs font-bold text-sky-400">DO (mg/L) = (V_thio × M_thio × 8000) / V_sample</div>
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
                    placeholder="Ask why air bubbles must be avoided or why starch is added near endpoint..."
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
                  <div className="text-zinc-400 font-bold">Oxygen Fixed</div>
                  <div className="text-sm font-bold text-emerald-400">{fixed ? '✓ Quantitative' : 'Pending'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Acidification Status</div>
                  <div className="text-sm font-bold text-amber-400">{acidified ? '✓ I2 Liberated' : 'Pending'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Thiosulfate Added</div>
                  <div className="text-sm font-bold text-sky-400">{vThioAdded.toFixed(2)} mL</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Iodine Consumed Fraction</div>
                  <div className="text-sm font-bold text-purple-400">{(iodineConsumedFraction * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* 7. REPORT TAB */}
            {activeTab === 'REPORT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs">Automated Chemistry Laboratory Report Draft</div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-white/15 space-y-1 leading-relaxed">
                  <div><strong>Experiment:</strong> Estimation of Dissolved Oxygen by Winkler's Method</div>
                  <div><strong>Sample Aliquot Volume:</strong> 200.0 mL</div>
                  <div><strong>Standard Titrant:</strong> 0.025 M Sodium Thiosulfate (Na2S2O3)</div>
                  <div><strong>Fixation Reagents:</strong> MnSO4 + Alkaline Iodide-Azide</div>
                  <div><strong>Acidification:</strong> Concentrated H2SO4</div>
                  <div><strong>Indicator:</strong> Starch Solution (1% w/v)</div>
                  <div><strong>Average Thiosulfate Titre:</strong> {vThioAdded.toFixed(2)} mL</div>
                  <div><strong>Calculated Dissolved Oxygen:</strong> {chemicalState.calculatedDoMgL.toFixed(2)} mg/L O2</div>
                </div>
              </div>
            )}

            {/* 8. ASSESSMENT TAB */}
            {activeTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs font-mono font-bold">Assessment Checkpoints:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>1. Zero Trapped Air Bubbles in BOD Sample</span>
                    <span className="font-bold">+35 pts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>2. Starch Added Near Endpoint & Titrated to Colourless</span>
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
