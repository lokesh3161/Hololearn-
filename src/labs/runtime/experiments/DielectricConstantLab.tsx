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
  Play,
  Pause,
  Eye,
  Info,
} from 'lucide-react';

import type { ExperimentConfig } from '../../types';
import type {
  DielectricMaterial,
  CapacitorState,
  RCCircuitState,
  Reading,
  ExperimentalResult,
  LabEvent,
  MisconceptionWarning,
} from '../../types/dielectricExperimentTypes';

import { dielectricConstantConfig } from '../../chemistry/dielectricConstant';
import { DielectricRCEngine, DEFAULT_MATERIALS, DEFAULT_DIELECTRIC_CONFIG } from '../../engines/DielectricRCEngine';
import { labSound } from '../../utils/LabSoundManager';

interface DielectricConstantLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const DielectricConstantLab: React.FC<DielectricConstantLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. CORE LABORATORY STATE ──────────────────────────────────────
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);
  const [learningMode, setLearningMode] = useState<'guided' | 'practice' | 'challenge' | 'research'>('guided');

  // Capacitor geometry & material state
  const [capState, setCapState] = useState<CapacitorState>({
    areaM2: 0.02, // 200 cm²
    separationM: 0.002, // 2 mm
    dielectric: {
      materialId: 'air',
      insertionFraction: 0.0,
    },
    customPermittivity: 4.0,
  });

  // RC Circuit & Timer State
  const [circuitState, setCircuitState] = useState<RCCircuitState>({
    mode: 'idle',
    supplyVoltageV: 10.0,
    resistanceOhm: 50000, // 50 kΩ
    switchClosed: false,
    elapsedTimeSeconds: 0.0,
  });

  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [readings, setReadings] = useState<Reading[]>([]);

  // Toggles for field & polarization visuals
  const [showElectricField, setShowElectricField] = useState<boolean>(false);
  const [showPolarization, setShowPolarization] = useState<boolean>(false);

  // Drawers & Views
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

  const [activeView, setActiveView] = useState<'APPARATUS' | 'CIRCUIT_DIAGRAM' | 'ELECTRIC_FIELD' | 'POLARIZATION'>('APPARATUS');
  const [activeGraphTab, setActiveGraphTab] = useState<'V_vs_T' | 'I_vs_T' | 'LN_V_vs_T' | 'LN_V0_MINUS_V'>('V_vs_T');
  const [activeTab, setActiveTab] = useState<
    'PROCEDURE' | 'DATA' | 'GRAPH' | 'TELEMETRY' | 'COMPARISON' | 'REPORT' | 'AI_MENTOR' | 'ASSESSMENT'
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
      text: "👋 Welcome to Experiment 09: Determination of Dielectric Constant Using Charging & Discharging Method! Set plate geometry, charge the capacitor, record discharge V(t) data for Air, insert dielectric, and compare linear slope -1/(RC).",
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  const logEvent = useCallback((event: LabEvent) => {
    setEventLog((prev) => [...prev, event]);
  }, []);

  // Selected Material Definition
  const selectedMaterial = useMemo(() => {
    return DEFAULT_MATERIALS.find((m) => m.id === capState.dielectric.materialId) || DEFAULT_MATERIALS[0];
  }, [capState.dielectric.materialId]);

  // Derived Physics Metrics
  const effectiveEpsR = useMemo(() => {
    return DielectricRCEngine.calculateEffectiveEpsR(capState, DEFAULT_MATERIALS);
  }, [capState]);

  const geometricCapacitanceF = useMemo(() => {
    return DielectricRCEngine.calculateGeometricCapacitanceF(capState, DEFAULT_MATERIALS);
  }, [capState]);

  const timeConstantSeconds = useMemo(() => {
    return DielectricRCEngine.calculateTimeConstantSeconds(capState, circuitState.resistanceOhm, DEFAULT_MATERIALS);
  }, [capState, circuitState.resistanceOhm]);

  // Live Voltage & Current
  const liveRCData = useMemo(() => {
    return DielectricRCEngine.calculateRCVoltageAndCurrent(
      capState,
      circuitState,
      circuitState.elapsedTimeSeconds,
      DEFAULT_MATERIALS
    );
  }, [capState, circuitState]);

  // Linear Regression & Experimental Derivation
  const dischargeRegression = useMemo(() => {
    return DielectricRCEngine.calculateDischargeLinearRegression(
      readings,
      circuitState.resistanceOhm,
      circuitState.supplyVoltageV
    );
  }, [readings, circuitState.resistanceOhm, circuitState.supplyVoltageV]);

  // Air Baseline Capacitance
  const airBaselineCapacitanceF = useMemo(() => {
    const airCapState: CapacitorState = { ...capState, dielectric: { materialId: 'air', insertionFraction: 0.0 } };
    return DielectricRCEngine.calculateGeometricCapacitanceF(airCapState, DEFAULT_MATERIALS);
  }, [capState]);

  const experimentalEpsR = useMemo(() => {
    if (airBaselineCapacitanceF <= 0 || dischargeRegression.experimentalCapacitanceF <= 0) return 1.0;
    return Number((dischargeRegression.experimentalCapacitanceF / airBaselineCapacitanceF).toFixed(2));
  }, [dischargeRegression.experimentalCapacitanceF, airBaselineCapacitanceF]);

  const percentageError = useMemo(() => {
    const ref = selectedMaterial.isCustom && capState.customPermittivity ? capState.customPermittivity : selectedMaterial.relativePermittivity;
    if (ref <= 0) return 0;
    return Number((Math.abs((experimentalEpsR - ref) / ref) * 100).toFixed(2));
  }, [experimentalEpsR, selectedMaterial, capState.customPermittivity]);

  // Grounded Misconception Warnings
  const misconceptions: MisconceptionWarning[] = useMemo(() => {
    return DielectricRCEngine.detectMisconceptions(readings, eventLog, circuitState);
  }, [readings, eventLog, circuitState]);

  // Real-Time Simulation Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && circuitState.switchClosed) {
      interval = setInterval(() => {
        setCircuitState((prev) => ({
          ...prev,
          elapsedTimeSeconds: Number((prev.elapsedTimeSeconds + 0.2).toFixed(1)),
        }));
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, circuitState.switchClosed]);

  // Sync inputs with parent runner
  useEffect(() => {
    onUpdateInput('material', selectedMaterial.name);
    onUpdateInput('areaCm2', capState.areaM2 * 10000);
    onUpdateInput('separationMm', capState.separationM * 1000);
    onUpdateInput('insertionFraction', capState.dielectric.insertionFraction);
    onUpdateInput('capacitancenF', (geometricCapacitanceF * 1e9).toFixed(3));
    onUpdateInput('timeConstantS', timeConstantSeconds.toFixed(3));
    onUpdateInput('voltageV', liveRCData.voltageV);
    onUpdateInput('experimentalEpsR', experimentalEpsR);
    onUpdateInput('percentageError', percentageError);
  }, [selectedMaterial, capState, geometricCapacitanceF, timeConstantSeconds, liveRCData.voltageV, experimentalEpsR, percentageError, onUpdateInput]);

  // ── 2. USER INTERACTION HANDLERS ─────────────────────────────────

  const handleSelectMaterial = (materialId: string) => {
    if (soundEnabled) labSound.playClick();
    setCapState((prev) => ({
      ...prev,
      dielectric: { ...prev.dielectric, materialId },
    }));
    setCurrentStepIndex(10);
    logEvent({ type: 'material_selected', materialId, t: Date.now() });
  };

  const handleSetInsertionFraction = (fraction: number) => {
    setCapState((prev) => ({
      ...prev,
      dielectric: { ...prev.dielectric, insertionFraction: fraction },
    }));
    setCurrentStepIndex(11);
    logEvent({ type: 'dielectric_moved', insertionFraction: fraction, t: Date.now() });
  };

  const handleStartCharging = () => {
    if (soundEnabled) labSound.playClick();
    setCircuitState((prev) => ({
      ...prev,
      mode: 'charging',
      switchClosed: true,
      elapsedTimeSeconds: 0.0,
    }));
    setIsTimerRunning(true);
    setValidationGateAlert(null);
    setCurrentStepIndex(6);
    logEvent({ type: 'switch_closed', mode: 'charging', t: Date.now() });
    onCompleteStep(6);
  };

  const handleStartDischarging = () => {
    if (soundEnabled) labSound.playClick();
    setCircuitState((prev) => ({
      ...prev,
      mode: 'discharging',
      switchClosed: true,
      elapsedTimeSeconds: 0.0,
    }));
    setIsTimerRunning(true);
    setValidationGateAlert(null);
    setCurrentStepIndex(8);
    logEvent({ type: 'switch_closed', mode: 'discharging', t: Date.now() });
    onCompleteStep(8);
  };

  const handlePauseResumeTimer = () => {
    if (soundEnabled) labSound.playClick();
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    if (soundEnabled) labSound.playReset();
    setIsTimerRunning(false);
    setCircuitState((prev) => ({
      ...prev,
      elapsedTimeSeconds: 0.0,
      mode: 'idle',
      switchClosed: false,
    }));
  };

  const handleRecordReading = () => {
    if (!circuitState.switchClosed || circuitState.mode === 'idle') {
      setValidationGateAlert('⚠ Switch is OPEN. Activate Charge or Discharge mode before adding reading.');
      return;
    }

    if (soundEnabled) labSound.playDataRecorded();

    const newReading: Reading = {
      tSeconds: circuitState.elapsedTimeSeconds,
      voltageV: liveRCData.voltageV,
      currentA: liveRCData.currentA,
      mode: circuitState.mode,
      materialId: capState.dielectric.materialId,
      dielectricInsertionFraction: capState.dielectric.insertionFraction,
    };

    setReadings((prev) => [...prev, newReading]);
    logEvent({ type: 'reading_recorded', reading: newReading, t: Date.now() });
    onRecordDataPoint();
  };

  const handleDeleteReading = (index: number) => {
    if (soundEnabled) labSound.playClick();
    setReadings((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearReadings = () => {
    if (soundEnabled) labSound.playReset();
    setReadings([]);
  };

  const handleResetLab = () => {
    if (soundEnabled) labSound.playReset();
    setCapState({
      areaM2: 0.02,
      separationM: 0.002,
      dielectric: { materialId: 'air', insertionFraction: 0.0 },
      customPermittivity: 4.0,
    });
    setCircuitState({
      mode: 'idle',
      supplyVoltageV: 10.0,
      resistanceOhm: 50000,
      switchClosed: false,
      elapsedTimeSeconds: 0.0,
    });
    setIsTimerRunning(false);
    setReadings([]);
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

      if (q.includes('why') && q.includes('increase')) {
        reply = 'Inserting a dielectric material reduces the internal electric field E = E0 / eps_r due to molecular dipole polarization, allowing the capacitor to store more charge Q at the same voltage V, increasing capacitance C = Q/V!';
      } else if (q.includes('polarization')) {
        reply = 'Dielectric polarization occurs when an external electric field shifts bound charges in dielectric molecules, creating opposing internal dipoles that partially cancel the applied field.';
      } else if (q.includes('exponential')) {
        reply = 'Voltage V(t) changes exponentially because charging current I = (V0 - V)/R decreases proportionally to remaining uncharged capacity, yielding V(t) = V0(1 - e^(-t/RC)).';
      } else if (q.includes('time constant') || q.includes('tau')) {
        reply = `The RC time constant tau = R*C represents the time required for a charging capacitor to reach 63.2% of V0 (or discharge to 36.8%). Current tau = ${timeConstantSeconds.toFixed(3)} s.`;
      } else if (q.includes('slope') || q.includes('calculate')) {
        reply = `From linear regression on discharge data ln(V/V0) vs t, the slope m = -1/(RC). Thus experimental C = -1/(R*m) = ${(dischargeRegression.experimentalCapacitanceF * 1e9).toFixed(2)} nF and derived eps_r = ${experimentalEpsR}.`;
      } else {
        reply = `Live RC Telemetry: Material = ${selectedMaterial.name}, Insertion = ${(capState.dielectric.insertionFraction * 100).toFixed(0)}%, C = ${(geometricCapacitanceF * 1e9).toFixed(2)} nF, V(t) = ${liveRCData.voltageV} V.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Time (s)', 'Mode', 'Material', 'Voltage (V)', 'Current (mA)', 'Capacitance (nF)', 'Time Constant (s)'],
    ];
    readings.forEach((r) => {
      rows.push([
        String(r.tSeconds),
        r.mode,
        r.materialId,
        String(r.voltageV),
        String(r.currentA * 1000),
        String((geometricCapacitanceF * 1e9).toFixed(3)),
        String(timeConstantSeconds.toFixed(3)),
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dielectric_constant_readings.csv`;
    link.click();
  };

  // Tab Content Renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'PROCEDURE':
        return (
          <div className="space-y-2.5 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <h3 className="font-bold text-xs text-cyan-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" /> STEP {currentStepIndex} / 16
              </h3>
              <span className="text-[10px] text-zinc-400">Progressive Mode</span>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-cyan-500/40 space-y-1.5">
              <div className="font-bold text-cyan-300 text-xs">
                Step {currentStepIndex}: {dielectricConstantConfig.procedure[currentStepIndex - 1]?.instruction}
              </div>
              <div className="text-[10px] text-emerald-400 pt-1 border-t border-white/5">
                Expected: {dielectricConstantConfig.procedure[currentStepIndex - 1]?.expectedAction}
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
                  onClick={handleClearReadings}
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
                    <th className="p-2">t (s)</th>
                    <th className="p-2">Mode</th>
                    <th className="p-2">Material</th>
                    <th className="p-2">V(t) (V)</th>
                    <th className="p-2">I(t) (mA)</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[10px]">
                  {readings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-zinc-500">
                        No readings logged. Activate Charge/Discharge and click Add Reading.
                      </td>
                    </tr>
                  ) : (
                    readings.map((r, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2 text-cyan-300 font-bold">{r.tSeconds} s</td>
                        <td className="p-2 text-amber-300 uppercase">{r.mode}</td>
                        <td className="p-2 text-zinc-300">{r.materialId}</td>
                        <td className="p-2 text-white font-bold">{r.voltageV} V</td>
                        <td className="p-2 text-emerald-400">{DielectricRCEngine.formatCurrentmA(r.currentA)}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteReading(idx)}
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
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
                <Activity className="w-4 h-4 shrink-0" /> Real-Time RC Curves
              </h3>
              <div className="flex items-center gap-1 text-[10px]">
                {(['V_vs_T', 'I_vs_T', 'LN_V_vs_T'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setActiveGraphTab(g)}
                    className={`px-2 py-0.5 rounded font-bold ${
                      activeGraphTab === g ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {g.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-2">
              <div className="w-full h-48 bg-black/80 rounded-xl border border-white/10 relative p-2 flex items-center justify-center">
                {activeGraphTab === 'V_vs_T' && (
                  <svg viewBox="0 0 300 150" className="w-full h-full">
                    <line x1="30" y1="130" x2="280" y2="130" stroke="#3f3f46" strokeWidth="1" />
                    <line x1="30" y1="20" x2="30" y2="130" stroke="#3f3f46" strokeWidth="1" />
                    <text x="35" y="30" fill="#a1a1aa" fontSize="9">V (Volt)</text>
                    <text x="250" y="125" fill="#a1a1aa" fontSize="9">t (s)</text>

                    {/* Landmark Tau line */}
                    <line x1="100" y1="20" x2="100" y2="130" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
                    <text x="105" y="25" fill="#f59e0b" fontSize="8">t = τ ({timeConstantSeconds.toFixed(1)}s)</text>

                    {/* Theoretical Voltage Curve */}
                    <path
                      d={Array.from({ length: 60 }).map((_, i) => {
                        const t = i * 0.2;
                        const cx = 30 + (t / 12) * 250;
                        const res = DielectricRCEngine.calculateRCVoltageAndCurrent(
                          capState,
                          { ...circuitState, switchClosed: true, mode: circuitState.mode === 'idle' ? 'charging' : circuitState.mode },
                          t,
                          DEFAULT_MATERIALS
                        );
                        const cy = 130 - (res.voltageV / Math.max(1, circuitState.supplyVoltageV)) * 100;
                        return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                    />

                    {/* Instantaneous Simulation Voltage Point */}
                    {circuitState.switchClosed && (
                      <circle
                        cx={30 + (circuitState.elapsedTimeSeconds / 12) * 250}
                        cy={130 - (liveRCData.voltageV / Math.max(1, circuitState.supplyVoltageV)) * 100}
                        r="4"
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Recorded Data Points */}
                    {readings.map((r, idx) => (
                      <circle
                        key={idx}
                        cx={30 + (r.tSeconds / 12) * 250}
                        cy={130 - (r.voltageV / Math.max(1, circuitState.supplyVoltageV)) * 100}
                        r="3"
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    ))}
                  </svg>
                )}

                {activeGraphTab === 'I_vs_T' && (
                  <svg viewBox="0 0 300 150" className="w-full h-full">
                    {/* Zero Current Baseline at Y = 75 */}
                    <line x1="30" y1="75" x2="280" y2="75" stroke="#71717a" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="30" y1="20" x2="30" y2="130" stroke="#3f3f46" strokeWidth="1" />
                    <text x="35" y="30" fill="#a1a1aa" fontSize="9">+I (mA)</text>
                    <text x="35" y="145" fill="#a1a1aa" fontSize="9">-I (mA)</text>
                    <text x="250" y="70" fill="#a1a1aa" fontSize="9">t (s)</text>

                    {/* Current Decay Curve */}
                    <path
                      d={Array.from({ length: 60 }).map((_, i) => {
                        const t = i * 0.2;
                        const cx = 30 + (t / 12) * 250;
                        const res = DielectricRCEngine.calculateRCVoltageAndCurrent(
                          capState,
                          { ...circuitState, switchClosed: true, mode: circuitState.mode === 'idle' ? 'charging' : circuitState.mode },
                          t,
                          DEFAULT_MATERIALS
                        );
                        const maxImA = (circuitState.supplyVoltageV / Math.max(100, circuitState.resistanceOhm)) * 1000;
                        const currentmA = res.currentA * 1000;
                        const cy = 75 - (currentmA / Math.max(0.001, maxImA)) * 50;
                        return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />

                    {/* Instantaneous Simulation Current Point */}
                    {circuitState.switchClosed && (
                      <circle
                        cx={30 + (circuitState.elapsedTimeSeconds / 12) * 250}
                        cy={75 - ((liveRCData.currentA * 1000) / Math.max(0.001, (circuitState.supplyVoltageV / Math.max(100, circuitState.resistanceOhm)) * 1000)) * 50}
                        r="4"
                        fill="#f43f5e"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Recorded Data Current Points */}
                    {readings.map((r, idx) => {
                      const maxImA = (circuitState.supplyVoltageV / Math.max(100, circuitState.resistanceOhm)) * 1000;
                      const cy = 75 - ((r.currentA * 1000) / Math.max(0.001, maxImA)) * 50;
                      return (
                        <circle key={idx} cx={30 + (r.tSeconds / 12) * 250} cy={cy} r="3" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                      );
                    })}
                  </svg>
                )}

                {activeGraphTab === 'LN_V_vs_T' && (
                  <svg viewBox="0 0 300 150" className="w-full h-full">
                    <line x1="30" y1="130" x2="280" y2="130" stroke="#3f3f46" strokeWidth="1" />
                    <line x1="30" y1="20" x2="30" y2="130" stroke="#3f3f46" strokeWidth="1" />
                    <text x="35" y="30" fill="#a1a1aa" fontSize="9">ln(V/V0)</text>
                    <text x="250" y="125" fill="#a1a1aa" fontSize="9">t (s)</text>

                    {/* Linear Regression Slope Fit Line */}
                    <line
                      x1="30"
                      y1="30"
                      x2="280"
                      y2={Math.min(130, 30 + Math.abs(dischargeRegression.slope) * 200)}
                      stroke="#10b981"
                      strokeWidth="2"
                    />

                    {readings.map((r, idx) => {
                      if (r.voltageV <= 0) return null;
                      const lnRatio = Math.log(r.voltageV / Math.max(0.001, circuitState.supplyVoltageV));
                      const cx = 30 + (r.tSeconds / 12) * 250;
                      const cy = 30 + Math.abs(lnRatio) * 30;
                      return <circle key={idx} cx={cx} cy={cy} r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />;
                    })}
                  </svg>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Discharge Slope m</div>
                  <div className="font-bold text-cyan-300 text-xs">{dischargeRegression.slope} s⁻¹</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">R² Fit Confidence</div>
                  <div className="font-bold text-emerald-400 text-xs">{dischargeRegression.rSquared}</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Derived C_exp</div>
                  <div className="font-bold text-amber-300 text-xs">{(dischargeRegression.experimentalCapacitanceF * 1e9).toFixed(2)} nF</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Derived εr_exp</div>
                  <div className="font-bold text-cyan-300 text-xs">{experimentalEpsR}</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'COMPARISON':
        return (
          <div className="space-y-3 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0" /> Air vs Dielectric Comparison
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-sky-400 border-b border-white/10 pb-1">AIR BASELINE (εr = 1.0)</div>
                <div><span className="text-zinc-400">Geometric C0:</span> {(airBaselineCapacitanceF * 1e9).toFixed(3)} nF</div>
                <div><span className="text-zinc-400">Time Constant τ0:</span> {(circuitState.resistanceOhm * airBaselineCapacitanceF).toFixed(3)} s</div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-cyan-500/40 space-y-1">
                <div className="font-bold text-cyan-300 border-b border-white/10 pb-1">{selectedMaterial.name.toUpperCase()}</div>
                <div><span className="text-zinc-400">Geometric C:</span> {(geometricCapacitanceF * 1e9).toFixed(3)} nF</div>
                <div><span className="text-zinc-400">Time Constant τ:</span> {timeConstantSeconds.toFixed(3)} s</div>
                <div><span className="text-zinc-400">Ref εr:</span> {selectedMaterial.relativePermittivity}</div>
                <div><span className="text-zinc-400">Derived εr_exp:</span> <strong className="text-emerald-400">{experimentalEpsR}</strong></div>
                <div><span className="text-zinc-400">% Error:</span> <strong className="text-red-300">{percentageError}%</strong></div>
              </div>
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
                LAB REPORT: EXPERIMENT 09 (DIELECTRIC CONSTANT)
              </div>
              <div><span className="text-zinc-400">Aim:</span> Determine dielectric constant εr of {selectedMaterial.name} using RC charging/discharging method.</div>
              <div><span className="text-zinc-400">Plate Area A:</span> {(capState.areaM2 * 10000).toFixed(0)} cm²</div>
              <div><span className="text-zinc-400">Plate Separation d:</span> {(capState.separationM * 1000).toFixed(1)} mm</div>
              <div><span className="text-zinc-400">Discharge Slope m:</span> {dischargeRegression.slope} s⁻¹</div>
              <div><span className="text-zinc-400">Derived Experimental C:</span> {(dischargeRegression.experimentalCapacitanceF * 1e9).toFixed(2)} nF</div>
              <div><span className="text-zinc-400">Derived Experimental εr:</span> {experimentalEpsR}</div>
              <div><span className="text-zinc-400">Reference εr:</span> {selectedMaterial.relativePermittivity}</div>
              <div><span className="text-zinc-400">Percentage Error:</span> {percentageError}%</div>
              <div className="pt-2 border-t border-white/10 text-emerald-400 font-bold">
                Conclusion: Relative permittivity determined as εr = {experimentalEpsR}.
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
              {['Why dielectric increases C?', 'What is polarization?', 'Why exponential curve?', 'What is time constant?'].map((chip) => (
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
                { id: 1, q: '1. What happens to capacitance C when a dielectric slab is inserted?', opts: ['Increases by factor of εr', 'Decreases to zero', 'Remains unchanged'] },
                { id: 2, q: '2. What is the physical mechanism behind increased capacitance?', opts: ['Dielectric polarization partially cancels internal electric field', 'Plates touch each other', 'Resistor heats up'] },
                { id: 3, q: '3. At time t = τ (RC time constant), what percentage of V0 does a charging capacitor reach?', opts: ['63.2%', '50.0%', '100.0%'] },
                { id: 4, q: '4. How do we derive experimental capacitance from discharge curve?', opts: ['From linear slope m of ln(V/V0) vs t where C = -1/(R*m)', 'By multiplying V0 by R', 'By guessing'] },
              ].map((item) => (
                <div key={item.id} className="bg-zinc-950 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-xs">
                  <div className="font-bold text-white">{item.q}</div>
                  <div className="space-y-1">
                    {item.opts.map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-zinc-300 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name={`dq_${item.id}`}
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
            EXP 09: DIELECTRIC CONSTANT (RC CHARGING/DISCHARGING)
          </h1>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase hidden md:inline shrink-0">
            Dielectric Engine
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowElectricField(!showElectricField)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1 ${
              showElectricField ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold' : 'bg-zinc-800 text-zinc-400 border-white/10'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Field Lines</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPolarization(!showPolarization)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1 ${
              showPolarization ? 'bg-purple-500/20 text-purple-300 border-purple-400 font-bold' : 'bg-zinc-800 text-zinc-400 border-white/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Polarization</span>
          </button>

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
              {dielectricConstantConfig.apparatus.map((item) => (
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

        {/* CENTER PRIMARY OPTICAL / CAPACITOR HERO WORKSPACE */}
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

          {/* CAPACITOR HERO VIEWPORT */}
          <div className="w-full max-w-6xl mx-auto flex-1 min-h-[280px] sm:min-h-[340px] bg-black/80 rounded-3xl border-2 border-cyan-500/40 p-4 relative overflow-hidden shadow-2xl flex flex-col items-center justify-around my-auto font-mono text-xs">
            
            {/* PARALLEL PLATE CAPACITOR & DIELECTRIC SLAB HERO */}
            <div className="w-full max-w-3xl flex flex-col items-center space-y-3">
              <div className="flex items-center justify-between w-full text-[11px]">
                <span className="text-zinc-400">Material: <strong className="text-cyan-300">{selectedMaterial.name} (εr = {selectedMaterial.relativePermittivity})</strong></span>
                <span className="text-zinc-400">Capacitance C: <strong className="text-emerald-400">{(geometricCapacitanceF * 1e6).toFixed(2)} µF</strong></span>
                <span className="text-zinc-400">Time Const τ: <strong className="text-amber-300">{timeConstantSeconds.toFixed(2)} s</strong></span>
              </div>

              {/* Parallel Plate Visualizer Frame */}
              <div className="relative w-full h-44 bg-zinc-950 rounded-2xl border border-white/20 p-4 flex flex-col justify-between items-center overflow-hidden shadow-inner">
                
                {/* Top Metallic Plate */}
                <div className="w-full h-5 bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600 border-b-2 border-cyan-400 rounded-t-lg flex items-center justify-center text-[9px] font-bold text-zinc-900 tracking-wider">
                  TOP METALLIC PLATE (+V)
                </div>

                {/* Plate Gap & Draggable Dielectric Slab */}
                <div className="relative w-full flex-1 flex items-center my-1 bg-black/40 rounded overflow-hidden">
                  
                  {/* Electric Field Lines Overlay */}
                  {showElectricField && (
                    <div className="absolute inset-0 flex justify-around items-center pointer-events-none opacity-60">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div key={i} className="w-0.5 h-full bg-cyan-400 animate-pulse" />
                      ))}
                    </div>
                  )}

                  {/* Dielectric Polarization Aligned Dipoles Overlay */}
                  {showPolarization && (
                    <div className="absolute inset-0 flex flex-wrap justify-around items-center pointer-events-none opacity-70 p-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                        <div key={i} className="text-[8px] font-bold text-purple-300 bg-purple-900/60 px-1 rounded border border-purple-400">
                          + -
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Physically Moving Dielectric Slab */}
                  <div
                    className="h-full rounded-md border-2 shadow-2xl transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-black"
                    style={{
                      width: `${capState.dielectric.insertionFraction * 100}%`,
                      backgroundColor: selectedMaterial.colorHex,
                      borderColor: '#ffffff',
                    }}
                  >
                    {capState.dielectric.insertionFraction > 0.2 && selectedMaterial.name}
                  </div>
                </div>

                {/* Bottom Metallic Plate */}
                <div className="w-full h-5 bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600 border-t-2 border-cyan-400 rounded-b-lg flex items-center justify-center text-[9px] font-bold text-zinc-900 tracking-wider">
                  BOTTOM METALLIC PLATE (GND)
                </div>
              </div>

              {/* Dielectric Slab Drag Slider */}
              <div className="w-full bg-zinc-900/80 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-3">
                <span className="text-[10px] text-zinc-400 font-bold min-w-[120px]">
                  SLAB INSERTION: <strong className="text-cyan-300">{(capState.dielectric.insertionFraction * 100).toFixed(0)}%</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={capState.dielectric.insertionFraction}
                  onChange={(e) => handleSetInsertionFraction(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* LIVE DIGITAL MULTIMETER READOUT PANEL */}
            <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Elapsed Time (t)</div>
                <div className="font-bold text-cyan-300 text-sm">{circuitState.elapsedTimeSeconds.toFixed(1)} s</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Capacitor Voltage V(t)</div>
                <div className="font-bold text-emerald-400 text-sm">{liveRCData.voltageV} V</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Current I(t)</div>
                <div className="font-bold text-amber-300 text-sm">{DielectricRCEngine.formatCurrentmA(liveRCData.currentA)}</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">State</div>
                <div className="font-bold text-purple-300 text-xs uppercase">{circuitState.mode}</div>
              </div>
            </div>
          </div>

          {/* LOWER WORKSPACE CONTROLS & SPDT SWITCH BAR */}
          <div className="w-full max-w-6xl mx-auto bg-zinc-900/90 border-2 border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 font-mono text-xs space-y-3 min-w-0 shrink-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Focus className="w-5 h-5 text-cyan-400 shrink-0" />
                <span className="font-bold text-sm text-white">SPDT SWITCH & RC EXPERIMENT CONTROLS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Dielectric Material:</span>
                <select
                  value={capState.dielectric.materialId}
                  onChange={(e) => handleSelectMaterial(e.target.value)}
                  className="bg-zinc-950 border border-white/15 rounded-lg px-2 py-0.5 text-xs text-cyan-300 font-bold"
                >
                  {DEFAULT_MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} (εr = {m.relativePermittivity})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              
              {/* SPDT Charge / Discharge Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleStartCharging}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all ${
                    circuitState.mode === 'charging'
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border-white/10'
                  }`}
                >
                  1. CHARGE (V0=10V)
                </button>

                <button
                  type="button"
                  onClick={handleStartDischarging}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all ${
                    circuitState.mode === 'discharging'
                      ? 'bg-amber-500 text-black border-amber-400 shadow-lg'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-white/10'
                  }`}
                >
                  2. DISCHARGE
                </button>
              </div>

              {/* Timer & Simulation Control Buttons */}
              <div className="flex items-center justify-center gap-2 bg-black/60 border border-white/10 rounded-xl p-2">
                <button
                  type="button"
                  onClick={handlePauseResumeTimer}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs border border-white/10 flex items-center gap-1"
                >
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isTimerRunning ? 'Pause' : 'Run Timer'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs font-bold border border-white/10"
                >
                  Reset Timer
                </button>
              </div>

              {/* Data Logging Button */}
              <div>
                <button
                  type="button"
                  onClick={handleRecordReading}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD DATA READING (V={liveRCData.voltageV}V)</span>
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
                    'COMPARISON',
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
