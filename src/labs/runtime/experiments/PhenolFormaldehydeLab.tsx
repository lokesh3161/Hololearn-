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
  MoreVertical,
  X,
  Eye,
  Thermometer,
  Grid,
  Hand,
  Maximize2,
  PackageCheck,
  ArrowRight,
} from 'lucide-react';

import type { ExperimentConfig } from '../../types';
import type {
  PhenolFormaldehydeConfig,
  PolymerReactionState,
  ThermalState,
  PolymerEvent,
  MolecularStage,
  PolymerMaterialVisualState,
} from '../../types/polymerExperimentTypes';

import { phenolFormaldehydeConfig } from '../../chemistry/phenolFormaldehyde';
import { PolymerizationEngine, DEFAULT_PHENOL_FORMALDEHYDE_CONFIG } from '../../engines/PolymerizationEngine';
import { labSound } from '../../utils/LabSoundManager';
import { PolymerSpecimenRenderer } from '../../components/PolymerSpecimenRenderer';

interface PhenolFormaldehydeLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const PhenolFormaldehydeLab: React.FC<PhenolFormaldehydeLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. CONFIGURATION & CONSTANTS ─────────────────────────────────
  const expConfig: PhenolFormaldehydeConfig = DEFAULT_PHENOL_FORMALDEHYDE_CONFIG;

  // ── 2. CORE LABORATORY STATE ──────────────────────────────────────
  const [safetyAcknowledged, setSafetyAcknowledged] = useState<boolean>(false);
  const [ppeSelected, setPpeSelected] = useState<{ goggles: boolean; coat: boolean; gloves: boolean }>({
    goggles: false,
    coat: false,
    gloves: false,
  });

  const [pathway, setPathway] = useState<'resol' | 'novolac'>('resol');
  const [realisticMode, setRealisticMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Reagents & Measurement State
  const [phenolMeasured, setPhenolMeasured] = useState<boolean>(false);
  const [formaldehydeMeasured, setFormaldehydeMeasured] = useState<boolean>(false);
  const [phenolTransferred, setPhenolTransferred] = useState<boolean>(false);
  const [formaldehydeTransferred, setFormaldehydeTransferred] = useState<boolean>(false);
  const [catalystAdded, setCatalystAdded] = useState<boolean>(false);

  // Mixing & Thermal State
  const [mixingProgress, setMixingProgress] = useState<number>(0);
  const [isMixing, setIsMixing] = useState<boolean>(false);
  const [thermalState, setThermalState] = useState<ThermalState>(PolymerizationEngine.getInitialThermalState());
  const [reactionState, setReactionState] = useState<PolymerReactionState>(PolymerizationEngine.getInitialReactionState());

  // Curing, Sample Tray, Inspection Modal & Molecular Overlay State
  const [isCuring, setIsCuring] = useState<boolean>(false);
  const [sampleTransferredToTray, setSampleTransferredToTray] = useState<boolean>(false);
  const [showInspectionModal, setShowInspectionModal] = useState<boolean>(false);
  const [showMolecularOverlay, setShowMolecularOverlay] = useState<boolean>(false);

  // Interactive Inspection View Controls (Rotation & Zoom)
  const [sampleRotationY, setSampleRotationY] = useState<number>(25);
  const [sampleRotationX, setSampleRotationX] = useState<number>(15);
  const [sampleZoom, setSampleZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Telemetry & Event Log
  const [eventLog, setEventLog] = useState<PolymerEvent[]>([]);
  const [loggedDataRows, setLoggedDataRows] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    'PROCEDURE' | 'DATA' | 'MOLECULAR' | 'ADVANCED_CHEMISTRY' | 'PATHWAYS' | 'REPORT' | 'AI_MENTOR' | 'ASSESSMENT' | 'SAFETY'
  >('PROCEDURE');

  // AI Mentor State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '👋 Welcome to Experiment 06: Preparation of Phenol-Formaldehyde Polymer! Equip virtual PPE, choose your pathway (Resol or Novolac), and measure phenol and formaldehyde reagents.',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [elapsedTimeSec, setElapsedTimeSec] = useState<number>(0);

  const logEvent = useCallback((event: PolymerEvent) => {
    setEventLog((prev) => [...prev, event]);
  }, []);

  // Compute Visual Material State strictly from PolymerReactionState
  const visualState: PolymerMaterialVisualState = useMemo(() => {
    return PolymerizationEngine.calculateMaterialVisualState(reactionState);
  }, [reactionState]);

  // ── 3. REACTION & THERMAL SIMULATION LOOP ─────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Step Thermal Engine
      setThermalState((prevThermal) => {
        const nextThermal = PolymerizationEngine.stepThermal(prevThermal, 0.2);
        return nextThermal;
      });

      // 2. Step Reaction Engine
      setReactionState((prevReaction) => {
        let updated = PolymerizationEngine.stepReaction(
          {
            ...prevReaction,
            phenolPresent: phenolTransferred,
            formaldehydePresent: formaldehydeTransferred,
            catalystConditionMet: catalystAdded,
          },
          thermalState,
          mixingProgress >= 100,
          pathway,
          expConfig
        );

        if (isCuring) {
          updated = PolymerizationEngine.stepCuring(updated, thermalState);
        }

        return updated;
      });

      if (reactionState.reactionProgress > 0 && reactionState.reactionProgress < 100) {
        setElapsedTimeSec((t) => t + 1);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [phenolTransferred, formaldehydeTransferred, catalystAdded, mixingProgress, thermalState, pathway, isCuring, reactionState.reactionProgress]);

  // Sync Telemetry Log Rows
  useEffect(() => {
    if (reactionState.reactionProgress > 0 && reactionState.reactionProgress % 10 < 1.5) {
      const newRow = {
        timeMin: (elapsedTimeSec / 60.0).toFixed(1),
        tempC: thermalState.currentTemperature.toFixed(1),
        progress: reactionState.reactionProgress.toFixed(1),
        polymerFrac: reactionState.polymerFraction.toFixed(2),
        viscosity: reactionState.viscosity.toFixed(0),
        crosslink: reactionState.crosslinkDensity.toFixed(2),
        stateLabel: visualState.label,
      };
      setLoggedDataRows((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].progress !== newRow.progress) {
          return [...prev, newRow];
        }
        return prev;
      });
    }
  }, [reactionState, thermalState, elapsedTimeSec, visualState]);

  // Sync inputs with parent runner
  useEffect(() => {
    onUpdateInput('ppeSelected', ppeSelected.goggles && ppeSelected.coat && ppeSelected.gloves);
    onUpdateInput('reagentsMeasured', phenolMeasured && formaldehydeMeasured);
    onUpdateInput('isMixed', mixingProgress >= 100);
    onUpdateInput('catalystAdded', catalystAdded);
    onUpdateInput('tempC', thermalState.currentTemperature);
    onUpdateInput('reactionProgress', reactionState.reactionProgress);
    onUpdateInput('polymerFraction', reactionState.polymerFraction);
    onUpdateInput('crosslinkDensity', reactionState.crosslinkDensity);
    onUpdateInput('viscosity', reactionState.viscosity);
    onUpdateInput('curingProgress', reactionState.curingProgress);
    onUpdateInput('isCured', reactionState.finalState === 'cured');
    onUpdateInput('sampleTransferred', sampleTransferredToTray);
    onUpdateInput('pathway', pathway);
  }, [ppeSelected, phenolMeasured, formaldehydeMeasured, mixingProgress, catalystAdded, thermalState.currentTemperature, reactionState, sampleTransferredToTray, pathway, onUpdateInput]);

  // ── 4. USER INTERACTION HANDLERS ─────────────────────────────────

  const handleTogglePPE = (key: 'goggles' | 'coat' | 'gloves') => {
    if (soundEnabled) labSound.playClick();
    const next = { ...ppeSelected, [key]: !ppeSelected[key] };
    setPpeSelected(next);
    if (next.goggles && next.coat && next.gloves && !safetyAcknowledged) {
      setSafetyAcknowledged(true);
      logEvent({ type: 'polymer_lab_started' });
      onCompleteStep(1);
    }
  };

  const handleSelectPathway = (p: 'resol' | 'novolac') => {
    if (soundEnabled) labSound.playClick();
    setPathway(p);
    logEvent({ type: 'reaction_condition_selected', condition: p === 'resol' ? 'basic' : 'acidic' });
    onCompleteStep(2);
  };

  const handleMeasurePhenol = () => {
    if (!safetyAcknowledged) return;
    if (soundEnabled) labSound.playBeaker();
    setPhenolMeasured(true);
    logEvent({ type: 'reagent_measured', reagent: 'Phenol', simulatedAmount: 25.0 });
  };

  const handleMeasureFormaldehyde = () => {
    if (!safetyAcknowledged) return;
    if (soundEnabled) labSound.playBeaker();
    setFormaldehydeMeasured(true);
    logEvent({ type: 'reagent_measured', reagent: 'Formaldehyde', simulatedAmount: 30.0 });
  };

  const handleTransferPhenol = () => {
    if (!phenolMeasured) return;
    if (soundEnabled) labSound.playPouring();
    setPhenolTransferred(true);
    logEvent({ type: 'reagent_transferred', reagent: 'Phenol' });
    onCompleteStep(3);
  };

  const handleTransferFormaldehyde = () => {
    if (!formaldehydeMeasured) return;
    if (soundEnabled) labSound.playPouring();
    setFormaldehydeTransferred(true);
    logEvent({ type: 'reagent_transferred', reagent: 'Formaldehyde' });
    onCompleteStep(4);
  };

  const handleAddCatalyst = () => {
    if (!phenolTransferred || !formaldehydeTransferred) return;
    if (soundEnabled) labSound.playPouring();
    setCatalystAdded(true);
    logEvent({ type: 'reaction_condition_selected', condition: pathway === 'resol' ? 'basic' : 'acidic' });
    onCompleteStep(5);
  };

  const handleStartMixing = () => {
    if (!catalystAdded || reactionState.finalState === 'cured' || mixingProgress >= 100) return;
    if (soundEnabled) labSound.playStirring();
    setIsMixing(true);
    logEvent({ type: 'mixing_started' });

    const interval = setInterval(() => {
      setMixingProgress((curr) => {
        if (curr >= 100) {
          clearInterval(interval);
          setIsMixing(false);
          logEvent({ type: 'mixing_completed' });
          onCompleteStep(6);
          return 100;
        }
        return curr + 25;
      });
    }, 400);
  };

  const handleToggleHeating = () => {
    if (soundEnabled) labSound.playClick();
    const nextHeating = !thermalState.heatingActive;
    setThermalState((prev) => ({ ...prev, heatingActive: nextHeating }));
    if (nextHeating) {
      logEvent({ type: 'heating_started' });
      onCompleteStep(7);
    }
  };

  const handleStartCuring = () => {
    if (reactionState.reactionProgress < 50) return;
    if (soundEnabled) labSound.playClick();
    setIsCuring(true);
    logEvent({ type: 'curing_started' });
    onCompleteStep(9);
  };

  const handleTransferToSampleTray = () => {
    if (reactionState.finalState !== 'cured' && reactionState.polymerFraction < 0.8) return;
    if (soundEnabled) labSound.playSuccess();
    setSampleTransferredToTray(true);
    logEvent({ type: 'polymer_sample_inspected' });
    onCompleteStep(10);
  };

  const handleOpenInspectionModal = () => {
    if (soundEnabled) labSound.playClick();
    setShowInspectionModal(true);
    logEvent({ type: 'polymer_sample_inspected' });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    setSampleRotationY((r) => r + dx * 0.8);
    setSampleRotationX((r) => Math.max(-60, Math.min(60, r - dy * 0.8)));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleResetLab = () => {
    if (soundEnabled) labSound.playReset();
    setSafetyAcknowledged(false);
    setPpeSelected({ goggles: false, coat: false, gloves: false });
    setPathway('resol');
    setPhenolMeasured(false);
    setFormaldehydeMeasured(false);
    setPhenolTransferred(false);
    setFormaldehydeTransferred(false);
    setCatalystAdded(false);
    setMixingProgress(0);
    setIsMixing(false);
    setThermalState(PolymerizationEngine.getInitialThermalState());
    setReactionState(PolymerizationEngine.getInitialReactionState());
    setIsCuring(false);
    setSampleTransferredToTray(false);
    setShowInspectionModal(false);
    setShowMolecularOverlay(false);
    setEventLog([]);
    setLoggedDataRows([]);
    setElapsedTimeSec(0);
  };

  // AI Mentor Questions
  const handleAskAIMentor = (promptText?: string) => {
    const textToSend = promptText || aiInputText;
    if (!textToSend.trim()) return;

    const newMsg = { sender: 'user' as const, text: textToSend };
    setChatMessages((prev) => [...prev, newMsg]);
    if (!promptText) setAiInputText('');

    setTimeout(() => {
      let reply = '';
      const q = textToSend.toLowerCase();

      if (q.includes('condensation polymerization')) {
        reply = 'Condensation polymerization is a step-growth reaction where monomers (phenol and formaldehyde) combine with the simultaneous elimination of small byproduct molecules like water (H2O).';
      } else if (q.includes('resol') || q.includes('novolac')) {
        reply = 'Resol resins are base-catalyzed with excess formaldehyde, forming reactive hydroxymethyl groups that self-crosslink into thermosets upon heating. Novolac resins are acid-catalyzed with excess phenol, yielding linear thermoplastics that require a curing agent to crosslink.';
      } else if (q.includes('viscosity')) {
        reply = `Viscosity is currently ${reactionState.viscosity} cP (${visualState.label}). As oligomers grow and crosslink, molecular friction and entanglement increase dramatically, slowing fluid motion until gelation occurs.`;
      } else if (q.includes('sample') || q.includes('look like')) {
        reply = `Your polymer sample is an organic molded specimen in the ${visualState.phase.toUpperCase()} state (${visualState.label}). Click "Inspect Polymer Sample" to rotate and inspect its physical depth, translucency, and micro-bubbles close up.`;
      } else if (q.includes('crosslinking') || q.includes('thermoset')) {
        reply = 'Crosslinking creates covalent methylene (-CH2-) bridges across polymer chains, turning fluid liquid into an infusible, rigid 3D thermoset network.';
      } else {
        reply = `Based on your live reaction state (Pathway: ${pathway.toUpperCase()}, Progress: ${reactionState.reactionProgress.toFixed(1)}%, Viscosity: ${reactionState.viscosity} cP, State: ${visualState.label}): Monitor thermal heating and inspect the polymer specimen upon curing.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Time (min)', 'Temp (°C)', 'Reaction Progress (%)', 'Polymer Fraction', 'Viscosity (cP)', 'Crosslinking', 'State'],
    ];
    loggedDataRows.forEach((r) => {
      rows.push([r.timeMin, r.tempC, r.progress, r.polymerFrac, r.viscosity, r.crosslink, r.stateLabel]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phenol_formaldehyde_polymer_data.csv`;
    link.click();
  };

  const molecularStage = useMemo(() => PolymerizationEngine.getMolecularStage(reactionState), [reactionState]);
  const stirringResistance = useMemo(() => PolymerizationEngine.getStirringResistanceLabel(reactionState.viscosity), [reactionState.viscosity]);

  // Tab Content Renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'PROCEDURE':
        return (
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 shrink-0" /> Guided Procedure
            </h3>
            {phenolFormaldehydeConfig.procedure.map((step) => (
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
                <BarChart2 className="w-4 h-4 shrink-0" /> Reaction Telemetry Data
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
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-800 text-zinc-300 border-b border-white/10 text-[10px]">
                  <tr>
                    <th className="p-2">Time</th>
                    <th className="p-2">Temp</th>
                    <th className="p-2">Progress</th>
                    <th className="p-2">Poly Frac</th>
                    <th className="p-2">Viscosity</th>
                    <th className="p-2">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[10px]">
                  {loggedDataRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-zinc-500">
                        No telemetry points logged yet.
                      </td>
                    </tr>
                  ) : (
                    loggedDataRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2 text-white">{r.timeMin}m</td>
                        <td className="p-2 text-amber-300">{r.tempC}°C</td>
                        <td className="p-2 text-cyan-300 font-bold">{r.progress}%</td>
                        <td className="p-2 text-emerald-300">{r.polymerFrac}</td>
                        <td className="p-2 text-purple-300">{r.viscosity} cP</td>
                        <td className="p-2 text-zinc-300 whitespace-nowrap">{r.stateLabel}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'MOLECULAR':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Grid className="w-4 h-4 shrink-0" /> Educational 2D Molecular View
            </h3>

            <div className="bg-zinc-950 p-4 rounded-xl border border-white/10 space-y-3 text-center">
              <div className="text-xs font-bold text-emerald-400 font-mono uppercase">
                STAGE: {molecularStage.toUpperCase()}
              </div>

              <div className="w-full h-40 bg-black/60 rounded-xl border border-white/10 flex items-center justify-center p-3 relative overflow-hidden">
                {molecularStage === 'monomers' && (
                  <div className="flex items-center justify-around w-full">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center font-bold text-[10px] text-cyan-200">
                        Phenol
                      </div>
                      <span className="text-[9px] text-zinc-400 mt-1">C6H5OH</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-500">+</span>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center font-bold text-[9px] text-amber-200">
                        CH2O
                      </div>
                      <span className="text-[9px] text-zinc-400 mt-1">Formaldehyde</span>
                    </div>
                  </div>
                )}

                {molecularStage === 'intermediates' && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="p-2 rounded-xl border border-emerald-400 bg-emerald-500/10 text-emerald-300 font-bold text-[10px]">
                      HO-C6H4-CH2OH
                    </div>
                    <span className="text-[10px] text-zinc-400">Hydroxymethyl Intermediates</span>
                  </div>
                )}

                {molecularStage === 'oligomers' && (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-purple-300">
                      <span>[Phenol]</span>
                      <span className="w-4 h-0.5 bg-purple-400" />
                      <span>CH2</span>
                      <span className="w-4 h-0.5 bg-purple-400" />
                      <span>[Phenol]</span>
                    </div>
                    <span className="text-[9px] text-zinc-400">Methylene-Linked Oligomers</span>
                  </div>
                )}

                {(molecularStage === 'polymer-chains' || molecularStage === 'crosslinked-network') && (
                  <div className="flex flex-col items-center justify-center gap-2 w-full">
                    <div className="flex items-center justify-center gap-1 text-[9px] text-cyan-300 font-bold">
                      ●──CH2──●──CH2──●──CH2──●
                    </div>
                    {molecularStage === 'crosslinked-network' && (
                      <>
                        <div className="flex items-center justify-center gap-4 text-[9px] text-amber-400 font-bold">
                          │ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; │ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; │
                        </div>
                        <div className="flex items-center justify-center gap-1 text-[9px] text-cyan-300 font-bold">
                          ●──CH2──●──CH2──●──CH2──●
                        </div>
                      </>
                    )}
                    <span className="text-[9px] text-emerald-400 pt-1">
                      {molecularStage === 'crosslinked-network' ? '3D Thermoset Crosslinked Resin Network' : 'Linear Polymer Chains'}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-zinc-400 font-mono italic">
                Educational schematic derived from chemical reaction state.
              </div>
            </div>
          </div>
        );

      case 'ADVANCED_CHEMISTRY':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" /> Advanced Polymer Drawer
            </h3>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Hydroxymethylation:</span>
                <span className="text-cyan-300 font-bold">{reactionState.hydroxymethylationProgress.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Condensation Progress:</span>
                <span className="text-amber-300 font-bold">{reactionState.condensationProgress.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Oligomer Fraction:</span>
                <span className="text-purple-300 font-bold">{reactionState.oligomerFraction.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Polymer Fraction:</span>
                <span className="text-emerald-300 font-bold">{reactionState.polymerFraction.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Crosslink Density:</span>
                <span className="text-white font-bold">{reactionState.crosslinkDensity.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Water Byproduct Relative:</span>
                <span className="text-cyan-400 font-bold">{reactionState.waterByproductRelative.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Viscosity (cP):</span>
                <span className="text-purple-400 font-bold">{reactionState.viscosity} cP</span>
              </div>
            </div>
          </div>
        );

      case 'PATHWAYS':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0" /> Resol vs Novolac Pathways
            </h3>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-3 font-mono text-xs">
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-cyan-500/30 space-y-1">
                <div className="font-bold text-cyan-300 text-xs">RESOL PATHWAY (Base Catalyzed)</div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Synthesized with alkaline catalyst (NaOH/NH3) and excess formaldehyde. Contains active methylol (-CH2OH) groups that self-crosslink into thermoset resins upon heating.
                </p>
              </div>

              <div className="bg-zinc-900 p-2.5 rounded-lg border border-amber-500/30 space-y-1">
                <div className="font-bold text-amber-300 text-xs">NOVOLAC PATHWAY (Acid Catalyzed)</div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Synthesized with acid catalyst (HCl/Oxalic Acid) and excess phenol. Produces stable linear thermoplastic oligomers requiring a curing agent for crosslinking.
                </p>
              </div>
            </div>
          </div>
        );

      case 'REPORT':
        return (
          <div className="space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0" /> Automated Laboratory Report
            </h3>

            <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-2 text-[11px] leading-relaxed font-mono">
              <div className="font-bold text-white text-xs border-b border-white/10 pb-1">
                LAB REPORT: EXPERIMENT 06
              </div>
              <div><span className="text-zinc-400">Aim:</span> Synthesize phenol-formaldehyde polymer resin via condensation polymerization.</div>
              <div><span className="text-zinc-400">Pathway:</span> {pathway.toUpperCase()} ({pathway === 'resol' ? 'Base' : 'Acid'} Catalyzed)</div>
              <div><span className="text-zinc-400">Final Reaction Progress:</span> {reactionState.reactionProgress.toFixed(1)}%</div>
              <div><span className="text-zinc-400">Final Polymer Fraction:</span> {reactionState.polymerFraction.toFixed(2)}</div>
              <div><span className="text-zinc-400">Final Viscosity:</span> {reactionState.viscosity} cP ({stirringResistance} resistance)</div>
              <div><span className="text-zinc-400">Crosslink Density:</span> {reactionState.crosslinkDensity.toFixed(2)}</div>
              <div><span className="text-zinc-400">Sample State:</span> {visualState.label}</div>
              <div><span className="text-zinc-400">Sample Transfer:</span> {sampleTransferredToTray ? 'Transferred to Tray ✓' : 'In Vessel'}</div>
              <div className="pt-2 border-t border-white/10 text-emerald-400 font-bold">
                Conclusion: Polymerization state reached {visualState.label}.
              </div>
            </div>
          </div>
        );

      case 'AI_MENTOR':
        return (
          <div className="h-full flex flex-col space-y-2.5 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" /> AI Polymer Mentor
            </h3>

            <div className="flex flex-wrap gap-1">
              {['What is condensation polymerization?', 'Resol vs Novolac?', 'Why viscosity increases?', 'What does my sample look like?', 'Analyze my error'].map((chip) => (
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
                placeholder="Ask AI Polymer Mentor..."
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
                { id: 1, q: '1. What type of reaction forms phenol-formaldehyde polymers?', opts: ['Addition polymerization', 'Condensation polymerization', 'Free-radical chain reaction'] },
                { id: 2, q: '2. What small byproduct molecule is eliminated during condensation?', opts: ['Carbon dioxide (CO2)', 'Water (H2O)', 'Ammonia (NH3)'] },
                { id: 3, q: '3. Which catalyst condition produces Resol resins?', opts: ['Basic catalyst (NaOH)', 'Acid catalyst (HCl)', 'Neutral water'] },
                { id: 4, q: '4. Why does fluid viscosity increase during polymerization?', opts: ['Temperature drops', 'Chain growth & crosslinking entangle molecules', 'Evaporation of solvent'] },
                { id: 5, q: '5. What is a thermosetting polymer network?', opts: ['Soluble thermoplastic', 'Infusible crosslinked 3D covalent network', 'Liquid gel'] },
              ].map((item) => (
                <div key={item.id} className="bg-zinc-950 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-xs">
                  <div className="font-bold text-white">{item.q}</div>
                  <div className="space-y-1">
                    {item.opts.map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-zinc-300 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name={`pq_${item.id}`}
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
          <div className="space-y-3 font-mono">
            <h3 className="font-bold text-xs sm:text-sm text-amber-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" /> Virtual Lab Safety Guidelines
            </h3>

            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-amber-200 text-xs space-y-2 leading-relaxed">
              <div>⚠ Phenol and formaldehyde are hazardous laboratory chemicals.</div>
              <div>⚠ This experiment is a virtual educational simulation for learning polymerization concepts.</div>
              <div>⚠ Equip virtual PPE (goggles, lab coat, nitrile gloves) before handling simulated reagents.</div>
              <div>⚠ Do not attempt to reproduce simulation parameters as a real-world chemical procedure.</div>
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
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <h1 className="font-bold text-white tracking-wide text-xs sm:text-sm truncate">
            EXP 06: PHENOL-FORMALDEHYDE POLYMER
          </h1>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase hidden md:inline shrink-0">
            Condensation Engine
          </span>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRealisticMode(!realisticMode)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              realisticMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                : 'bg-zinc-800 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Realistic Mode</span>
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

      {/* ── RESPONSIVE MAIN WORKSPACE ───────────────────────────────── */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_clamp(280px,26vw,400px)]">
        
        {/* LEFT / PRIMARY REACTION BENCH WORKSPACE COLUMN */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-2.5 sm:p-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col justify-between space-y-3 sm:space-y-4">
          
          {/* REACTION TIMELINE STEPPER WIDGET */}
          <div className="w-full max-w-6xl mx-auto bg-zinc-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-3 font-mono text-xs shrink-0">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold mb-1.5">
              <span>REACTION STAGE TIMELINE</span>
              <span className="text-cyan-400 uppercase font-bold">{visualState.label}</span>
            </div>
            <div className="flex items-center justify-between gap-1 overflow-x-auto whitespace-nowrap scrollbar-none text-[10px]">
              <span className={`px-2 py-0.5 rounded font-bold ${reactionState.reactionProgress < 15 ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                1. MONOMERS
              </span>
              <span className="text-zinc-600">➔</span>
              <span className={`px-2 py-0.5 rounded font-bold ${reactionState.reactionProgress >= 15 && reactionState.reactionProgress < 40 ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                2. REACTION
              </span>
              <span className="text-zinc-600">➔</span>
              <span className={`px-2 py-0.5 rounded font-bold ${reactionState.reactionProgress >= 40 && reactionState.reactionProgress < 70 ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                3. OLIGOMERS
              </span>
              <span className="text-zinc-600">➔</span>
              <span className={`px-2 py-0.5 rounded font-bold ${reactionState.reactionProgress >= 70 && reactionState.reactionProgress < 90 ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                4. POLYMER
              </span>
              <span className="text-zinc-600">➔</span>
              <span className={`px-2 py-0.5 rounded font-bold ${reactionState.reactionProgress >= 90 && reactionState.finalState !== 'cured' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                5. GEL
              </span>
              <span className="text-zinc-600">➔</span>
              <span className={`px-2 py-0.5 rounded font-bold ${reactionState.finalState === 'cured' ? 'bg-emerald-500 text-black shadow' : 'bg-zinc-800 text-zinc-400'}`}>
                6. CURED RESIN ✓
              </span>
            </div>
          </div>

          {/* Virtual PPE Warning Banner */}
          {!safetyAcknowledged && (
            <div className="w-full max-w-6xl mx-auto bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-amber-200 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>VIRTUAL CHEMISTRY SAFETY ACKNOWLEDGEMENT</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Phenol and formaldehyde are hazardous laboratory chemicals. Equip virtual PPE before handling simulated reagents.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTogglePPE('goggles')}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                    ppeSelected.goggles ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-zinc-800 text-zinc-300 border-white/10'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> 1. Eye Goggles {ppeSelected.goggles && '✓'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePPE('coat')}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                    ppeSelected.coat ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-zinc-800 text-zinc-300 border-white/10'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> 2. Lab Coat {ppeSelected.coat && '✓'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePPE('gloves')}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                    ppeSelected.gloves ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-zinc-800 text-zinc-300 border-white/10'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5" /> 3. Gloves {ppeSelected.gloves && '✓'}
                </button>
              </div>
            </div>
          )}

          {/* APPARATUS CARDS GRID */}
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch my-auto">
            
            {/* 1. REAGENTS & PATHWAY CARD */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between gap-3 min-w-0">
              <div className="w-full text-xs font-bold text-zinc-300 font-mono flex items-center gap-2 border-b border-white/10 pb-1.5">
                <Beaker className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">REAGENTS & PATHWAY</span>
              </div>

              <div className="w-full space-y-1.5 font-mono">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Synthesis Pathway:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPathway('resol')}
                    className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      pathway === 'resol' ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400' : 'bg-zinc-800 text-zinc-400 border-white/10'
                    }`}
                  >
                    Resol (Base)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPathway('novolac')}
                    className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      pathway === 'novolac' ? 'bg-amber-500/30 text-amber-300 border-amber-400' : 'bg-zinc-800 text-zinc-400 border-white/10'
                    }`}
                  >
                    Novolac (Acid)
                  </button>
                </div>
              </div>

              <div className="w-full space-y-2 font-mono text-xs pt-1">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleMeasurePhenol}
                    className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-left truncate ${
                      phenolMeasured ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-zinc-800 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    Phenol {phenolMeasured ? '✓' : '(25mL)'}
                  </button>
                  <button
                    type="button"
                    onClick={handleMeasureFormaldehyde}
                    className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-left truncate ${
                      formaldehydeMeasured ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-zinc-800 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    CH2O {formaldehydeMeasured ? '✓' : '(30mL)'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleTransferPhenol}
                    disabled={!phenolMeasured}
                    className={`py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                      phenolTransferred ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : phenolMeasured ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    Add Phenol
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferFormaldehyde}
                    disabled={!formaldehydeMeasured}
                    className={`py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                      formaldehydeTransferred ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : formaldehydeMeasured ? 'bg-amber-500 text-black border-amber-400' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    Add CH2O
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddCatalyst}
                  disabled={!phenolTransferred || !formaldehydeTransferred}
                  className={`w-full py-2 rounded-xl border text-xs font-bold transition-all ${
                    catalystAdded ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : phenolTransferred && formaldehydeTransferred ? 'bg-purple-500 text-white border-purple-400 shadow-md' : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  Add {pathway === 'resol' ? 'Base Catalyst (NaOH)' : 'Acid Catalyst (HCl)'}
                </button>
              </div>
            </div>

            {/* 2. REACTION VESSEL HERO CARD */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900/90 border-2 border-emerald-500/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl flex flex-col items-center justify-between gap-3 relative overflow-hidden backdrop-blur-md min-w-0"
            >
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-1.5 font-mono">
                <div className="flex items-center gap-2 truncate">
                  <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-xs tracking-wider text-zinc-200 truncate">REACTION VESSEL</span>
                </div>
                <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {visualState.phase.toUpperCase()}
                </div>
              </div>

              {/* REACTION VESSEL VISUAL CONTAINER */}
              <div className="relative w-full h-36 bg-black/60 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="relative flex flex-col items-center">
                  <div className="w-14 h-24 border-2 border-white/40 rounded-b-3xl relative overflow-hidden flex items-end justify-center">
                    
                    {/* Organic Specimen / Liquid Rendering Inside Flask */}
                    {(phenolTransferred || formaldehydeTransferred) && (
                      <PolymerSpecimenRenderer
                        rotationX={10}
                        rotationY={15}
                        zoom={0.45}
                        phase={visualState.phase}
                        colorHex={visualState.colorHex}
                        className="w-full h-full"
                      />
                    )}

                    {/* Stirring Rod Graphic */}
                    {isMixing && (
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ repeat: Infinity, duration: 0.6 / Math.max(0.1, visualState.flowSpeed), ease: 'linear' }}
                        className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none"
                      >
                        <div className="w-1 h-full bg-cyan-300/60 rounded" />
                      </motion.div>
                    )}
                  </div>

                  {/* Heating Mantle Base */}
                  <div className="w-20 h-5 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 rounded-b-xl border-t border-amber-400 flex items-center justify-center text-[8px] font-mono font-bold text-white shadow-lg">
                    {thermalState.heatingActive ? 'HEATING MANTLE ON' : 'HEATER OFF'}
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="w-full grid grid-cols-2 gap-2 text-center font-mono text-[10px]">
                <div className="bg-black/50 p-1.5 rounded-lg border border-amber-500/30">
                  <div className="text-zinc-400">TEMP</div>
                  <div className="font-bold text-amber-300 text-xs">{thermalState.currentTemperature.toFixed(1)} °C</div>
                </div>
                <div className="bg-black/50 p-1.5 rounded-lg border border-purple-500/30">
                  <div className="text-zinc-400">VISCOSITY</div>
                  <div className="font-bold text-purple-300 text-xs">{reactionState.viscosity} cP</div>
                </div>
              </div>
            </motion.div>

            {/* 3. PROCESS CONTROLS CARD */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col items-center justify-between gap-3 sm:col-span-2 lg:col-span-1 min-w-0">
              <div className="w-full text-xs font-bold text-zinc-300 font-mono flex items-center gap-2 border-b border-white/10 pb-1.5">
                <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">PROCESS CONTROLS</span>
              </div>

              <div className="w-full space-y-2 font-mono text-xs">
                {/* Stirring Control */}
                <button
                  type="button"
                  onClick={handleStartMixing}
                  disabled={!catalystAdded || reactionState.finalState === 'cured' || mixingProgress >= 100}
                  className={`w-full py-2 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${
                    mixingProgress >= 100
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                      : catalystAdded
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-md cursor-pointer'
                      : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isMixing ? 'animate-spin' : ''}`} />
                  <span>{mixingProgress >= 100 ? 'Homogenized (100%)' : 'Stir & Homogenize Mixture'}</span>
                </button>

                {/* Heating Control */}
                <button
                  type="button"
                  onClick={handleToggleHeating}
                  disabled={mixingProgress < 100}
                  className={`w-full py-2 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${
                    thermalState.heatingActive
                      ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/40'
                      : mixingProgress >= 100
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md cursor-pointer'
                      : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>{thermalState.heatingActive ? 'Deactivate Heating' : 'Activate Heating Mantle (90°C)'}</span>
                </button>

                {/* Curing Control */}
                {reactionState.reactionProgress >= 50 && (
                  <button
                    type="button"
                    onClick={handleStartCuring}
                    disabled={reactionState.finalState === 'cured'}
                    className={`w-full py-2 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${
                      reactionState.finalState === 'cured'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                        : 'bg-purple-500 text-white border-purple-400 shadow-md cursor-pointer'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{reactionState.finalState === 'cured' ? 'Cured Thermoset Resin ✓' : 'Execute Thermal Curing'}</span>
                  </button>
                )}
              </div>

              <div className="w-full pt-1 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span>Stirring Resistance:</span>
                <span className="font-bold text-amber-300">{stirringResistance}</span>
              </div>
            </div>
          </div>

          {/* LOWER WORKSPACE — POLYMER SAMPLE RESULT STATION */}
          <div className="w-full max-w-6xl mx-auto bg-zinc-900/90 border-2 border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 font-mono text-xs space-y-3 min-w-0 shrink-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-bold text-sm text-white">POLYMER SAMPLE RESULT STATION</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase">
                {visualState.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              {/* REALISTIC PHYSICAL SPECIMEN PREVIEW (CLEAN MATERIAL SURFACE) */}
              <div className="bg-black/60 border border-white/10 rounded-xl p-3 flex flex-col items-center text-center gap-2 overflow-hidden">
                <PolymerSpecimenRenderer
                  rotationX={12}
                  rotationY={20}
                  zoom={0.65}
                  phase={visualState.phase}
                  colorHex={visualState.colorHex}
                  className="w-36 h-28"
                />
                <div className="pt-1 border-t border-white/10 w-full">
                  <div className="font-bold text-xs text-rose-300 uppercase tracking-wide">CURED RESIN SPECIMEN</div>
                  <div className="text-[10px] text-zinc-400">Location: {sampleTransferredToTray ? 'Polymer Sample Tray' : 'Reaction Flask'}</div>
                </div>
              </div>

              {/* Material Property Metrics */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Physical State:</span>
                  <span className="text-emerald-400 font-bold">{visualState.phase.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Polymer Fraction:</span>
                  <span className="text-cyan-300 font-bold">{(reactionState.polymerFraction * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Crosslink Density:</span>
                  <span className="text-amber-300 font-bold">{(reactionState.crosslinkDensity * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {!sampleTransferredToTray && (
                  <button
                    type="button"
                    onClick={handleTransferToSampleTray}
                    disabled={reactionState.finalState !== 'cured' && reactionState.polymerFraction < 0.75}
                    className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      reactionState.finalState === 'cured' || reactionState.polymerFraction >= 0.75
                        ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400 shadow-md cursor-pointer'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Transfer to Sample Tray</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenInspectionModal}
                  disabled={reactionState.polymerFraction < 0.3}
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    reactionState.polymerFraction >= 0.3
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-lg cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Inspect Polymer Sample</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT / SIDE DRAWER PANEL */}
        <div
          className={`w-full md:w-auto h-full border-t md:border-t-0 md:border-l border-white/10 bg-zinc-900 flex flex-col min-h-0 min-w-0 overflow-hidden ${
            mobileDrawerOpen ? 'fixed inset-x-0 bottom-0 top-20 z-40 bg-zinc-900/95 backdrop-blur-md' : ''
          }`}
        >
          {/* Mobile Drawer Bar Toggle */}
          <div
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="md:hidden h-10 bg-zinc-950 border-b border-white/10 px-3 flex items-center justify-between text-xs font-mono shrink-0 cursor-pointer text-cyan-400 font-bold"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>POLYMER DATA & DRAWERS</span>
            </div>
            {mobileDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>

          {/* Tab Navigation Bar */}
          <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-none bg-black/70 p-1.5 gap-1 border-b border-white/10 max-w-full font-mono text-[11px] shrink-0">
            {(
              [
                'PROCEDURE',
                'DATA',
                'MOLECULAR',
                'ADVANCED_CHEMISTRY',
                'PATHWAYS',
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

      {/* ── INTERACTIVE ROTATE / ZOOM POLYMER INSPECTION CHAMBER MODAL ── */}
      <AnimatePresence>
        {showInspectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto select-none font-mono">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border-2 border-cyan-500/50 rounded-3xl max-w-xl w-full p-5 shadow-2xl space-y-4 text-white relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-sm text-white">POLYMER SAMPLE INSPECTION</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* DARK LABORATORY INSPECTION CHAMBER */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-full h-64 bg-radial from-zinc-900 via-black to-black rounded-2xl border border-white/15 flex flex-col items-center justify-center relative overflow-hidden cursor-grab active:cursor-grabbing shadow-inner"
              >
                <div className="absolute top-2 left-3 text-[10px] text-zinc-400">
                  Drag to rotate 3D view | Scroll/Buttons to Zoom
                </div>

                {/* REALISTIC PHYSICAL SPECIMEN RENDERER (CLEAN MATERIAL SURFACE) */}
                <PolymerSpecimenRenderer
                  rotationX={sampleRotationX}
                  rotationY={sampleRotationY}
                  zoom={sampleZoom}
                  phase={visualState.phase}
                  colorHex={visualState.colorHex}
                  showMolecularOverlay={showMolecularOverlay}
                  className="w-64 h-48"
                />

                {/* Scientific Label Outside Material */}
                <div className="absolute bottom-2 left-3 text-left pointer-events-none">
                  <div className="text-xs font-bold text-rose-300 tracking-wider">CURED PHENOL-FORMALDEHYDE RESIN</div>
                  <div className="text-[10px] text-emerald-400 font-bold">STATUS: {visualState.phase.toUpperCase()}</div>
                </div>

                {/* Controls Overlay (Molecular View Toggle & Zoom) */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/15 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowMolecularOverlay(!showMolecularOverlay)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                      showMolecularOverlay ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400' : 'bg-zinc-800 text-zinc-400 border-white/10'
                    }`}
                  >
                    Molecular View
                  </button>

                  <button
                    type="button"
                    onClick={() => setSampleZoom((z) => Math.min(2.0, z + 0.2))}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300"
                    title="Zoom In"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSampleZoom((z) => Math.max(0.6, z - 0.2))}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300"
                    title="Zoom Out"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSampleZoom(1.0);
                      setSampleRotationY(25);
                      setSampleRotationX(15);
                    }}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px]"
                  >
                    Reset View
                  </button>
                </div>
              </div>

              {/* Sample Telemetry Details */}
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Material State:</span>
                  <span className="text-emerald-400 font-bold">{visualState.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Polymer Fraction:</span>
                  <span className="text-cyan-300 font-bold">{(reactionState.polymerFraction * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Crosslink Density:</span>
                  <span className="text-amber-300 font-bold">{(reactionState.crosslinkDensity * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Simulated Viscosity:</span>
                  <span className="text-purple-300 font-bold">{reactionState.viscosity} cP</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Sample Location:</span>
                  <span className="text-white font-bold">{sampleTransferredToTray ? 'Polymer Sample Tray' : 'Reaction Flask'}</span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-400 italic text-center border-t border-white/10 pt-2">
                Simulated educational polymer properties derived strictly from reaction state.
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
