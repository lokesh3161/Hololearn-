import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
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
  Scale,
  Activity,
  Sliders,
  Check,
  HelpCircle,
  BarChart2,
  RefreshCw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  Eye,
  Thermometer,
  Grid,
  Maximize2,
  PackageCheck,
  ArrowRight,
  ArrowLeft,
  Sun,
  Focus,
  SlidersVertical,
  Maximize,
  HelpCircle as QuestionIcon,
} from 'lucide-react';

import type { ExperimentConfig } from '../../types';
import type {
  OpticsLightSource,
  NewtonsRingsReading,
  NewtonsRingsState,
  MicroscopeState,
  OpticsEvent,
  MisconceptionWarning,
  TrialData,
} from '../../types/opticsExperimentTypes';

import { newtonsRingsConfig } from '../../chemistry/newtonsRings';
import { OpticsNewtonsRingsEngine, DEFAULT_LIGHT_SOURCES } from '../../engines/OpticsNewtonsRingsEngine';
import { labSound } from '../../utils/LabSoundManager';

interface NewtonsRingsLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const NewtonsRingsLab: React.FC<NewtonsRingsLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. CORE LABORATORY STATE ──────────────────────────────────────
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);
  const [lensPlaced, setLensPlaced] = useState<boolean>(false);
  const [lampActive, setLampActive] = useState<boolean>(false);
  const [selectedLightSource, setSelectedLightSource] = useState<OpticsLightSource>(DEFAULT_LIGHT_SOURCES[0]);
  const [nominalRadiusCm, setNominalRadiusCm] = useState<number>(100);

  const [microscopeState, setMicroscopeState] = useState<MicroscopeState>({
    positionXMm: 0.0,
    focusBlurPx: 4,
    isFocused: false,
    mainScaleMm: 0,
    vernierScaleMm: 0,
    leastCountMm: 0.01,
    locked: false,
  });

  const [selectedRingOrder, setSelectedRingOrder] = useState<number>(4);
  const [tempLeftMm, setTempLeftMm] = useState<number | null>(null);
  const [readings, setReadings] = useState<NewtonsRingsReading[]>([]);
  const [noiseEnabled, setNoiseEnabled] = useState<boolean>(false);

  // App Collapsible Drawers & Views
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

  const [activeView, setActiveView] = useState<'APPARATUS' | 'MICROSCOPE' | 'TOP' | 'RINGS' | 'MEASUREMENT'>('MICROSCOPE');
  const [activeTab, setActiveTab] = useState<
    'PROCEDURE' | 'DATA' | 'GRAPH' | 'TELEMETRY' | 'ERROR_ANALYSIS' | 'TRIALS' | 'REPORT' | 'AI_MENTOR' | 'ASSESSMENT'
  >('PROCEDURE');

  const [realisticMode, setRealisticMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Validation & Misconception Alert State
  const [validationGateAlert, setValidationGateAlert] = useState<string | null>(null);
  const [trials, setTrials] = useState<TrialData[]>([]);

  // Telemetry & Event Log
  const [eventLog, setEventLog] = useState<OpticsEvent[]>([]);

  // AI Mentor State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '👋 Welcome to Experiment 07: Determination of Radius of Curvature by Newton’s Rings! Place the plano-convex lens on the flat glass plate, activate the Sodium lamp, and focus the travelling microscope.',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  const logEvent = useCallback((event: OpticsEvent) => {
    setEventLog((prev) => [...prev, event]);
  }, []);

  // Linear Regression Calculation
  const regressionResults = useMemo(() => {
    return OpticsNewtonsRingsEngine.calculateLinearRegression(
      readings,
      selectedLightSource.wavelengthNm,
      nominalRadiusCm
    );
  }, [readings, selectedLightSource.wavelengthNm, nominalRadiusCm]);

  // Misconception Warnings
  const misconceptions: MisconceptionWarning[] = useMemo(() => {
    return OpticsNewtonsRingsEngine.detectMisconceptions(readings, eventLog);
  }, [readings, eventLog]);

  // Keyboard Arrow Key Micrometer Stepping Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleMoveMicroscope(-0.1);
      } else if (e.key === 'ArrowRight') {
        handleMoveMicroscope(0.1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync inputs with parent runner
  useEffect(() => {
    onUpdateInput('lensPlaced', lensPlaced);
    onUpdateInput('lampActive', lampActive);
    onUpdateInput('wavelengthNm', selectedLightSource.wavelengthNm);
    onUpdateInput('radiusCm', nominalRadiusCm);
    onUpdateInput('isFocused', microscopeState.isFocused);
    onUpdateInput('readingsCount', readings.length);
    onUpdateInput('slope', regressionResults.slopeCm2PerN);
    onUpdateInput('derivedRadiusCm', regressionResults.derivedRadiusCm);
    onUpdateInput('percentageError', regressionResults.percentageError);
  }, [lensPlaced, lampActive, selectedLightSource, nominalRadiusCm, microscopeState.isFocused, readings.length, regressionResults, onUpdateInput]);

  // ── 2. USER INTERACTION HANDLERS ─────────────────────────────────

  const handlePlaceLens = () => {
    if (soundEnabled) labSound.playGlassTouch();
    setLensPlaced(true);
    setCurrentStepIndex(2);
    logEvent({ type: 'optics_lab_started' });
    onCompleteStep(1);
  };

  const handleToggleLamp = () => {
    if (soundEnabled) labSound.playClick();
    const nextLamp = !lampActive;
    setLampActive(nextLamp);
    if (nextLamp) {
      setCurrentStepIndex(4);
      logEvent({ type: 'light_source_selected', wavelengthNm: selectedLightSource.wavelengthNm });
      onCompleteStep(2);
      onCompleteStep(3);
    }
  };

  const handleSelectLightSource = (src: OpticsLightSource) => {
    if (soundEnabled) labSound.playClick();
    setSelectedLightSource(src);
    logEvent({ type: 'light_source_selected', wavelengthNm: src.wavelengthNm });
  };

  const handleFocusMicroscope = () => {
    if (soundEnabled) labSound.playClick();
    setMicroscopeState((prev) => ({
      ...prev,
      focusBlurPx: 0,
      isFocused: true,
    }));
    setValidationGateAlert(null);
    setCurrentStepIndex(6);
    logEvent({ type: 'microscope_focused' });
    onCompleteStep(4);
    onCompleteStep(5);
  };

  const handleMoveMicroscope = (deltaMm: number) => {
    if (microscopeState.locked) return;
    if (soundEnabled) labSound.playStirring();
    setMicroscopeState((prev) => {
      const nextPos = Number((prev.positionXMm + deltaMm).toFixed(2));
      const boundedPos = Math.max(-15.0, Math.min(15.0, nextPos));
      const mainScale = Math.floor(boundedPos);
      const vernier = Number((Math.abs(boundedPos - mainScale)).toFixed(2));
      return {
        ...prev,
        positionXMm: boundedPos,
        mainScaleMm: mainScale,
        vernierScaleMm: vernier,
      };
    });
    logEvent({ type: 'microscope_moved', positionMm: microscopeState.positionXMm });
  };

  const handleRecordLeftReading = () => {
    // Validation Gate Check
    if (!microscopeState.isFocused) {
      setValidationGateAlert('⚠ Microscope must be focused before recording fringe readings.');
      return;
    }
    setValidationGateAlert(null);
    if (soundEnabled) labSound.playDataRecorded();
    setTempLeftMm(microscopeState.positionXMm);
    setCurrentStepIndex(7);
    onCompleteStep(6);
  };

  const handleRecordRightReading = () => {
    if (!microscopeState.isFocused || tempLeftMm === null) {
      setValidationGateAlert('⚠ Record Left micrometer reading first before recording Right position.');
      return;
    }
    setValidationGateAlert(null);
    if (soundEnabled) labSound.playDataRecorded();

    const leftMm = tempLeftMm;
    const rightMm = microscopeState.positionXMm;
    const diameterMm = Number(Math.abs(rightMm - leftMm).toFixed(2));
    const diameterCm = diameterMm / 10.0;
    const diameterSqCm2 = Number((diameterCm * diameterCm).toFixed(4));

    const newReading: NewtonsRingsReading = {
      ringOrder: selectedRingOrder,
      leftReadingMm: leftMm,
      rightReadingMm: rightMm,
      diameterMm,
      diameterCm,
      diameterSqCm2,
    };

    setReadings((prev) => {
      const filtered = prev.filter((r) => r.ringOrder !== selectedRingOrder);
      return [...filtered, newReading].sort((a, b) => a.ringOrder - b.ringOrder);
    });

    setTempLeftMm(null);
    logEvent({ type: 'reading_added', ringOrder: selectedRingOrder, leftMm, rightMm });
    onCompleteStep(7);
    onCompleteStep(8);

    if (readings.length + 1 >= 5) {
      setCurrentStepIndex(10);
      onCompleteStep(9);
      onCompleteStep(10);
    }
  };

  const handleSaveTrial = () => {
    if (readings.length < 2) return;
    if (soundEnabled) labSound.playSuccess();
    const newTrial: TrialData = {
      trialId: trials.length + 1,
      wavelengthNm: selectedLightSource.wavelengthNm,
      readings: [...readings],
      slopeCm2PerN: regressionResults.slopeCm2PerN,
      derivedRadiusCm: regressionResults.derivedRadiusCm,
      rSquared: regressionResults.rSquared,
    };
    setTrials((prev) => [...prev, newTrial]);
  };

  const handleDeleteReading = (ringOrder: number) => {
    if (soundEnabled) labSound.playClick();
    setReadings((prev) => prev.filter((r) => r.ringOrder !== ringOrder));
  };

  const handleClearReadings = () => {
    if (soundEnabled) labSound.playReset();
    setReadings([]);
    setTempLeftMm(null);
    logEvent({ type: 'data_cleared' });
  };

  const handleResetLab = () => {
    if (soundEnabled) labSound.playReset();
    setLensPlaced(false);
    setLampActive(false);
    setSelectedLightSource(DEFAULT_LIGHT_SOURCES[0]);
    setNominalRadiusCm(100);
    setMicroscopeState({
      positionXMm: 0.0,
      focusBlurPx: 4,
      isFocused: false,
      mainScaleMm: 0,
      vernierScaleMm: 0,
      leastCountMm: 0.01,
      locked: false,
    });
    setSelectedRingOrder(4);
    setTempLeftMm(null);
    setReadings([]);
    setNoiseEnabled(false);
    setActiveView('MICROSCOPE');
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

      if (q.includes('circular')) {
        reply = 'Newton’s rings are circular because the air film between the spherical convex lens surface and the flat glass plate has cylindrical circular symmetry with equal film thickness at a constant radius.';
      } else if (q.includes('dark central') || q.includes('central spot')) {
        reply = 'The central spot is dark in reflected light because rays reflected from the lower glass surface undergo a π (180°) phase reversal, causing destructive interference at point contact (air thickness t = 0).';
      } else if (q.includes('diameter') || q.includes('d^2')) {
        reply = 'We plot Diameter Squared (D_n^2) against Ring Order (n) because D_n^2 = 4nλR. This yields a straight line with slope m = 4λR, allowing us to calculate R = Slope / (4λ) accurately.';
      } else if (q.includes('slope')) {
        reply = `The slope of D_n^2 vs n is currently ${regressionResults.slopeCm2PerN} cm²/n. Using R = Slope / (4λ), your derived radius of curvature is R = ${regressionResults.derivedRadiusCm} cm (${regressionResults.derivedRadiusM} m).`;
      } else if (q.includes('error')) {
        reply = `Percentage error is currently ${regressionResults.percentageError.toFixed(2)}%. Main sources of error include fringe boundary location uncertainty and micrometer backlash.`;
      } else {
        reply = `Live Optical Telemetry: Wavelength λ = ${selectedLightSource.wavelengthNm} nm, Slope = ${regressionResults.slopeCm2PerN} cm²/n, Derived Radius R = ${regressionResults.derivedRadiusCm} cm.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Ring Order (n)', 'Left Reading (mm)', 'Right Reading (mm)', 'Diameter (mm)', 'Diameter (cm)', 'D_n^2 (cm²)'],
    ];
    readings.forEach((r) => {
      rows.push([
        String(r.ringOrder),
        String(r.leftReadingMm),
        String(r.rightReadingMm),
        String(r.diameterMm),
        String(r.diameterCm),
        String(r.diameterSqCm2),
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `newtons_rings_data_${selectedLightSource.id}.csv`;
    link.click();
  };

  const generatedRings = useMemo(() => {
    const ringOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    return ringOrders.map((n) => {
      const diameterMm = OpticsNewtonsRingsEngine.calculateDarkRingDiameterMm(n, selectedLightSource.wavelengthNm, nominalRadiusCm);
      const radiusPx = (diameterMm / 2.0) * 12.0;
      return { n, diameterMm, radiusPx };
    });
  }, [selectedLightSource.wavelengthNm, nominalRadiusCm]);

  // Tab Content Renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'PROCEDURE':
        return (
          <div className="space-y-2.5 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <h3 className="font-bold text-xs text-cyan-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" /> STEP {currentStepIndex} / 10
              </h3>
              <span className="text-[10px] text-zinc-400">Progressive Mode</span>
            </div>

            {/* Active Step Only */}
            <div className="bg-zinc-950 p-3 rounded-xl border border-cyan-500/40 space-y-1.5">
              <div className="font-bold text-cyan-300 text-xs">
                Step {currentStepIndex}: {newtonsRingsConfig.procedure[currentStepIndex - 1]?.instruction}
              </div>
              <div className="text-[10px] text-emerald-400 pt-1 border-t border-white/5">
                Expected: {newtonsRingsConfig.procedure[currentStepIndex - 1]?.expectedAction}
              </div>
            </div>
          </div>
        );

      case 'DATA':
        return (
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 shrink-0" /> Observation Table (D_n^2 vs n)
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveTrial}
                  disabled={readings.length < 2}
                  className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold"
                >
                  Save Trial
                </button>
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
                    <th className="p-2">Ring (n)</th>
                    <th className="p-2">X_L (mm)</th>
                    <th className="p-2">X_R (mm)</th>
                    <th className="p-2">D_n (mm)</th>
                    <th className="p-2">D_n (cm)</th>
                    <th className="p-2">D_n^2 (cm²)</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[10px]">
                  {readings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-zinc-500">
                        No fringe readings recorded yet.
                      </td>
                    </tr>
                  ) : (
                    readings.map((r) => (
                      <tr key={r.ringOrder} className="hover:bg-white/5">
                        <td className="p-2 text-cyan-300 font-bold">n = {r.ringOrder}</td>
                        <td className="p-2 text-amber-300">{r.leftReadingMm}</td>
                        <td className="p-2 text-amber-300">{r.rightReadingMm}</td>
                        <td className="p-2 text-white">{r.diameterMm}</td>
                        <td className="p-2 text-zinc-300">{r.diameterCm}</td>
                        <td className="p-2 text-emerald-400 font-bold">{r.diameterSqCm2}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteReading(r.ringOrder)}
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
              <Activity className="w-4 h-4 shrink-0" /> Linear Regression Graph: D_n^2 vs n
            </h3>

            <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-3">
              <div className="w-full h-44 bg-black/60 rounded-xl border border-white/10 relative p-2 flex items-center justify-center">
                <svg viewBox="0 0 300 150" className="w-full h-full">
                  <line x1="30" y1="120" x2="280" y2="120" stroke="#3f3f46" strokeWidth="1" />
                  <line x1="30" y1="20" x2="30" y2="120" stroke="#3f3f46" strokeWidth="1" />

                  {readings.length >= 2 && (
                    <line
                      x1="40"
                      y1={`${120 - (regressionResults.slopeCm2PerN * 2 * 6)}`}
                      x2="270"
                      y2={`${120 - (regressionResults.slopeCm2PerN * 16 * 6)}`}
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  )}

                  {readings.map((r) => {
                    const cx = 30 + (r.ringOrder / 18) * 240;
                    const cy = 120 - (r.diameterSqCm2 / 0.3) * 90;
                    return (
                      <g key={r.ringOrder}>
                        <circle cx={cx} cy={cy} r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Slope m = Δ(D²)/Δn</div>
                  <div className="font-bold text-cyan-300 text-xs">{regressionResults.slopeCm2PerN} cm²/n</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">R² Fit Confidence</div>
                  <div className="font-bold text-emerald-400 text-xs">{regressionResults.rSquared}</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Derived Radius R</div>
                  <div className="font-bold text-amber-300 text-xs">{regressionResults.derivedRadiusCm} cm ({regressionResults.derivedRadiusM} m)</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Percentage Error</div>
                  <div className="font-bold text-red-300 text-xs">{regressionResults.percentageError}%</div>
                </div>
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
                  No trial runs saved yet. Record readings and click "Save Trial" in the Data tab.
                </div>
              ) : (
                trials.map((t) => (
                  <div key={t.trialId} className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-1 text-xs">
                    <div className="font-bold text-cyan-300 flex items-center justify-between">
                      <span>Trial #{t.trialId} ({t.wavelengthNm} nm)</span>
                      <span className="text-emerald-400 font-bold">R = {t.derivedRadiusCm} cm</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Slope: {t.slopeCm2PerN} cm²/n | R² Fit: {t.rSquared} | Readings: {t.readings.length}
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
                LAB REPORT: EXPERIMENT 07
              </div>
              <div><span className="text-zinc-400">Aim:</span> Determine radius of curvature (R) of a plano-convex lens using Newton’s rings.</div>
              <div><span className="text-zinc-400">Monochromatic Light:</span> {selectedLightSource.name}</div>
              <div><span className="text-zinc-400">Linear Slope (D_n^2 vs n):</span> {regressionResults.slopeCm2PerN} cm²/n</div>
              <div><span className="text-zinc-400">Experimental Radius R:</span> {regressionResults.derivedRadiusCm} cm ({regressionResults.derivedRadiusM} m)</div>
              <div><span className="text-zinc-400">Nominal Radius R_0:</span> {nominalRadiusCm} cm</div>
              <div><span className="text-zinc-400">Percentage Error:</span> {regressionResults.percentageError}%</div>
              <div className="pt-2 border-t border-white/10 text-emerald-400 font-bold">
                Conclusion: Radius of curvature determined as R = {regressionResults.derivedRadiusCm} cm.
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
              {['Why are rings circular?', 'Why central spot is dark?', 'Why plot D^2 vs n?', 'What does slope represent?', 'Analyze my error'].map((chip) => (
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
                { id: 1, q: '1. What produces Newton’s rings interference fringes?', opts: ['Diffraction at lens edge', 'Thin film interference in air gap', 'Refraction through lens'] },
                { id: 2, q: '2. Why is the central spot dark in reflected light?', opts: ['Light is completely absorbed', '180° (π) phase shift at lower plate creates destructive interference', 'Lens blocks the light'] },
                { id: 3, q: '3. What is the mathematical relationship for dark ring diameter squared?', opts: ['D_n^2 = 4nλR', 'D_n = nλR', 'D_n^2 = 2nλ/R'] },
                { id: 4, q: '4. Why do we plot D_n^2 against ring order n?', opts: ['To form a circle', 'To obtain a straight line with slope m = 4λR', 'To eliminate wavelength'] },
                { id: 5, q: '5. How does increasing light wavelength λ change ring spacing?', opts: ['Rings contract', 'Ring diameters increase & spread out', 'No change'] },
              ].map((item) => (
                <div key={item.id} className="bg-zinc-950 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-xs">
                  <div className="font-bold text-white">{item.q}</div>
                  <div className="space-y-1">
                    {item.opts.map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-zinc-300 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name={`nq_${item.id}`}
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
            EXP 07: NEWTON’S RINGS (RADIUS OF CURVATURE)
          </h1>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase hidden md:inline shrink-0">
            Optics Engine
          </span>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setNoiseEnabled(!noiseEnabled)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              noiseEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-zinc-800 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Instrument Noise</span>
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

        {/* Mobile Options Button */}
        <div className="flex md:hidden items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Options Modal */}
      <AnimatePresence>
        {showMobileMoreMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 right-3 z-50 bg-zinc-900 border border-white/20 rounded-2xl p-3 shadow-2xl space-y-2 font-mono text-xs md:hidden w-48"
          >
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold border-b border-white/10 pb-1">
              <span>OPTICS CONTROLS</span>
              <button type="button" onClick={() => setShowMobileMoreMenu(false)}>
                <X className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setNoiseEnabled(!noiseEnabled);
                setShowMobileMoreMenu(false);
              }}
              className={`w-full py-1.5 px-2 rounded-xl text-left border flex items-center gap-2 ${
                noiseEnabled ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' : 'bg-zinc-800 text-zinc-300 border-white/10'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Noise: {noiseEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleResetLab();
                setShowMobileMoreMenu(false);
              }}
              className="w-full py-1.5 px-2 rounded-xl text-left bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-2 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Lab</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESPONSIVE MAIN WORKSPACE (WITH COLLAPSIBLE DRAWERS) ──── */}
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
              {newtonsRingsConfig.apparatus.map((item) => (
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

        {/* CENTER PRIMARY OPTICAL HERO WORKSPACE */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-2.5 sm:p-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col justify-between space-y-3 sm:space-y-4">
          
          {/* Validation Gate Alert Notice */}
          {validationGateAlert && (
            <div className="w-full max-w-6xl mx-auto bg-amber-500/20 border border-amber-500/50 rounded-2xl p-2.5 text-amber-200 text-xs font-mono flex items-center justify-between">
              <span>{validationGateAlert}</span>
              <button type="button" onClick={() => setValidationGateAlert(null)} className="text-amber-400 font-bold">✕</button>
            </div>
          )}

          {/* Misconception Detection Warnings Banner */}
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

          {/* OPTICAL BENCH VIEW MODE TOGGLE BAR */}
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between bg-zinc-900/80 border border-white/10 rounded-2xl p-2 font-mono text-xs shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
              {(['MICROSCOPE', 'APPARATUS', 'TOP', 'RINGS', 'MEASUREMENT'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveView(mode)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all text-[11px] ${
                    activeView === mode ? 'bg-cyan-500 text-black shadow' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode} VIEW
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="text-zinc-400">λ:</span>
              <span className="font-bold text-cyan-300">{selectedLightSource.wavelengthNm} nm</span>
            </div>
          </div>

          {/* MAIN HERO VIEWPORT (MICROSCOPE EYEPIECE / APPARATUS) */}
          <div className="w-full max-w-6xl mx-auto flex-1 min-h-[280px] sm:min-h-[340px] bg-black/80 rounded-3xl border-2 border-cyan-500/40 p-4 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center my-auto">
            
            {/* MICROSCOPE EYEPIECE VIEW MODE (PRIMARY HERO) */}
            {activeView === 'MICROSCOPE' && (
              <div className="relative flex flex-col items-center justify-center w-full h-full">
                
                {/* Circular Microscope Eyepiece Outer Ring */}
                <div
                  className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-zinc-700 bg-black flex items-center justify-center overflow-hidden shadow-2xl"
                  style={{
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9), 0 0 25px rgba(6, 182, 212, 0.3)',
                  }}
                >
                  {/* Procedural Newton's Rings Fringe Visualizer */}
                  {lampActive && lensPlaced && (
                    <div
                      className="absolute inset-0 flex items-center justify-center transition-all duration-300"
                      style={{
                        filter: `blur(${microscopeState.focusBlurPx}px)`,
                        transform: `translateX(${-microscopeState.positionXMm * 12}px)`,
                      }}
                    >
                      <svg viewBox="0 0 300 300" className="w-full h-full">
                        {/* Central Dark Spot */}
                        <circle cx="150" cy="150" r="8" fill="#000000" stroke={selectedLightSource.colorHex} strokeWidth="1" />

                        {/* Concentric Interference Rings */}
                        {generatedRings.map((ring) => (
                          <g key={ring.n}>
                            <circle
                              cx="150"
                              cy="150"
                              r={ring.radiusPx}
                              fill="none"
                              stroke={selectedLightSource.colorHex}
                              strokeWidth="2.5"
                              opacity={0.85 - ring.n * 0.03}
                            />
                            <circle
                              cx="150"
                              cy="150"
                              r={ring.radiusPx + 2}
                              fill="none"
                              stroke="#000000"
                              strokeWidth="1.5"
                            />
                          </g>
                        ))}
                      </svg>
                    </div>
                  )}

                  {!lampActive && (
                    <div className="text-zinc-600 text-xs font-mono text-center px-4">
                      [ Monochromatic Lamp Off — Activate Sodium Lamp to view interference rings ]
                    </div>
                  )}

                  {!lensPlaced && lampActive && (
                    <div className="text-amber-400/80 text-xs font-mono text-center px-4">
                      [ Place Plano-Convex Lens on Glass Plate ]
                    </div>
                  )}

                  {/* Fixed Crosshair Reticle Line Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-0.5 bg-cyan-400/70" />
                    <div className="absolute h-full w-0.5 bg-cyan-400/70" />
                    <div className="w-3 h-3 border border-cyan-400 rounded-full bg-cyan-400/20" />
                  </div>
                </div>

                {/* Eyepiece Bottom Overlay Info */}
                <div className="mt-2 flex items-center gap-4 text-[11px] font-mono">
                  <span className="text-zinc-400">Position X: <strong className="text-cyan-300">{microscopeState.positionXMm.toFixed(2)} mm</strong></span>
                  <span className="text-zinc-400">Focus: <strong className={microscopeState.isFocused ? 'text-emerald-400' : 'text-amber-400'}>{microscopeState.isFocused ? 'Sharp' : 'Blurred'}</strong></span>
                </div>
              </div>
            )}

            {/* APPARATUS OPTICAL BENCH VIEW MODE */}
            {activeView === 'APPARATUS' && (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-4 font-mono text-xs">
                <div className="text-cyan-400 font-bold">3D-LIKE OPTICAL BENCH ARRANGEMENT</div>
                <div className="w-full max-w-md h-40 bg-zinc-950 rounded-2xl border border-white/10 p-4 flex items-center justify-around relative">
                  <div className={`flex flex-col items-center p-1 rounded-lg ${highlightedComponentId === 'sodium-lamp' ? 'border border-cyan-400 bg-cyan-500/20' : ''}`}>
                    <div className={`w-10 h-16 rounded-lg border flex items-center justify-center font-bold text-[9px] ${lampActive ? 'bg-yellow-500/30 border-yellow-400 text-yellow-200 shadow-lg shadow-yellow-500/50' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                      LAMP
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1">Sodium 589nm</span>
                  </div>

                  <div className={`w-0.5 h-16 bg-white/40 rotate-45 relative p-1 ${highlightedComponentId === 'beam-reflector' ? 'border border-cyan-400 bg-cyan-500/20' : ''}`}>
                    <span className="absolute -top-4 -left-4 text-[8px] text-zinc-400">45° Plate</span>
                  </div>

                  <div className={`flex flex-col items-center p-1 rounded-lg ${highlightedComponentId === 'plano-convex-lens' ? 'border border-cyan-400 bg-cyan-500/20' : ''}`}>
                    <div className="w-14 h-6 rounded-t-full border-t-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center text-[8px] font-bold text-cyan-200">
                      LENS
                    </div>
                    <div className="w-16 h-2 bg-zinc-700 border-t border-white/40" />
                    <span className="text-[9px] text-zinc-400 mt-1">Plano-Convex</span>
                  </div>

                  <div className={`flex flex-col items-center p-1 rounded-lg ${highlightedComponentId === 'travelling-microscope' ? 'border border-cyan-400 bg-cyan-500/20' : ''}`}>
                    <div className="w-8 h-20 bg-gradient-to-b from-zinc-700 to-zinc-900 border border-white/20 rounded-t-xl flex items-center justify-center text-[8px] font-bold text-purple-300">
                      MICROSCOPE
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1">Vernier X</span>
                  </div>
                </div>
              </div>
            )}

            {/* TOP & RINGS VIEW MODES */}
            {(activeView === 'TOP' || activeView === 'RINGS' || activeView === 'MEASUREMENT') && (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-3 font-mono text-xs">
                <div className="text-cyan-400 font-bold uppercase">{activeView} OVERVIEW</div>
                <div className="w-64 h-64 bg-black rounded-2xl border border-white/10 flex items-center justify-center p-2">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {generatedRings.map((ring) => (
                      <circle
                        key={ring.n}
                        cx="100"
                        cy="100"
                        r={ring.radiusPx * 0.7}
                        fill="none"
                        stroke={selectedLightSource.colorHex}
                        strokeWidth="2"
                        opacity={0.8}
                      />
                    ))}
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* LOWER WORKSPACE CONTROLS & VERNIER MICROMETER BAR */}
          <div className="w-full max-w-6xl mx-auto bg-zinc-900/90 border-2 border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 font-mono text-xs space-y-3 min-w-0 shrink-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Focus className="w-5 h-5 text-cyan-400 shrink-0" />
                <span className="font-bold text-sm text-white">TRAVELLING MICROSCOPE CONTROLS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Ring Order:</span>
                <select
                  value={selectedRingOrder}
                  onChange={(e) => setSelectedRingOrder(Number(e.target.value))}
                  className="bg-zinc-950 border border-white/15 rounded-lg px-2 py-0.5 text-xs text-cyan-300 font-bold"
                >
                  {[2, 4, 6, 8, 10, 12, 14, 16].map((n) => (
                    <option key={n} value={n}>n = {n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              
              {/* Setup Actions */}
              <div className="space-y-2">
                {!lensPlaced ? (
                  <button
                    type="button"
                    onClick={handlePlaceLens}
                    className="w-full py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all shadow-md"
                  >
                    1. Place Plano-Convex Lens
                  </button>
                ) : !lampActive ? (
                  <button
                    type="button"
                    onClick={handleToggleLamp}
                    className="w-full py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all shadow-md"
                  >
                    2. Activate Sodium Lamp (589nm)
                  </button>
                ) : !microscopeState.isFocused ? (
                  <button
                    type="button"
                    onClick={handleFocusMicroscope}
                    className="w-full py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all shadow-md"
                  >
                    3. Focus Microscope Image
                  </button>
                ) : (
                  <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center font-bold text-xs">
                    Optical Setup Active & Focused ✓
                  </div>
                )}

                {/* Light Source Selector */}
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {DEFAULT_LIGHT_SOURCES.map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => handleSelectLightSource(src)}
                      className={`py-1 px-1 rounded-lg border text-[10px] font-bold truncate ${
                        selectedLightSource.id === src.id ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400' : 'bg-zinc-800 text-zinc-400 border-white/10'
                      }`}
                    >
                      {src.wavelengthNm}nm
                    </button>
                  ))}
                </div>
              </div>

              {/* X-Axis Traverse Micrometer Controls (WITH KEYBOARD ARROW KEY SUPPORT) */}
              <div className="bg-black/60 border border-white/10 rounded-xl p-3 space-y-2 text-center">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">
                  X-AXIS TRAVERSE CONTROL (Use Arrow Keys ← →)
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveMicroscope(-1.0)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg font-bold text-xs border border-white/10"
                  >
                    -1mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveMicroscope(-0.1)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg font-bold text-xs border border-white/10"
                  >
                    -0.1mm
                  </button>
                  <span className="font-bold text-cyan-300 text-sm px-2 min-w-[70px]">
                    {microscopeState.positionXMm.toFixed(2)} mm
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMoveMicroscope(0.1)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg font-bold text-xs border border-white/10"
                  >
                    +0.1mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveMicroscope(1.0)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg font-bold text-xs border border-white/10"
                  >
                    +1mm
                  </button>
                </div>
              </div>

              {/* Recording Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleRecordLeftReading}
                  disabled={!microscopeState.isFocused}
                  className={`w-full py-2 rounded-xl border text-xs font-bold transition-all ${
                    tempLeftMm !== null
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                      : microscopeState.isFocused
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-md cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  {tempLeftMm !== null ? `Left (X_L = ${tempLeftMm.toFixed(2)} mm) ✓` : `Record Left Reading (X_L) for n=${selectedRingOrder}`}
                </button>

                <button
                  type="button"
                  onClick={handleRecordRightReading}
                  disabled={!microscopeState.isFocused || tempLeftMm === null}
                  className={`w-full py-2 rounded-xl border text-xs font-bold transition-all ${
                    tempLeftMm !== null
                      ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400 shadow-lg cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  Record Right Reading (X_R) for n={selectedRingOrder}
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
              {/* Tab Selector */}
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

              {/* Active Tab Body */}
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
