import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  MoreVertical,
  X,
} from 'lucide-react';

import type { ExperimentConfig } from '../../types';
import type {
  PHExperimentConfig,
  PHMeterState,
  PHSampleState,
  PHStabilityState,
  PHMeasurement,
  PHEvent,
} from '../../types/phExperimentTypes';

import { phWaterSoilConfig } from '../../chemistry/phWaterSoil';
import { PHMeasurementEngine, DEFAULT_PH_EXPERIMENT_CONFIG } from '../../engines/PHMeasurementEngine';
import { labSound } from '../../utils/LabSoundManager';

interface PHWaterSoilLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const PHWaterSoilLab: React.FC<PHWaterSoilLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. CONFIGURATION & SIMULATION CONSTANTS ───────────────────────
  const expConfig: PHExperimentConfig = DEFAULT_PH_EXPERIMENT_CONFIG;
  const waterTruePH = expConfig.waterSample.hiddenPH; // 6.86
  const soilTruePH = expConfig.soilSample.hiddenPH;   // 5.65

  // ── 2. CORE LABORATORY STATE ──────────────────────────────────────
  const [powerOn, setPowerOn] = useState<boolean>(true);
  const [safetyReviewed, setSafetyReviewed] = useState<boolean>(false);
  const [realisticMode, setRealisticMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Meter & Electrode State
  const [calibrationState, setCalibrationState] = useState<'uncalibrated' | 'calibrating' | 'calibrated' | 'calibration-failed'>('uncalibrated');
  const [calibrationOffset, setCalibrationOffset] = useState<number>(0.45); // offset when uncalibrated
  const [calibratedPoints, setCalibratedPoints] = useState<number[]>([]);
  const [selectedBuffer, setSelectedBuffer] = useState<number | null>(null);
  
  // Location of electrode: 'storage' | 'rinse' | 'buffer-7' | 'buffer-4' | 'buffer-10' | 'water' | 'soil'
  const [electrodeLocation, setElectrodeLocation] = useState<'storage' | 'rinse' | 'buffer-7' | 'buffer-4' | 'buffer-10' | 'water' | 'soil'>('storage');
  const [electrodeRinsed, setElectrodeRinsed] = useState<boolean>(false);
  const [contaminationRisk, setContaminationRisk] = useState<boolean>(false);
  const [previousSolutionPH, setPreviousSolutionPH] = useState<number | null>(null);
  const [isRinsingAnimating, setIsRinsingAnimating] = useState<boolean>(false);

  // Stabilization State
  const [displayedPH, setDisplayedPH] = useState<number>(7.00);
  const [stabilityScore, setStabilityScore] = useState<number>(0);
  const [isStable, setIsStable] = useState<boolean>(false);
  const [temperatureC, setTemperatureC] = useState<number>(25.0);

  // Water Sample State
  const [waterMeasured, setWaterMeasured] = useState<boolean>(false);
  const [waterRecordedPH, setWaterRecordedPH] = useState<number | null>(null);
  const [waterTrials, setWaterTrials] = useState<PHMeasurement[]>([]);

  // Soil Preparation & Sample State
  const [balanceTared, setBalanceTared] = useState<boolean>(false);
  const [soilMassG, setSoilMassG] = useState<number>(0.0);
  const [extractionLiquidMl, setExtractionLiquidMl] = useState<number>(0.0);
  const [soilMixed, setSoilMixed] = useState<boolean>(false);
  const [isMixingAnimating, setIsMixingAnimating] = useState<boolean>(false);
  const [soilSettled, setSoilSettled] = useState<boolean>(false);
  const [isSettlingAnimating, setIsSettlingAnimating] = useState<boolean>(false);
  const [soilMeasured, setSoilMeasured] = useState<boolean>(false);
  const [soilRecordedPH, setSoilRecordedPH] = useState<number | null>(null);
  const [soilTrials, setSoilTrials] = useState<PHMeasurement[]>([]);

  // Telemetry & Event Log
  const [eventLog, setEventLog] = useState<PHEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'DATA' | 'PH_SCALE' | 'ADVANCED_CHEMISTRY' | 'COMPARISON' | 'REPORT' | 'AI_MENTOR' | 'ASSESSMENT' | 'SAFETY'>('PROCEDURE');

  // AI Mentor State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '👋 Welcome to Experiment 05: Determination of pH of Water and Soil Samples! I am your AI Chemistry Mentor. Start by powering on the digital pH meter, rinsing the glass electrode, and calibrating with standard buffers (pH 7.00 and pH 4.00).',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // Assessment Quiz State
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  // ── 3. HELPER TO RECORD LOGGED EVENTS ─────────────────────────────
  const logEvent = useCallback((event: PHEvent) => {
    setEventLog((prev) => [...prev, event]);
  }, []);

  // ── 4. STABILIZATION TICKER LOOP ──────────────────────────────────
  useEffect(() => {
    if (!powerOn) {
      setDisplayedPH(0.00);
      setStabilityScore(0);
      setIsStable(false);
      return;
    }

    let trueTargetPH = 7.00;
    if (electrodeLocation === 'storage') {
      trueTargetPH = 7.00;
    } else if (electrodeLocation === 'rinse') {
      trueTargetPH = 7.00;
    } else if (electrodeLocation === 'buffer-7') {
      trueTargetPH = 7.00;
    } else if (electrodeLocation === 'buffer-4') {
      trueTargetPH = 4.00;
    } else if (electrodeLocation === 'buffer-10') {
      trueTargetPH = 10.00;
    } else if (electrodeLocation === 'water') {
      trueTargetPH = waterTruePH;
    } else if (electrodeLocation === 'soil') {
      trueTargetPH = soilTruePH;
    }

    const calculatedTarget = PHMeasurementEngine.calculateTargetInstrumentPH(
      trueTargetPH,
      {
        powerOn,
        calibrationState,
        selectedBufferPH: selectedBuffer,
        electrodeCondition: electrodeLocation === 'rinse' ? 'rinsing' : isStable ? 'stable' : 'stabilizing',
        temperatureC,
        displayedPH,
        stablePH: isStable ? displayedPH : null,
        stabilityScore,
        calibrationOffsetPh: calibrationOffset,
        measurementValid: calibrationState === 'calibrated',
      },
      expConfig,
      {
        isDirtyElectrode: contaminationRisk,
        previousPH: previousSolutionPH,
        realisticModeEnabled: realisticMode,
      }
    );

    const interval = setInterval(() => {
      setDisplayedPH((curr) => {
        const diff = calculatedTarget - curr;
        if (Math.abs(diff) <= 0.01) {
          setIsStable(true);
          setStabilityScore(100);
          return calculatedTarget;
        }
        setIsStable(false);
        const step = diff * 0.22;
        const next = Number((curr + step).toFixed(2));
        const dist = Math.abs(calculatedTarget - next);
        const score = Math.max(10, Math.min(99, Math.round((1 - dist / 4.0) * 100)));
        setStabilityScore(score);
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [
    powerOn,
    electrodeLocation,
    calibrationState,
    calibrationOffset,
    contaminationRisk,
    previousSolutionPH,
    realisticMode,
    waterTruePH,
    soilTruePH,
    temperatureC,
    selectedBuffer,
  ]);

  // Sync inputs with parent runner
  useEffect(() => {
    onUpdateInput('isCalibrated', calibrationState === 'calibrated');
    onUpdateInput('waterPH', waterRecordedPH ?? displayedPH);
    onUpdateInput('soilPH', soilRecordedPH ?? displayedPH);
    onUpdateInput('powerOn', powerOn);
    onUpdateInput('electrodeRinsed', electrodeRinsed);
    onUpdateInput('waterMeasured', waterMeasured);
    onUpdateInput('soilPrepared', soilMassG >= 9.9 && extractionLiquidMl >= 48 && soilMixed && soilSettled);
    onUpdateInput('soilMeasured', soilMeasured);
    onUpdateInput('isStable', isStable);
    onUpdateInput('reportGenerated', waterMeasured && soilMeasured);
  }, [
    calibrationState,
    waterRecordedPH,
    soilRecordedPH,
    displayedPH,
    powerOn,
    electrodeRinsed,
    waterMeasured,
    soilMassG,
    extractionLiquidMl,
    soilMixed,
    soilSettled,
    soilMeasured,
    isStable,
    onUpdateInput,
  ]);

  // ── 5. USER INTERACTION HANDLERS ─────────────────────────────────
  const handleTogglePower = () => {
    const next = !powerOn;
    setPowerOn(next);
    if (soundEnabled) labSound.playClick();
    if (next) logEvent({ type: 'ph_meter_powered_on' });
  };

  const handleRinseElectrode = () => {
    if (!powerOn) return;
    if (soundEnabled) labSound.playPouring();
    setIsRinsingAnimating(true);
    setElectrodeLocation('rinse');
    
    setTimeout(() => {
      setElectrodeRinsed(true);
      setContaminationRisk(false);
      setPreviousSolutionPH(null);
      setIsRinsingAnimating(false);
      logEvent({ type: 'electrode_rinsed' });
    }, 1200);
  };

  const handleSelectBuffer = (ph: 7.00 | 4.00 | 10.00) => {
    if (!powerOn) return;
    if (soundEnabled) labSound.playGlassTouch();
    
    if (!electrodeRinsed && previousSolutionPH != null) {
      setContaminationRisk(true);
    }

    setSelectedBuffer(ph);
    setElectrodeRinsed(false);
    setPreviousSolutionPH(ph);

    if (ph === 7.00) setElectrodeLocation('buffer-7');
    else if (ph === 4.00) setElectrodeLocation('buffer-4');
    else setElectrodeLocation('buffer-10');

    logEvent({ type: 'buffer_selected', bufferPH: ph });
    logEvent({ type: 'calibration_started', bufferPH: ph });
  };

  const handleConfirmCalibrationPoint = () => {
    if (!powerOn || selectedBuffer == null || !isStable) return;
    
    const evaluation = PHMeasurementEngine.evaluateCalibrationPoint(
      selectedBuffer,
      displayedPH,
      expConfig
    );

    if (!evaluation.valid) {
      setCalibrationState('calibration-failed');
      if (soundEnabled) labSound.playError();
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `⚠️ Calibration Error: ${evaluation.errorMsg} Clean probe in rinse station and retry calibration.`,
        },
      ]);
      return;
    }

    const newPoints = Array.from(new Set([...calibratedPoints, selectedBuffer]));
    setCalibratedPoints(newPoints);
    if (soundEnabled) labSound.playSuccess();

    logEvent({
      type: 'calibration_confirmed',
      expectedPH: selectedBuffer,
      observedPH: displayedPH,
    });

    if (newPoints.length >= 2) {
      setCalibrationState('calibrated');
      setCalibrationOffset(0.00);
      logEvent({ type: 'calibration_completed' });
      onCompleteStep(3);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '✅ pH Meter Calibration Complete! Standard slope and offset verified. You can now proceed to measure Water Sample A.',
        },
      ]);
    }
  };

  const handleImmerseWater = () => {
    if (!powerOn) return;
    if (soundEnabled) labSound.playBeaker();

    if (!electrodeRinsed && previousSolutionPH != null) {
      setContaminationRisk(true);
    }

    setElectrodeLocation('water');
    setElectrodeRinsed(false);
    setPreviousSolutionPH(waterTruePH);
    logEvent({ type: 'electrode_immersed', sampleType: 'Water Sample A' });
    logEvent({ type: 'water_measurement_started' });
  };

  const handleRecordWaterPH = () => {
    if (!powerOn || electrodeLocation !== 'water' || !isStable) return;
    if (soundEnabled) labSound.playSuccess();

    setWaterMeasured(true);
    setWaterRecordedPH(displayedPH);
    
    const newMeasurement: PHMeasurement = {
      measurementNumber: waterTrials.length + 1,
      sampleType: 'water',
      measuredPH: displayedPH,
      temperatureC,
      stable: true,
      calibrationValid: calibrationState === 'calibrated',
      electrodeRinsed,
      eventLogIds: ['water_measurement_recorded'],
      timestamp: new Date().toLocaleTimeString(),
    };

    setWaterTrials((prev) => [...prev, newMeasurement]);
    logEvent({ type: 'water_measurement_recorded', measuredPH: displayedPH });
    onCompleteStep(4);
    onRecordDataPoint();
  };

  // Soil Prep Handlers
  const handleTareBalance = () => {
    if (soundEnabled) labSound.playClick();
    setBalanceTared(true);
    setSoilMassG(0.0);
  };

  const handleAddSoilMass = () => {
    if (!balanceTared) return;
    if (soundEnabled) labSound.playBeaker();
    setSoilMassG(10.00);
    logEvent({ type: 'soil_weighed', massG: 10.00 });
  };

  const handleAddExtractionLiquid = () => {
    if (soilMassG < 1.0) return;
    if (soundEnabled) labSound.playPouring();
    setExtractionLiquidMl(50.0);
    logEvent({ type: 'soil_extraction_liquid_added', volumeMl: 50.0 });
  };

  const handleMixSoil = () => {
    if (soilMassG < 1.0 || extractionLiquidMl < 10) return;
    if (soundEnabled) labSound.playStirring();
    setIsMixingAnimating(true);

    setTimeout(() => {
      setIsMixingAnimating(false);
      setSoilMixed(true);
      logEvent({ type: 'soil_mixed' });
    }, 2000);
  };

  const handleSettleSoil = () => {
    if (!soilMixed) return;
    if (soundEnabled) labSound.playClick();
    setIsSettlingAnimating(true);

    setTimeout(() => {
      setIsSettlingAnimating(false);
      setSoilSettled(true);
      logEvent({ type: 'soil_settled' });
      onCompleteStep(5);
    }, 2500);
  };

  const handleImmerseSoil = () => {
    if (!powerOn || !soilSettled) return;
    if (soundEnabled) labSound.playBeaker();

    if (!electrodeRinsed && previousSolutionPH != null) {
      setContaminationRisk(true);
    }

    setElectrodeLocation('soil');
    setElectrodeRinsed(false);
    setPreviousSolutionPH(soilTruePH);
    logEvent({ type: 'electrode_immersed', sampleType: 'Soil Extract' });
    logEvent({ type: 'soil_measurement_started' });
  };

  const handleRecordSoilPH = () => {
    if (!powerOn || electrodeLocation !== 'soil' || !isStable) return;
    if (soundEnabled) labSound.playSuccess();

    setSoilMeasured(true);
    setSoilRecordedPH(displayedPH);

    const newMeasurement: PHMeasurement = {
      measurementNumber: soilTrials.length + 1,
      sampleType: 'soil-extract',
      measuredPH: displayedPH,
      temperatureC,
      stable: true,
      calibrationValid: calibrationState === 'calibrated',
      electrodeRinsed,
      eventLogIds: ['soil_measurement_recorded'],
      timestamp: new Date().toLocaleTimeString(),
    };

    setSoilTrials((prev) => [...prev, newMeasurement]);
    logEvent({ type: 'soil_measurement_recorded', measuredPH: displayedPH });
    onCompleteStep(6);
    onCompleteStep(7);
    onRecordDataPoint();
  };

  const handleResetLab = () => {
    if (soundEnabled) labSound.playReset();
    setCalibrationState('uncalibrated');
    setCalibrationOffset(0.45);
    setCalibratedPoints([]);
    setSelectedBuffer(null);
    setElectrodeLocation('storage');
    setElectrodeRinsed(false);
    setContaminationRisk(false);
    setPreviousSolutionPH(null);
    setDisplayedPH(7.00);
    setIsStable(false);
    setWaterMeasured(false);
    setWaterRecordedPH(null);
    setWaterTrials([]);
    setBalanceTared(false);
    setSoilMassG(0.0);
    setExtractionLiquidMl(0.0);
    setSoilMixed(false);
    setSoilSettled(false);
    setSoilMeasured(false);
    setSoilRecordedPH(null);
    setSoilTrials([]);
    setEventLog([]);
  };

  // AI Mentor
  const handleAskAIMentor = (promptText?: string) => {
    const textToSend = promptText || aiInputText;
    if (!textToSend.trim()) return;

    const newMsg = { sender: 'user' as const, text: textToSend };
    setChatMessages((prev) => [...prev, newMsg]);
    if (!promptText) setAiInputText('');

    setTimeout(() => {
      let reply = '';
      const q = textToSend.toLowerCase();

      if (q.includes('what is ph')) {
        reply = 'pH is the negative logarithm (base 10) of hydrogen ion activity: pH = -log10[H+]. It quantifies acidity (pH < 7) or alkalinity (pH > 7) on a logarithmic scale where each unit represents a 10-fold change in [H+].';
      } else if (q.includes('why must a ph meter be calibrated') || q.includes('calibrate')) {
        reply = 'Glass combination pH electrodes undergo asymmetric potential shifts over time. Calibration with known buffer standards (e.g. pH 7.00 and 4.00) establishes the exact Nernstian slope and zero offset.';
      } else if (q.includes('rinse')) {
        reply = 'Rinsing the electrode with distilled water removes residual ions from the previous solution. If you skip rinsing, carryover contamination will distort the sample reading.';
      } else if (q.includes('stabilize') || q.includes('stability')) {
        reply = 'The glass membrane requires time to establish equilibrium potential with hydrogen ions in the sample. Recording before stabilization introduces transient drift errors.';
      } else if (q.includes('soil')) {
        reply = 'Soil pH measures hydrogen ions in soil pore water. Since dry soil cannot form liquid contact with the glass electrode tip, soil is extracted with distilled water (1:5 ratio), stirred, and allowed to settle so the probe can measure the supernatant liquid.';
      } else if (q.includes('error') || q.includes('analyze my error')) {
        const errors: string[] = [];
        if (calibrationState === 'uncalibrated') errors.push('Attempted measurement before pH meter calibration.');
        if (contaminationRisk) errors.push('Electrode was not rinsed between solutions (cross-contamination risk).');
        if (!isStable) errors.push('Recorded reading before display reached STABLE state.');
        if (soilMassG > 0 && !soilMixed) errors.push('Soil suspension was not stirred prior to measurement.');

        reply = errors.length === 0
          ? '✨ Excellent technique! No experimental errors detected in your current protocol execution.'
          : `🔍 Error Analysis:\n- ${errors.join('\n- ')}`;
      } else if (q.includes('water sample result') || q.includes('explain my water')) {
        reply = waterRecordedPH != null
          ? `Water Sample A measured pH is ${waterRecordedPH.toFixed(2)} (${PHMeasurementEngine.classifyPH(waterRecordedPH)}). Estimated [H+] = ${PHMeasurementEngine.calculateHydrogenIonConcentration(waterRecordedPH).toExponential(2)} mol/L.`
          : 'Please complete the Water Sample measurement first.';
      } else if (q.includes('soil sample result') || q.includes('explain my soil')) {
        reply = soilRecordedPH != null
          ? `Soil Extract measured pH is ${soilRecordedPH.toFixed(2)} (${PHMeasurementEngine.classifyPH(soilRecordedPH)}). Soil pH is typically more acidic than water due to organic acid leaching and exchangeable H+ ions.`
          : 'Please complete the Soil Extract measurement first.';
      } else {
        reply = `Based on your live state (Calibration: ${calibrationState}, Water pH: ${waterRecordedPH ?? 'Pending'}, Soil pH: ${soilRecordedPH ?? 'Pending'}): Ensure electrode is rinsed and displays STABLE before logging.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['Trial', 'Sample Type', 'Measured pH', 'Temp (°C)', 'Stability', 'Calibration Status', 'Timestamp'],
    ];

    [...waterTrials, ...soilTrials].forEach((t, i) => {
      rows.push([
        (i + 1).toString(),
        t.sampleType === 'water' ? 'Water Sample A' : 'Soil Extract',
        t.measuredPH.toFixed(2),
        t.temperatureC.toFixed(1),
        t.stable ? 'Stable' : 'Unstable',
        t.calibrationValid ? 'Valid' : 'Invalid',
        t.timestamp || '',
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ph_experiment_05_data.csv`;
    link.click();
  };

  const deltaPH = useMemo(() => {
    if (waterRecordedPH != null && soilRecordedPH != null) {
      return Number(Math.abs(waterRecordedPH - soilRecordedPH).toFixed(2));
    }
    return null;
  }, [waterRecordedPH, soilRecordedPH]);

  // Tab Drawer Content Renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'PROCEDURE':
        return (
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 shrink-0" /> Step-by-Step Procedure
            </h3>
            {phWaterSoilConfig.procedure.map((step) => (
              <div key={step.stepNumber} className="bg-zinc-950 p-2.5 sm:p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>Step {step.stepNumber}</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">{step.instruction}</p>
                <div className="text-[10px] text-cyan-400/80 pt-1 border-t border-white/5">
                  Expected: {step.expectedAction}
                </div>
              </div>
            ))}
          </div>
        );

      case 'DATA':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 shrink-0" /> Data Table
              </h3>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-500/30 rounded-lg flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>

            <div className="border border-white/10 rounded-xl overflow-x-auto max-w-full bg-zinc-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-800 text-zinc-300 border-b border-white/10 text-[11px]">
                  <tr>
                    <th className="p-2">Sample</th>
                    <th className="p-2">pH</th>
                    <th className="p-2">Temp</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {[...waterTrials, ...soilTrials].length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-zinc-500">
                        No measurements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    [...waterTrials, ...soilTrials].map((t, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2 text-white font-bold whitespace-nowrap">
                          {t.sampleType === 'water' ? 'Water A' : 'Soil Extract'}
                        </td>
                        <td className="p-2 text-cyan-300 font-bold">{t.measuredPH.toFixed(2)}</td>
                        <td className="p-2 text-zinc-400">{t.temperatureC.toFixed(1)}°C</td>
                        <td className="p-2 text-emerald-400 font-bold whitespace-nowrap">Valid ✓</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'PH_SCALE':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 shrink-0" /> Interactive pH Scale (0 - 14)
            </h3>

            <div className="space-y-2 pt-1">
              <div className="h-6 w-full rounded-xl bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-cyan-400 to-purple-600 relative border border-white/20 shadow-inner overflow-hidden">
                {waterRecordedPH != null && (
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_8px_#ffffff] z-10"
                    style={{ left: `${(waterRecordedPH / 14.0) * 100}%` }}
                    title={`Water pH: ${waterRecordedPH.toFixed(2)}`}
                  />
                )}
                {soilRecordedPH != null && (
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-black border border-white z-10"
                    style={{ left: `${(soilRecordedPH / 14.0) * 100}%` }}
                    title={`Soil pH: ${soilRecordedPH.toFixed(2)}`}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                <span>0 (Acidic)</span>
                <span>7 (Neutral)</span>
                <span>14 (Alkaline)</span>
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Water Classification:</span>
                <span className="text-cyan-300 font-bold">
                  {waterRecordedPH != null ? PHMeasurementEngine.classifyPH(waterRecordedPH) : 'Not Measured'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Soil Classification:</span>
                <span className="text-amber-300 font-bold">
                  {soilRecordedPH != null ? PHMeasurementEngine.classifyPH(soilRecordedPH) : 'Not Measured'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'ADVANCED_CHEMISTRY':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" /> Electrochemistry Drawer
            </h3>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Displayed Instrument pH:</span>
                <span className="text-cyan-300 font-bold">{displayedPH.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Estimated [H⁺] Activity:</span>
                <span className="text-emerald-400 font-bold">
                  {PHMeasurementEngine.calculateHydrogenIonConcentration(displayedPH).toExponential(2)} M
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Temperature (ATC):</span>
                <span className="text-white font-bold">{temperatureC.toFixed(1)} °C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Calibration Offset:</span>
                <span className="text-amber-300 font-bold">{calibrationOffset.toFixed(2)} pH</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Electrode Stability Score:</span>
                <span className="text-cyan-400 font-bold">{stabilityScore}%</span>
              </div>
            </div>
          </div>
        );

      case 'COMPARISON':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0" /> Water vs Soil Comparison
            </h3>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-zinc-900 p-2 rounded-lg border border-cyan-500/30">
                  <div className="text-[10px] text-zinc-400">WATER pH</div>
                  <div className="text-base sm:text-lg font-bold text-cyan-300">
                    {waterRecordedPH != null ? waterRecordedPH.toFixed(2) : '---'}
                  </div>
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-amber-500/30">
                  <div className="text-[10px] text-zinc-400">SOIL pH</div>
                  <div className="text-base sm:text-lg font-bold text-amber-300">
                    {soilRecordedPH != null ? soilRecordedPH.toFixed(2) : '---'}
                  </div>
                </div>
              </div>

              {deltaPH != null && (
                <div className="text-center pt-2 border-t border-white/10">
                  <div className="text-zinc-400 text-xs">Acidity Difference:</div>
                  <div className="text-lg font-bold text-white">ΔpH = {deltaPH.toFixed(2)}</div>
                  <p className="text-[10px] text-zinc-400 pt-1 leading-normal">
                    {waterRecordedPH! > soilRecordedPH!
                      ? 'Soil extract is more acidic than water due to organic compounds & exchangeable H+ ions.'
                      : 'Water sample is more acidic than soil extract.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'REPORT':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0" /> Automated Laboratory Report
            </h3>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-2 text-[11px] leading-relaxed">
              <div className="font-bold text-white text-xs border-b border-white/10 pb-1">
                LAB REPORT: EXPERIMENT 05
              </div>
              <div><span className="text-zinc-400">Aim:</span> Determine pH of Water and Soil Samples using a calibrated pH meter.</div>
              <div><span className="text-zinc-400">Water Sample A pH:</span> {waterRecordedPH?.toFixed(2) ?? 'Not Recorded'}</div>
              <div><span className="text-zinc-400">Soil Extract pH:</span> {soilRecordedPH?.toFixed(2) ?? 'Not Recorded'}</div>
              <div><span className="text-zinc-400">Calculated ΔpH:</span> {deltaPH?.toFixed(2) ?? 'N/A'}</div>
              <div><span className="text-zinc-400">Calibration Status:</span> {calibrationState.toUpperCase()}</div>
              <div className="pt-2 border-t border-white/10 text-emerald-400 font-bold">
                Conclusion: Potentiometric measurements successfully logged.
              </div>
            </div>
          </div>
        );

      case 'AI_MENTOR':
        return (
          <div className="h-full flex flex-col space-y-2.5">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" /> AI Chemistry Mentor
            </h3>

            <div className="flex flex-wrap gap-1">
              {['What is pH?', 'Why calibrate?', 'Why rinse probe?', 'Why soil extraction?', 'Analyze my error'].map((chip) => (
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
                placeholder="Ask AI Mentor a question..."
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
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Award className="w-4 h-4 shrink-0" /> Conceptual Assessment
            </h3>

            <div className="space-y-2.5">
              {[
                { id: 1, q: '1. What is the mathematical definition of pH?', opts: ['pH = log10[H+]', 'pH = -log10[H+]', 'pH = [OH-]/[H+]'] },
                { id: 2, q: '2. Why calibrate a pH meter with buffer standards?', opts: ['To reset probe battery', 'To establish Nernst slope & zero offset', 'To clean the probe tip'] },
                { id: 3, q: '3. Why rinse the glass electrode between solutions?', opts: ['To prevent carryover contamination', 'To cool the probe', 'To dissolve glass'] },
                { id: 4, q: '4. Why wait for displayed pH to stabilize?', opts: ['Display is random', 'Glass membrane requires time to equilibrate', 'To save power'] },
                { id: 5, q: '5. Why prepare a 1:5 soil extract for soil pH?', opts: ['Soil cannot dissolve', 'Dry soil lacks liquid contact for probe', 'To dilute soil color'] },
              ].map((item) => (
                <div key={item.id} className="bg-zinc-950 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-xs">
                  <div className="font-bold text-white">{item.q}</div>
                  <div className="space-y-1">
                    {item.opts.map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-zinc-300 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name={`q_${item.id}`}
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

      case 'SAFETY':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-amber-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" /> Virtual Lab Safety Guidelines
            </h3>

            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-amber-200 text-xs space-y-2 leading-relaxed">
              <div>⚠ Wear laboratory safety goggles and disposable gloves.</div>
              <div>⚠ Handle glass electrodes with care; do not force probe into dry soil.</div>
              <div>⚠ Store glass electrode immersed in storage solution when not in use.</div>
              <div>⚠ Do not taste or ingest laboratory buffer solutions or soil samples.</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 text-white font-sans overflow-hidden select-none">
      {/* ── RESPONSIVE TOP CONTROL HEADER ──────────────────────────── */}
      <header className="h-12 sm:h-14 bg-zinc-900/90 border-b border-white/10 px-3 sm:px-4 flex items-center justify-between z-20 shrink-0 font-mono text-xs max-w-full overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <h1 className="font-bold text-white tracking-wide text-xs sm:text-sm truncate">
            EXP 05: pH OF WATER & SOIL
          </h1>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold uppercase hidden md:inline shrink-0">
            Digital Station
          </span>
        </div>

        {/* Desktop Controls (Inline) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRealisticMode(!realisticMode)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              realisticMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                : 'bg-zinc-800 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title="Toggle Realistic Noise & Drift"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Realistic Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 transition-all"
            title="Toggle Audio Effects"
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

        {/* Mobile / Tablet "More Options" Menu Button */}
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

      {/* Mobile More Options Dropdown Modal */}
      <AnimatePresence>
        {showMobileMoreMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 right-3 z-50 bg-zinc-900 border border-white/20 rounded-2xl p-3 shadow-2xl space-y-2 font-mono text-xs md:hidden w-48"
          >
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold border-b border-white/10 pb-1">
              <span>LAB CONTROLS</span>
              <button type="button" onClick={() => setShowMobileMoreMenu(false)}>
                <X className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setRealisticMode(!realisticMode);
                setShowMobileMoreMenu(false);
              }}
              className={`w-full py-1.5 px-2 rounded-xl text-left border flex items-center gap-2 ${
                realisticMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold' : 'bg-zinc-800 text-zinc-300 border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Realistic Mode</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                setShowMobileMoreMenu(false);
              }}
              className="w-full py-1.5 px-2 rounded-xl text-left bg-zinc-800 text-zinc-300 border border-white/10 flex items-center gap-2"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
              <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
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

      {/* ── RESPONSIVE MAIN WORKSPACE (GRID / FLEX SPLIT) ───────────── */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_clamp(280px,26vw,400px)]">
        
        {/* LEFT / PRIMARY LABORATORY WORKSPACE COLUMN */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-2.5 sm:p-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col justify-between space-y-3 sm:space-y-4">
          
          {/* Warning Banner */}
          {(calibrationState === 'uncalibrated' || contaminationRisk) && (
            <div className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row gap-2 shrink-0">
              {calibrationState === 'uncalibrated' && (
                <div className="flex-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="truncate">Uncalibrated meter! Calibrate with pH 7.00 & 4.00 buffers.</span>
                </div>
              )}
              {contaminationRisk && (
                <div className="flex-1 bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 font-mono">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="truncate">Dirty probe carryover! Rinse in H2O station.</span>
                </div>
              )}
            </div>
          )}

          {/* APPARATUS CARDS GRID (RESPONSIVE 3-COL / 2-COL / 1-COL) */}
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch my-auto">
            
            {/* 1. DIGITAL pH METER HERO CARD */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900/90 border-2 border-cyan-500/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl flex flex-col items-center justify-between gap-3 relative overflow-hidden backdrop-blur-md min-w-0"
            >
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-2 truncate">
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-bold text-xs tracking-wider text-zinc-200 truncate">DIGITAL pH METER</span>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePower}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                    powerOn ? 'bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/50' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}
                  title="Power On / Off"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>

              {/* LCD Display */}
              <div className="w-full bg-cyan-950/60 border-2 border-cyan-400/50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-inner relative">
                <div className="w-full flex items-center justify-between text-[10px] font-mono text-cyan-400/80 uppercase">
                  <span>ATC: {temperatureC.toFixed(1)}°C</span>
                  <span className={calibrationState === 'calibrated' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {calibrationState.toUpperCase()}
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-wider text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)] py-1">
                  {powerOn ? displayedPH.toFixed(2) : '---'}
                </div>

                <div className="w-full flex items-center justify-between pt-1 border-t border-cyan-500/30 text-[10px] font-mono">
                  <div className="flex items-center gap-1 truncate">
                    <span className="text-zinc-400">STABILITY:</span>
                    <span className={`font-bold ${isStable ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                      {isStable ? 'STABLE ✓' : `${stabilityScore}%`}
                    </span>
                  </div>
                  <span className="text-zinc-400 uppercase truncate">
                    {electrodeLocation === 'storage' ? 'DRY PROBE' : electrodeLocation.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Probe Connection Wire */}
              <div className="w-full flex flex-col items-center">
                <div className="w-1 h-8 sm:h-10 bg-gradient-to-b from-cyan-500 to-zinc-700 rounded-full" />
                <div className="text-[9px] font-mono text-zinc-400">Combination Glass Cable</div>
              </div>
            </motion.div>

            {/* 2. ELECTRODE & BUFFERS CARD */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col items-center justify-between gap-3 min-w-0">
              <div className="w-full text-xs font-bold text-zinc-300 font-mono flex items-center gap-2 border-b border-white/10 pb-1.5">
                <Droplet className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">ELECTRODE & BUFFERS</span>
              </div>

              {/* Probe Graphic Container */}
              <div className="relative w-full h-28 sm:h-32 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                <motion.div
                  animate={{
                    y: electrodeLocation !== 'storage' ? 8 : -8,
                  }}
                  className="flex flex-col items-center"
                >
                  <div className="w-3.5 h-12 bg-zinc-400 rounded-t border border-zinc-300 flex items-center justify-center">
                    <div className="w-1.5 h-8 bg-cyan-400/60 rounded" />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-cyan-300/80 border border-white shadow-md flex items-center justify-center text-[7px] font-mono text-black font-bold">
                    Ag
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-200 border border-cyan-400 animate-pulse" />
                </motion.div>

                {electrodeLocation !== 'storage' && (
                  <div className="absolute bottom-0 inset-x-0 h-12 bg-cyan-500/20 backdrop-blur-sm border-t border-cyan-400/40 flex items-center justify-center">
                    <span className="text-[9px] font-mono font-bold text-cyan-300 uppercase px-1 text-center truncate">
                      {isRinsingAnimating ? '💧 RINSING PROBE...' : `IMMERSED: ${electrodeLocation}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Buffer Actions */}
              <div className="w-full space-y-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={handleRinseElectrode}
                  className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 text-[11px]"
                >
                  <Droplet className="w-3.5 h-3.5" />
                  <span>Rinse Probe in H2O Station</span>
                </button>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectBuffer(7.00)}
                    className={`py-1 rounded-lg border text-[10px] font-bold transition-all ${
                      selectedBuffer === 7.00 ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400' : 'bg-zinc-800 text-zinc-300 border-white/10'
                    }`}
                  >
                    pH 7.00
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBuffer(4.00)}
                    className={`py-1 rounded-lg border text-[10px] font-bold transition-all ${
                      selectedBuffer === 4.00 ? 'bg-red-500/30 text-red-300 border-red-400' : 'bg-zinc-800 text-zinc-300 border-white/10'
                    }`}
                  >
                    pH 4.00
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBuffer(10.00)}
                    className={`py-1 rounded-lg border text-[10px] font-bold transition-all ${
                      selectedBuffer === 10.00 ? 'bg-blue-500/30 text-blue-300 border-blue-400' : 'bg-zinc-800 text-zinc-300 border-white/10'
                    }`}
                  >
                    pH 10.00
                  </button>
                </div>

                {selectedBuffer != null && (
                  <button
                    type="button"
                    onClick={handleConfirmCalibrationPoint}
                    disabled={!isStable}
                    className={`w-full py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                      isStable ? 'bg-emerald-500 text-black border-emerald-400 shadow-md cursor-pointer' : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Point ({selectedBuffer.toFixed(2)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. SAMPLES CARD */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col items-center justify-between gap-3 sm:col-span-2 lg:col-span-1 min-w-0">
              <div className="w-full text-xs font-bold text-zinc-300 font-mono flex items-center gap-2 border-b border-white/10 pb-1.5">
                <Beaker className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">SAMPLE PREPARATION</span>
              </div>

              <div className="w-full grid grid-cols-2 gap-2">
                {/* Water Beaker */}
                <div className="bg-black/50 border border-cyan-500/30 rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5">
                  <Beaker className="w-6 h-6 text-cyan-400" />
                  <div>
                    <div className="font-bold text-[11px] text-white font-mono truncate">WATER A</div>
                    <div className="text-[9px] text-zinc-400 font-mono">50 mL</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleImmerseWater}
                    className={`w-full py-1 rounded-lg border text-[10px] font-bold font-mono transition-all ${
                      electrodeLocation === 'water' ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-zinc-800 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    Immerse
                  </button>
                  {waterMeasured && (
                    <div className="text-[9px] font-mono text-emerald-400 font-bold">
                      pH: {waterRecordedPH?.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Soil Container */}
                <div className="bg-black/50 border border-amber-500/30 rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5">
                  <Scale className="w-6 h-6 text-amber-400" />
                  <div>
                    <div className="font-bold text-[11px] text-white font-mono truncate">SOIL EXTRACT</div>
                    <div className="text-[9px] text-zinc-400 font-mono">{soilMassG.toFixed(1)}g/{extractionLiquidMl.toFixed(0)}mL</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleImmerseSoil}
                    disabled={!soilSettled}
                    className={`w-full py-1 rounded-lg border text-[10px] font-bold font-mono transition-all ${
                      !soilSettled
                        ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                        : electrodeLocation === 'soil'
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-zinc-800 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    Immerse
                  </button>
                  {soilMeasured && (
                    <div className="text-[9px] font-mono text-emerald-400 font-bold">
                      pH: {soilRecordedPH?.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Record Measurement Action Buttons */}
              <div className="w-full space-y-1 pt-1 font-mono text-xs">
                {electrodeLocation === 'water' && (
                  <button
                    type="button"
                    onClick={handleRecordWaterPH}
                    disabled={!isStable}
                    className={`w-full py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isStable ? 'bg-cyan-500 text-black border-cyan-400 shadow-md cursor-pointer' : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Record Water Sample pH</span>
                  </button>
                )}

                {electrodeLocation === 'soil' && (
                  <button
                    type="button"
                    onClick={handleRecordSoilPH}
                    disabled={!isStable}
                    className={`w-full py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isStable ? 'bg-amber-500 text-black border-amber-400 shadow-md cursor-pointer' : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Record Soil Extract pH</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SOIL PREPARATION WORKFLOW STEPPER */}
          <div className="w-full max-w-6xl mx-auto bg-zinc-900/80 border border-white/10 rounded-2xl p-3 sm:p-4 font-mono text-xs space-y-2.5 min-w-0 shrink-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-2 truncate">
                <Scale className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-white text-xs truncate">SOIL EXTRACT PREPARATION (1:5 RATIO)</span>
              </div>
              <span className="text-[10px] text-zinc-400 shrink-0">
                {soilSettled ? 'READY ✓' : 'IN PROGRESS...'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleTareBalance}
                className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all text-left truncate ${
                  balanceTared ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-800 text-zinc-300 border-white/10'
                }`}
              >
                1. Tare Balance
              </button>

              <button
                type="button"
                onClick={handleAddSoilMass}
                disabled={!balanceTared}
                className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all text-left truncate ${
                  soilMassG > 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : balanceTared ? 'bg-zinc-800 text-zinc-300 border-white/10' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                }`}
              >
                2. Weigh 10g Soil
              </button>

              <button
                type="button"
                onClick={handleAddExtractionLiquid}
                disabled={soilMassG < 1.0}
                className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all text-left truncate ${
                  extractionLiquidMl > 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : soilMassG > 0 ? 'bg-zinc-800 text-zinc-300 border-white/10' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                }`}
              >
                3. Add 50mL H2O
              </button>

              <button
                type="button"
                onClick={handleMixSoil}
                disabled={extractionLiquidMl < 10}
                className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all text-left truncate ${
                  soilMixed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : extractionLiquidMl > 0 ? 'bg-zinc-800 text-zinc-300 border-white/10' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                }`}
              >
                4. Stir & Mix
              </button>
            </div>

            {soilMixed && !soilSettled && (
              <button
                type="button"
                onClick={handleSettleSoil}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all shadow-md flex items-center justify-center gap-2 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSettlingAnimating ? 'animate-spin' : ''}`} />
                <span>{isSettlingAnimating ? 'Equilibrating...' : '5. Settle Particles into Supernatant'}</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT / SIDE DRAWER PANEL (RESPONSIVE DESKTOP PANEL & MOBILE/TABLET SHEET) */}
        <div
          className={`w-full md:w-auto h-full border-t md:border-t-0 md:border-l border-white/10 bg-zinc-900 flex flex-col min-h-0 min-w-0 overflow-hidden ${
            mobileDrawerOpen ? 'fixed inset-x-0 bottom-0 top-20 z-40 bg-zinc-900/95 backdrop-blur-md' : ''
          }`}
        >
          {/* Mobile Drawer Bar Toggle (Visible on Small Viewports) */}
          <div
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="md:hidden h-10 bg-zinc-950 border-b border-white/10 px-3 flex items-center justify-between text-xs font-mono shrink-0 cursor-pointer text-cyan-400 font-bold"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>LAB DATA & TOOL DRAWER</span>
            </div>
            {mobileDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>

          {/* Horizontally Scrollable Tab Navigation Bar */}
          <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-none bg-black/70 p-1.5 gap-1 border-b border-white/10 max-w-full font-mono text-[11px] shrink-0">
            {(
              [
                'PROCEDURE',
                'DATA',
                'PH_SCALE',
                'ADVANCED_CHEMISTRY',
                'COMPARISON',
                'REPORT',
                'AI_MENTOR',
                'ASSESSMENT',
                'SAFETY',
              ] as const
            ).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  activeTab === t ? 'bg-cyan-500 text-black shadow' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Active Tab Body Content */}
          <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto font-mono text-xs space-y-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
