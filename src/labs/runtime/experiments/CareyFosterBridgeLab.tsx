import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Plus,
  Minus,
  Download,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  BookOpen,
  FileText,
  Award,
  Zap,
  ShieldAlert,
  Layers,
  Activity,
  Sliders,
  Check,
  BarChart2,
  MoreVertical,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Power,
  RefreshCw,
  Focus,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

import type { ExperimentConfig } from '../../types';
import type {
  CircuitState,
  NullPointMeasurement,
  ResistanceTrial,
  LabEvent,
  MisconceptionWarning,
} from '../../types/careyFosterTypes';

import { careyFosterBridgeConfig } from '../../chemistry/careyFosterBridge';
import { CareyFosterEngine, DEFAULT_CAREY_FOSTER_CONFIG } from '../../engines/CareyFosterEngine';
import { labSound } from '../../utils/LabSoundManager';

interface CareyFosterBridgeLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const CareyFosterBridgeLab: React.FC<CareyFosterBridgeLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. CORE LABORATORY STATE ──────────────────────────────────────
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);
  const [learningMode, setLearningMode] = useState<'guided' | 'practice' | 'challenge' | 'research'>('guided');

  const [circuitState, setCircuitState] = useState<CircuitState>(
    CareyFosterEngine.getInitialCircuitState()
  );

  const [tempL1Cm, setTempL1Cm] = useState<number | null>(null);
  const [trials, setTrials] = useState<ResistanceTrial[]>([]);

  // UI Drawers & Views
  const [leftDrawerOpen, setLeftDrawerOpen] = useState<boolean>(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(true);
  const [rightDrawerWidth, setRightDrawerWidth] = useState<number>(320); // Resizable drawer width (px)
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [highlightedComponentId, setHighlightedComponentId] = useState<string | null>(null);

  // Mouse Drag Resizing Listener for Right Drawer
  const handleMouseDownRightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRight) return;
      const newWidth = Math.max(220, Math.min(640, window.innerWidth - e.clientX));
      setRightDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
    };

    if (isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRight]);

  const [activeView, setActiveView] = useState<'APPARATUS' | 'CIRCUIT_DIAGRAM' | 'MEASUREMENT'>('APPARATUS');
  const [activeTab, setActiveTab] = useState<
    'PROCEDURE' | 'DATA' | 'GRAPH' | 'TELEMETRY' | 'TRIALS' | 'REPORT' | 'AI_MENTOR' | 'ASSESSMENT'
  >('PROCEDURE');

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);
  const [validationGateAlert, setValidationGateAlert] = useState<string | null>(null);

  // Telemetry & Event Log
  const [eventLog, setEventLog] = useState<LabEvent[]>([]);

  // AI Mentor State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to Experiment 08: Verification of Series & Parallel Laws by Carey Foster's Bridge Method! Select resistors, set combination mode (Series/Parallel), close plug key, and slide jockey to find null balance.",
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  const logEvent = useCallback((event: LabEvent) => {
    setEventLog((prev) => [...prev, event]);
  }, []);

  // Compute active theoretical resistance Y_theo
  const activeResistorsInCircuit = useMemo(() => {
    return circuitState.resistors.filter((r) => r.inCircuit);
  }, [circuitState.resistors]);

  const theoreticalResistanceOhm = useMemo(() => {
    const ohmsList = activeResistorsInCircuit.map((r) => r.ohms);
    return CareyFosterEngine.calculateTheoreticalResistance(circuitState.mode, ohmsList);
  }, [circuitState.mode, activeResistorsInCircuit]);

  // Keep circuitState.unknownResistanceOhm synced with theoretical Y
  useEffect(() => {
    setCircuitState((prev) => ({
      ...prev,
      unknownResistanceOhm: theoreticalResistanceOhm,
    }));
  }, [theoreticalResistanceOhm]);

  // Continuous Galvanometer Deflection
  const galvanometerDeflection = useMemo(() => {
    return CareyFosterEngine.calculateGalvanometerDeflection(circuitState, DEFAULT_CAREY_FOSTER_CONFIG);
  }, [circuitState]);

  const trueNullPositionCm = useMemo(() => {
    return CareyFosterEngine.calculateTrueNullPositionCm(circuitState, DEFAULT_CAREY_FOSTER_CONFIG);
  }, [circuitState]);

  const isAtNull = Math.abs(galvanometerDeflection) <= DEFAULT_CAREY_FOSTER_CONFIG.nullTolerance.maxDeflectionDivisionsToRecord;

  // Grounded Misconception Warnings
  const misconceptions: MisconceptionWarning[] = useMemo(() => {
    return CareyFosterEngine.detectMisconceptions(eventLog, circuitState, trials);
  }, [eventLog, circuitState, trials]);

  // Keyboard Arrow Key Jockey Movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleMoveJockey(-0.1);
      } else if (e.key === 'ArrowRight') {
        handleMoveJockey(0.1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync with parent runner
  useEffect(() => {
    onUpdateInput('mode', circuitState.mode);
    onUpdateInput('keyClosed', circuitState.keyClosed);
    onUpdateInput('reversed', circuitState.reversed);
    onUpdateInput('jockeyPositionCm', circuitState.jockeyPositionCm);
    onUpdateInput('galvanometerDeflection', galvanometerDeflection);
    onUpdateInput('standardPOhm', circuitState.standardResistanceOhm);
    onUpdateInput('trialsCount', trials.length);
  }, [circuitState, galvanometerDeflection, trials.length, onUpdateInput]);

  // ── 2. USER INTERACTION HANDLERS ─────────────────────────────────

  const handleToggleMode = (mode: 'series' | 'parallel') => {
    if (soundEnabled) labSound.playClick();
    setCircuitState((prev) => ({ ...prev, mode }));
    setTempL1Cm(null);
    setCurrentStepIndex(3);
    logEvent({ type: 'combination_selected', mode, t: Date.now() });
    onCompleteStep(2);
  };

  const handleToggleResistorInCircuit = (id: string) => {
    if (soundEnabled) labSound.playClick();
    setCircuitState((prev) => ({
      ...prev,
      resistors: prev.resistors.map((r) => (r.id === id ? { ...r, inCircuit: !r.inCircuit } : r)),
    }));
    setTempL1Cm(null);
  };

  const handleSetStandardP = (ohms: number) => {
    if (soundEnabled) labSound.playClick();
    setCircuitState((prev) => ({ ...prev, standardResistanceOhm: ohms }));
    setTempL1Cm(null);
    onCompleteStep(4);
  };

  const handleTogglePlugKey = () => {
    if (soundEnabled) labSound.playClick();
    const nextKey = !circuitState.keyClosed;
    setCircuitState((prev) => ({ ...prev, keyClosed: nextKey }));
    if (nextKey) {
      setCurrentStepIndex(6);
      logEvent({ type: 'key_closed', t: Date.now() });
      onCompleteStep(5);
    }
  };

  const handleToggleCommutator = () => {
    if (soundEnabled) labSound.playClick();
    const nextReversed = !circuitState.reversed;
    setCircuitState((prev) => ({ ...prev, reversed: nextReversed }));
    setCurrentStepIndex(9);
    logEvent({ type: 'commutator_reversed', t: Date.now() });
    onCompleteStep(8);
  };

  const handleMoveJockey = (deltaCm: number) => {
    if (soundEnabled) labSound.playStirring();
    setCircuitState((prev) => {
      const nextPos = Number((prev.jockeyPositionCm + deltaCm).toFixed(2));
      const bounded = Math.max(0.0, Math.min(100.0, nextPos));
      return { ...prev, jockeyPositionCm: bounded };
    });
    logEvent({ type: 'jockey_moved', positionCm: circuitState.jockeyPositionCm, t: Date.now() });
  };

  const handleRecordL1 = () => {
    if (!circuitState.keyClosed) {
      setValidationGateAlert('⚠ Plug key is OPEN. Close key to energize bridge circuit.');
      logEvent({ type: 'invalid_record_attempt', deflectionDivisions: galvanometerDeflection, t: Date.now() });
      return;
    }
    if (!isAtNull) {
      setValidationGateAlert('⚠ Measurement outside acceptable null region (|deflection| ≤ 0.5 divs). Fine-adjust jockey.');
      logEvent({ type: 'invalid_record_attempt', deflectionDivisions: galvanometerDeflection, t: Date.now() });
      return;
    }

    setValidationGateAlert(null);
    if (soundEnabled) labSound.playDataRecorded();
    setTempL1Cm(circuitState.jockeyPositionCm);
    setCurrentStepIndex(8);
    logEvent({
      type: 'null_point_recorded',
      measurement: {
        jockeyPositionCm: circuitState.jockeyPositionCm,
        galvanometerDeflectionDivisions: galvanometerDeflection,
        reversed: circuitState.reversed,
        t: Date.now(),
      },
      t: Date.now(),
    });
    onCompleteStep(6);
    onCompleteStep(7);
  };

  const handleRecordL2AndSaveTrial = () => {
    if (!circuitState.keyClosed || tempL1Cm === null) {
      setValidationGateAlert('⚠ Record initial null length l1 first before recording l2.');
      return;
    }
    if (!isAtNull) {
      setValidationGateAlert('⚠ Measurement outside acceptable null region (|deflection| ≤ 0.5 divs). Fine-adjust jockey.');
      return;
    }

    setValidationGateAlert(null);
    if (soundEnabled) labSound.playSuccess();

    const l1 = tempL1Cm;
    const l2 = circuitState.jockeyPositionCm;

    const { deltaLCm, experimentalResistanceOhm } = CareyFosterEngine.calculateExperimentalResistance(
      l1,
      l2,
      circuitState.standardResistanceOhm,
      DEFAULT_CAREY_FOSTER_CONFIG
    );

    const absError = Number(Math.abs(experimentalResistanceOhm - theoreticalResistanceOhm).toFixed(3));
    const pctError = theoreticalResistanceOhm > 0 ? Number(((absError / theoreticalResistanceOhm) * 100).toFixed(2)) : 0;

    const newTrial: ResistanceTrial = {
      trialNumber: trials.length + 1,
      combination: circuitState.mode,
      resistorIds: activeResistorsInCircuit.map((r) => r.id),
      l1Cm: l1,
      l2Cm: l2,
      deltaLCm,
      experimentalResistanceOhm,
      theoreticalResistanceOhm,
      absoluteErrorOhm: absError,
      percentageError: pctError,
    };

    setTrials((prev) => [...prev, newTrial]);
    setTempL1Cm(null);
    setCurrentStepIndex(11);

    logEvent({ type: 'trial_recorded', trial: newTrial, t: Date.now() });
    onCompleteStep(9);
    onCompleteStep(10);
    onCompleteStep(11);
    onCompleteStep(12);

    if (trials.length + 1 >= 2) {
      onCompleteStep(13);
      onCompleteStep(14);
      onCompleteStep(15);
      onCompleteStep(16);
      onCompleteStep(17);
    }
  };

  const handleDeleteTrial = (trialNumber: number) => {
    if (soundEnabled) labSound.playClick();
    setTrials((prev) => prev.filter((t) => t.trialNumber !== trialNumber));
  };

  const handleClearTrials = () => {
    if (soundEnabled) labSound.playReset();
    setTrials([]);
    setTempL1Cm(null);
  };

  const handleResetLab = () => {
    if (soundEnabled) labSound.playReset();
    setCircuitState(CareyFosterEngine.getInitialCircuitState());
    setTempL1Cm(null);
    setTrials([]);
    setCurrentStepIndex(1);
    setValidationGateAlert(null);
    setEventLog([]);
  };

  const handleAskAIMentor = (promptText?: string) => {
    const textToSend = promptText || aiInputText;
    if (!textToSend.trim()) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    if (!promptText) setAiInputText('');

    setTimeout(() => {
      let reply = '';
      const q = textToSend.toLowerCase();

      if (q.includes('zero') || q.includes('balance')) {
        reply = 'The galvanometer shows zero deflection when bridge potential difference V_B - V_D = 0. At this exact null point, no current flows through the galvanometer branch.';
      } else if (q.includes('reverse') || q.includes('commutator')) {
        reply = 'We reverse resistance arms P and Y using the commutator to eliminate copper strip resistance and end-wire contact errors. By taking Δl = l2 - l1, end resistances cancel out!';
      } else if (q.includes('equal')) {
        reply = 'Resistances P and Y should be nearly equal so the balance point l1 lies near the center of the 100 cm bridge wire (40-60 cm), maximizing measurement sensitivity.';
      } else if (q.includes('series')) {
        reply = `For series combination, resistances add directly: Rs = R1 + R2. Your active resistors give theoretical Rs = ${theoreticalResistanceOhm} Ω.`;
      } else if (q.includes('parallel')) {
        reply = `For parallel combination, reciprocals add: 1/Rp = 1/R1 + 1/R2. Your active resistors give theoretical Rp = ${theoreticalResistanceOhm} Ω.`;
      } else {
        reply = `Live Bridge Status: Mode = ${circuitState.mode.toUpperCase()}, Standard P = ${circuitState.standardResistanceOhm} Ω, Jockey = ${circuitState.jockeyPositionCm} cm, Galvanometer Deflection = ${galvanometerDeflection} divs.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  const handleExportCSV = () => {
    const rows = [
      [
        'Trial',
        'Combination',
        'Standard P (Ω)',
        'l1 (cm)',
        'l2 (cm)',
        'Δl (cm)',
        'Experimental R (Ω)',
        'Theoretical R (Ω)',
        'Absolute Error (Ω)',
        '% Error',
      ],
    ];
    trials.forEach((t) => {
      rows.push([
        String(t.trialNumber),
        t.combination,
        String(circuitState.standardResistanceOhm),
        String(t.l1Cm),
        String(t.l2Cm),
        String(t.deltaLCm),
        String(t.experimentalResistanceOhm),
        String(t.theoreticalResistanceOhm),
        String(t.absoluteErrorOhm),
        String(t.percentageError),
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `carey_foster_trials.csv`;
    link.click();
  };

  // Deflection Curve Data Points (Deflection vs Jockey Position)
  const deflectionCurvePoints = useMemo(() => {
    const pts = [];
    for (let x = 0; x <= 100; x += 5) {
      const tempState = { ...circuitState, jockeyPositionCm: x, keyClosed: true };
      const def = CareyFosterEngine.calculateGalvanometerDeflection(tempState, DEFAULT_CAREY_FOSTER_CONFIG);
      pts.push({ x, def });
    }
    return pts;
  }, [circuitState]);

  // Tab Content Renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'PROCEDURE':
        return (
          <div className="space-y-2.5 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <h3 className="font-bold text-xs text-cyan-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" /> STEP {currentStepIndex} / 17
              </h3>
              <span className="text-[10px] text-zinc-400">Progressive Mode</span>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-cyan-500/40 space-y-1.5">
              <div className="font-bold text-cyan-300 text-xs">
                Step {currentStepIndex}: {careyFosterBridgeConfig.procedure[currentStepIndex - 1]?.instruction}
              </div>
              <div className="text-[10px] text-emerald-400 pt-1 border-t border-white/5">
                Expected: {careyFosterBridgeConfig.procedure[currentStepIndex - 1]?.expectedAction}
              </div>
            </div>
          </div>
        );

      case 'DATA':
        return (
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 shrink-0" /> Observation Table
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearTrials}
                  className="px-2 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg text-[11px] font-bold"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-500/30 rounded-lg flex items-center gap-1 text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl overflow-x-auto max-w-full bg-zinc-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-800 text-zinc-300 border-b border-white/10 text-[10px]">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Mode</th>
                    <th className="p-2">l1 (cm)</th>
                    <th className="p-2">l2 (cm)</th>
                    <th className="p-2">Δl (cm)</th>
                    <th className="p-2">R_exp (Ω)</th>
                    <th className="p-2">R_theo (Ω)</th>
                    <th className="p-2">% Error</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[10px]">
                  {trials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-zinc-500">
                        No trials recorded yet. Slide jockey to null position and click Record.
                      </td>
                    </tr>
                  ) : (
                    trials.map((t) => (
                      <tr key={t.trialNumber} className="hover:bg-white/5">
                        <td className="p-2 text-cyan-300 font-bold">#{t.trialNumber}</td>
                        <td className="p-2 text-amber-300 uppercase">{t.combination}</td>
                        <td className="p-2 text-zinc-300">{t.l1Cm}</td>
                        <td className="p-2 text-zinc-300">{t.l2Cm}</td>
                        <td className="p-2 text-white">{t.deltaLCm}</td>
                        <td className="p-2 text-emerald-400 font-bold">{t.experimentalResistanceOhm}</td>
                        <td className="p-2 text-cyan-200">{t.theoreticalResistanceOhm}</td>
                        <td className="p-2 text-red-300">{t.percentageError}%</td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteTrial(t.trialNumber)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'GRAPH':
        return (
          <div className="space-y-3 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Activity className="w-4 h-4 shrink-0" /> Real-Time Bridge Graphs
            </h3>

            {/* Zero Crossing Deflection Curve */}
            <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-2">
              <div className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                <span>GALVANOMETER DEFLECTION VS JOCKEY POSITION</span>
                <span className="text-cyan-300">True Null l0 = {trueNullPositionCm.toFixed(1)} cm</span>
              </div>

              <div className="w-full h-40 bg-black/60 rounded-xl border border-white/10 relative p-2 flex items-center justify-center">
                <svg viewBox="0 0 300 150" className="w-full h-full">
                  {/* Zero Center Line */}
                  <line x1="30" y1="75" x2="280" y2="75" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="30" y1="20" x2="30" y2="130" stroke="#3f3f46" strokeWidth="1" />

                  {/* Deflection Curve */}
                  <path
                    d={deflectionCurvePoints
                      .map((pt, idx) => {
                        const cx = 30 + (pt.x / 100) * 250;
                        const cy = 75 - (pt.def / 30) * 50;
                        return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                  />

                  {/* Current Jockey Position Pointer */}
                  <circle
                    cx={30 + (circuitState.jockeyPositionCm / 100) * 250}
                    cy={75 - (galvanometerDeflection / 30) * 50}
                    r="4"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
          </div>
        );

      case 'TRIALS':
        return (
          <div className="space-y-3 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-amber-400 flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0" /> Multiple Experimental Trial Runs
            </h3>

            <div className="space-y-2">
              {trials.length === 0 ? (
                <div className="bg-zinc-950 p-4 text-center text-zinc-500 rounded-xl border border-white/10 text-xs">
                  No trial runs saved yet.
                </div>
              ) : (
                trials.map((t) => (
                  <div key={t.trialNumber} className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-1 text-xs">
                    <div className="font-bold text-cyan-300 flex items-center justify-between">
                      <span>Trial #{t.trialNumber} ({t.combination.toUpperCase()})</span>
                      <span className="text-emerald-400 font-bold">R_exp = {t.experimentalResistanceOhm} Ω</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      l1: {t.l1Cm} cm | l2: {t.l2Cm} cm | Δl: {t.deltaLCm} cm | R_theo: {t.theoreticalResistanceOhm} Ω | Error: {t.percentageError}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'REPORT':
        return (
          <div className="space-y-3 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0" /> Automated Laboratory Report
            </h3>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-2 text-[11px] leading-relaxed font-mono">
              <div className="font-bold text-white text-xs border-b border-white/10 pb-1">
                LAB REPORT: EXPERIMENT 08 (CAREY FOSTER BRIDGE)
              </div>
              <div><span className="text-zinc-400">Aim:</span> Verify series and parallel combination laws of resistance using Carey Foster’s bridge.</div>
              <div><span className="text-zinc-400">Current Mode:</span> {circuitState.mode.toUpperCase()}</div>
              <div><span className="text-zinc-400">Active Standard P:</span> {circuitState.standardResistanceOhm} Ω</div>
              <div><span className="text-zinc-400">Theoretical Combined Resistance:</span> {theoreticalResistanceOhm} Ω</div>
              <div><span className="text-zinc-400">Recorded Trials Count:</span> {trials.length}</div>
              <div className="pt-2 border-t border-white/10 text-emerald-400 font-bold">
                Conclusion: Combination laws verified via Carey Foster relation Y = P + r(l2 - l1).
              </div>
            </div>
          </div>
        );

      case 'AI_MENTOR':
        return (
          <div className="h-full flex flex-col space-y-2.5 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" /> AI Physics Mentor
            </h3>

            <div className="flex flex-wrap gap-1">
              {['Why zero deflection at balance?', 'Why reverse resistances?', 'Why resistors nearly equal?', 'Explain series formula', 'Explain parallel formula'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAskAIMentor(chip)}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded text-[10px] border border-cyan-500/30 whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-[160px] bg-zinc-950 p-2.5 rounded-xl border border-white/10 overflow-y-auto space-y-2">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl text-xs ${
                    m.sender === 'user'
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 ml-4'
                      : 'bg-zinc-800 text-zinc-200 border border-white/10 mr-4'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAIMentor()}
                placeholder="Ask AI Physics Mentor..."
                className="flex-1 bg-zinc-950 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => handleAskAIMentor()}
                className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'ASSESSMENT':
        return (
          <div className="space-y-3 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Award className="w-4 h-4 shrink-0" /> Conceptual Assessment (13 Questions)
            </h3>

            <div className="space-y-2.5">
              {[
                { id: 1, q: '1. What formula gives experimental resistance Y in Carey Foster’s bridge?', opts: ['Y = P + r*(l2 - l1)', 'Y = P * (l1/l2)', 'Y = r * (l1 + l2)'] },
                { id: 2, q: '2. Why is commutator reversal necessary in Carey Foster’s bridge?', opts: ['To change battery voltage', 'To eliminate copper strip and end-contact resistance errors', 'To protect galvanometer'] },
                { id: 3, q: '3. What is the theoretical equivalent of two resistors R1=2.0 Ω and R2=3.0 Ω in series?', opts: ['5.0 Ω', '1.2 Ω', '6.0 Ω'] },
                { id: 4, q: '4. What is the theoretical equivalent of two resistors R1=2.0 Ω and R2=3.0 Ω in parallel?', opts: ['1.2 Ω', '5.0 Ω', '2.5 Ω'] },
              ].map((item) => (
                <div key={item.id} className="bg-zinc-950 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-xs">
                  <div className="font-bold text-white">{item.q}</div>
                  <div className="space-y-1">
                    {item.opts.map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-zinc-300 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name={`cq_${item.id}`}
                          checked={userAnswers[item.id] === oIdx}
                          onChange={() => setUserAnswers((prev) => ({ ...prev, [item.id]: oIdx }))}
                          className="accent-cyan-400"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 text-white font-sans overflow-hidden select-none">
      {/* ── TOP CONTROL HEADER ────────────────────────────────────── */}
      <header className="h-12 sm:h-14 bg-zinc-900/90 border-b border-white/10 px-3 sm:px-4 flex items-center justify-between z-20 shrink-0 font-mono text-xs max-w-full overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <h1 className="font-bold text-white tracking-wide text-xs sm:text-sm truncate">
            EXP 08: CAREY FOSTER’S BRIDGE (SERIES & PARALLEL LAWS)
          </h1>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase hidden md:inline shrink-0">
            Electrical Bridge Engine
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 transition-all"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          <button
            type="button"
            onClick={handleResetLab}
            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-all active:scale-95 flex items-center gap-1 font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* ── RESPONSIVE MAIN WORKSPACE ───────────────────────────────── */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden flex flex-col md:flex-row">
        
        {/* COLLAPSIBLE LEFT APPARATUS DRAWER */}
        <div
          className={`bg-zinc-900/90 border-r border-white/10 font-mono text-xs transition-all duration-300 flex flex-col shrink-0 ${
            leftDrawerOpen ? 'w-full md:w-56 p-3' : 'w-full md:w-10 p-2 items-center'
          }`}
        >
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-2 mb-2">
            {leftDrawerOpen && <span className="font-bold text-cyan-400 text-xs">APPARATUS SHELF</span>}
            <button
              type="button"
              onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              {leftDrawerOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {leftDrawerOpen && (
            <div className="space-y-2 overflow-y-auto flex-1 text-[11px]">
              {careyFosterBridgeConfig.apparatus.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setHighlightedComponentId(item.id)}
                  className={`p-2 rounded-xl border cursor-pointer transition-all ${
                    highlightedComponentId === item.id ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-zinc-950 border-white/10 text-zinc-300 hover:border-white/30'
                  }`}
                >
                  <div className="font-bold text-white text-[11px]">{item.name}</div>
                  <div className="text-[9px] text-zinc-400 mt-0.5">{item.specs}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER PRIMARY OPTICAL / BRIDGE HERO WORKSPACE */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-2.5 sm:p-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col justify-between space-y-3 sm:space-y-4">
          
          {/* Validation Gate Alert Notice */}
          {validationGateAlert && (
            <div className="w-full max-w-6xl mx-auto bg-amber-500/20 border border-amber-500/50 rounded-2xl p-2.5 text-amber-200 text-xs font-mono flex items-center justify-between">
              <span>{validationGateAlert}</span>
              <button type="button" onClick={() => setValidationGateAlert(null)} className="text-amber-400 font-bold">✕</button>
            </div>
          )}

          {/* Misconception Warnings Banner */}
          {misconceptions.length > 0 && (
            <div className="w-full max-w-6xl mx-auto space-y-1.5">
              {misconceptions.map((m) => (
                <div key={m.id} className="bg-red-500/10 border border-red-500/40 rounded-xl p-2.5 text-red-200 text-xs font-mono space-y-0.5">
                  <div className="font-bold text-red-400">{m.title}</div>
                  <div className="text-[11px]">{m.message}</div>
                </div>
              ))}
            </div>
          )}

          {/* BRIDGE VIEW MODE TOGGLE BAR */}
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between bg-zinc-900/80 border border-white/10 rounded-2xl p-2 font-mono text-xs shrink-0">
            <div className="flex items-center gap-1">
              {(['APPARATUS', 'CIRCUIT_DIAGRAM', 'MEASUREMENT'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveView(mode)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all text-[11px] ${
                    activeView === mode ? 'bg-cyan-500 text-black shadow' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-400">Combination Mode:</span>
              <button
                type="button"
                onClick={() => handleToggleMode(circuitState.mode === 'series' ? 'parallel' : 'series')}
                className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-bold uppercase"
              >
                {circuitState.mode} (Y = {theoreticalResistanceOhm} Ω)
              </button>
            </div>
          </div>

          {/* MAIN HERO VIEWPORT (CAREY FOSTER BRIDGE & GALVANOMETER) */}
          <div className="w-full max-w-6xl mx-auto flex-1 min-h-[280px] sm:min-h-[340px] bg-black/80 rounded-3xl border-2 border-cyan-500/40 p-4 relative overflow-hidden shadow-2xl flex flex-col items-center justify-around my-auto font-mono text-xs">
            
            {activeView === 'APPARATUS' && (
              <div className="w-full flex flex-col items-center space-y-4">
                
                {/* TOP INSTRUMENTation ROW (Galvanometer Pointer + Commutator + Plug Key) */}
                <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  
                  {/* ANALOG GALVANOMETER VIEWPORT */}
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-3 flex flex-col items-center shadow-lg">
                    <div className="text-[10px] text-zinc-400 font-bold mb-1">GALVANOMETER</div>
                    <div className="relative w-36 h-20 bg-black rounded-t-full border border-white/20 flex items-center justify-center overflow-hidden">
                      {/* Scale Arch */}
                      <svg viewBox="0 0 100 50" className="w-full h-full">
                        <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="#52525b" strokeWidth="2" />
                        <line x1="50" y1="45" x2="50" y2="40" stroke="#ef4444" strokeWidth="1.5" />
                      </svg>
                      {/* Deflection Needle */}
                      <div
                        className="absolute bottom-1 w-0.5 h-14 bg-cyan-400 origin-bottom transition-transform duration-100"
                        style={{ transform: `rotate(${galvanometerDeflection * 2.5}deg)` }}
                      />
                    </div>
                    <div className="text-[11px] font-bold mt-1">
                      {isAtNull ? (
                        <span className="text-emerald-400">BALANCED (0.0) ✓</span>
                      ) : galvanometerDeflection < 0 ? (
                        <span className="text-amber-400">LEFT ({galvanometerDeflection} div)</span>
                      ) : (
                        <span className="text-amber-400">RIGHT (+{galvanometerDeflection} div)</span>
                      )}
                    </div>
                  </div>

                  {/* COMMUTATOR SWITCH */}
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-3 flex flex-col items-center shadow-lg space-y-1">
                    <div className="text-[10px] text-zinc-400 font-bold">COMMUTATOR</div>
                    <button
                      type="button"
                      onClick={handleToggleCommutator}
                      className={`w-full py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                        circuitState.reversed ? 'bg-amber-500/20 text-amber-300 border-amber-400' : 'bg-zinc-800 text-cyan-300 border-white/10'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{circuitState.reversed ? 'REVERSED (Y left, P right)' : 'DIRECT (P left, Y right)'}</span>
                    </button>
                  </div>

                  {/* BATTERY PLUG KEY */}
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-3 flex flex-col items-center shadow-lg space-y-1">
                    <div className="text-[10px] text-zinc-400 font-bold">BATTERY PLUG KEY</div>
                    <button
                      type="button"
                      onClick={handleTogglePlugKey}
                      className={`w-full py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                        circuitState.keyClosed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-red-500/20 text-red-300 border-red-400'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{circuitState.keyClosed ? 'KEY CLOSED (ENERGIZED)' : 'KEY OPEN (DISCONNECTED)'}</span>
                    </button>
                  </div>
                </div>

                {/* CAREY FOSTER METER BRIDGE RAIL HERO */}
                <div className="w-full max-w-4xl bg-zinc-950 border-2 border-cyan-500/40 rounded-2xl p-4 space-y-3 relative shadow-2xl">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                    <span>CAREY FOSTER 100 CM RESISTANCE WIRE RAIL</span>
                    <span>JOCKEY POSITION: <strong className="text-cyan-300 text-xs">{circuitState.jockeyPositionCm.toFixed(2)} cm</strong></span>
                  </div>

                  {/* 100 cm Wire Track with Sliding Jockey Pointer */}
                  <div className="relative w-full h-8 bg-zinc-900 border border-white/20 rounded-xl flex items-center px-2">
                    <div className="w-full h-1 bg-amber-400 rounded relative">
                      {/* Slotted Scale Tick Marks */}
                      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((mark) => (
                        <div
                          key={mark}
                          className="absolute top-0 w-0.5 h-3 bg-white/40 -translate-y-1"
                          style={{ left: `${mark}%` }}
                        />
                      ))}
                    </div>

                    {/* Sliding Knife-Edge Jockey Cursor */}
                    <div
                      className="absolute top-0 -translate-y-2 w-4 h-12 bg-cyan-400 border-2 border-white rounded shadow-lg flex items-center justify-center cursor-pointer transition-all"
                      style={{ left: `calc(${circuitState.jockeyPositionCm}% - 8px)` }}
                    >
                      <div className="w-0.5 h-6 bg-black" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'CIRCUIT_DIAGRAM' && (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-3">
                <div className="text-cyan-400 font-bold text-xs uppercase">SCHEMATIC BRIDGE CIRCUIT DIAGRAM</div>
                <div className="w-full max-w-md h-52 bg-zinc-950 rounded-2xl border border-white/10 p-4 flex flex-col items-center justify-center text-[10px] space-y-2">
                  <div className="text-zinc-400">Bridge Arms: P (Standard) | Q (Wire l) | R (Wire 100-l) | S (Unknown Y)</div>
                  <div className="p-3 bg-zinc-900 rounded-xl border border-white/10 text-center font-bold text-cyan-300">
                    Carey Foster Formula: Y = P + r * (l2 - l1)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LOWER WORKSPACE CONTROLS & JOCKEY TRAVERSE BAR */}
          <div className="w-full max-w-6xl mx-auto bg-zinc-900/90 border-2 border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 font-mono text-xs space-y-3 min-w-0 shrink-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Focus className="w-5 h-5 text-cyan-400 shrink-0" />
                <span className="font-bold text-sm text-white">JOCKEY TRAVERSE & RECORDING CONTROLS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Standard P:</span>
                <select
                  value={circuitState.standardResistanceOhm}
                  onChange={(e) => handleSetStandardP(Number(e.target.value))}
                  className="bg-zinc-950 border border-white/15 rounded-lg px-2 py-0.5 text-xs text-cyan-300 font-bold"
                >
                  {DEFAULT_CAREY_FOSTER_CONFIG.resistanceBoxSteps.map((step) => (
                    <option key={step} value={step}>P = {step} Ω</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              
              {/* Resistor Selection Chips */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-zinc-400 font-bold">SELECT RESISTORS IN UNKNOWN ARM Y:</div>
                <div className="flex flex-wrap gap-1">
                  {circuitState.resistors.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleToggleResistorInCircuit(r.id)}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${
                        r.inCircuit ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400' : 'bg-zinc-800 text-zinc-500 border-white/10'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jockey Traverse Controls (Use Arrow Keys) */}
              <div className="bg-black/60 border border-white/10 rounded-xl p-3 space-y-2 text-center">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">
                  SLIDE JOCKEY ALONG WIRE (Use Arrow Keys ← →)
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveJockey(-1.0)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg font-bold text-xs border border-white/10"
                  >
                    -1cm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveJockey(-0.1)}
                    className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg font-bold text-xs border border-white/10"
                  >
                    -0.1cm
                  </button>
                  <span className="font-bold text-cyan-300 text-sm px-2 min-w-[70px]">
                    {circuitState.jockeyPositionCm.toFixed(2)} cm
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMoveJockey(0.1)}
                    className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg font-bold text-xs border border-white/10"
                  >
                    +0.1cm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveJockey(1.0)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg font-bold text-xs border border-white/10"
                  >
                    +1cm
                  </button>
                </div>
              </div>

              {/* Null Recording Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleRecordL1}
                  className={`w-full py-2 rounded-xl border text-xs font-bold transition-all ${
                    tempL1Cm !== null
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                      : isAtNull
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-md cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}
                >
                  {tempL1Cm !== null ? `Initial Null (l1 = ${tempL1Cm.toFixed(2)} cm) ✓` : '1. Record Initial Null (l1)'}
                </button>

                <button
                  type="button"
                  onClick={handleRecordL2AndSaveTrial}
                  disabled={tempL1Cm === null}
                  className={`w-full py-2 rounded-xl border text-xs font-bold transition-all ${
                    tempL1Cm !== null && isAtNull
                      ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400 shadow-lg cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  2. Record Reversed Null (l2) & Save Trial
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLLAPSIBLE & DRAGGABLE RIGHT TELEMETRY DRAWER */}
        <div
          className={`bg-zinc-900/90 border-l border-white/10 font-mono text-xs flex flex-col shrink-0 relative ${
            isResizingRight ? 'select-none' : 'transition-all duration-200'
          } ${rightDrawerOpen ? 'p-3' : 'w-full md:w-10 p-2 items-center'}`}
          style={{
            width: rightDrawerOpen ? (window.innerWidth >= 768 ? `${rightDrawerWidth}px` : '100%') : undefined,
          }}
        >
          {/* Drag Handle for Resizing TELEMETRY & TABS Drawer */}
          {rightDrawerOpen && (
            <div
              onMouseDown={handleMouseDownRightResize}
              className="hidden md:flex absolute top-0 bottom-0 -left-2 w-4 cursor-col-resize hover:bg-cyan-500/30 active:bg-cyan-500/50 transition-colors z-30 items-center justify-center group"
              title="Drag to resize Telemetry & Tabs drawer"
            >
              <div className="w-1 h-12 bg-zinc-600 group-hover:bg-cyan-400 rounded-full transition-colors shadow" />
            </div>
          )}

          <div className="flex items-center justify-between w-full border-b border-white/10 pb-2 mb-2">
            <button
              type="button"
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              {rightDrawerOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {rightDrawerOpen && <span className="font-bold text-cyan-400 text-xs">TELEMETRY & TABS</span>}
          </div>

          {rightDrawerOpen && (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-none bg-black/70 p-1 rounded-lg border border-white/10 gap-1 text-[10px]">
                {(
                  [
                    'PROCEDURE',
                    'DATA',
                    'GRAPH',
                    'TRIALS',
                    'REPORT',
                    'AI_MENTOR',
                    'ASSESSMENT',
                  ] as const
                ).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      activeTab === t ? 'bg-cyan-500 text-black shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
                {renderTabContent()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
