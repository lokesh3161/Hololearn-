import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  FileText,
  Bot,
  BookOpen,
  PlusCircle,
  BarChart2,
  Sliders,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
  Zap,
  Beaker,
  Printer,
  Volume2,
  VolumeX,
  Compass,
  Copy,
  Trash2,
  HelpCircle,
  Maximize2,
  Minimize2,
  Clock,
  Download,
  PenTool,
  X,
  ChevronUp,
  ChevronDown,
  Info,
  Sparkles,
  Check,
  Share2,
  Ruler,
  Scale,
  Target,
  ShieldAlert,
} from 'lucide-react';
import katex from 'katex';
import type { ExperimentConfig } from '../../types';
import { useDataLogger } from '../../hooks/useDataLogger';
import { LabSoundManager, labSound } from '../../utils/LabSoundManager';
import { MechanicsEngine } from '../../engines/MechanicsEngine';

export interface HookesLawLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

// ── 1. TYPES & PRESETS ────────────────────────────────────────────────────────
export type SpringPresetId = 'standard' | 'soft' | 'stiff' | 'unknown';

export interface SpringPreset {
  id: SpringPresetId;
  name: string;
  kRef: number; // N/m
  naturalLengthM: number; // m
  elasticLimitN: number; // N
  elasticLimitGrams: number; // g
  color: string;
  wireThickness: number;
}

export const SPRING_PRESETS: Record<SpringPresetId, SpringPreset> = {
  standard: {
    id: 'standard',
    name: 'Standard Steel Spring (k ≈ 25 N/m)',
    kRef: 25.0,
    naturalLengthM: 0.20,
    elasticLimitN: 3.433,
    elasticLimitGrams: 350,
    color: '#38bdf8', // sky-400
    wireThickness: 2.5,
  },
  soft: {
    id: 'soft',
    name: 'Soft Brass Spring (k ≈ 15 N/m)',
    kRef: 15.0,
    naturalLengthM: 0.20,
    elasticLimitN: 1.962,
    elasticLimitGrams: 200,
    color: '#facc15', // yellow-400
    wireThickness: 2.0,
  },
  stiff: {
    id: 'stiff',
    name: 'Stiff Alloy Spring (k ≈ 50 N/m)',
    kRef: 50.0,
    naturalLengthM: 0.20,
    elasticLimitN: 6.867,
    elasticLimitGrams: 700,
    color: '#a855f7', // purple-500
    wireThickness: 3.2,
  },
  unknown: {
    id: 'unknown',
    name: 'Unknown Assessment Spring',
    kRef: 37.5,
    naturalLengthM: 0.20,
    elasticLimitN: 4.905,
    elasticLimitGrams: 500,
    color: '#10b981', // emerald-500
    wireThickness: 2.8,
  },
};

export interface HookesTrial {
  id: string;
  trialNum: number;
  springId: SpringPresetId;
  springName: string;
  massGrams: number;
  massKg: number;
  forceN: number;
  naturalLengthCm: number;
  lengthCm: number;
  lengthM: number;
  extensionCm: number;
  extensionM: number;
  calculatedK: number; // N/m
  isElastic: boolean;
  timestamp: string;
}

// Assessment Questions
export interface AssessmentQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 1,
    question: "What does Hooke's Law state for an ideal helical spring?",
    options: [
      "Restoring force is inversely proportional to extension",
      "Restoring force is directly proportional to displacement within elastic limit (F = kx)",
      "Extension depends quadratically on hanging mass (F = kx²)",
      "Spring constant increases linearly with applied load",
    ],
    correctIndex: 1,
    explanation: "Hooke's Law states that within the elastic limit, restoring force F is directly proportional to extension x: F = kx.",
  },
  {
    id: 2,
    question: "In a Force (N) vs Extension (m) laboratory graph, what does the gradient/slope represent?",
    options: [
      "Acceleration due to gravity (g)",
      "Elastic Potential Energy stored in the spring (U)",
      "The Spring Constant (k) in N/m",
      "The natural un-loaded length (L₀)",
    ],
    correctIndex: 2,
    explanation: "Because F = kx, the slope ΔF / Δx equals the spring constant k.",
  },
  {
    id: 3,
    question: "What happens when the applied load exceeds the spring's elastic limit?",
    options: [
      "The spring snaps instantly into two pieces",
      "The spring undergoes permanent plastic deformation and no longer obeys F = kx",
      "The spring constant doubles automatically",
      "The extension drops back to zero",
    ],
    correctIndex: 1,
    explanation: "Beyond the elastic limit, permanent plastic deformation occurs and extension increases non-linearly with applied load.",
  },
  {
    id: 4,
    question: "Why must extension x be measured relative to the natural length L₀ (x = L - L₀)?",
    options: [
      "To cancel out the earth's magnetic field",
      "To isolate elongation caused strictly by the applied force from the initial length of the spring",
      "Because initial length L₀ changes with gravity",
      "To prevent spring oscillations",
    ],
    correctIndex: 1,
    explanation: "Extension x represents only the additional stretch (L - L₀) produced by the hanging mass, not the total length.",
  },
  {
    id: 5,
    question: "What is the standard SI unit for the spring constant k?",
    options: ["N · m", "N / m", "kg / m", "J / m²"],
    correctIndex: 1,
    explanation: "Since k = F / x, force is in Newtons (N) and extension is in meters (m), yielding N/m.",
  },
  {
    id: 6,
    question: "How does doubling the spring constant k affect the extension for a fixed hanging mass?",
    options: [
      "Extension is doubled (2x)",
      "Extension is halved (1/2 x)",
      "Extension quadruples (4x)",
      "Extension remains unchanged",
    ],
    correctIndex: 1,
    explanation: "Since x = F / k, a spring twice as stiff (2k) extends half as much under the same load.",
  },
  {
    id: 7,
    question: "How much elastic potential energy U is stored in a spring with k = 25 N/m stretched by x = 0.10 m?",
    options: ["2.50 J", "0.25 J", "0.125 J", "1.25 J"],
    correctIndex: 2,
    explanation: "U = 1/2 k x² = 0.5 × 25 × (0.10)² = 0.5 × 25 × 0.01 = 0.125 Joules.",
  },
];

export const HookesLawLab: React.FC<HookesLawLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
  onBack,
}) => {
  // ── 2. STATE DECLARATIONS ───────────────────────────────────────────────────
  const [selectedPreset, setSelectedPreset] = useState<SpringPresetId>('standard');
  const [noiseEnabled, setNoiseEnabled] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [referenceKRevealed, setReferenceKRevealed] = useState<boolean>(false);
  const [zeroOffsetCm, setZeroOffsetCm] = useState<number>(0.0);

  // Slotted Weight Collection (in grams)
  const [slottedWeights, setSlottedWeights] = useState<number[]>([50]); // Initial hanger mass = 50g

  // Navigation Workspaces & Tabs
  const [activeTab, setActiveTab] = useState<
    'EXPERIMENT' | 'DATA' | 'GRAPH' | 'PROCEDURE' | 'FORMULAS' | 'REPORT' | 'ASSESSMENT'
  >('EXPERIMENT');
  const [graphTab, setGraphTab] = useState<'F_vs_x' | 'k_trials' | 'energy'>('F_vs_x');

  // Drawers
  const [showApparatusDrawer, setShowApparatusDrawer] = useState<boolean>(false);
  const [showFbdDrawer, setShowFbdDrawer] = useState<boolean>(false);
  const [showPhysicsDrawer, setShowPhysicsDrawer] = useState<boolean>(false);
  const [showFormulasDrawer, setShowFormulasDrawer] = useState<boolean>(false);
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);

  // Recorded Experimental Trials
  const [trials, setTrials] = useState<HookesTrial[]>([]);

  // Assessment Answers & Score
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [assessmentSubmitted, setAssessmentSubmitted] = useState<boolean>(false);

  // AI Mentor Chat Stream
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to the Hooke's Law Laboratory! Add slotted masses to the hanger, measure the spring extension x = L - L₀, and plot F vs x to determine the spring constant k.",
    },
  ]);
  const [aiQuestionInput, setAiQuestionInput] = useState<string>('');

  // HoloLearn Data Logger Hook
  const { record: recordToLogger, exportCSV } = useDataLogger([
    'trialNum',
    'massGrams',
    'massKg',
    'forceN',
    'lengthCm',
    'extensionCm',
    'extensionM',
    'calculatedK',
    'isElastic',
  ]);

  // Current Spring Properties
  const activeSpring = useMemo(() => SPRING_PRESETS[selectedPreset], [selectedPreset]);

  // Mass Calculation
  const totalMassGrams = useMemo(
    () => slottedWeights.reduce((sum, w) => sum + w, 0),
    [slottedWeights]
  );
  const totalMassKg = useMemo(() => totalMassGrams / 1000.0, [totalMassGrams]);

  // Gravity constant
  const g = 9.81;

  // Theoretical Applied Force
  const appliedForceN = useMemo(() => totalMassKg * g, [totalMassKg]);

  // Elastic Limit & Overload Check
  const isDeformed = useMemo(
    () => appliedForceN > activeSpring.elasticLimitN,
    [appliedForceN, activeSpring.elasticLimitN]
  );

  // Static Equilibrium Extension
  const equilibriumExtensionM = useMemo(() => {
    if (totalMassGrams === 0) return 0;
    const k = activeSpring.kRef;
    if (!isDeformed) {
      return appliedForceN / k;
    } else {
      // Controlled non-linear deformation past elastic limit
      const limitF = activeSpring.elasticLimitN;
      const linearPart = limitF / k;
      const excessF = appliedForceN - limitF;
      const nonLinearPart = excessF / (k * 0.55) + 0.0008 * Math.pow(excessF, 2);
      return linearPart + nonLinearPart;
    }
  }, [totalMassGrams, activeSpring, appliedForceN, isDeformed]);

  // ── 3. DAMPED HARMONIC OSCILLATION SIMULATION ENGINE ───────────────────────
  const [simX, setSimX] = useState<number>(0); // Current dynamic extension (m)
  const [simV, setSimV] = useState<number>(0); // Velocity (m/s)
  const [isOscillating, setIsOscillating] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Trigger oscillation whenever mass or spring preset changes
  useEffect(() => {
    setIsOscillating(true);
    if (soundOn) labSound.playLaunch();
  }, [totalMassGrams, selectedPreset, soundOn]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000.0, 0.032);
      lastTimeRef.current = timestamp;

      setSimX((prevX) => {
        setSimV((prevV) => {
          const targetX = equilibriumExtensionM;
          const k = activeSpring.kRef;
          const m = Math.max(totalMassKg, 0.05); // Effective inertia
          const c = 3.5; // Air damping coefficient

          const springForce = -k * (prevX - targetX);
          const dampingForce = -c * prevV;
          const accel = (springForce + dampingForce) / m;

          const nextV = prevV + accel * dt;
          const nextX = Math.max(0, prevX + nextV * dt);

          if (Math.abs(nextV) < 0.0005 && Math.abs(nextX - targetX) < 0.0002) {
            setIsOscillating(false);
            return targetX;
          } else {
            setIsOscillating(true);
          }

          return nextX;
        });
        return prevX;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [equilibriumExtensionM, activeSpring.kRef, totalMassKg]);

  // Final Computed Live Display Values (With Sensor Noise if Enabled)
  const displayedExtensionM = useMemo(() => {
    const raw = simX;
    if (!noiseEnabled || raw === 0) return raw;
    const noise = (Math.random() - 0.5) * 0.0008;
    return Math.max(0, raw + noise);
  }, [simX, noiseEnabled]);

  const displayedExtensionCm = useMemo(() => displayedExtensionM * 100.0, [displayedExtensionM]);
  const naturalLengthCm = useMemo(() => activeSpring.naturalLengthM * 100.0, [activeSpring]);
  const displayedLengthCm = useMemo(() => naturalLengthCm + displayedExtensionCm + zeroOffsetCm, [naturalLengthCm, displayedExtensionCm, zeroOffsetCm]);
  const displayedLengthM = useMemo(() => displayedLengthCm / 100.0, [displayedLengthCm]);

  const displayedForceN = useMemo(() => {
    if (!noiseEnabled || appliedForceN === 0) return appliedForceN;
    const noise = (Math.random() - 0.5) * 0.005;
    return Math.max(0, appliedForceN + noise);
  }, [appliedForceN, noiseEnabled]);

  // Synchronize inputs with workbench parent
  useEffect(() => {
    onUpdateInput('massGrams', totalMassGrams);
    onUpdateInput('massKg', totalMassKg);
    onUpdateInput('forceN', Number(displayedForceN.toFixed(3)));
    onUpdateInput('extensionCm', Number(displayedExtensionCm.toFixed(2)));
    onUpdateInput('extensionM', Number(displayedExtensionM.toFixed(4)));
    onUpdateInput('lengthCm', Number(displayedLengthCm.toFixed(2)));
    onUpdateInput('isDeformed', isDeformed);
    onUpdateInput('isEquilibrium', !isOscillating);
  }, [totalMassGrams, totalMassKg, displayedForceN, displayedExtensionCm, displayedExtensionM, displayedLengthCm, isDeformed, isOscillating, onUpdateInput]);

  // ── 4. CONTROL HANDLERS ───────────────────────────────────────────────────
  const handleAddWeight = useCallback((grams: number) => {
    if (totalMassGrams + grams > 1000) {
      if (soundOn) labSound.playInvalidInput();
      return;
    }
    setSlottedWeights((prev) => [...prev, grams]);
  }, [totalMassGrams, soundOn]);

  const handleRemoveTopWeight = useCallback(() => {
    if (slottedWeights.length <= 1) return; // Keep base hanger (50g)
    setSlottedWeights((prev) => prev.slice(0, -1));
  }, [slottedWeights]);

  const handleClearMasses = useCallback(() => {
    setSlottedWeights([50]); // Reset to 50g base hanger
    if (soundOn) labSound.playReset();
  }, [soundOn]);

  const handleSliderMassChange = useCallback((targetGrams: number) => {
    // Generate weight stack closest to targetGrams
    if (targetGrams <= 50) {
      setSlottedWeights([50]);
      return;
    }
    const stack: number[] = [50]; // Hanger base
    let rem = targetGrams - 50;
    while (rem >= 100) { stack.push(100); rem -= 100; }
    while (rem >= 50) { stack.push(50); rem -= 50; }
    while (rem >= 20) { stack.push(20); rem -= 20; }
    while (rem >= 10) { stack.push(10); rem -= 10; }
    setSlottedWeights(stack);
  }, []);

  const handleRecordTrial = useCallback(() => {
    const trialNum = trials.length + 1;
    const calculatedK = displayedExtensionM > 0 ? displayedForceN / displayedExtensionM : 0;

    const newTrial: HookesTrial = {
      id: `trial-${Date.now()}`,
      trialNum,
      springId: selectedPreset,
      springName: activeSpring.name,
      massGrams: totalMassGrams,
      massKg: totalMassKg,
      forceN: Number(displayedForceN.toFixed(3)),
      naturalLengthCm: Number(naturalLengthCm.toFixed(2)),
      lengthCm: Number(displayedLengthCm.toFixed(2)),
      lengthM: Number(displayedLengthM.toFixed(4)),
      extensionCm: Number(displayedExtensionCm.toFixed(2)),
      extensionM: Number(displayedExtensionM.toFixed(4)),
      calculatedK: Number(calculatedK.toFixed(2)),
      isElastic: !isDeformed,
      timestamp: new Date().toLocaleTimeString(),
    };

    setTrials((prev) => [...prev, newTrial]);

    // Record to parent logger
    recordToLogger({
      trialNum,
      massGrams: totalMassGrams,
      massKg: totalMassKg,
      forceN: Number(displayedForceN.toFixed(3)),
      lengthCm: Number(displayedLengthCm.toFixed(2)),
      extensionCm: Number(displayedExtensionCm.toFixed(2)),
      extensionM: Number(displayedExtensionM.toFixed(4)),
      calculatedK: Number(calculatedK.toFixed(2)),
      isElastic: !isDeformed,
    });

    onRecordDataPoint();
    if (soundOn) labSound.playDataRecorded();

    // Check step progress
    if (trials.length >= 4) onCompleteStep(9);
  }, [trials, selectedPreset, activeSpring, totalMassGrams, totalMassKg, displayedForceN, naturalLengthCm, displayedLengthCm, displayedLengthM, displayedExtensionCm, displayedExtensionM, isDeformed, recordToLogger, onRecordDataPoint, soundOn, onCompleteStep]);

  const handleDeleteTrial = (id: string) => {
    setTrials((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearTrials = () => {
    setTrials([]);
    if (soundOn) labSound.playReset();
  };

  const handleResetExperiment = useCallback(() => {
    setSlottedWeights([50]);
    setTrials([]);
    setZeroOffsetCm(0);
    setReferenceKRevealed(false);
    setSelectedPreset('standard');
    if (soundOn) labSound.playReset();
  }, [soundOn]);

  // ── 5. GRAPH DATA & REGRESSION CALCULATIONS ────────────────────────────────
  const validElasticTrials = useMemo(
    () => trials.filter((t) => t.isElastic && t.extensionM > 0),
    [trials]
  );

  const regressionResult = useMemo(() => {
    if (validElasticTrials.length < 2) {
      return { slopeK: 0, rSquared: 0, intercept: 0 };
    }
    const n = validElasticTrials.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

    validElasticTrials.forEach((t) => {
      const x = t.extensionM;
      const y = t.forceN;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      sumYY += y * y;
    });

    const slopeK = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slopeK * sumX) / n;

    // R^2 calculation
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const rSquared = den !== 0 ? Math.pow(num / den, 2) : 0;

    return {
      slopeK: Number(slopeK.toFixed(2)),
      rSquared: Number(rSquared.toFixed(4)),
      intercept: Number(intercept.toFixed(3)),
    };
  }, [validElasticTrials]);

  // Average K calculation
  const averageK = useMemo(() => {
    if (validElasticTrials.length === 0) return 0;
    const sum = validElasticTrials.reduce((acc, t) => acc + t.calculatedK, 0);
    return Number((sum / validElasticTrials.length).toFixed(2));
  }, [validElasticTrials]);

  // ── 6. AI MENTOR CHAT HANDLER ─────────────────────────────────────────────
  const handleSendAiQuestion = (questionText?: string) => {
    const q = questionText || aiQuestionInput;
    if (!q.trim()) return;

    const userMsg = { sender: 'user' as const, text: q };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!questionText) setAiQuestionInput('');

    let reply = "";
    const lower = q.toLowerCase();

    if (lower.includes("hooke's law") || lower.includes("explain")) {
      reply = "Hooke's Law states that within the elastic limit, the extension x of a spring is directly proportional to the restoring force F applied: F = kx. Here, k is the stiffness or spring constant in N/m.";
    } else if (lower.includes("extend") || lower.includes("stretches")) {
      reply = "When a mass is suspended, gravitational force (F = mg) pulls down on the spring. The spring stretches downward until the upward elastic restoring force (F_spring = kx) balances gravity in static equilibrium.";
    } else if (lower.includes("calculate k") || lower.includes("slope")) {
      reply = `To calculate k from your trials: divide force F (N) by extension x (m): k = F / x. Alternatively, on the Force vs Extension graph, fit a line; the slope ΔF / Δx directly gives k! In your active experiment, measured slope = ${regressionResult.slopeK || 'N/A'} N/m.`;
    } else if (lower.includes("elastic limit") || lower.includes("exceed")) {
      reply = `The elastic limit is the maximum force (${activeSpring.elasticLimitN.toFixed(2)} N / ${activeSpring.elasticLimitGrams}g for ${activeSpring.name}) beyond which the spring suffers permanent plastic deformation and no longer obeys F = kx.`;
    } else if (lower.includes("graph") || lower.includes("linear")) {
      reply = `The Force vs Extension graph is a straight line through the origin because force F is directly proportional to extension x (F = kx). The constant ratio F/x means the graph has a constant linear gradient k.`;
    } else {
      reply = `Based on your live apparatus state: Hanging Mass = ${totalMassKg.toFixed(3)} kg, Force = ${displayedForceN.toFixed(3)} N, Extension = ${displayedExtensionM.toFixed(4)} m. Your calculated trial k is ${(displayedExtensionM > 0 ? displayedForceN / displayedExtensionM : 0).toFixed(2)} N/m.`;
    }

    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  // ── 7. ASSESSMENT SUBMISSION HANDLER ──────────────────────────────────────
  const handleAssessmentSubmit = () => {
    setAssessmentSubmitted(true);
    if (soundOn) labSound.playProcedureCompleted();
  };

  const assessmentScore = useMemo(() => {
    let score = 0;
    ASSESSMENT_QUESTIONS.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) score += 1;
    });
    return score;
  }, [userAnswers]);

  // Helper for KaTeX Math rendering
  const renderTex = (mathStr: string) => {
    try {
      return { __html: katex.renderToString(mathStr, { throwOnError: false }) };
    } catch {
      return { __html: mathStr };
    }
  };

  // ── 8. RENDER JSX ──────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-black text-white font-sans select-none overflow-hidden relative">
      {/* ── WORKSPACE TAB SELECTION BAR ──────────────────────────────────────── */}
      <nav className="h-10 bg-zinc-950 border-b border-white/15 px-4 flex items-center justify-between shrink-0 text-xs font-mono z-20">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'EXPERIMENT', label: 'EXPERIMENT', icon: Scale },
            { id: 'DATA', label: 'DATA TABLE', icon: Layers },
            { id: 'GRAPH', label: 'FORCE VS EXTENSION GRAPH', icon: BarChart2 },
            { id: 'PROCEDURE', label: 'PROCEDURE', icon: CheckCircle2 },
            { id: 'FORMULAS', label: 'FORMULAS', icon: BookOpen },
            { id: 'REPORT', label: 'LAB REPORT', icon: FileText },
            { id: 'ASSESSMENT', label: 'ASSESSMENT', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-[11px] font-bold ${
                  isActive
                    ? 'bg-white text-black shadow-lg font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Status Badges & Quick Action Drawers */}
        <div className="flex items-center gap-2">
          {isDeformed ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full font-bold text-[10px] animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>⚠ ELASTIC LIMIT EXCEEDED</span>
            </div>
          ) : isOscillating ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>~ OSCILLATING</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>● EQUILIBRIUM</span>
            </div>
          )}

          <button
            onClick={() => setShowApparatusDrawer(true)}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/15 text-[11px] flex items-center gap-1 font-bold transition-all active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Apparatus</span>
          </button>

          <button
            onClick={() => setShowFbdDrawer(true)}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/15 text-[11px] flex items-center gap-1 font-bold transition-all active:scale-95"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>FBD</span>
          </button>

          <button
            onClick={() => setShowFormulasDrawer(true)}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/15 text-[11px] flex items-center gap-1 font-bold transition-all active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Formulas</span>
          </button>

          <button
            onClick={() => setShowAiDrawer(true)}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] flex items-center gap-1 font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>AI Mentor</span>
          </button>
        </div>
      </nav>

      {/* ── MAIN WORKSPACE BODY ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        {/* ── 1. EXPERIMENT TAB: HERO APPARATUS & CONTROLS ───────────────────── */}
        {activeTab === 'EXPERIMENT' && (
          <div className="w-full h-full flex flex-col p-4 gap-4 overflow-y-auto min-h-0 bg-black">
            {/* HERO SIMULATION VIEWPORT */}
            <div className="flex-1 min-h-[380px] bg-zinc-950 border border-white/15 rounded-2xl relative flex items-center justify-between p-6 shadow-2xl overflow-hidden">
              {/* Left Column: Digital Readouts & Telemetry Overlay */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 font-mono">
                <div className="bg-zinc-900/90 backdrop-blur border border-white/15 p-3 rounded-xl shadow-xl space-y-1 text-xs">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Spring Material</div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeSpring.color }} />
                    <span>{activeSpring.name}</span>
                  </div>
                  {referenceKRevealed && (
                    <div className="text-[11px] text-cyan-400 pt-1 font-bold">
                      Reference k: {activeSpring.kRef.toFixed(1)} N/m
                    </div>
                  )}
                </div>

                <div className="bg-zinc-900/90 backdrop-blur border border-white/15 p-3 rounded-xl shadow-xl space-y-1 text-xs">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Elastic Limit Threshold</div>
                  <div className="font-bold text-amber-400">{activeSpring.elasticLimitN.toFixed(2)} N ({activeSpring.elasticLimitGrams}g)</div>
                </div>
              </div>

              {/* CENTER: PHYSICAL APPARATUS SVG HERO SIMULATION */}
              <div className="flex-1 h-full flex items-center justify-center relative">
                <svg className="w-full h-full max-h-[520px]" viewBox="0 0 600 500" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="metalStand" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#27272a" />
                      <stop offset="50%" stopColor="#52525b" />
                      <stop offset="100%" stopColor="#18181b" />
                    </linearGradient>
                    <linearGradient id="springMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={isDeformed ? "#ef4444" : activeSpring.color} />
                      <stop offset="50%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor={isDeformed ? "#b91c1c" : "#0284c7"} />
                    </linearGradient>
                    <linearGradient id="brassWeight" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="50%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>
                    <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* 1. Heavy Metal Base Plate */}
                  <rect x="180" y="440" width="240" height="20" rx="4" fill="url(#metalStand)" stroke="#71717a" strokeWidth="1.5" />
                  <rect x="200" y="460" width="200" height="8" rx="2" fill="#09090b" />

                  {/* 2. Vertical Support Column */}
                  <rect x="210" y="40" width="16" height="400" fill="url(#metalStand)" stroke="#a1a1aa" strokeWidth="1" />

                  {/* 3. Top Clamp Arm & Boss Head */}
                  <rect x="195" y="60" width="46" height="24" rx="3" fill="#3f3f46" stroke="#d4d4d8" strokeWidth="1.5" />
                  <circle cx="218" cy="72" r="5" fill="#a1a1aa" />
                  <rect x="210" y="70" width="130" height="12" rx="2" fill="url(#metalStand)" stroke="#71717a" />

                  {/* 4. Mounted Digital Force Sensor */}
                  <g transform="translate(290, 50)">
                    <rect x="0" y="0" width="70" height="34" rx="6" fill="#18181b" stroke="#38bdf8" strokeWidth="1.5" />
                    <rect x="6" y="6" width="58" height="22" rx="3" fill="#042f2e" />
                    <text x="35" y="22" textAnchor="middle" fill="#2dd4bf" fontFamily="monospace" fontSize="11" fontWeight="bold">
                      {displayedForceN.toFixed(3)}N
                    </text>
                  </g>

                  {/* 5. Precision Meter Scale (Ruler) */}
                  <g transform="translate(420, 90)">
                    {/* Ruler Body */}
                    <rect x="0" y="0" width="45" height="330" fill="#18181b" stroke="#52525b" strokeWidth="1.5" rx="3" />
                    <text x="22" y="-10" textAnchor="middle" fill="#a1a1aa" fontFamily="monospace" fontSize="10" fontWeight="bold">
                      cm SCALE
                    </text>

                    {/* Scale Tick Marks (0 to 50 cm) */}
                    {Array.from({ length: 51 }).map((_, cm) => {
                      const y = cm * 6; // 6px per cm
                      const isMajor = cm % 5 === 0;
                      return (
                        <g key={cm}>
                          <line
                            x1="0"
                            y1={y}
                            x2={isMajor ? 18 : 8}
                            y2={y}
                            stroke={isMajor ? '#ffffff' : '#71717a'}
                            strokeWidth={isMajor ? 1.5 : 1}
                          />
                          {isMajor && (
                            <text x="22" y={y + 3} fill="#e4e4e7" fontFamily="monospace" fontSize="9" fontWeight="bold">
                              {cm}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Moveable Zero Reference Marker L₀ */}
                    <g transform={`translate(0, ${naturalLengthCm * 6})`}>
                      <line x1="-15" y1="0" x2="45" y2="0" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3,3" />
                      <rect x="-42" y="-9" width="26" height="18" rx="3" fill="#0284c7" />
                      <text x="-29" y="3" textAnchor="middle" fill="#ffffff" fontFamily="monospace" fontSize="8" fontWeight="bold">
                        L₀
                      </text>
                    </g>
                  </g>

                  {/* 6. Dynamic Spring Coils & Mass Hanger */}
                  {(() => {
                    const springTopY = 82;
                    // Scale visual pixels: 1 cm = 6 px
                    const curSpringLengthPx = displayedLengthCm * 6.0;
                    const springBottomY = springTopY + curSpringLengthPx;
                    const turns = 18;
                    const radius = 18;
                    const springX = 325;

                    // Generate Helical Path Points
                    let pathD = `M ${springX} ${springTopY} L ${springX} ${springTopY + 10}`;
                    const coilStart = springTopY + 10;
                    const coilHeight = curSpringLengthPx - 20;
                    const stepY = coilHeight / turns;

                    for (let i = 0; i < turns; i++) {
                      const y1 = coilStart + i * stepY + stepY * 0.25;
                      const y2 = coilStart + i * stepY + stepY * 0.75;
                      const y3 = coilStart + (i + 1) * stepY;
                      pathD += ` C ${springX + radius} ${y1}, ${springX - radius} ${y2}, ${springX} ${y3}`;
                    }
                    pathD += ` L ${springX} ${springBottomY}`;

                    return (
                      <g>
                        {/* Upper Hook Attachment */}
                        <line x1={springX} y1={72} x2={springX} y2={springTopY} stroke="#d4d4d8" strokeWidth="3" />

                        {/* Helical Spring Path */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={`url(#springMetal)`}
                          strokeWidth={activeSpring.wireThickness + (isDeformed ? 0.5 : 0)}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Mass Hanger Stem & Bottom Hook */}
                        <g transform={`translate(${springX}, ${springBottomY})`}>
                          {/* Top Hook */}
                          <path d="M 0 0 L 0 12 C 0 18, -10 18, -10 12" fill="none" stroke="#e4e4e7" strokeWidth="2.5" />
                          <line x1="0" y1="12" x2="0" y2="80" stroke="#e4e4e7" strokeWidth="3" />
                          {/* Hanger Base Plate */}
                          <rect x="-24" y="80" width="48" height="8" rx="2" fill="url(#metalStand)" stroke="#a1a1aa" strokeWidth="1" />

                          {/* Stacked Slotted Weights */}
                          {slottedWeights.map((w, idx) => {
                            const stackY = 76 - (idx + 1) * 12;
                            return (
                              <g key={idx} transform={`translate(-20, ${stackY})`}>
                                <rect x="0" y="0" width="40" height="11" rx="2" fill="url(#brassWeight)" stroke="#fef08a" strokeWidth="0.8" />
                                <text x="20" y="8" textAnchor="middle" fill="#451a03" fontFamily="monospace" fontSize="8" fontWeight="bold">
                                  {w}g
                                </text>
                              </g>
                            );
                          })}

                          {/* Precision Pointer Tip pointing directly to Ruler Scale */}
                          <g transform="translate(0, 80)">
                            {/* Laser Line across to ruler */}
                            <line x1="0" y1="0" x2="95" y2="0" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" filter="url(#laserGlow)" />
                            {/* Pointer Arrow */}
                            <polygon points="0,-6 14,0 0,6" fill="#ef4444" />
                          </g>

                          {/* Extension Indicator Bracket x = L - L₀ */}
                          <g transform={`translate(95, ${-(displayedExtensionCm * 6.0)})`}>
                            <line x1="0" y1="0" x2="0" y2={displayedExtensionCm * 6.0} stroke="#38bdf8" strokeWidth="2" />
                            <circle cx="0" cy="0" r="3" fill="#38bdf8" />
                            <circle cx="0" cy={displayedExtensionCm * 6.0} r="3" fill="#38bdf8" />
                            <rect x="8" y={(displayedExtensionCm * 6.0) / 2 - 10} width="65" height="20" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
                            <text x="40.5" y={(displayedExtensionCm * 6.0) / 2 + 3} textAnchor="middle" fill="#7dd3fc" fontFamily="monospace" fontSize="9" fontWeight="bold">
                              x = {displayedExtensionCm.toFixed(1)} cm
                            </text>
                          </g>
                        </g>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* Right Column: Live Scale & Instrumentation Readout Card */}
              <div className="w-72 flex flex-col gap-3 font-mono z-20">
                <div className="p-4 bg-zinc-900/90 border border-white/15 rounded-xl space-y-2 shadow-xl">
                  <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold">
                    <span>Primary Measurements</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="p-2.5 bg-black border border-white/10 rounded-lg flex items-center justify-between">
                      <span className="text-zinc-400 text-xs">FORCE (F = mg)</span>
                      <span className="text-lg font-bold text-emerald-400">{displayedForceN.toFixed(3)} N</span>
                    </div>

                    <div className="p-2.5 bg-black border border-white/10 rounded-lg flex items-center justify-between">
                      <span className="text-zinc-400 text-xs">EXTENSION (x)</span>
                      <span className="text-lg font-bold text-cyan-400">{displayedExtensionM.toFixed(4)} m</span>
                    </div>

                    <div className="p-2.5 bg-black border border-white/10 rounded-lg flex items-center justify-between">
                      <span className="text-zinc-400 text-xs">SPRING LENGTH (L)</span>
                      <span className="text-lg font-bold text-white">{displayedLengthCm.toFixed(2)} cm</span>
                    </div>

                    <div className="p-2.5 bg-black border border-white/10 rounded-lg flex items-center justify-between">
                      <span className="text-zinc-400 text-xs">HANGING MASS (m)</span>
                      <span className="text-lg font-bold text-yellow-400">{totalMassKg.toFixed(3)} kg</span>
                    </div>
                  </div>

                  <button
                    onClick={handleRecordTrial}
                    className="w-full mt-2 py-2.5 bg-white text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>RECORD TRIAL #{trials.length + 1}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BOTTOM LABORATORY CONTROL PANEL */}
            <div className="w-full bg-zinc-950 border border-white/15 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono shrink-0 shadow-2xl">
              {/* Quick Slotted Mass Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5 mr-2">
                  <Scale className="w-4 h-4 text-yellow-400" />
                  <span>ADD SLOTTED MASS:</span>
                </span>
                {[10, 20, 50, 100].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleAddWeight(m)}
                    className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-yellow-300 border border-white/15 font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
                  >
                    <span>+{m} g</span>
                  </button>
                ))}

                <button
                  onClick={handleRemoveTopWeight}
                  disabled={slottedWeights.length <= 1}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-red-300 border border-white/15 font-bold text-xs disabled:opacity-40 transition-all active:scale-95 ml-2"
                >
                  Remove Mass
                </button>

                <button
                  onClick={handleClearMasses}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs transition-all active:scale-95"
                >
                  Clear Load
                </button>
              </div>

              {/* Continuous Mass Slider */}
              <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-xl border border-white/10 flex-1 min-w-[280px]">
                <span className="text-zinc-400 text-[11px] whitespace-nowrap">Load Slider:</span>
                <input
                  type="range"
                  min={50}
                  max={800}
                  step={10}
                  value={totalMassGrams}
                  onChange={(e) => handleSliderMassChange(Number(e.target.value))}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
                <span className="font-bold text-yellow-300 text-xs w-16 text-right">{totalMassGrams} g</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. DATA TABLE TAB ────────────────────────────────────────────── */}
        {activeTab === 'DATA' && (
          <div className="w-full h-full p-6 bg-black flex flex-col gap-4 overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between bg-zinc-950 p-4 border border-white/15 rounded-xl">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Experimental Trials Observation Table</span>
                </h2>
                <p className="text-zinc-400 text-xs">Record multi-point trial measurements to verify Hooke's Law (F ∝ x).</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  disabled={trials.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-white text-black font-bold flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleClearTrials}
                  disabled={trials.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Table</span>
                </button>
              </div>
            </div>

            {trials.length === 0 ? (
              <div className="flex-1 bg-zinc-950 border border-white/15 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-3">
                <Layers className="w-12 h-12 text-zinc-700 stroke-[1.5]" />
                <p className="text-sm font-bold text-zinc-400">No trials recorded yet.</p>
                <p className="text-xs text-zinc-500 max-w-sm">Return to the Experiment tab, suspend slotted masses, and click "Record Trial".</p>
              </div>
            ) : (
              <div className="flex-1 bg-zinc-950 border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-white/15 text-zinc-400 text-[11px]">
                      <th className="p-3">Trial #</th>
                      <th className="p-3">Spring Preset</th>
                      <th className="p-3">Mass (kg)</th>
                      <th className="p-3">Force F (N)</th>
                      <th className="p-3">Natural L₀ (cm)</th>
                      <th className="p-3">Extended L (cm)</th>
                      <th className="p-3">Extension x (m)</th>
                      <th className="p-3">Calculated k (N/m)</th>
                      <th className="p-3">Region</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trials.map((t) => (
                      <tr key={t.id} className="border-b border-white/10 hover:bg-zinc-900/50 transition-all text-xs">
                        <td className="p-3 font-bold text-white">#{t.trialNum}</td>
                        <td className="p-3 text-cyan-400">{t.springName}</td>
                        <td className="p-3 text-yellow-300">{t.massKg.toFixed(3)} kg ({t.massGrams}g)</td>
                        <td className="p-3 text-emerald-400 font-bold">{t.forceN.toFixed(3)} N</td>
                        <td className="p-3 text-zinc-300">{t.naturalLengthCm.toFixed(2)} cm</td>
                        <td className="p-3 text-zinc-300">{t.lengthCm.toFixed(2)} cm</td>
                        <td className="p-3 text-cyan-300 font-bold">{t.extensionM.toFixed(4)} m</td>
                        <td className="p-3 text-purple-300 font-bold">{t.calculatedK.toFixed(2)} N/m</td>
                        <td className="p-3">
                          {t.isElastic ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              ELASTIC REGION
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                              PLASTIC OVERLOAD
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteTrial(t.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 3. GRAPH WORKSPACE TAB ───────────────────────────────────────── */}
        {activeTab === 'GRAPH' && (
          <div className="w-full h-full p-6 bg-black flex flex-col gap-4 overflow-y-auto font-mono text-xs">
            {/* Graph Sub-tab Selector */}
            <div className="flex items-center justify-between bg-zinc-950 p-3 border border-white/15 rounded-xl shrink-0">
              <div className="flex items-center gap-2">
                {[
                  { id: 'F_vs_x', label: 'FORCE VS EXTENSION (F vs x)' },
                  { id: 'k_trials', label: 'CALCULATED k PER TRIAL' },
                  { id: 'energy', label: 'POTENTIAL ENERGY (U vs x)' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGraphTab(g.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      graphTab === g.id
                        ? 'bg-white text-black shadow-md'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              {/* Regression Summary Banner */}
              {regressionResult.slopeK > 0 && (
                <div className="flex items-center gap-4 bg-zinc-900 px-4 py-1.5 rounded-lg border border-white/10 text-xs">
                  <div>
                    <span className="text-zinc-400">Spring Constant Slope k: </span>
                    <span className="text-emerald-400 font-bold text-sm">{regressionResult.slopeK} N/m</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">R² Fit: </span>
                    <span className="text-cyan-400 font-bold">{regressionResult.rSquared}</span>
                  </div>
                </div>
              )}
            </div>

            {/* MAIN GRAPH CANVAS AREA */}
            <div className="flex-1 bg-zinc-950 border border-white/15 rounded-2xl p-6 relative flex flex-col justify-between shadow-2xl min-h-[420px]">
              {graphTab === 'F_vs_x' && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-cyan-400" />
                      <span>Primary Analysis Graph: Force F (N) vs Extension x (m)</span>
                    </h3>
                    <span className="text-[11px] text-zinc-400">Slope of Linear Fit = Spring Constant k</span>
                  </div>

                  <div className="flex-1 w-full min-h-[340px] relative">
                    {/* SVG GRAPH PLOT */}
                    <svg className="w-full h-full" viewBox="0 0 700 400" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      {Array.from({ length: 11 }).map((_, i) => (
                        <g key={i}>
                          {/* Horizontal Grid */}
                          <line x1="60" y1={40 + i * 32} x2="660" y2={40 + i * 32} stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
                          <text x="50" y={44 + i * 32} textAnchor="end" fill="#71717a" fontSize="10" fontFamily="monospace">
                            {((10 - i) * 0.8).toFixed(1)}
                          </text>

                          {/* Vertical Grid */}
                          <line x1={60 + i * 60} y1="40" x2={60 + i * 60} y2="360" stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
                          <text x={60 + i * 60} y="380" textAnchor="middle" fill="#71717a" fontSize="10" fontFamily="monospace">
                            {(i * 0.02).toFixed(2)}
                          </text>
                        </g>
                      ))}

                      {/* Axes */}
                      <line x1="60" y1="40" x2="60" y2="360" stroke="#ffffff" strokeWidth="2" />
                      <line x1="60" y1="360" x2="660" y2="360" stroke="#ffffff" strokeWidth="2" />

                      {/* Axis Labels */}
                      <text x="360" y="398" textAnchor="middle" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">
                        Extension x (m)
                      </text>
                      <text x="20" y="200" textAnchor="middle" fill="#4ade80" fontSize="12" fontFamily="monospace" fontWeight="bold" transform="rotate(-90 20 200)">
                        Applied Force F (N)
                      </text>

                      {/* Best-Fit Regression Line */}
                      {regressionResult.slopeK > 0 && (
                        <line
                          x1="60"
                          y1="360"
                          x2={Math.min(660, 60 + 0.16 * (600 / 0.20))}
                          y2={Math.max(40, 360 - (0.16 * regressionResult.slopeK) * (320 / 8.0))}
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                        />
                      )}

                      {/* Plotted Trial Data Points */}
                      {trials.map((t) => {
                        const cx = 60 + (t.extensionM / 0.20) * 600;
                        const cy = 360 - (t.forceN / 8.0) * 320;
                        return (
                          <g key={t.id} className="cursor-pointer group">
                            <circle
                              cx={cx}
                              cy={cy}
                              r="6"
                              fill={t.isElastic ? '#4ade80' : '#ef4444'}
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                            {/* Hover Tooltip */}
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <rect x={cx - 50} y={cy - 35} width="100" height="26" rx="4" fill="#18181b" stroke="#ffffff" strokeWidth="1" />
                              <text x={cx} y={cy - 18} textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace">
                                {t.forceN}N, {t.extensionM}m
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}

              {graphTab === 'k_trials' && (
                <div className="w-full h-full flex flex-col">
                  <h3 className="font-bold text-sm text-white mb-2">Calculated Spring Constant k (N/m) across Recorded Trials</h3>
                  {trials.length === 0 ? (
                    <p className="text-zinc-500 text-xs">Record trials to visualize calculated k consistency.</p>
                  ) : (
                    <div className="flex-1 w-full flex items-end gap-4 border-b border-l border-white/20 p-4">
                      {trials.map((t) => (
                        <div key={t.id} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className="w-full bg-purple-500/80 rounded-t-lg transition-all border border-purple-300"
                            style={{ height: `${Math.min(280, (t.calculatedK / 60.0) * 280)}px` }}
                          />
                          <span className="text-[10px] text-zinc-300">T#{t.trialNum}</span>
                          <span className="text-[11px] font-bold text-purple-300">{t.calculatedK} N/m</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {graphTab === 'energy' && (
                <div className="w-full h-full flex flex-col">
                  <h3 className="font-bold text-sm text-white mb-2">Stored Elastic Potential Energy: U = ½ k x²</h3>
                  <p className="text-zinc-400 text-xs mb-4">Parabolic energy curve as spring extension increases.</p>
                  <div className="flex-1 bg-black border border-white/10 rounded-xl p-4 flex items-center justify-center">
                    <svg className="w-full h-full max-h-[300px]" viewBox="0 0 600 300">
                      <path
                        d="M 50 250 Q 300 240, 550 50"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="3"
                      />
                      <text x="300" y="280" textAnchor="middle" fill="#a1a1aa" fontFamily="monospace" fontSize="11">
                        Extension x (m) ➔
                      </text>
                      <text x="30" y="150" textAnchor="middle" fill="#a855f7" fontFamily="monospace" fontSize="11" transform="rotate(-90 30 150)">
                        Potential Energy U (Joules)
                      </text>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 4. PROCEDURE CHECKLIST TAB ────────────────────────────────────── */}
        {activeTab === 'PROCEDURE' && (
          <div className="w-full h-full p-6 bg-black flex flex-col gap-4 overflow-y-auto font-mono text-xs">
            <div className="bg-zinc-950 p-4 border border-white/15 rounded-xl flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>14-Step Experimental Procedure Checklist</span>
                </h2>
                <p className="text-zinc-400 text-xs">Follow standard laboratory protocol to measure Hooke's Law extension.</p>
              </div>
            </div>

            <div className="space-y-2">
              {(config.procedure || []).map((step: any) => (
                <div key={step.stepNumber} className="bg-zinc-950 border border-white/15 p-3.5 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                    {step.stepNumber}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-xs">{step.instruction}</div>
                    <div className="text-[11px] text-zinc-400 pt-0.5">Expected Action: {step.expectedAction}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. FORMULAS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'FORMULAS' && (
          <div className="w-full h-full p-6 bg-black flex flex-col gap-4 overflow-y-auto font-mono text-xs">
            <div className="bg-zinc-950 p-4 border border-white/15 rounded-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Theoretical Physics Equations & Derivations</span>
              </h2>
              <p className="text-zinc-400 text-xs">Mathematical formulas governing spring elasticity and Hooke's Law.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Hooke's Law Equation", tex: "F = k x", desc: "Restoring force F is directly proportional to extension x within the elastic limit." },
                { title: "Spring Constant Formula", tex: "k = \\frac{F}{x}", desc: "Ratio of applied force to extension. Measured in Newtons per meter (N/m)." },
                { title: "Gravitational Load Force", tex: "F = m \\cdot g", desc: "Downward gravitational force exerted by hanging mass (g = 9.81 m/s²)." },
                { title: "Extension Calculation", tex: "x = L - L_0", desc: "Elongation equal to current length L minus natural un-loaded length L₀." },
                { title: "Elastic Potential Energy", tex: "U = \\frac{1}{2} k x^2", desc: "Mechanical work stored as potential energy when spring is stretched by x." },
                { title: "Linear Regression Slope", tex: "k = \\frac{\\Delta F}{\\Delta x}", desc: "Gradient of Force vs Extension graph line gives experimental k." },
              ].map((item, idx) => (
                <div key={idx} className="bg-zinc-950 border border-white/15 p-4 rounded-xl space-y-2">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase">{item.title}</div>
                  <div className="py-2 text-center text-lg bg-black rounded-lg border border-white/10" dangerouslySetInnerHTML={renderTex(item.tex)} />
                  <div className="text-[11px] text-zinc-400">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 6. LAB REPORT GENERATOR TAB ──────────────────────────────────── */}
        {activeTab === 'REPORT' && (
          <div className="w-full h-full p-6 bg-black flex flex-col gap-4 overflow-y-auto font-mono text-xs">
            <div className="bg-zinc-950 p-4 border border-white/15 rounded-xl flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Generated Laboratory Report</span>
                </h2>
                <p className="text-zinc-400 text-xs">Comprehensive scientific summary compiled from recorded trial measurements.</p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white text-black font-bold rounded-lg text-xs flex items-center gap-2 hover:bg-zinc-200"
              >
                <Printer className="w-4 h-4" />
                <span>Print Report</span>
              </button>
            </div>

            <div className="bg-zinc-950 border border-white/15 p-8 rounded-2xl space-y-6 text-zinc-200 max-w-4xl mx-auto w-full">
              <div className="border-b border-white/15 pb-4">
                <h1 className="text-xl font-bold text-white">VIRTUAL PHYSICS LABORATORY REPORT</h1>
                <p className="text-xs text-zinc-400 pt-1">TITLE: HOOKE'S LAW & SPRING CONSTANT DETERMINATION</p>
                <p className="text-xs text-zinc-400">DATE: {new Date().toLocaleDateString()} | STATUS: COMPLETED</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white text-xs uppercase text-cyan-400">1. Objective</h3>
                <p className="text-xs text-zinc-300">To experimentally verify Hooke's Law (F ∝ x) and determine the spring constant k of a helical spring within its elastic limit.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white text-xs uppercase text-cyan-400">2. Apparatus & Setup</h3>
                <p className="text-xs text-zinc-300">Rigid laboratory stand, Helical steel spring ({activeSpring.name}), Slotted mass set, Precision millimeter ruler, Digital force sensor.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white text-xs uppercase text-cyan-400">3. Experimental Results Summary</h3>
                <div className="grid grid-cols-3 gap-3 p-4 bg-black border border-white/10 rounded-xl">
                  <div>
                    <div className="text-[10px] text-zinc-400">RECORDED TRIALS</div>
                    <div className="text-lg font-bold text-white">{trials.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">REGRESSION SLOPE k</div>
                    <div className="text-lg font-bold text-emerald-400">{regressionResult.slopeK || 'N/A'} N/m</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">AVERAGE TRIAL k</div>
                    <div className="text-lg font-bold text-purple-400">{averageK || 'N/A'} N/m</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white text-xs uppercase text-cyan-400">4. Scientific Conclusion</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Experimental data confirms that applied force F is directly proportional to spring extension x within the elastic limit. The experimental spring constant was determined to be {regressionResult.slopeK || averageK} N/m. Beyond the elastic limit ({activeSpring.elasticLimitN} N), non-linear deformation occurs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 7. ASSESSMENT QUIZ TAB ────────────────────────────────────────── */}
        {activeTab === 'ASSESSMENT' && (
          <div className="w-full h-full p-6 bg-black flex flex-col gap-4 overflow-y-auto font-mono text-xs">
            <div className="bg-zinc-950 p-4 border border-white/15 rounded-xl flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span>Hooke's Law Conceptual Knowledge Assessment</span>
                </h2>
                <p className="text-zinc-400 text-xs">Answer 7 physics concepts questions to verify your theoretical understanding.</p>
              </div>

              {assessmentSubmitted && (
                <div className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold">
                  Score: {assessmentScore} / {ASSESSMENT_QUESTIONS.length} ({((assessmentScore / ASSESSMENT_QUESTIONS.length) * 100).toFixed(0)}%)
                </div>
              )}
            </div>

            <div className="space-y-4">
              {ASSESSMENT_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="bg-zinc-950 border border-white/15 p-4 rounded-xl space-y-3">
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-zinc-900 border border-white/20 flex items-center justify-center text-[10px] text-cyan-400">
                      Q{idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>

                  <div className="space-y-1.5 pl-7">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = userAnswers[q.id] === oIdx;
                      const isCorrect = q.correctIndex === oIdx;

                      return (
                        <button
                          key={oIdx}
                          onClick={() => setUserAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                          disabled={assessmentSubmitted}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                            assessmentSubmitted
                              ? isCorrect
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                                : isSelected
                                ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                : 'bg-zinc-900/50 border-white/10 text-zinc-400'
                              : isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                              : 'bg-zinc-900 hover:bg-zinc-850 border-white/10 text-zinc-300'
                          }`}
                        >
                          <span>{opt}</span>
                          {assessmentSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {assessmentSubmitted && (
                    <div className="pl-7 pt-1 text-[11px] text-zinc-400 italic">
                      Explanation: {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!assessmentSubmitted && (
              <button
                onClick={handleAssessmentSubmit}
                className="w-full py-3 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200 transition-all shadow-xl"
              >
                SUBMIT ASSESSMENT ANSWERS
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 9. DRAWERS & MODAL OVERLAYS ──────────────────────────────────────── */}

      {/* A. APPARATUS DRAWER */}
      {showApparatusDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-96 h-full bg-zinc-950 border-l border-white/15 p-6 space-y-6 overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Apparatus Configuration</span>
              </h3>
              <button onClick={() => setShowApparatusDrawer(false)} className="p-1 hover:bg-zinc-900 rounded">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Select Spring Preset */}
            <div className="space-y-2">
              <label className="text-zinc-400 font-bold text-[11px]">SELECT HELICAL SPRING</label>
              <div className="space-y-1.5">
                {(Object.keys(SPRING_PRESETS) as SpringPresetId[]).map((pId) => {
                  const sp = SPRING_PRESETS[pId];
                  return (
                    <button
                      key={pId}
                      onClick={() => setSelectedPreset(pId)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between ${
                        selectedPreset === pId
                          ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                          : 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sp.color }} />
                        <span>{sp.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sensor Noise Toggle */}
            <div className="p-3 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Sensor Noise Jitter</div>
                <div className="text-[10px] text-zinc-400">Simulate realistic experimental error (±0.5%)</div>
              </div>
              <input
                type="checkbox"
                checked={noiseEnabled}
                onChange={(e) => setNoiseEnabled(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Reveal Reference k Toggle */}
            <div className="p-3 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Reveal Reference k Value</div>
                <div className="text-[10px] text-zinc-400">Display reference k value on readout</div>
              </div>
              <input
                type="checkbox"
                checked={referenceKRevealed}
                onChange={(e) => setReferenceKRevealed(e.target.checked)}
                className="w-4 h-4 accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Zero Reference Adjustment */}
            <div className="p-3 bg-zinc-900 border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Ruler Zero Shift L₀</span>
                <span className="text-cyan-400">{zeroOffsetCm.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min={-3}
                max={3}
                step={0.5}
                value={zeroOffsetCm}
                onChange={(e) => setZeroOffsetCm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* B. FREE-BODY DIAGRAM (FBD) DRAWER */}
      {showFbdDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-96 h-full bg-zinc-950 border-l border-white/15 p-6 space-y-6 font-mono text-xs overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>Free-Body Diagram (FBD)</span>
              </h3>
              <button onClick={() => setShowFbdDrawer(false)} className="p-1 hover:bg-zinc-900 rounded">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="bg-black border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
              <svg className="w-48 h-64" viewBox="0 0 200 260">
                {/* Mass Block */}
                <rect x="60" y="100" width="80" height="60" rx="8" fill="#18181b" stroke="#ffffff" strokeWidth="2" />
                <text x="100" y="135" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                  {totalMassGrams}g
                </text>

                {/* Upward Spring Restoring Force Vector F_spring */}
                <line x1="100" y1="100" x2="100" y2={Math.max(20, 100 - displayedForceN * 25)} stroke="#38bdf8" strokeWidth="3" />
                <polygon points={`95,${Math.max(20, 100 - displayedForceN * 25)} 100,${Math.max(10, 100 - displayedForceN * 25 - 10)} 105,${Math.max(20, 100 - displayedForceN * 25)}`} fill="#38bdf8" />
                <text x="110" y="50" fill="#38bdf8" fontSize="11" fontWeight="bold">
                  F_spring = kx ({displayedForceN.toFixed(2)} N)
                </text>

                {/* Downward Gravity Force Vector F_g */}
                <line x1="100" y1="160" x2="100" y2={Math.min(240, 160 + displayedForceN * 25)} stroke="#eab308" strokeWidth="3" />
                <polygon points={`95,${Math.min(240, 160 + displayedForceN * 25)} 100,${Math.min(250, 160 + displayedForceN * 25 + 10)} 105,${Math.min(240, 160 + displayedForceN * 25)}`} fill="#eab308" />
                <text x="110" y="210" fill="#eab308" fontSize="11" fontWeight="bold">
                  F_g = mg ({displayedForceN.toFixed(2)} N)
                </text>
              </svg>

              <div className="p-3 bg-zinc-900 rounded-lg w-full text-center space-y-1">
                <div className="text-zinc-400 text-[10px]">Static Equilibrium Condition</div>
                <div className="text-emerald-400 font-bold">Σ F = F_spring - mg = 0</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* C. FORMULAS DRAWER */}
      {showFormulasDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-96 h-full bg-zinc-950 border-l border-white/15 p-6 space-y-4 font-mono text-xs overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Formulas Drawer</span>
              </h3>
              <button onClick={() => setShowFormulasDrawer(false)} className="p-1 hover:bg-zinc-900 rounded">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-zinc-900 rounded-xl border border-white/10 space-y-1">
                <div className="text-cyan-400 font-bold">F = k x</div>
                <div className="text-zinc-400 text-[11px]">Hooke's Law restoring force formula.</div>
              </div>

              <div className="p-3 bg-zinc-900 rounded-xl border border-white/10 space-y-1">
                <div className="text-emerald-400 font-bold">k = F / x</div>
                <div className="text-zinc-400 text-[11px]">Spring constant determination from load force and stretch.</div>
              </div>

              <div className="p-3 bg-zinc-900 rounded-xl border border-white/10 space-y-1">
                <div className="text-purple-400 font-bold">U = ½ k x²</div>
                <div className="text-zinc-400 text-[11px]">Elastic potential energy stored in the deformed spring.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D. AI MENTOR DRAWER */}
      {showAiDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-96 h-full bg-zinc-950 border-l border-white/15 p-6 flex flex-col justify-between font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>AI Physics Mentor</span>
              </h3>
              <button onClick={() => setShowAiDrawer(false)} className="p-1 hover:bg-zinc-900 rounded">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 my-4 space-y-3 overflow-y-auto pr-1">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white ml-auto font-bold'
                      : 'bg-zinc-900 text-zinc-200 border border-white/10'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Prompt Chips */}
            <div className="space-y-2 pt-2 border-t border-white/15">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Quick Prompt Chips:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Explain Hooke's Law",
                  "Why does the spring extend?",
                  "How do I calculate k?",
                  "What is the elastic limit?",
                  "Why is the graph linear?",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendAiQuestion(chip)}
                    className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-white/10 text-[10px]"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Question Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAiQuestion();
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  placeholder="Ask AI Mentor..."
                  value={aiQuestionInput}
                  onChange={(e) => setAiQuestionInput(e.target.value)}
                  className="flex-1 bg-black border border-white/15 px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button type="submit" className="px-3 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500">
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
