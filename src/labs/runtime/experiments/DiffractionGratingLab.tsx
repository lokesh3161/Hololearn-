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
  Crosshair,
} from 'lucide-react';

import type { ExperimentConfig } from '../../types';
import type {
  LaserSpec,
  GratingSpec,
  DiffractionOrderSpot,
  DiffractionTrial,
  DiffractionRegressionResult,
  GoniometerReading,
  MisconceptionWarning,
} from '../../types/diffractionGratingTypes';

import { diffractionGratingConfig } from '../../physics/diffractionGrating';
import { LASER_PRESETS, GRATING_PRESETS, DiffractionGratingEngine } from '../../engines/DiffractionGratingEngine';
import { labSound } from '../../utils/LabSoundManager';

interface DiffractionGratingLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const DiffractionGratingLab: React.FC<DiffractionGratingLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. CORE LABORATORY STATE ──────────────────────────────────────
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);
  const [learningMode, setLearningMode] = useState<'guided' | 'practice' | 'challenge' | 'research'>('guided');

  // Laser Source Specification State
  const [laserState, setLaserState] = useState<LaserSpec>({
    id: 'red-650',
    name: 'Red He-Ne Laser',
    wavelengthNm: 650.0,
    colorHex: '#ef4444',
    intensityPercent: 100,
    alignmentDeg: 0.0,
  });

  // Diffraction Grating Specification State
  const [gratingState, setGratingState] = useState<GratingSpec>({
    id: 'g-600',
    name: '600 lines/mm Grating',
    linesPerMm: 600,
    spacingM: DiffractionGratingEngine.calculateGratingSpacingD(600),
    rotationDeg: 0.0,
  });

  // Screen & Optics Bench State
  const [screenDistanceL, setScreenDistanceL] = useState<number>(1.0); // 1.0 meter
  const [laserPowerOn, setLaserPowerOn] = useState<boolean>(true);
  const [selectedOrderN, setSelectedOrderN] = useState<number>(1); // Order n = +1

  // Vernier Goniometer Modal State
  const [showGoniometerModal, setShowGoniometerModal] = useState<boolean>(false);

  // Observation Trials State
  const [trials, setTrials] = useState<DiffractionTrial[]>([]);

  // UI Drawers, Splitters & Views
  const [leftDrawerOpen, setLeftDrawerOpen] = useState<boolean>(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(true);
  const [rightDrawerWidth, setRightDrawerWidth] = useState<number>(320);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [highlightedComponentId, setHighlightedComponentId] = useState<string | null>(null);

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
      text: '👋 Welcome to Experiment 11: Determination of Laser Wavelength by Diffraction Grating! Adjust wavelength λ, grating lines N, or screen distance L to observe real-time diffraction spots and record trials.',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  const logEvent = useCallback((event: { type: string; t: number; [key: string]: any }) => {
    setEventLog((prev) => [...prev, event]);
  }, []);

  // Derived Diffraction Spots Array
  const diffractionSpots: DiffractionOrderSpot[] = useMemo(() => {
    if (!laserPowerOn) return [];
    return DiffractionGratingEngine.calculateDiffractionSpots(laserState, gratingState, screenDistanceL);
  }, [laserState, gratingState, screenDistanceL, laserPowerOn]);

  // Active Selected Spot
  const activeSpot = useMemo(() => {
    return diffractionSpots.find((s) => s.orderN === selectedOrderN) || diffractionSpots.find((s) => s.orderN === 1) || diffractionSpots[0];
  }, [diffractionSpots, selectedOrderN]);

  // Linear Regression Analysis on sin(θ) vs n
  const regressionAnalysis: DiffractionRegressionResult = useMemo(() => {
    return DiffractionGratingEngine.calculateRegressionAnalysis(trials, laserState.wavelengthNm);
  }, [trials, laserState.wavelengthNm]);

  // Grounded Misconception Warnings
  const misconceptions: MisconceptionWarning[] = useMemo(() => {
    return DiffractionGratingEngine.detectMisconceptions(laserState.alignmentDeg, trials);
  }, [laserState.alignmentDeg, trials]);

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

  // Sync inputs with parent workbench
  useEffect(() => {
    onUpdateInput('laserWavelengthNm', laserState.wavelengthNm);
    onUpdateInput('gratingLinesPerMm', gratingState.linesPerMm);
    onUpdateInput('screenDistanceL', screenDistanceL);
    onUpdateInput('selectedOrderN', selectedOrderN);
    if (activeSpot) {
      onUpdateInput('spotDisplacementXM', activeSpot.displacementXM);
      onUpdateInput('diffractionAngleDeg', activeSpot.angleDeg);
    }
    onUpdateInput('experimentalWavelengthNm', regressionAnalysis.experimentalWavelengthNm);
    onUpdateInput('percentageError', regressionAnalysis.percentageError);
  }, [laserState, gratingState, screenDistanceL, selectedOrderN, activeSpot, regressionAnalysis, onUpdateInput]);

  // ── 2. USER INTERACTION HANDLERS ─────────────────────────────────

  const handleSelectLaserPreset = (presetId: string) => {
    if (soundEnabled) labSound.playClick();
    const preset = LASER_PRESETS.find((p) => p.id === presetId) || LASER_PRESETS[0];
    setLaserState((prev) => ({
      ...prev,
      id: preset.id,
      name: preset.name,
      wavelengthNm: preset.wavelengthNm,
      colorHex: preset.colorHex,
    }));
    logEvent({ type: 'laser_changed', presetId, wavelengthNm: preset.wavelengthNm, t: Date.now() });
  };

  const handleSelectGratingPreset = (presetId: string) => {
    if (soundEnabled) labSound.playClick();
    const preset = GRATING_PRESETS.find((p) => p.id === presetId) || GRATING_PRESETS[1];
    const spacingM = DiffractionGratingEngine.calculateGratingSpacingD(preset.linesPerMm);
    setGratingState((prev) => ({
      ...prev,
      id: preset.id,
      name: preset.name,
      linesPerMm: preset.linesPerMm,
      spacingM,
    }));
    setCurrentStepIndex(4);
    logEvent({ type: 'grating_changed', linesPerMm: preset.linesPerMm, t: Date.now() });
  };

  const handleSetScreenDistance = (distL: number) => {
    setScreenDistanceL(distL);
    setCurrentStepIndex(3);
    logEvent({ type: 'screen_distance_changed', distL, t: Date.now() });
  };

  const handleSetLaserAlignment = (alignmentDeg: number) => {
    setLaserState((prev) => ({ ...prev, alignmentDeg }));
    logEvent({ type: 'laser_aligned', alignmentDeg, t: Date.now() });
  };

  const handleSaveTrial = () => {
    if (soundEnabled) labSound.playDataRecorded();
    if (!activeSpot || activeSpot.orderN === 0) return;

    const calc = DiffractionGratingEngine.calculateExperimentalWavelength(
      gratingState.spacingM,
      activeSpot.orderN,
      screenDistanceL,
      activeSpot.displacementXM
    );

    const errorPercent = Number(
      (Math.abs((calc.experimentalWavelengthNm - laserState.wavelengthNm) / laserState.wavelengthNm) * 100).toFixed(2)
    );

    const newTrial: DiffractionTrial = {
      trialNumber: trials.length + 1,
      laserName: laserState.name,
      theoreticalWavelengthNm: laserState.wavelengthNm,
      linesPerMm: gratingState.linesPerMm,
      gratingSpacingM: gratingState.spacingM,
      orderN: activeSpot.orderN,
      screenDistanceL,
      measuredDisplacementXM: Math.abs(activeSpot.displacementXM),
      calculatedAngleDeg: activeSpot.angleDeg,
      experimentalWavelengthNm: calc.experimentalWavelengthNm,
      errorPercent,
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
    setLaserState({
      id: 'red-650',
      name: 'Red He-Ne Laser',
      wavelengthNm: 650.0,
      colorHex: '#ef4444',
      intensityPercent: 100,
      alignmentDeg: 0.0,
    });
    setGratingState({
      id: 'g-600',
      name: '600 lines/mm Grating',
      linesPerMm: 600,
      spacingM: DiffractionGratingEngine.calculateGratingSpacingD(600),
      rotationDeg: 0.0,
    });
    setScreenDistanceL(1.0);
    setLaserPowerOn(true);
    setSelectedOrderN(1);
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

      if (q.includes('spread') || q.includes('lines/mm') || q.includes('increase')) {
        reply = 'Increasing line density N decreases slit spacing d = 1/N. According to d*sin(theta) = n*lambda, a smaller d requires a larger diffraction angle theta, spreading the spots farther apart!';
      } else if (q.includes('central') || q.includes('undeviated') || q.includes('n=0')) {
        reply = 'At the central maximum (n = 0), the path difference between light rays from adjacent slits is 0 = 0*lambda, resulting in total constructive interference at theta = 0°.';
      } else if (q.includes('shorter') || q.includes('green') || q.includes('wavelength')) {
        reply = 'Shorter wavelengths (e.g. Green 532 nm vs Red 650 nm) produce smaller diffraction angles theta because sin(theta) = n*lambda / d is directly proportional to lambda.';
      } else if (q.includes('slope') || q.includes('graph')) {
        reply = `From linear regression of sin(theta) vs n, the slope m = lambda / d. Therefore, experimental wavelength lambda_exp = m * d = ${regressionAnalysis.experimentalWavelengthNm} nm!`;
      } else {
        reply = `Laser Telemetry: Laser = ${laserState.name} (${laserState.wavelengthNm} nm), Grating = ${gratingState.linesPerMm} lines/mm (d = ${(gratingState.spacingM * 1e6).toFixed(3)} µm), Screen L = ${screenDistanceL} m, Order n = ${selectedOrderN}, Angle theta = ${activeSpot?.angleDeg || 0}°.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Trial', 'Laser Source', 'Theoretical λ (nm)', 'Lines/mm', 'Grating d (m)', 'Order n', 'Screen L (m)', 'Measured x (m)', 'Angle θ (°)', 'Experimental λ (nm)', 'Error (%)'],
    ];
    trials.forEach((t) => {
      rows.push([
        String(t.trialNumber),
        t.laserName,
        String(t.theoreticalWavelengthNm),
        String(t.linesPerMm),
        String(t.gratingSpacingM),
        String(t.orderN),
        String(t.screenDistanceL),
        String(t.measuredDisplacementXM),
        String(t.calculatedAngleDeg),
        String(t.experimentalWavelengthNm),
        String(t.errorPercent),
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laser_diffraction_readings.csv`;
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
                <BookOpen className="w-4 h-4 shrink-0" /> STEP {currentStepIndex} / 12
              </h3>
              <span className="text-[10px] text-zinc-400">Progressive Mode</span>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-cyan-500/40 space-y-1.5">
              <div className="font-bold text-cyan-300 text-xs">
                Step {currentStepIndex}: {diffractionGratingConfig.procedure[currentStepIndex - 1]?.instruction}
              </div>
              <div className="text-[10px] text-emerald-400 pt-1 border-t border-white/5">
                Expected: {diffractionGratingConfig.procedure[currentStepIndex - 1]?.expectedAction}
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
                    <th className="p-2">Laser</th>
                    <th className="p-2">Lines/mm</th>
                    <th className="p-2">Order n</th>
                    <th className="p-2">L (m)</th>
                    <th className="p-2">x (m)</th>
                    <th className="p-2">θ (°)</th>
                    <th className="p-2">λ_exp (nm)</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[10px]">
                  {trials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-zinc-500">
                        No trials saved. Select order spot and click + Record Trial.
                      </td>
                    </tr>
                  ) : (
                    trials.map((t, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2 text-cyan-300 font-bold">#{t.trialNumber}</td>
                        <td className="p-2 text-zinc-300">{t.theoreticalWavelengthNm} nm</td>
                        <td className="p-2 text-amber-300">{t.linesPerMm}</td>
                        <td className="p-2 text-purple-300 font-bold">n = {t.orderN}</td>
                        <td className="p-2 text-zinc-300">{t.screenDistanceL} m</td>
                        <td className="p-2 text-cyan-300">{t.measuredDisplacementXM} m</td>
                        <td className="p-2 text-white font-bold">{t.calculatedAngleDeg}°</td>
                        <td className="p-2 text-emerald-400 font-bold">{t.experimentalWavelengthNm} nm</td>
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
              <Activity className="w-4 h-4 shrink-0" /> sin(θ) vs Order n Linear Regression Graph
            </h3>

            <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-2">
              <div className="w-full h-48 bg-black/80 rounded-xl border border-white/10 relative p-2 flex items-center justify-center">
                <svg viewBox="0 0 300 150" className="w-full h-full">
                  <line x1="30" y1="130" x2="280" y2="130" stroke="#3f3f46" strokeWidth="1" />
                  <line x1="30" y1="20" x2="30" y2="130" stroke="#3f3f46" strokeWidth="1" />
                  <text x="35" y="30" fill="#a1a1aa" fontSize="9">sin(θ)</text>
                  <text x="250" y="125" fill="#a1a1aa" fontSize="9">Order n</text>

                  {/* Best-Fit Linear Regression Line */}
                  {trials.length >= 2 && (
                    <line
                      x1="30"
                      y1="130"
                      x2="280"
                      y2={Math.max(20, 130 - regressionAnalysis.slope * 300)}
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                  )}

                  {/* Data Points */}
                  {trials.map((t, idx) => {
                    const sinTheta = Math.sin((t.calculatedAngleDeg * Math.PI) / 180.0);
                    const cx = 30 + (t.orderN / 4) * 230;
                    const cy = 130 - sinTheta * 110;
                    return (
                      <circle key={idx} cx={cx} cy={cy} r="3.5" fill={laserState.colorHex} stroke="#ffffff" strokeWidth="1" />
                    );
                  })}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Slope m = λ/d</div>
                  <div className="font-bold text-cyan-300 text-xs">{regressionAnalysis.slope}</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Fit R²</div>
                  <div className="font-bold text-emerald-400 text-xs">{regressionAnalysis.rSquared}</div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-white/10">
                  <div className="text-zinc-400">Derived λ_exp</div>
                  <div className="font-bold text-amber-300 text-xs">{regressionAnalysis.experimentalWavelengthNm} nm</div>
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
              <Layers className="w-4 h-4 shrink-0" /> Laser Wavelength & Grating Comparison
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-red-400 border-b border-white/10 pb-1">RED LASER (650 nm)</div>
                <div><span className="text-zinc-400">Grating:</span> {gratingState.linesPerMm} lines/mm</div>
                <div><span className="text-zinc-400">First Order θ₁:</span> {DiffractionGratingEngine.calculateDiffractionSpots({ ...laserState, wavelengthNm: 650 }, gratingState, screenDistanceL).find((s) => s.orderN === 1)?.angleDeg}°</div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-emerald-500/40 space-y-1">
                <div className="font-bold text-emerald-400 border-b border-white/10 pb-1">GREEN LASER (532 nm)</div>
                <div><span className="text-zinc-400">Grating:</span> {gratingState.linesPerMm} lines/mm</div>
                <div><span className="text-zinc-400">First Order θ₁:</span> {DiffractionGratingEngine.calculateDiffractionSpots({ ...laserState, wavelengthNm: 532 }, gratingState, screenDistanceL).find((s) => s.orderN === 1)?.angleDeg}°</div>
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
                LAB REPORT: EXPERIMENT 11 (LASER WAVELENGTH BY DIFFRACTION GRATING)
              </div>

              {/* EXPERIMENTAL RESULT CARD */}
              <div className="bg-zinc-900 p-3 rounded-xl border border-cyan-500/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-xs">EXPERIMENTAL RESULT</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    regressionAnalysis.percentageError <= 3.0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {regressionAnalysis.percentageError <= 3.0 ? 'HIGH PRECISION ✓' : 'GOOD ACCURACY ⚠'}
                  </span>
                </div>
                <div><span className="text-zinc-400">Experimental Wavelength λ_exp:</span> <strong className="text-emerald-400 text-xs">{regressionAnalysis.experimentalWavelengthNm} nm</strong></div>
                <div><span className="text-zinc-400">Theoretical Wavelength λ_ref:</span> <strong className="text-cyan-300">{laserState.wavelengthNm} nm</strong></div>
                <div><span className="text-zinc-400">Percentage Error:</span> <strong className="text-red-300">{regressionAnalysis.percentageError}%</strong></div>
              </div>

              <div><span className="text-zinc-400">Laser Source:</span> {laserState.name} ({laserState.wavelengthNm} nm)</div>
              <div><span className="text-zinc-400">Diffraction Grating:</span> {gratingState.linesPerMm} lines/mm (d = {(gratingState.spacingM * 1e6).toFixed(3)} µm)</div>
              <div><span className="text-zinc-400">Screen Distance L:</span> {screenDistanceL} m</div>

              <div className="pt-2 border-t border-white/10 space-y-1 text-[10px]">
                <div className="font-bold text-cyan-400">Standard Lab Precautions:</div>
                <div className="text-zinc-400">• Align laser beam at normal incidence to the grating surface.</div>
                <div className="text-zinc-400">• Measure distances to symmetrical +n and -n orders to eliminate offset errors.</div>
                <div className="text-zinc-400">• Use large screen distance L (e.g. 1.0m) to reduce relative measurement uncertainty.</div>
              </div>

              <div className="pt-2 border-t border-white/10 text-emerald-400 font-bold">
                Conclusion: Monochromatic laser wavelength determined as λ = {regressionAnalysis.experimentalWavelengthNm} nm.
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
                'Why do spots spread when N increases?',
                'Why is central spot undeviated?',
                'Why do shorter wavelengths diffract less?',
                'How to calculate lambda from slope?',
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
                { id: 1, q: '1. What happens to diffraction maxima spacing when line density N is increased?', opts: ['Maxima spread farther apart', 'Maxima move closer together', 'Maxima disappear'] },
                { id: 2, q: '2. Why is the central maximum (n = 0) undeviated?', opts: ['Path difference between adjacent slits is zero', 'Light does not pass through grating', 'Grating absorbs central light'] },
                { id: 3, q: '3. How does Green laser light (532 nm) compare to Red laser light (650 nm)?', opts: ['Green spots are closer to central maximum', 'Green spots are farther from central maximum', 'Green light does not diffract'] },
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
            EXP 11: LASER WAVELENGTH BY DIFFRACTION GRATING
          </h1>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase hidden md:inline shrink-0">
            Optics Engine
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowGoniometerModal(true)}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Vernier Goniometer</span>
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
              {diffractionGratingConfig.apparatus.map((item) => (
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

        {/* CENTER PRIMARY OPTICS BENCH HERO CANVAS */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-2.5 sm:p-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col justify-between space-y-3 sm:space-y-4">
          
          {/* Misconception Warnings Banner */}
          {misconceptions.length > 0 && (
            <div className="w-full max-w-6xl mx-auto space-y-1.5">
              {misconceptions.map((m) => (
                <div key={m.id} className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-2.5 text-amber-200 text-xs font-mono space-y-0.5">
                  <div className="font-bold text-amber-400">{m.title}</div>
                  <div className="text-[11px]">{m.message}</div>
                </div>
              ))}
            </div>
          )}

          {/* 2.5D HERO OPTICS BENCH & SCREEN VIEWPORT */}
          <div className="w-full max-w-6xl mx-auto flex-1 min-h-[320px] sm:min-h-[380px] bg-black/90 rounded-3xl border-2 border-cyan-500/40 p-4 relative overflow-hidden shadow-2xl flex flex-col items-center justify-around my-auto font-mono text-xs">
            
            <div className="w-full max-w-4xl flex flex-col items-center space-y-2">
              <div className="flex items-center justify-between w-full text-[11px]">
                <span className="text-zinc-400">Laser: <strong className="text-cyan-300">{laserState.name} ({laserState.wavelengthNm} nm)</strong></span>
                <span className="text-zinc-400">Grating: <strong className="text-amber-300">{gratingState.linesPerMm} lines/mm (d = {(gratingState.spacingM * 1e6).toFixed(3)} µm)</strong></span>
                <span className="text-zinc-400">Screen L: <strong className="text-emerald-400">{screenDistanceL} m</strong></span>
              </div>

              {/* OPTICS BENCH & PROJECTION SCREEN FRAME */}
              <div className="relative w-full h-56 bg-zinc-950 rounded-2xl border border-white/20 p-4 flex items-center justify-between overflow-hidden shadow-inner">
                
                {/* 1. Monochromatic Laser Source */}
                <div className="relative flex flex-col items-center z-10">
                  <div className="w-20 h-10 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 rounded-lg border-2 border-white/30 flex items-center justify-center text-[9px] font-bold text-cyan-300 shadow-lg">
                    LASER {laserState.wavelengthNm}nm
                  </div>
                  <div className="w-4 h-6 bg-zinc-700 rounded-b border border-white/10" />
                </div>

                {/* 2. Laser Beam & Diffracted Rays */}
                <div className="relative flex-1 h-full mx-2 flex items-center justify-center">
                  <svg viewBox="0 0 400 160" className="w-full h-full">
                    {/* Optical Axis Line */}
                    <line x1="0" y1="80" x2="400" y2="80" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4" />

                    {/* Central Incident Beam */}
                    {laserPowerOn && (
                      <line
                        x1="0"
                        y1="80"
                        x2="150"
                        y2="80"
                        stroke={laserState.colorHex}
                        strokeWidth="2.5"
                        className="animate-pulse"
                      />
                    )}

                    {/* Vertically Mounted Transmission Diffraction Grating */}
                    <rect x="150" y="30" width="8" height="100" fill="#27272a" stroke="#ffffff" strokeWidth="1.5" rx="2" />
                    <line x1="154" y1="35" x2="154" y2="125" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="2" />
                    <text x="135" y="24" fill="#a1a1aa" fontSize="8">GRATING ({gratingState.linesPerMm}/mm)</text>

                    {/* Diffracted Rays Spreading to Screen */}
                    {laserPowerOn &&
                      diffractionSpots.map((s, idx) => {
                        if (!s.isObservable) return null;
                        const yTarget = 80 + (s.displacementXM / 0.85) * 65;
                        return (
                          <g key={idx}>
                            <line
                              x1="158"
                              y1="80"
                              x2="380"
                              y2={yTarget}
                              stroke={laserState.colorHex}
                              strokeWidth={s.orderN === 0 ? "2.5" : "1.5"}
                              strokeOpacity={s.intensityRatio}
                            />
                          </g>
                        );
                      })}
                  </svg>
                </div>

                {/* 3. Millimeter Projection Screen with Dynamic Spots */}
                <div className="relative w-28 h-48 bg-zinc-900 border-2 border-white/30 rounded-xl p-2 flex flex-col items-center justify-between shadow-2xl z-10">
                  <div className="text-[8px] font-bold text-zinc-400 border-b border-white/10 w-full text-center pb-0.5">
                    SCREEN (L = {screenDistanceL}m)
                  </div>

                  {/* Vertical Millimeter Scale & Dynamic Laser Diffraction Spots */}
                  <div className="relative w-full flex-1 bg-black/90 rounded border border-white/10 my-1 overflow-hidden flex items-center justify-center">
                    {/* Center Reference Mark (n=0) */}
                    <div className="absolute w-full h-[1px] bg-white/20" />

                    {laserPowerOn &&
                      diffractionSpots.map((s, idx) => {
                        if (!s.isObservable) return null;
                        const yOffsetPercent = (s.displacementXM / 0.85) * 45; // % from center
                        const isSelected = selectedOrderN === s.orderN;

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedOrderN(s.orderN)}
                            className={`absolute w-3 h-3 rounded-full cursor-pointer transition-all transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
                              isSelected ? 'ring-2 ring-white scale-125 z-20' : 'hover:scale-110'
                            }`}
                            style={{
                              left: '50%',
                              top: `${50 + yOffsetPercent}%`,
                              backgroundColor: laserState.colorHex,
                              boxShadow: `0 0 12px ${laserState.colorHex}`,
                            }}
                          >
                            <span className="text-[7px] font-bold text-black opacity-90">{s.orderN === 0 ? '0' : s.orderN > 0 ? `+${s.orderN}` : s.orderN}</span>
                          </div>
                        );
                      })}
                  </div>

                  <div className="text-[8px] font-bold text-cyan-300">
                    Order n = {selectedOrderN}
                  </div>
                </div>
              </div>

              {/* Laser & Grating Quick Selectors */}
              <div className="w-full bg-zinc-900/80 border border-white/10 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400 font-bold">LASER:</span>
                  {LASER_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectLaserPreset(p.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                        laserState.id === p.id
                          ? 'bg-cyan-500 text-black border-cyan-400'
                          : 'bg-zinc-800 text-zinc-300 border-white/10'
                      }`}
                    >
                      {p.name.split(' ')[0]} ({p.wavelengthNm}nm)
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400 font-bold">GRATING:</span>
                  {GRATING_PRESETS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectGratingPreset(g.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                        gratingState.id === g.id
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-zinc-800 text-zinc-300 border-white/10'
                      }`}
                    >
                      {g.linesPerMm}/mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE TELEMETRY DASHBOARD */}
            <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Order n</div>
                <div className="font-bold text-cyan-300 text-sm">n = {selectedOrderN}</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Spot Distance x</div>
                <div className="font-bold text-emerald-400 text-sm">{activeSpot ? Math.abs(activeSpot.displacementXM).toFixed(4) : '0.0000'} m</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Diffraction Angle θ</div>
                <div className="font-bold text-amber-300 text-sm">{activeSpot ? activeSpot.angleDeg : 0}°</div>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-white/10">
                <div className="text-[9px] text-zinc-400">Derived λ_exp</div>
                <div className="font-bold text-purple-300 text-sm">{regressionAnalysis.experimentalWavelengthNm} nm</div>
              </div>
            </div>
          </div>

          {/* LOWER CONTROLS BAR */}
          <div className="w-full max-w-6xl mx-auto bg-zinc-900/90 border-2 border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 font-mono text-xs space-y-3 min-w-0 shrink-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Focus className="w-5 h-5 text-cyan-400 shrink-0" />
                <span className="font-bold text-sm text-white">DIFFRACTION OPTICS BENCH CONTROLS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">Screen Distance L:</span>
                <span className="font-bold text-emerald-400">{screenDistanceL} m</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              
              {/* Screen Distance Slider */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 font-bold min-w-[90px]">Screen L:</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={screenDistanceL}
                  onChange={(e) => handleSetScreenDistance(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Laser Power & Order Selector */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setLaserPowerOn(!laserPowerOn)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                    laserPowerOn ? 'bg-red-500 text-white border-red-400 shadow-lg' : 'bg-zinc-800 text-zinc-400 border-white/10'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{laserPowerOn ? 'LASER ON' : 'LASER OFF'}</span>
                </button>

                <div className="flex items-center gap-1">
                  {[-2, -1, 0, 1, 2].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSelectedOrderN(n)}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold ${
                        selectedOrderN === n ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-zinc-800 text-zinc-300 border-white/10'
                      }`}
                    >
                      {n === 0 ? 'n=0' : n > 0 ? `+${n}` : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Trial Button */}
              <div>
                <button
                  type="button"
                  onClick={handleSaveTrial}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>RECORD TRIAL (n={selectedOrderN}, x={activeSpot ? Math.abs(activeSpot.displacementXM).toFixed(3) : 0}m)</span>
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

      {/* VERNIER GONIOMETER MODAL */}
      <AnimatePresence>
        {showGoniometerModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border-2 border-cyan-500/50 rounded-2xl p-5 max-w-lg w-full font-mono text-xs space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Compass className="w-5 h-5" /> VERNIER ANGULAR GONIOMETER
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGoniometerModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-white/10">
                  <div>
                    <div className="text-zinc-400">Order n = {selectedOrderN} Angle</div>
                    <div className="font-bold text-emerald-400 text-sm">{activeSpot ? activeSpot.angleDeg : 0}°</div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-400">Least Count (LC)</div>
                    <div className="font-bold text-amber-300">0.01°</div>
                  </div>
                </div>

                {/* Goniometer Dial Visualization */}
                <div className="w-full h-36 bg-zinc-950 rounded-xl border border-cyan-500/30 p-3 flex items-center justify-center relative overflow-hidden">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-cyan-400/60 flex items-center justify-center relative">
                    <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center relative">
                      <div
                        className="w-1 h-12 bg-red-500 transition-transform duration-100"
                        style={{ transform: `rotate(${activeSpot ? activeSpot.angleDeg : 0}deg)` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
