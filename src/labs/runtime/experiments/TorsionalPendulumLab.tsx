import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Maximize2,
  Minimize2,
  Compass,
} from 'lucide-react';

import type { ExperimentConfig } from '../../types';
import type {
  WireSpec,
  DiscSpec,
  SlottedMassSpec,
  ScrewGaugeReading,
  OscillationState,
  TorsionalTrial,
  TorsionalRegressionResult,
  MisconceptionWarning,
} from '../../types/torsionalPendulumTypes';

import { torsionalPendulumConfig } from '../../physics/torsionalPendulum';
import { WIRE_MATERIALS, TorsionalPendulumEngine } from '../../engines/TorsionalPendulumEngine';
import { labSound } from '../../utils/LabSoundManager';

interface TorsionalPendulumLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const TorsionalPendulumLab: React.FC<TorsionalPendulumLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. CORE LABORATORY STATE ──────────────────────────────────────
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);
  const [learningMode, setLearningMode] = useState<'guided' | 'practice' | 'challenge' | 'research'>('guided');

  // Wire Specification State
  const [wireState, setWireState] = useState<WireSpec>({
    materialId: 'steel',
    materialName: 'Steel Wire',
    referenceG_GPa: 79.3,
    lengthM: 1.0, // 1.0 m
    diameterMm: 0.8, // 0.8 mm
  });

  // Disc Specification State
  const [discState, setDiscState] = useState<DiscSpec>({
    massKg: 1.2, // 1.2 kg heavy disc
    radiusM: 0.1, // 10 cm radius
  });

  // Slotted Additional Masses State
  const [slottedMassState, setSlottedMassState] = useState<SlottedMassSpec>({
    massEachKg: 0.2, // 200g each mass
    positionRadiusM: 0.07, // 7 cm from center
    count: 0, // 0, 2, 4 masses
  });

  // Screw Gauge Micrometer State
  const [showScrewGaugeModal, setShowScrewGaugeModal] = useState<boolean>(false);
  const [screwGaugeReadings, setScrewGaugeReadings] = useState<ScrewGaugeReading[]>([]);
  const [sgActivePosition, setSgActivePosition] = useState<'Top' | 'Middle' | 'Bottom'>('Top');
  const [sgThimbleDivisions, setSgThimbleDivisions] = useState<number>(30);

  // Oscillation & Timer Simulation State
  const [oscState, setOscState] = useState<OscillationState>({
    isOscillating: false,
    initialAngleDeg: 5.0, // Recommended default small angle (5.0 deg)
    currentAngleDeg: 5.0,
    angularVelocityRadS: 0.0,
    angularAccelRadS2: 0.0,
    elapsedTimeSeconds: 0.0,
    targetOscillations: 10,
    currentOscillationCount: 0,
    dampingLevel: 'REALISTIC',
    noiseLevel: 'OFF',
  });

  // Observation Trials
  const [trials, setTrials] = useState<TorsionalTrial[]>([]);

  // UI Drawers, Splitters & Views
  const [leftDrawerOpen, setLeftDrawerOpen] = useState<boolean>(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(true);
  const [rightDrawerWidth, setRightDrawerWidth] = useState<number>(320); // Resizable right drawer width
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [highlightedComponentId, setHighlightedComponentId] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<'APPARATUS' | 'SCREW_GAUGE' | 'OSCILLATION'>('APPARATUS');
  const [activeTab, setActiveTab] = useState<
    'PROCEDURE' | 'DATA' | 'GRAPH' | 'COMPARISON' | 'REPORT' | 'AI_MENTOR' | 'ASSESSMENT'
  >('PROCEDURE');

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [validationGateAlert, setValidationGateAlert] = useState<string | null>(null);

  // Telemetry & Event Log
  const [eventLog, setEventLog] = useState<Array<{ type: string; t: number; [key: string]: any }>>([]);

  // AI Mentor State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to Experiment 10: Determination of Rigidity Modulus using Torsional Pendulum! Measure wire length L and diameter d, set slotted masses, twist disc, and record oscillation periods T for moment of inertia I.",
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  const logEvent = useCallback((event: { type: string; t: number; [key: string]: any }) => {
    setEventLog((prev) => [...prev, event]);
  }, []);

  // Selected Wire Material Definition
  const selectedMaterial = useMemo(() => {
    return WIRE_MATERIALS.find((m) => m.id === wireState.materialId) || WIRE_MATERIALS[0];
  }, [wireState.materialId]);

  // Derived Mean Diameter from Screw Gauge Readings
  const meanDiameterMm = useMemo(() => {
    if (screwGaugeReadings.length === 0) return wireState.diameterMm;
    const sum = screwGaugeReadings.reduce((acc, r) => acc + r.measuredDiameterMm, 0);
    return Number((sum / screwGaugeReadings.length).toFixed(3));
  }, [screwGaugeReadings, wireState.diameterMm]);

  // Sync Mean Diameter to Wire Specification
  useEffect(() => {
    if (screwGaugeReadings.length > 0) {
      setWireState((prev) => ({ ...prev, diameterMm: meanDiameterMm }));
    }
  }, [meanDiameterMm, screwGaugeReadings.length]);

  // Derived Physics Metrics
  const momentOfInertiaMetrics = useMemo(() => {
    return TorsionalPendulumEngine.calculateTotalMomentOfInertia(discState, slottedMassState);
  }, [discState, slottedMassState]);

  const theoreticalPeriodMetrics = useMemo(() => {
    return TorsionalPendulumEngine.calculateTimePeriodSeconds(wireState, discState, slottedMassState);
  }, [wireState, discState, slottedMassState]);

  // Linear Regression Fit on T² vs I
  const regressionAnalysis: TorsionalRegressionResult = useMemo(() => {
    return TorsionalPendulumEngine.calculateRegressionAnalysis(trials, wireState);
  }, [trials, wireState]);

  // Grounded Misconception Warnings
  const misconceptions: MisconceptionWarning[] = useMemo(() => {
    return TorsionalPendulumEngine.detectMisconceptions(oscState.initialAngleDeg, trials);
  }, [oscState.initialAngleDeg, trials]);

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

  // 60 FPS Real-Time Torsional Oscillation Loop & Automatic Zero-Crossing Counter
  const prevAngleRef = useRef<number>(oscState.initialAngleDeg);
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (oscState.isOscillating) {
        const dt = (now - lastTime) / 1000.0;
        lastTime = now;

        setOscState((prev) => {
          const nextTime = prev.elapsedTimeSeconds + dt;
          const frame = TorsionalPendulumEngine.calculateOscillationFrame(
            wireState,
            discState,
            slottedMassState,
            nextTime,
            prev.initialAngleDeg,
            prev.dampingLevel
          );

          // Zero-crossing oscillation counter
          let nextCount = prev.currentOscillationCount;
          if (
            (prevAngleRef.current < 0 && frame.angleDeg >= 0) ||
            (prevAngleRef.current > 0 && frame.angleDeg <= 0)
          ) {
            // Half oscillation crossed
          }
          prevAngleRef.current = frame.angleDeg;

          // Compute exact oscillation period crossings
          const T = theoreticalPeriodMetrics.periodT;
          const totalOscillationsDone = Math.floor(nextTime / Math.max(0.1, T));
          nextCount = Math.min(prev.targetOscillations, totalOscillationsDone);

          let stopOscillating = false;
          if (nextCount >= prev.targetOscillations) {
            stopOscillating = true;
          }

          return {
            ...prev,
            isOscillating: !stopOscillating,
            currentAngleDeg: frame.angleDeg,
            angularVelocityRadS: frame.angularVelocityRadS,
            angularAccelRadS2: frame.angularAccelRadS2,
            elapsedTimeSeconds: Number(nextTime.toFixed(2)),
            currentOscillationCount: nextCount,
          };
        });

        if (oscState.isOscillating) {
          animFrameId = requestAnimationFrame(loop);
        }
      }
    };

    if (oscState.isOscillating) {
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animFrameId);
  }, [oscState.isOscillating, wireState, discState, slottedMassState, theoreticalPeriodMetrics.periodT]);

  // Sync inputs with parent workbench
  useEffect(() => {
    onUpdateInput('wireMaterial', selectedMaterial.name);
    onUpdateInput('wireLengthM', wireState.lengthM);
    onUpdateInput('wireDiameterMm', wireState.diameterMm);
    onUpdateInput('discMassKg', discState.massKg);
    onUpdateInput('discRadiusM', discState.radiusM);
    onUpdateInput('momentOfInertiaKgM2', momentOfInertiaMetrics.I_total);
    onUpdateInput('periodT', theoreticalPeriodMetrics.periodT);
    onUpdateInput('periodSquaredT2', theoreticalPeriodMetrics.periodSquaredT2);
    onUpdateInput('experimentalG_GPa', regressionAnalysis.experimentalG_GPa);
    onUpdateInput('percentageError', regressionAnalysis.percentageError);
  }, [selectedMaterial, wireState, discState, momentOfInertiaMetrics, theoreticalPeriodMetrics, regressionAnalysis, onUpdateInput]);

  // ── 2. USER INTERACTION HANDLERS ─────────────────────────────────

  const handleSelectMaterial = (materialId: string) => {
    if (soundEnabled) labSound.playClick();
    const mat = WIRE_MATERIALS.find((m) => m.id === materialId) || WIRE_MATERIALS[0];
    setWireState((prev) => ({
      ...prev,
      materialId: mat.id,
      materialName: mat.name,
      referenceG_GPa: mat.rigidityModulusGPa,
    }));
    logEvent({ type: 'material_changed', materialId, t: Date.now() });
  };

  const handleSetWireLength = (lengthM: number) => {
    setWireState((prev) => ({ ...prev, lengthM }));
    setCurrentStepIndex(2);
    logEvent({ type: 'wire_measured', lengthM, t: Date.now() });
  };

  const handleSetSlottedMassCount = (count: number) => {
    if (soundEnabled) labSound.playClick();
    setSlottedMassState((prev) => ({ ...prev, count }));
    setCurrentStepIndex(11);
  };

  const handleRotateDiscAngle = (angleDeg: number) => {
    setOscState((prev) => ({
      ...prev,
      initialAngleDeg: angleDeg,
      currentAngleDeg: angleDeg,
      elapsedTimeSeconds: 0.0,
      currentOscillationCount: 0,
    }));
    setCurrentStepIndex(7);
    logEvent({ type: 'disc_rotated', angleDeg, t: Date.now() });
  };

  const handleReleasePendulum = () => {
    if (soundEnabled) labSound.playClick();
    setOscState((prev) => ({
      ...prev,
      isOscillating: true,
      elapsedTimeSeconds: 0.0,
      currentOscillationCount: 0,
    }));
    setValidationGateAlert(null);
    setCurrentStepIndex(8);
    logEvent({ type: 'pendulum_released', t: Date.now() });
    onCompleteStep(8);
  };

  const handleResetPendulum = () => {
    if (soundEnabled) labSound.playReset();
    setOscState((prev) => ({
      ...prev,
      isOscillating: false,
      currentAngleDeg: prev.initialAngleDeg,
      angularVelocityRadS: 0.0,
      angularAccelRadS2: 0.0,
      elapsedTimeSeconds: 0.0,
      currentOscillationCount: 0,
    }));
  };

  const handleAddScrewGaugeReading = () => {
    if (soundEnabled) labSound.playClick();
    const reading = TorsionalPendulumEngine.simulateScrewGaugeReading(
      sgActivePosition,
      wireState.diameterMm
    );
    setScrewGaugeReadings((prev) => [...prev, reading]);
    logEvent({ type: 'screw_gauge_read', reading, t: Date.now() });
    setCurrentStepIndex(3);
  };

  const handleSaveTrial = () => {
    if (soundEnabled) labSound.playDataRecorded();

    const addedMassTotalKg = slottedMassState.massEachKg * slottedMassState.count;
    const totalMassKg = discState.massKg + addedMassTotalKg;
    const I_total = momentOfInertiaMetrics.I_total;
    const numOscillations = oscState.targetOscillations;
    const totalTimeSeconds = Number((numOscillations * theoreticalPeriodMetrics.periodT).toFixed(2));
    const periodT = theoreticalPeriodMetrics.periodT;
    const periodSquaredT2 = theoreticalPeriodMetrics.periodSquaredT2;

    const newTrial: TorsionalTrial = {
      trialNumber: trials.length + 1,
      addedMassTotalKg,
      totalMassKg,
      totalMomentOfInertiaKgM2: I_total,
      numOscillations,
      totalTimeSeconds,
      periodTSeconds: periodT,
      periodSquaredT2,
    };

    setTrials((prev) => [...prev, newTrial]);
    logEvent({ type: 'trial_saved', trial: newTrial, t: Date.now() });
    onRecordDataPoint();
    setCurrentStepIndex(10);
  };

  const handleDeleteTrial = (index: number) => {
    if (soundEnabled) labSound.playClick();
    setTrials((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearTrials = () => {
    if (soundEnabled) labSound.playReset();
    setTrials([]);
  };

  const handleResetLab = () => {
    if (soundEnabled) labSound.playReset();
    setWireState({
      materialId: 'steel',
      materialName: 'Steel Wire',
      referenceG_GPa: 79.3,
      lengthM: 1.0,
      diameterMm: 0.8,
    });
    setDiscState({ massKg: 1.2, radiusM: 0.1 });
    setSlottedMassState({ massEachKg: 0.2, positionRadiusM: 0.07, count: 0 });
    setOscState({
      isOscillating: false,
      initialAngleDeg: 10.0,
      currentAngleDeg: 10.0,
      angularVelocityRadS: 0.0,
      angularAccelRadS2: 0.0,
      elapsedTimeSeconds: 0.0,
      targetOscillations: 10,
      currentOscillationCount: 0,
      dampingLevel: 'REALISTIC',
      noiseLevel: 'OFF',
    });
    setTrials([]);
    setScrewGaugeReadings([]);
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

      if (q.includes('diameter') || q.includes('carefully') || q.includes('d^4')) {
        reply = 'Because torsional constant C = pi*G*d^4 / (32*L) depends on diameter to the 4th power (d^4), even a 2% error in wire diameter results in an 8% error in derived Rigidity Modulus G!';
      } else if (q.includes('angle') || q.includes('small')) {
        reply = 'Small initial angular displacement (theta <= 10 deg) ensures simple harmonic torsional motion with constant restoring torque constant C = tau / theta.';
      } else if (q.includes('slope') || q.includes('graph')) {
        reply = `From linear regression of T^2 vs I, slope m = 128*pi*L / (G*d^4). Therefore Rigidity Modulus G = 128*pi*L / (d^4 * m). Current experimental slope m = ${regressionAnalysis.slope} s^2/(kg*m^2).`;
      } else if (q.includes('length') || q.includes('period')) {
        reply = `Increasing wire length L decreases torsional rigidity C = G*J/L, making the wire more flexible and increasing oscillation period T = 2*pi*sqrt(I/C).`;
      } else {
        reply = `Torsional Telemetry: Material = ${selectedMaterial.name}, Length L = ${wireState.lengthM} m, Diameter d = ${wireState.diameterMm} mm, Total I = ${momentOfInertiaMetrics.I_total} kg*m^2, Period T = ${theoreticalPeriodMetrics.periodT} s.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Trial', 'Added Mass (kg)', 'Total Mass (kg)', 'Moment of Inertia I (kg*m^2)', 'Oscillations N', 'Total Time t (s)', 'Period T (s)', 'T^2 (s^2)'],
    ];
    trials.forEach((t) => {
      rows.push([
        String(t.trialNumber),
        String(t.addedMassTotalKg),
        String(t.totalMassKg),
        String(t.totalMomentOfInertiaKgM2),
        String(t.numOscillations),
        String(t.totalTimeSeconds),
        String(t.periodTSeconds),
        String(t.periodSquaredT2),
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `torsional_pendulum_readings.csv`;
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
                <BookOpen className="w-4 h-4 shrink-0" /> STEP {currentStepIndex} / 17
              </h3>
              <span className="text-[10px] text-zinc-400">Progressive Mode</span>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-cyan-500/40 space-y-1.5">
              <div className="font-bold text-cyan-300 text-xs">
                Step {currentStepIndex}: {torsionalPendulumConfig.procedure[currentStepIndex - 1]?.instruction}
              </div>
              <div className="text-[10px] text-emerald-400 pt-1 border-t border-white/5">
                Expected: {torsionalPendulumConfig.procedure[currentStepIndex - 1]?.expectedAction}
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
                    <th className="p-2">Trial</th>
                    <th className="p-2">Mass (kg)</th>
                    <th className="p-2">I (kg·m²)</th>
                    <th className="p-2">t (s)</th>
                    <th className="p-2">T (s)</th>
                    <th className="p-2">T² (s²)</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[10px]">
                  {trials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-zinc-500">
                        No trials saved. Twist disc, release, and click Save Trial.
                      </td>
                    </tr>
                  ) : (
                    trials.map((t, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2 text-cyan-300 font-bold">#{t.trialNumber}</td>
                        <td className="p-2 text-zinc-300">{t.totalMassKg.toFixed(2)} kg</td>
                        <td className="p-2 text-emerald-400 font-bold">{t.totalMomentOfInertiaKgM2}</td>
                        <td className="p-2 text-amber-300">{t.totalTimeSeconds} s</td>
                        <td className="p-2 text-white font-bold">{t.periodTSeconds} s</td>
                        <td className="p-2 text-cyan-300 font-bold">{t.periodSquaredT2}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteTrial(idx)}
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
              <Activity className="w-4 h-4 shrink-0" /> T² vs Moment of Inertia I Graph
            </h3>

            <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-2">
              <div className="w-full h-48 bg-black/80 rounded-xl border border-white/10 relative p-2 flex items-center justify-center">
                <svg viewBox="0 0 300 150" className="w-full h-full">
                  <line x1="30" y1="130" x2="280" y2="130" stroke="#3f3f46" strokeWidth="1" />
                  <line x1="30" y1="20" x2="30" y2="130" stroke="#3f3f46" strokeWidth="1" />
                  <text x="35" y="30" fill="#a1a1aa" fontSize="9">T² (s²)</text>
                  <text x="240" y="125" fill="#a1a1aa" fontSize="9">I (kg·m²)</text>

                  {/* Best-Fit Linear Regression Line */}
                  {trials.length >= 2 && (
                    <line
                      x1="30"
                      y1="120"
                      x2="280"
                      y2={Math.max(20, 120 - regressionAnalysis.slope * 15)}
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                  )}

                  {/* Data Points */}
                  {trials.map((t, idx) => {
                    const cx = 30 + (t.totalMomentOfInertiaKgM2 / 0.03) * 230;
                    const cy = 130 - (t.periodSquaredT2 / 30) * 100;
                    return (
                      <circle key={idx} cx={cx} cy={cy} r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                    );
                  })}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Slope m (T²/I)</div>
                  <div className="font-bold text-cyan-300 text-xs">{regressionAnalysis.slope} s²/(kg·m²)</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Fit R²</div>
                  <div className="font-bold text-emerald-400 text-xs">{regressionAnalysis.rSquared}</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Derived Rigidity G</div>
                  <div className="font-bold text-amber-300 text-xs">{regressionAnalysis.experimentalG_GPa} GPa</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Percentage Error</div>
                  <div className="font-bold text-red-300 text-xs">{regressionAnalysis.percentageError}%</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'COMPARISON':
        return (
          <div className="space-y-3 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0" /> Wire Material Permittivity & Rigidity Comparison
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-sky-400 border-b border-white/10 pb-1">STEEL WIRE (BASELINE)</div>
                <div><span className="text-zinc-400">Ref G:</span> 79.3 GPa</div>
                <div><span className="text-zinc-400">Polar J:</span> {(TorsionalPendulumEngine.calculatePolarMomentJ(0.0008) * 1e12).toFixed(4)} ×10⁻¹² m⁴</div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-cyan-500/40 space-y-1">
                <div className="font-bold text-cyan-300 border-b border-white/10 pb-1">{selectedMaterial.name.toUpperCase()}</div>
                <div><span className="text-zinc-400">Ref G:</span> {selectedMaterial.rigidityModulusGPa} GPa</div>
                <div><span className="text-zinc-400">Derived G_exp:</span> <strong className="text-emerald-400">{regressionAnalysis.experimentalG_GPa} GPa</strong></div>
                <div><span className="text-zinc-400">% Error:</span> <strong className="text-red-300">{regressionAnalysis.percentageError}%</strong></div>
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

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-2.5 text-[11px] leading-relaxed font-mono">
              <div className="font-bold text-white text-xs border-b border-white/10 pb-1">
                LAB REPORT: EXPERIMENT 10 (RIGIDITY MODULUS BY TORSIONAL PENDULUM)
              </div>

              {/* EXPERIMENTAL RESULT CARD */}
              <div className="bg-zinc-900 p-3 rounded-xl border border-cyan-500/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-xs">EXPERIMENTAL RESULT</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    regressionAnalysis.percentageError <= 5.0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {regressionAnalysis.percentageError <= 5.0 ? 'GOOD AGREEMENT ✓' : 'REPEAT MEASUREMENT ⚠'}
                  </span>
                </div>
                <div><span className="text-zinc-400">Experimental G:</span> <strong className="text-emerald-400 text-xs">{regressionAnalysis.experimentalG_GPa} GPa</strong></div>
                <div><span className="text-zinc-400">Reference G:</span> <strong className="text-cyan-300">{selectedMaterial.rigidityModulusGPa} GPa</strong></div>
                <div><span className="text-zinc-400">Percentage Error:</span> <strong className="text-red-300">{regressionAnalysis.percentageError}%</strong></div>
              </div>

              {/* d^4 Educational Sensitivity Card */}
              <div className="bg-purple-950/40 p-2.5 rounded-xl border border-purple-500/30 space-y-1 text-[10px]">
                <div className="font-bold text-purple-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> EDUCATIONAL INSIGHT: d⁴ SENSITIVITY
                </div>
                <div className="text-purple-200/90">
                  Polar second moment of area J = (π d⁴) / 32. Because G ∝ 1/d⁴, a small +1% measurement error in wire diameter d amplifies into a ~4.06% change in d⁴, shifting derived G by ~3.9%!
                </div>
              </div>

              <div><span className="text-zinc-400">Wire Length L:</span> {wireState.lengthM} m</div>
              <div><span className="text-zinc-400">Mean Wire Diameter d:</span> {wireState.diameterMm} mm</div>
              <div><span className="text-zinc-400">T² vs I Slope m:</span> {regressionAnalysis.slope} s²/(kg·m²)</div>

              <div className="pt-2 border-t border-white/10 space-y-1 text-[10px]">
                <div className="font-bold text-cyan-400">Standard Lab Precautions:</div>
                <div className="text-zinc-400">• Keep initial twist angle small (θ ≤ 10°) for linear restoring torque SHM.</div>
                <div className="text-zinc-400">• Ensure slotted masses are positioned symmetrically at distance r.</div>
                <div className="text-zinc-400">• Take screw gauge readings at top, middle, and bottom to find true mean d.</div>
              </div>

              <div className="pt-2 border-t border-white/10 text-emerald-400 font-bold">
                Conclusion: Rigidity modulus determined as G = {regressionAnalysis.experimentalG_GPa} GPa.
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
              {[
                'Why measure diameter carefully?',
                'Why small initial angle?',
                'What does graph slope represent?',
                'How does wire length affect T?',
              ].map((chip) => (
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
              <Award className="w-4 h-4 shrink-0" /> Conceptual Assessment Questions
            </h3>

            <div className="space-y-2.5">
              {[
                { id: 1, q: '1. Why does wire diameter d have the strongest impact on torsional rigidity?', opts: ['Torsional constant C depends on d⁴', 'Disc mass M doubles', 'Length L increases'] },
                { id: 2, q: '2. What is the physical significance of small initial angular displacement (θ <= 10°)?', opts: ['Maintains simple harmonic torsional motion', 'Spins the disc faster', 'Reduces wire length'] },
                { id: 3, q: '3. In the T² vs I graph, what quantity does the linear slope m represent?', opts: ['m = 128*pi*L / (G*d⁴)', 'm = G * d⁴', 'm = 2*pi / L'] },
              ].map((item) => (
                <div key={item.id} className="bg-zinc-950 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-xs">
                  <div className="font-bold text-white">{item.q}</div>
                  <div className="space-y-1">
                    {item.opts.map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-zinc-300 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name={`tq_${item.id}`}
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
            EXP 10: RIGIDITY MODULUS (TORSIONAL PENDULUM)
          </h1>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase hidden md:inline shrink-0">
            Torsional Engine
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowScrewGaugeModal(true)}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Virtual Screw Gauge</span>
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
              {torsionalPendulumConfig.apparatus.map((item) => (
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

        {/* CENTER PRIMARY TORSIONAL PENDULUM HERO CANVAS */}
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

          {/* 2.5D TORSIONAL PENDULUM HERO VIEWPORT */}
          <div className="w-full max-w-6xl mx-auto flex-1 min-h-[300px] sm:min-h-[360px] bg-black/80 rounded-3xl border-2 border-cyan-500/40 p-4 relative overflow-hidden shadow-2xl flex flex-col items-center justify-around my-auto font-mono text-xs">
            
            <div className="w-full max-w-3xl flex flex-col items-center space-y-2">
              <div className="flex items-center justify-between w-full text-[11px]">
                <span className="text-zinc-400">Material: <strong className="text-cyan-300">{selectedMaterial.name} (G={selectedMaterial.rigidityModulusGPa} GPa)</strong></span>
                <span className="text-zinc-400">Wire L: <strong className="text-emerald-400">{wireState.lengthM} m</strong>, d: <strong className="text-amber-300">{wireState.diameterMm} mm</strong></span>
                <span className="text-zinc-400">Total I: <strong className="text-purple-300">{momentOfInertiaMetrics.I_total} kg·m²</strong></span>
              </div>

              {/* TORSIONAL PENDULUM CANVAS FRAME */}
              <div className="relative w-full h-52 bg-zinc-950 rounded-2xl border border-white/20 p-4 flex flex-col items-center justify-between overflow-hidden shadow-inner">
                
                {/* Rigid Laboratory Top Clamp */}
                <div className="w-32 h-4 bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-700 rounded border border-white/20 shadow-md flex items-center justify-center text-[8px] font-bold text-zinc-200">
                  RIGID WIRE CLAMP
                </div>

                {/* Dynamic Twisting Vertical Torsion Wire */}
                <div className="relative flex-1 w-2 flex flex-col justify-around items-center my-0.5">
                  <div
                    className="w-1.5 h-full rounded transition-transform duration-75 shadow"
                    style={{
                      backgroundColor: selectedMaterial.colorHex,
                      transform: `rotate(${oscState.currentAngleDeg * 1.5}deg)`,
                    }}
                  />
                </div>

                {/* Circular Heavy Metal Disc & Pointer Assembly */}
                <div className="relative flex items-center justify-center my-1">
                  {/* Outer Circular 360° Protractor Scale */}
                  <div className="w-40 h-10 rounded-full border-2 border-dashed border-cyan-400/60 flex items-center justify-center relative">
                    {/* Metal Disc */}
                    <div
                      className="w-36 h-8 rounded-full bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-700 border-2 border-white shadow-2xl flex items-center justify-around transition-transform duration-75 relative"
                      style={{
                        transform: `rotate(${oscState.currentAngleDeg}deg)`,
                      }}
                    >
                      {/* Symmetrical Slotted Masses on Disc */}
                      {slottedMassState.count > 0 && (
                        <>
                          <div className="w-5 h-5 rounded-full bg-amber-400 border border-black shadow flex items-center justify-center text-[7px] font-bold text-black">
                            +m
                          </div>
                          <div className="w-5 h-5 rounded-full bg-amber-400 border border-black shadow flex items-center justify-center text-[7px] font-bold text-black">
                            +m
                          </div>
                        </>
                      )}

                      {/* Needle Pointer */}
                      <div className="absolute -top-3 w-1 h-5 bg-red-500 shadow-md" />
                    </div>
                  </div>
                </div>

                {/* Laboratory Base Stand */}
                <div className="w-48 h-3 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 rounded border-t border-white/20 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                  STABLE BASE STAND
                </div>
              </div>

              {/* Angle Twist Slider & Controls */}
              <div className="w-full bg-zinc-900/80 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-3">
                <span className="text-[10px] text-zinc-400 font-bold min-w-[140px]">
                  INITIAL TWIST: <strong className="text-cyan-300">{oscState.initialAngleDeg}°</strong>
                </span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  disabled={oscState.isOscillating}
                  value={oscState.initialAngleDeg}
                  onChange={(e) => handleRotateDiscAngle(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            {/* LIVE TELEMETRY DASHBOARD */}
            <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Twist Angle θ(t)</div>
                <div className="font-bold text-cyan-300 text-sm">{oscState.currentAngleDeg}°</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Elapsed Time t</div>
                <div className="font-bold text-emerald-400 text-sm">{oscState.elapsedTimeSeconds.toFixed(2)} s</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Oscillations N</div>
                <div className="font-bold text-amber-300 text-sm">{oscState.currentOscillationCount} / {oscState.targetOscillations}</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Period T</div>
                <div className="font-bold text-purple-300 text-sm">{theoreticalPeriodMetrics.periodT} s</div>
              </div>
            </div>
          </div>

          {/* LOWER CONTROLS BAR */}
          <div className="w-full max-w-6xl mx-auto bg-zinc-900/90 border-2 border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 font-mono text-xs space-y-3 min-w-0 shrink-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Focus className="w-5 h-5 text-cyan-400 shrink-0" />
                <span className="font-bold text-sm text-white">TORSIONAL EXPERIMENT CONTROLS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Wire Material:</span>
                <select
                  value={wireState.materialId}
                  onChange={(e) => handleSelectMaterial(e.target.value)}
                  className="bg-zinc-950 border border-white/15 rounded-lg px-2 py-0.5 text-xs text-cyan-300 font-bold"
                >
                  {WIRE_MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} (G={m.rigidityModulusGPa} GPa)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              
              {/* Slotted Mass Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-bold whitespace-nowrap">Added Masses:</span>
                <div className="flex items-center gap-1">
                  {[0, 2, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleSetSlottedMassCount(count)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                        slottedMassState.count === count
                          ? 'bg-cyan-500 text-black border-cyan-400'
                          : 'bg-zinc-800 text-zinc-300 border-white/10'
                      }`}
                    >
                      {count === 0 ? 'None' : `${count * 200}g`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Release / Reset Buttons */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleReleasePendulum}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                    oscState.isOscillating
                      ? 'bg-amber-500 text-black border-amber-400 shadow-lg'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow'
                  }`}
                >
                  {oscState.isOscillating ? 'Oscillating...' : '1. RELEASE PENDULUM'}
                </button>

                <button
                  type="button"
                  onClick={handleResetPendulum}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold border border-white/10"
                >
                  Reset
                </button>
              </div>

              {/* Save Trial Button */}
              <div>
                <button
                  type="button"
                  onClick={handleSaveTrial}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>2. SAVE TRIAL (T={theoreticalPeriodMetrics.periodT}s)</span>
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

      {/* VIRTUAL SCREW GAUGE MICROMETER MODAL */}
      <AnimatePresence>
        {showScrewGaugeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border-2 border-cyan-500/50 rounded-2xl p-5 max-w-lg w-full font-mono text-xs space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Compass className="w-5 h-5" /> VIRTUAL SCREW GAUGE (MICROMETER)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowScrewGaugeModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-white/10">
                  <div>
                    <div className="text-zinc-400">Position</div>
                    <div className="flex gap-1.5 pt-1">
                      {(['Top', 'Middle', 'Bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setSgActivePosition(pos)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            sgActivePosition === pos ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-400">Least Count (LC)</div>
                    <div className="font-bold text-amber-300">0.01 mm</div>
                  </div>
                </div>

                {/* Screw Gauge Visual Frame */}
                <div className="w-full h-32 bg-zinc-950 rounded-xl border border-cyan-500/30 p-3 flex items-center justify-around relative overflow-hidden">
                  <div className="w-24 h-16 border-4 border-r-0 border-zinc-600 rounded-l-full flex items-center justify-center text-[9px] text-zinc-400 font-bold">
                    FRAME
                  </div>
                  <div className="w-2 h-10 bg-zinc-400 border border-black" />
                  <div className="w-16 h-8 bg-zinc-700 border border-white/20 flex items-center justify-center text-[9px] text-emerald-400 font-bold">
                    d = {wireState.diameterMm} mm
                  </div>
                  <div className="w-20 h-12 bg-gradient-to-r from-zinc-600 to-zinc-400 rounded-r border border-white/30 flex items-center justify-center text-[9px] text-cyan-300 font-bold">
                    THIMBLE
                  </div>
                </div>

                <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-white/10">
                  <div>
                    <div className="text-zinc-400">Current Measured d</div>
                    <div className="font-bold text-emerald-400 text-sm">{wireState.diameterMm} mm</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddScrewGaugeReading}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs"
                  >
                    + Record Position
                  </button>
                </div>

                {screwGaugeReadings.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-bold text-zinc-300 text-[11px]">Recorded Diameters:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {screwGaugeReadings.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 bg-zinc-800 text-cyan-300 rounded border border-white/10 text-[10px]">
                          {r.positionName}: {r.measuredDiameterMm} mm
                        </span>
                      ))}
                    </div>
                    <div className="text-emerald-400 font-bold text-xs pt-1">
                      Mean Diameter d = {meanDiameterMm} mm
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
