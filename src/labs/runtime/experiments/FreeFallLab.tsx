import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play,
  RotateCcw,
  FileText,
  Bot,
  BookOpen,
  BarChart2,
  Sliders,
  CheckCircle2,
  Activity,
  Zap,
  Printer,
  Volume2,
  VolumeX,
  Compass,
  Copy,
  Trash2,
  HelpCircle,
  Clock,
  Download,
  X,
  Sparkles,
  Check,
  Ruler,
  Scale,
  ShieldAlert,
  Globe,
  Wind,
  Radio,
  Eye,
  Layers,
  ArrowRight,
} from 'lucide-react';
import katex from 'katex';
import type { ExperimentConfig } from '../../types';
import { useDataLogger } from '../../hooks/useDataLogger';
import { labSound } from '../../utils/LabSoundManager';
import { MechanicsEngine } from '../../engines/MechanicsEngine';

export interface FreeFallLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

// ── 1. TYPES & PRESETS ────────────────────────────────────────────────────────
export type PlanetId = 'earth' | 'moon' | 'mars' | 'custom';

export interface PlanetPreset {
  id: PlanetId;
  name: string;
  g: number;
  color: string;
  surfaceBg: string;
  description: string;
}

export const PLANETS: Record<PlanetId, PlanetPreset> = {
  earth: {
    id: 'earth',
    name: 'Earth (Standard)',
    g: 9.80665,
    color: '#38bdf8', // sky-400
    surfaceBg: 'from-blue-900/30 to-emerald-900/20',
    description: 'Standard reference gravitational acceleration at sea level (9.80665 m/s²).',
  },
  moon: {
    id: 'moon',
    name: 'Moon (Lunar)',
    g: 1.62,
    color: '#cbd5e1', // slate-300
    surfaceBg: 'from-slate-800/40 to-zinc-900/30',
    description: 'Lunar surface gravity (~1/6th of Earth gravity). Low acceleration, prolonged fall.',
  },
  mars: {
    id: 'mars',
    name: 'Mars (Martian)',
    g: 3.71,
    color: '#f97316', // orange-500
    surfaceBg: 'from-orange-950/40 to-red-900/20',
    description: 'Martian surface gravity (~38% of Earth gravity). Moderate acceleration.',
  },
  custom: {
    id: 'custom',
    name: 'Custom Gravity',
    g: 9.80665,
    color: '#a855f7', // purple-500
    surfaceBg: 'from-purple-950/30 to-zinc-900/30',
    description: 'User-specified gravitational acceleration environment.',
  },
};

export type ObjectTypeId = 'steel' | 'aluminum' | 'alloy';

export interface ObjectPreset {
  id: ObjectTypeId;
  name: string;
  massKg: number;
  color: string;
  material: string;
  diameterMm: number;
}

export const OBJECT_PRESETS: Record<ObjectTypeId, ObjectPreset> = {
  steel: {
    id: 'steel',
    name: 'Precision Steel Sphere',
    massKg: 0.028,
    color: '#e2e8f0', // slate-200
    material: 'High-Density Stainless Steel',
    diameterMm: 18.0,
  },
  aluminum: {
    id: 'aluminum',
    name: 'Lightweight Aluminum Sphere',
    massKg: 0.010,
    color: '#94a3b8', // slate-400
    material: 'Anodized Aircraft Aluminum',
    diameterMm: 18.0,
  },
  alloy: {
    id: 'alloy',
    name: 'Heavy Alloy Sphere',
    massKg: 0.100,
    color: '#fbbf24', // amber-400
    material: 'Tungsten-Copper Heavy Alloy',
    diameterMm: 18.0,
  },
};

export interface FreeFallTrial {
  id: string;
  trialNum: number;
  heightM: number;
  v0: number;
  gravityG: number;
  massKg: number;
  fallTimeS: number;
  tSquared: number;
  expG: number;
  errorPercent: number;
  airResistance: boolean;
  sensorNoise: boolean;
  planetName: string;
  timestamp: string;
}

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
    question: "In ideal free fall (ignoring air drag), how does acceleration change as an object drops?",
    options: [
      "Acceleration increases continuously as speed increases",
      "Acceleration remains constant at g throughout the entire fall",
      "Acceleration starts at zero and reaches maximum at impact",
      "Acceleration decreases as potential energy is converted to kinetic energy",
    ],
    correctIndex: 1,
    explanation: "In ideal free fall near Earth's surface, gravitational acceleration g remains constant (~9.81 m/s²) regardless of time or displacement.",
  },
  {
    id: 2,
    question: "Under ideal free-fall conditions in a vacuum, how does object mass affect fall time?",
    options: [
      "Heavier objects fall significantly faster because F = mg is larger",
      "Lighter objects fall faster due to lower inertia",
      "Object mass has NO effect on fall time because gravitational and inertial mass cancel out (a = F/m = mg/m = g)",
      "Mass only affects fall time if height exceeds 10 meters",
    ],
    correctIndex: 2,
    explanation: "According to Newton's Second Law and Universal Gravitation, a = F/m = (mg)/m = g. All masses accelerate at identical rates in a vacuum.",
  },
  {
    id: 3,
    question: "In a laboratory graph of Height h (m) vs Time Squared t² (s²), what does the slope represent?",
    options: [
      "The exact gravitational acceleration g",
      "Half of gravitational acceleration (g / 2)",
      "The initial release velocity (v₀)",
      "The terminal velocity of the object",
    ],
    correctIndex: 1,
    explanation: "From h = ½gt², comparing to y = mx gives slope = g/2. Therefore, experimental g is calculated as 2 × slope.",
  },
  {
    id: 4,
    question: "If an object is dropped from height h = 10.0 m on Earth (g = 9.80665 m/s²), what is the theoretical fall time?",
    options: ["1.43 s", "1.02 s", "2.04 s", "0.71 s"],
    correctIndex: 0,
    explanation: "Using t = √(2h / g) = √(20.0 / 9.80665) = √2.0394 ≈ 1.428 seconds.",
  },
  {
    id: 5,
    question: "What happens when significant air resistance is introduced into the drop experiment?",
    options: [
      "Acceleration remains constant at g, but total distance decreases",
      "Drag force opposes gravity, reducing net acceleration (a = g - F_drag/m) and making calculated g artificially low",
      "Fall time decreases because air pushes the object downward",
      "Height becomes inversely proportional to time squared",
    ],
    correctIndex: 1,
    explanation: "Air drag opposes downward motion, causing net acceleration to fall below g and causing calculated g (using ideal equations) to underestimate theoretical gravity.",
  },
  {
    id: 6,
    question: "Why is a precision electronic photogate preferred over a manual hand stopwatch for free-fall experiments?",
    options: [
      "Photogates change the local gravitational field",
      "Human reaction delay (~150-200ms) introduces excessive measurement scatter relative to millisecond fall times",
      "Photogates prevent the object from rotating during fall",
      "Hand stopwatches cannot measure distances",
    ],
    correctIndex: 1,
    explanation: "Free fall times are typically under 2 seconds. Human reaction uncertainty of ±0.15s represents up to 15% error, whereas microsecond photogates achieve <0.1% uncertainty.",
  },
];

export const FreeFallLab: React.FC<FreeFallLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
  onBack,
}) => {
  // ── 2. STATE DECLARATIONS ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    'SIMULATION' | 'DATA' | 'GRAPH' | 'PROCEDURE' | 'FORMULAS' | 'REPORT' | 'ASSESSMENT'
  >('SIMULATION');
  const [graphTab, setGraphTab] = useState<'h_vs_t2' | 'h_vs_t' | 'v_vs_t' | 'a_vs_t'>('h_vs_t2');

  // Simulation Parameters
  const [heightM, setHeightM] = useState<number>(10.0);
  const [initialVelocity, setInitialVelocity] = useState<number>(0.0);
  const [selectedPlanetId, setSelectedPlanetId] = useState<PlanetId>('earth');
  const [customG, setCustomG] = useState<number>(9.80665);
  const [selectedObjectId, setSelectedObjectId] = useState<ObjectTypeId>('steel');
  const [airResistance, setAirResistance] = useState<boolean>(false);
  const [sensorNoise, setSensorNoise] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<'total' | 'photogate'>('total');
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Active Simulation Runtime State
  const [status, setStatus] = useState<'READY' | 'ARMED' | 'RELEASED' | 'FALLING' | 'IMPACT'>('READY');
  const [currentY, setCurrentY] = useState<number>(0.0); // meters fallen from top
  const [currentV, setCurrentV] = useState<number>(0.0); // m/s
  const [currentA, setCurrentA] = useState<number>(9.80665); // m/s²
  const [currentTime, setCurrentTime] = useState<number>(0.0); // s
  const [recordedTime, setRecordedTime] = useState<number>(0.0); // measured time on impact
  const [recordedExpG, setRecordedExpG] = useState<number>(0.0);
  const [photogateT1, setPhotogateT1] = useState<number>(0.0);
  const [photogateT2, setPhotogateT2] = useState<number>(0.0);

  // Drawers & Modals
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);
  const [showPlanetModal, setShowPlanetModal] = useState<boolean>(false);
  const [showFormulasDrawer, setShowFormulasDrawer] = useState<boolean>(false);
  const [showApparatusDrawer, setShowApparatusDrawer] = useState<boolean>(false);

  // Assessment Quiz State
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Experimental Trials Log
  const [trials, setTrials] = useState<FreeFallTrial[]>([]);

  // Refs for animation loop
  const animFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);

  // Current active gravity value
  const activeG = useMemo(() => {
    if (selectedPlanetId === 'custom') return customG;
    return PLANETS[selectedPlanetId].g;
  }, [selectedPlanetId, customG]);

  const activeObject = useMemo(() => OBJECT_PRESETS[selectedObjectId], [selectedObjectId]);

  // Theoretical Fall Time
  const theoreticalTime = useMemo(() => {
    const a = 0.5 * activeG;
    const b = initialVelocity;
    const c = -heightM;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return 0;
    return (-b + Math.sqrt(disc)) / (2 * a);
  }, [heightM, initialVelocity, activeG]);

  // Data Logger integration
  const { record } = useDataLogger(['heightM', 'fallTimeS', 'tSquared', 'expG', 'errorPercent']);

  // ── 3. FORMULA KA-TEX RENDERING HELPER ──────────────────────────────────────
  const renderMath = (tex: string, displayMode = false) => {
    try {
      const html = katex.renderToString(tex, { displayMode, throwOnError: false });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <code>{tex}</code>;
    }
  };

  // ── 4. ANIMATION ENGINE (PHYSICS TICK) ──────────────────────────────────────
  const handleReset = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setStatus('READY');
    setCurrentY(0.0);
    setCurrentV(initialVelocity);
    setCurrentA(activeG);
    setCurrentTime(0.0);
    setRecordedTime(0.0);
    setRecordedExpG(0.0);
    setPhotogateT1(0.0);
    setPhotogateT2(0.0);
    lastTickTimeRef.current = null;
    if (soundOn) labSound.playReset();
  }, [initialVelocity, activeG, soundOn]);

  const handleArmSensor = () => {
    handleReset();
    setStatus('ARMED');
    if (soundOn) labSound.playClick();
  };

  const handleRelease = () => {
    if (status !== 'ARMED' && status !== 'READY') return;
    setStatus('RELEASED');
    setCurrentTime(0.0);
    setCurrentY(0.0);
    setCurrentV(initialVelocity);
    setCurrentA(activeG);
    lastTickTimeRef.current = performance.now();
    if (soundOn) labSound.playRelease();
    onCompleteStep(3);
  };

  // Main Physics Integration Loop
  useEffect(() => {
    if (status !== 'RELEASED' && status !== 'FALLING') return;

    let yPos = currentY;
    let vel = currentV;
    let tAcc = currentTime;
    const gVal = activeG;
    const mass = activeObject.massKg;

    const tick = (now: number) => {
      if (!lastTickTimeRef.current) lastTickTimeRef.current = now;
      const dtMs = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      // Real-time speed scale (dt in seconds)
      const dt = Math.min(dtMs / 1000, 0.033);

      tAcc += dt;

      // Air Drag Acceleration: F_net = mg - b*v^2 => a = g - (b/m)*v^2
      let accel = gVal;
      if (airResistance) {
        const b = 0.0025; // Drag coefficient factor
        accel = Math.max(0, gVal - (b / mass) * vel * vel);
      }

      vel += accel * dt;
      yPos += vel * dt + 0.5 * accel * dt * dt;

      if (yPos >= heightM) {
        // IMPACT REACHED!
        yPos = heightM;
        setStatus('IMPACT');

        // Apply sensor noise if toggled
        let noiseOffset = 0;
        if (sensorNoise) {
          noiseOffset = (Math.random() - 0.5) * 0.003; // ±1.5ms scatter
        }

        const finalT = Math.max(0.001, tAcc + noiseOffset);
        const tSq = finalT * finalT;

        // Experimental g from h = 1/2 g t^2 => g = 2h / t^2
        const expG = (2 * heightM) / tSq;

        setRecordedTime(finalT);
        setRecordedExpG(expG);
        setCurrentTime(finalT);
        setCurrentY(heightM);
        setCurrentV(vel);
        setCurrentA(accel);

        if (soundOn) {
          labSound.playImpact();
        }

        onCompleteStep(4);
        return;
      }

      setStatus('FALLING');
      setCurrentTime(tAcc);
      setCurrentY(yPos);
      setCurrentV(vel);
      setCurrentA(accel);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    status,
    currentY,
    currentV,
    currentTime,
    heightM,
    activeG,
    airResistance,
    activeObject.massKg,
    sensorNoise,
    soundOn,
    onCompleteStep,
  ]);

  // ── 5. RECORD TRIAL DATA ────────────────────────────────────────────────────
  const handleRecordTrial = () => {
    if (recordedTime <= 0) return;

    const tSq = recordedTime * recordedTime;
    const expG = (2 * heightM) / tSq;
    const errPct = (Math.abs(expG - activeG) / activeG) * 100;

    const newTrial: FreeFallTrial = {
      id: `trial_${Date.now()}`,
      trialNum: trials.length + 1,
      heightM,
      v0: initialVelocity,
      gravityG: activeG,
      massKg: activeObject.massKg,
      fallTimeS: Number(recordedTime.toFixed(3)),
      tSquared: Number(tSq.toFixed(3)),
      expG: Number(expG.toFixed(3)),
      errorPercent: Number(errPct.toFixed(2)),
      airResistance,
      sensorNoise,
      planetName: PLANETS[selectedPlanetId].name,
      timestamp: new Date().toLocaleTimeString(),
    };

    setTrials((prev) => [...prev, newTrial]);

    // System Data Logger Hook
    record({
      heightM,
      fallTimeS: Number(recordedTime.toFixed(3)),
      tSquared: Number(tSq.toFixed(3)),
      expG: Number(expG.toFixed(3)),
      errorPercent: Number(errPct.toFixed(2)),
    });

    onRecordDataPoint();
    if (soundOn) labSound.playSuccess();
  };

  const handleDeleteTrial = (id: string) => {
    setTrials((prev) => prev.filter((t) => t.id !== id));
    if (soundOn) labSound.playClick();
  };

  const handleClearAllTrials = () => {
    setTrials([]);
    if (soundOn) labSound.playReset();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (trials.length === 0) return;
    const headers = 'Trial,Height (m),Time (s),Time Squared (s²),Experimental g (m/s²),Error (%),Planet,Air Resistance,Sensor Noise\n';
    const rows = trials
      .map(
        (t) =>
          `${t.trialNum},${t.heightM},${t.fallTimeS},${t.tSquared},${t.expG},${t.errorPercent}%,${t.planetName},${t.airResistance},${t.sensorNoise}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `free_fall_data_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── 6. GRAPHICAL SLOPE & REGRESSION ANALYSIS (h vs t²) ──────────────────────
  const regressionStats = useMemo(() => {
    if (trials.length < 2) return null;

    const n = trials.length;
    let sumX = 0; // t²
    let sumY = 0; // h
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    trials.forEach((t) => {
      const x = t.tSquared;
      const y = t.heightM;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // R² Calculation
    const numR = n * sumXY - sumX * sumY;
    const denR = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r2 = denR !== 0 ? Math.pow(numR / denR, 2) : 0;

    // Experimental g from slope = g/2 => g = 2 * slope
    const expGFromSlope = 2 * slope;
    const pctErrorFromSlope = (Math.abs(expGFromSlope - activeG) / activeG) * 100;

    return {
      slope: Number(slope.toFixed(4)),
      intercept: Number(intercept.toFixed(4)),
      r2: Number(r2.toFixed(4)),
      expGFromSlope: Number(expGFromSlope.toFixed(3)),
      pctErrorFromSlope: Number(pctErrorFromSlope.toFixed(2)),
    };
  }, [trials, activeG]);

  // ── 7. ENERGY TELEMETRY ─────────────────────────────────────────────────────
  const potentialEnergy = useMemo(() => {
    const remainingH = Math.max(0, heightM - currentY);
    return activeObject.massKg * activeG * remainingH;
  }, [heightM, currentY, activeObject.massKg, activeG]);

  const kineticEnergy = useMemo(() => {
    return 0.5 * activeObject.massKg * currentV * currentV;
  }, [activeObject.massKg, currentV]);

  const totalEnergy = useMemo(() => potentialEnergy + kineticEnergy, [potentialEnergy, kineticEnergy]);

  // ── 8. ASSESSMENT QUIZ LOGIC ────────────────────────────────────────────────
  const handleSelectAnswer = (qId: number, oIdx: number) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: oIdx }));
  };

  const calculateQuizScore = () => {
    let score = 0;
    ASSESSMENT_QUESTIONS.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) score++;
    });
    return score;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER UI
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col bg-[#07090e] text-zinc-100 font-sans select-none overflow-hidden relative">
      {/* ── TOP CONTROL BAR ── */}
      <div className="h-13 bg-zinc-950/90 border-b border-white/10 px-4 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/15 hover:bg-zinc-800 text-zinc-300 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>← Labs</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight text-sm">
              Free Fall Motion & Gravitational Acceleration (g)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              PHYSICS
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              GUIDED
            </span>
          </div>
        </div>

        {/* Quick Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Preset Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-white/10">
            {(['earth', 'moon', 'mars'] as PlanetId[]).map((pid) => (
              <button
                key={pid}
                onClick={() => {
                  setSelectedPlanetId(pid);
                  handleReset();
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  selectedPlanetId === pid
                    ? 'bg-sky-500 text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {pid.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`p-1.5 rounded-lg border transition-all ${
              soundOn
                ? 'bg-zinc-900 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-900 border-white/10 text-zinc-500'
            }`}
            title="Toggle Sound Effects"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reset Physics */}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/15 hover:bg-zinc-800 text-zinc-300 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={trials.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── WORKSPACE TAB NAVIGATION ── */}
      <div className="h-10 bg-zinc-950 border-b border-white/10 px-4 flex items-center justify-between shrink-0 font-mono text-xs z-10">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'SIMULATION', label: 'SIMULATION', icon: Zap },
              { id: 'DATA', label: 'DATA TABLE', icon: FileText, count: trials.length },
              { id: 'GRAPH', label: 'GRAPH WORKSPACE', icon: BarChart2 },
              { id: 'PROCEDURE', label: 'PROCEDURE', icon: Compass },
              { id: 'FORMULAS', label: 'FORMULAS', icon: BookOpen },
              { id: 'REPORT', label: 'LAB REPORT', icon: Printer },
              { id: 'ASSESSMENT', label: 'ASSESSMENT', icon: CheckCircle2 },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-black font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Drawer Triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPlanetModal(true)}
            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 flex items-center gap-1.5 text-[11px]"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>Gravity Compare</span>
          </button>
          <button
            onClick={() => setShowAiDrawer(true)}
            className="px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 text-[11px]"
          >
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span>AI Mentor</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden">
        {/* 1. SIMULATION TAB (PRIMARY WORKSPACE) */}
        {activeTab === 'SIMULATION' && (
          <div className="w-full h-full flex flex-col lg:flex-row p-4 gap-4 overflow-y-auto">
            {/* CENTRAL APPARATUS VIEWPORT */}
            <div className="flex-1 min-h-[420px] bg-zinc-950/80 border border-white/15 rounded-2xl p-4 flex flex-col items-center justify-between relative shadow-2xl overflow-hidden">
              {/* Environment Backdrop Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${PLANETS[selectedPlanetId].surfaceBg} pointer-events-none transition-all duration-700`}
              />

              {/* Status Header Bar */}
              <div className="w-full flex items-center justify-between z-10 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">Environment:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PLANETS[selectedPlanetId].color }}
                    />
                    {PLANETS[selectedPlanetId].name} (g = {activeG.toFixed(3)} m/s²)
                  </span>
                </div>

                {/* Live Status Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full font-bold text-xs border tracking-wide uppercase transition-all ${
                      status === 'READY'
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        : status === 'ARMED'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : status === 'RELEASED' || status === 'FALLING'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>

              {/* VERTICAL APPARATUS CANVAS (SVG / HTML RENDER) */}
              <div className="flex-1 w-full max-w-xl my-2 relative flex items-center justify-center">
                <div className="relative w-full h-full max-h-[380px] flex items-center justify-center">
                  {/* Stand Column & Ruler Scale */}
                  <div className="relative h-[320px] w-24 border-l-4 border-zinc-700 flex flex-col justify-between pl-4">
                    {/* Electromagnet Pin Top */}
                    <div
                      className={`absolute top-0 -left-[14px] w-7 h-5 rounded border-2 transition-all ${
                        status === 'ARMED'
                          ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                          : 'bg-zinc-800 border-zinc-500'
                      }`}
                      title="Electromagnetic Release Solenoid"
                    />

                    {/* Height Scale Markings */}
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const markH = (heightM * (5 - idx)) / 5;
                      return (
                        <div key={idx} className="relative flex items-center gap-2">
                          <div className="w-4 h-[2px] bg-zinc-500" />
                          <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                            {markH.toFixed(1)}m
                          </span>
                        </div>
                      );
                    })}

                    {/* Photogate A (Upper Sensor) */}
                    <div
                      className="absolute left-[-16px] w-8 h-3 bg-sky-500/40 border border-sky-400 rounded flex items-center justify-center text-[9px] font-mono text-sky-200 font-bold"
                      style={{ top: '10%' }}
                      title="Photogate A"
                    >
                      GATE A
                    </div>

                    {/* Photogate B (Lower Sensor at heightM) */}
                    <div
                      className="absolute left-[-16px] w-8 h-3 bg-sky-500/40 border border-sky-400 rounded flex items-center justify-center text-[9px] font-mono text-sky-200 font-bold"
                      style={{ bottom: '10%' }}
                      title="Photogate B"
                    >
                      GATE B
                    </div>

                    {/* FALLING SPHERE OBJECT */}
                    <div
                      className="absolute rounded-full border-2 shadow-lg transition-all duration-75 flex items-center justify-center z-20"
                      style={{
                        top: `${Math.min(90, (currentY / heightM) * 80 + 5)}%`,
                        left: '-10px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: activeObject.color,
                        borderColor: '#ffffff',
                        boxShadow:
                          status === 'FALLING'
                            ? '0 0 16px rgba(56,189,248,0.9)'
                            : '0 2px 8px rgba(0,0,0,0.6)',
                      }}
                    />

                    {/* Impact Cushion Pad Bottom */}
                    <div
                      className={`absolute bottom-0 -left-[20px] w-10 h-4 border-t-4 rounded transition-all ${
                        status === 'IMPACT'
                          ? 'bg-sky-500 border-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.8)] scale-105'
                          : 'bg-zinc-800 border-zinc-600'
                      }`}
                      title="Piezoelectric Impact Landing Sensor"
                    />
                  </div>

                  {/* DIGITAL TIMER READOUT INSTRUMENT */}
                  <div className="absolute right-4 top-4 bg-zinc-950/90 border border-white/20 p-4 rounded-xl font-mono space-y-2 shadow-2xl w-48">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Digital Timer</span>
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                    </div>

                    <div className="text-3xl font-extrabold text-sky-400 font-mono tracking-tight">
                      {(currentTime * 1000).toFixed(1)} <span className="text-sm text-sky-200 font-normal">ms</span>
                    </div>

                    <div className="text-xs text-zinc-300 font-bold border-t border-white/10 pt-1 flex items-center justify-between">
                      <span>t (seconds):</span>
                      <span className="text-white font-mono">{currentTime.toFixed(3)} s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* REAL-TIME TELEMETRY BAR */}
              <div className="w-full bg-zinc-900/90 border border-white/15 p-3 rounded-xl font-mono text-xs grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 z-10">
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold">FALL DISTANCE (y)</div>
                  <div className="text-sm font-bold text-white">{currentY.toFixed(2)} m</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold">TIME (t)</div>
                  <div className="text-sm font-bold text-sky-400">{currentTime.toFixed(3)} s</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold">VELOCITY (v)</div>
                  <div className="text-sm font-bold text-emerald-400">{currentV.toFixed(2)} m/s</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold">ACCELERATION (a)</div>
                  <div className="text-sm font-bold text-amber-400">{currentA.toFixed(2)} m/s²</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold">POTENTIAL E (PE)</div>
                  <div className="text-sm font-bold text-purple-400">{potentialEnergy.toFixed(2)} J</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold">KINETIC E (KE)</div>
                  <div className="text-sm font-bold text-pink-400">{kineticEnergy.toFixed(2)} J</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold">EXP. g CALC.</div>
                  <div className="text-sm font-bold text-white">
                    {recordedExpG > 0 ? `${recordedExpG.toFixed(3)} m/s²` : '---'}
                  </div>
                </div>
              </div>
            </div>

            {/* CONTROLS SIDEBAR */}
            <div className="w-full lg:w-80 bg-zinc-950/80 border border-white/15 rounded-2xl p-4 flex flex-col justify-between font-mono text-xs space-y-4 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white font-bold border-b border-white/10 pb-2 text-sm">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span>Experiment Parameters</span>
                </div>

                {/* Release Height Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Release Height (h):</span>
                    <span className="font-bold text-sky-400 text-sm">{heightM.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={20.0}
                    step={0.5}
                    value={heightM}
                    disabled={status === 'FALLING'}
                    onChange={(e) => {
                      setHeightM(parseFloat(e.target.value));
                      handleReset();
                    }}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>0.50m</span>
                    <span>10.00m</span>
                    <span>20.00m</span>
                  </div>
                </div>

                {/* Initial Velocity */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Initial Velocity (v₀):</span>
                    <span className="font-bold text-white">{initialVelocity.toFixed(2)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={10.0}
                    step={0.5}
                    value={initialVelocity}
                    disabled={status === 'FALLING'}
                    onChange={(e) => {
                      setInitialVelocity(parseFloat(e.target.value));
                      handleReset();
                    }}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="text-[10px] text-zinc-500">
                    {initialVelocity === 0 ? 'Ideal free fall (released from rest)' : 'Initial push imparted'}
                  </div>
                </div>

                {/* Object Mass Selector */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <label className="text-zinc-300 font-semibold block">Test Object / Mass:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['steel', 'aluminum', 'alloy'] as ObjectTypeId[]).map((objId) => (
                      <button
                        key={objId}
                        onClick={() => setSelectedObjectId(objId)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          selectedObjectId === objId
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border-white/10 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="capitalize text-[11px]">{objId}</div>
                        <div className="text-[9px] text-zinc-400">
                          {(OBJECT_PRESETS[objId].massKg * 1000).toFixed(0)}g
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Environmental Toggles */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <label className="flex items-center justify-between text-zinc-300 cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-sky-400" />
                      <span>Air Resistance Drag</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={airResistance}
                      onChange={(e) => setAirResistance(e.target.checked)}
                      className="accent-sky-400 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-zinc-300 cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      <span>Realistic Sensor Noise</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sensorNoise}
                      onChange={(e) => setSensorNoise(e.target.checked)}
                      className="accent-amber-400 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                {status === 'READY' || status === 'IMPACT' ? (
                  <button
                    onClick={handleArmSensor}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>ARM SENSOR</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRelease}
                    disabled={status === 'FALLING'}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>RELEASE OBJECT</span>
                  </button>
                )}

                <button
                  onClick={handleRecordTrial}
                  disabled={status !== 'IMPACT'}
                  className="w-full py-2.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  <span>RECORD TRIAL DATA</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. DATA TABLE TAB */}
        {activeTab === 'DATA' && (
          <div className="w-full h-full p-6 overflow-y-auto font-mono text-xs space-y-4">
            <div className="flex items-center justify-between bg-zinc-950 border border-white/15 p-4 rounded-xl">
              <div>
                <h3 className="text-base font-bold text-white">Experimental Data Log</h3>
                <p className="text-zinc-400 text-xs">
                  Recorded measurements across trial drops. Use these data points to plot h vs t² and extract experimental g.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearAllTrials}
                  disabled={trials.length === 0}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={trials.length === 0}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {trials.length === 0 ? (
              <div className="w-full p-12 bg-zinc-950/60 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                <FileText className="w-10 h-10 text-zinc-600" />
                <p className="text-zinc-400 text-sm font-semibold">No trial measurements recorded yet.</p>
                <p className="text-zinc-500 text-xs max-w-md">
                  Return to the SIMULATION tab, release the sphere, and click "RECORD TRIAL DATA" after impact to log data rows.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/15 rounded-xl bg-zinc-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] font-bold border-b border-white/10">
                      <th className="p-3">Trial #</th>
                      <th className="p-3">Height h (m)</th>
                      <th className="p-3">Fall Time t (s)</th>
                      <th className="p-3">t² (s²)</th>
                      <th className="p-3">Exp. g (m/s²)</th>
                      <th className="p-3">Error (%)</th>
                      <th className="p-3">Environment</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-zinc-200">
                    {trials.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-900/50 transition-all">
                        <td className="p-3 font-bold text-sky-400">#{t.trialNum}</td>
                        <td className="p-3 font-bold text-white">{t.heightM.toFixed(2)} m</td>
                        <td className="p-3">{t.fallTimeS.toFixed(3)} s</td>
                        <td className="p-3 text-emerald-400">{t.tSquared.toFixed(3)} s²</td>
                        <td className="p-3 font-bold text-amber-400">{t.expG.toFixed(3)} m/s²</td>
                        <td className="p-3 text-purple-400">{t.errorPercent.toFixed(2)}%</td>
                        <td className="p-3 text-zinc-400 text-[11px]">{t.planetName}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteTrial(t.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 transition-all"
                            title="Delete Trial"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* 3. GRAPH WORKSPACE TAB */}
        {activeTab === 'GRAPH' && (
          <div className="w-full h-full p-6 overflow-y-auto font-mono text-xs space-y-4">
            {/* Graph Subtabs */}
            <div className="flex items-center justify-between bg-zinc-950 border border-white/15 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                {[
                  { id: 'h_vs_t2', label: 'Height h vs t² (Ideal for g)' },
                  { id: 'h_vs_t', label: 'Height h vs Time t' },
                  { id: 'v_vs_t', label: 'Velocity v vs Time t' },
                  { id: 'a_vs_t', label: 'Acceleration a vs Time t' },
                ].map((gt) => (
                  <button
                    key={gt.id}
                    onClick={() => setGraphTab(gt.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      graphTab === gt.id
                        ? 'bg-sky-500 text-black shadow-md'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {gt.label}
                  </button>
                ))}
              </div>

              {regressionStats && (
                <div className="flex items-center gap-4 text-xs font-bold text-emerald-400">
                  <span>Slope: {regressionStats.slope} m/s²</span>
                  <span>R²: {regressionStats.r2}</span>
                  <span>Exp. g: {regressionStats.expGFromSlope} m/s²</span>
                </div>
              )}
            </div>

            {/* GRAPH DISPLAY WINDOW */}
            <div className="w-full h-96 bg-zinc-950 border border-white/15 rounded-2xl p-6 relative flex flex-col justify-between shadow-2xl">
              {trials.length < 2 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-2">
                  <BarChart2 className="w-10 h-10 text-zinc-600" />
                  <p className="text-zinc-400 font-semibold text-sm">
                    Record at least 2 trial drops to generate scientific graphs and linear slope regression.
                  </p>
                </div>
              ) : (
                <div className="w-full h-full relative flex items-end justify-between border-l-2 border-b-2 border-white/30 pl-10 pb-8 pr-6 pt-6">
                  {/* Axis Labels */}
                  <span className="absolute top-2 left-10 text-[11px] font-bold text-sky-400 uppercase">
                    {graphTab === 'h_vs_t2'
                      ? 'Height h (m)'
                      : graphTab === 'h_vs_t'
                      ? 'Height h (m)'
                      : graphTab === 'v_vs_t'
                      ? 'Velocity v (m/s)'
                      : 'Acceleration a (m/s²)'}
                  </span>

                  <span className="absolute bottom-2 right-6 text-[11px] font-bold text-sky-400 uppercase">
                    {graphTab === 'h_vs_t2' ? 'Time Squared t² (s²)' : 'Time t (s)'}
                  </span>

                  {/* Scatter Data Plot Points */}
                  {trials.map((t, idx) => {
                    const xVal = graphTab === 'h_vs_t2' ? t.tSquared : t.fallTimeS;
                    const yVal = t.heightM;

                    const maxX = Math.max(...trials.map((tr) => (graphTab === 'h_vs_t2' ? tr.tSquared : tr.fallTimeS))) * 1.2 || 1;
                    const maxY = Math.max(...trials.map((tr) => tr.heightM)) * 1.2 || 1;

                    const leftPct = (xVal / maxX) * 85 + 5;
                    const bottomPct = (yVal / maxY) * 80 + 10;

                    return (
                      <div
                        key={idx}
                        className="absolute w-3 h-3 bg-sky-400 rounded-full border-2 border-white shadow-[0_0_8px_rgba(56,189,248,0.9)] transform -translate-x-1/2 translate-y-1/2 group cursor-pointer"
                        style={{ left: `${leftPct}%`, bottom: `${bottomPct}%` }}
                      >
                        <div className="hidden group-hover:block absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/20 px-2 py-1 rounded text-[10px] whitespace-nowrap z-30 font-mono shadow-xl text-white">
                          Trial #{t.trialNum}: h={t.heightM}m, t²={t.tSquared}s²
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. PROCEDURE GUIDED STEPS TAB */}
        {activeTab === 'PROCEDURE' && (
          <div className="w-full h-full p-6 overflow-y-auto font-mono text-xs space-y-4 max-w-4xl mx-auto">
            <div className="bg-zinc-950 border border-white/15 p-4 rounded-xl space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-sky-400" />
                <span>Guided Physics Experiment Procedure</span>
              </h3>
              <p className="text-zinc-400 text-xs">
                Follow these 10 systematic laboratory steps to measure fall times, record trial data, and extract gravitational acceleration g.
              </p>
            </div>

            <div className="space-y-3">
              {config.procedure.map((p) => (
                <div
                  key={p.stepNumber}
                  className="p-4 bg-zinc-950/80 border border-white/10 rounded-xl flex items-start gap-4 hover:border-sky-500/40 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-bold shrink-0">
                    {p.stepNumber}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="text-sm font-semibold text-white">{p.instruction}</div>
                    <div className="text-zinc-400 text-[11px] font-mono">
                      Expected outcome: <span className="text-emerald-400">{p.expectedAction}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. FORMULAS TAB */}
        {activeTab === 'FORMULAS' && (
          <div className="w-full h-full p-6 overflow-y-auto font-mono text-xs space-y-4 max-w-4xl mx-auto">
            <div className="bg-zinc-950 border border-white/15 p-4 rounded-xl space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" />
                <span>Theoretical Physics Reference & Equations</span>
              </h3>
              <p className="text-zinc-400 text-xs">
                Mathematical relationships governing free fall kinematics and experimental error analysis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Free Fall Height Equation', tex: 'h = \\frac{1}{2}g t^2', desc: 'Relates drop height h to time squared for an object released from rest (v₀ = 0).' },
                { title: 'Experimental Gravity Formula', tex: 'g = \\frac{2h}{t^2}', desc: 'Direct experimental formula to calculate g from measured height and fall time.' },
                { title: 'General Kinematic Position', tex: 'y(t) = y_0 + v_0 t + \\frac{1}{2}g t^2', desc: 'Position equation with non-zero initial velocity v₀.' },
                { title: 'Velocity vs Time', tex: 'v(t) = v_0 + g t', desc: 'Linear velocity equation showing constant acceleration g.' },
                { title: 'Potential Energy', tex: 'PE = m g h', desc: 'Gravitational potential energy of mass m at height h.' },
                { title: 'Kinetic Energy', tex: 'KE = \\frac{1}{2} m v^2', desc: 'Kinetic energy acquired by mass m falling at speed v.' },
                { title: 'Percentage Error', tex: '\\% \\text{ error} = \\frac{|g_{\\text{exp}} - g_{\\text{theory}}|}{g_{\\text{theory}}} \\times 100\\%', desc: 'Quantifies experimental accuracy relative to standard reference g = 9.80665 m/s².' },
                { title: 'Linear Slope Relationship', tex: '\\text{Slope} = \\frac{g}{2} \\implies g = 2 \\times \\text{Slope}', desc: 'Extracts experimental g from the gradient of a Height h vs t² graph.' },
              ].map((f, idx) => (
                <div key={idx} className="p-4 bg-zinc-950 border border-white/10 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">{f.title}</div>
                  <div className="text-base font-mono text-white py-2 bg-zinc-900/80 px-3 rounded-lg border border-white/5 flex items-center justify-center">
                    {renderMath(f.tex, true)}
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. LAB REPORT TAB */}
        {activeTab === 'REPORT' && (
          <div className="w-full h-full p-6 overflow-y-auto font-sans text-xs space-y-4 max-w-4xl mx-auto bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Formal Physics Laboratory Report</h2>
                <p className="text-zinc-400 font-mono text-xs">HoloLearn AI Virtual Laboratory • Free Fall & Gravity Module</p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl flex items-center gap-2 font-mono transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>

            <div className="space-y-6 text-zinc-200 leading-relaxed font-sans pt-2">
              <section className="space-y-1">
                <h4 className="font-bold text-sky-400 font-mono uppercase text-xs">1. Experiment Objective</h4>
                <p>{config.objective}</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sky-400 font-mono uppercase text-xs">2. Summary of Observations</h4>
                <div className="p-4 bg-zinc-900/80 border border-white/10 rounded-xl font-mono text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-zinc-400 block">Total Trials Recorded:</span>
                    <span className="text-white font-bold text-sm">{trials.length}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Theoretical Gravity:</span>
                    <span className="text-sky-400 font-bold text-sm">{activeG.toFixed(5)} m/s²</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Slope Exp. g:</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {regressionStats ? `${regressionStats.expGFromSlope} m/s²` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Regression R²:</span>
                    <span className="text-purple-400 font-bold text-sm">
                      {regressionStats ? regressionStats.r2 : 'N/A'}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-1">
                <h4 className="font-bold text-sky-400 font-mono uppercase text-xs">3. Scientific Conclusion</h4>
                <p className="text-zinc-300">
                  The experiment successfully verifies that vertical free-fall displacement scales quadratically with fall time (\(h \propto t^2\)). Under ideal conditions in a vacuum, all objects regardless of mass accelerate at \(g \approx 9.81\) m/s² near Earth's surface.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* 7. ASSESSMENT TAB */}
        {activeTab === 'ASSESSMENT' && (
          <div className="w-full h-full p-6 overflow-y-auto font-mono text-xs space-y-4 max-w-3xl mx-auto">
            <div className="bg-zinc-950 border border-white/15 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-sky-400" />
                  <span>Conceptual Assessment Quiz</span>
                </h3>
                <p className="text-zinc-400 text-xs">
                  Test your understanding of free fall kinematics, uncertainty, and gravity analysis.
                </p>
              </div>

              {quizSubmitted && (
                <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-sm">
                  Score: {calculateQuizScore()} / {ASSESSMENT_QUESTIONS.length}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {ASSESSMENT_QUESTIONS.map((q) => {
                const selected = userAnswers[q.id];
                const isCorrect = selected === q.correctIndex;

                return (
                  <div key={q.id} className="p-5 bg-zinc-950 border border-white/10 rounded-2xl space-y-3">
                    <div className="text-sm font-bold text-white flex items-start gap-2">
                      <span className="text-sky-400">Q{q.id}.</span>
                      <span>{q.question}</span>
                    </div>

                    <div className="space-y-2 pl-4">
                      {q.options.map((opt, oIdx) => {
                        let btnStyle = 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800';
                        if (selected === oIdx) {
                          btnStyle = 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold';
                        }
                        if (quizSubmitted) {
                          if (oIdx === q.correctIndex) {
                            btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                          } else if (selected === oIdx) {
                            btnStyle = 'bg-red-500/20 border-red-500 text-red-300 font-bold';
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelectAnswer(q.id, oIdx)}
                            className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {quizSubmitted && oIdx === q.correctIndex && (
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <div className="p-3 bg-zinc-900/90 border border-white/10 rounded-xl text-zinc-400 text-[11px] leading-relaxed">
                        <span className="font-bold text-sky-400">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              {!quizSubmitted ? (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={Object.keys(userAnswers).length < ASSESSMENT_QUESTIONS.length}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all disabled:opacity-40"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={() => {
                    setQuizSubmitted(false);
                    setUserAnswers({});
                  }}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Retake Assessment
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── AI PHYSICS MENTOR DRAWER ── */}
      {showAiDrawer && (
        <div className="fixed inset-y-0 right-0 w-96 bg-zinc-950 border-l border-white/15 p-6 z-50 flex flex-col justify-between font-mono text-xs shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Bot className="w-5 h-5" />
                <span>AI Physics Mentor</span>
              </div>
              <button
                onClick={() => setShowAiDrawer(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-zinc-400 text-xs leading-relaxed">
              Ask questions to understand the conceptual physics behind free-fall acceleration and experimental error.
            </p>

            <div className="space-y-2">
              <div className="text-[10px] text-zinc-500 font-bold uppercase">Suggested Prompts</div>
              {[
                "Why does the object accelerate downward?",
                "Why doesn't mass affect gravitational acceleration g?",
                "Why is height h proportional to fall time squared t²?",
                "How do I calculate g from the slope of h vs t²?",
                "Why does air resistance cause deviations from ideal g?",
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (soundOn) labSound.playClick();
                  }}
                  className="w-full p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-left text-zinc-300 transition-all text-[11px]"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-300 text-[11px] leading-relaxed">
              <Sparkles className="w-4 h-4 mb-1 text-sky-400" />
              Mentor hint: Check the slope of your h vs t² graph. Because h = ½gt², the slope is g/2. Multiply your slope by 2 to get experimental g!
            </div>
          </div>
        </div>
      )}

      {/* ── GRAVITY COMPARISON MODAL ── */}
      {showPlanetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/20 p-6 rounded-2xl max-w-xl w-full font-mono text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Globe className="w-5 h-5" />
                <span>Gravity Comparison Tool</span>
              </div>
              <button
                onClick={() => setShowPlanetModal(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-zinc-400 text-xs">
              Compare how the same 10.0m drop behaves under different planetary gravitational environments:
            </p>

            <div className="grid grid-cols-3 gap-3">
              {(['earth', 'moon', 'mars'] as PlanetId[]).map((pid) => {
                const p = PLANETS[pid];
                const tLunar = Math.sqrt((2 * 10.0) / p.g);
                return (
                  <button
                    key={pid}
                    onClick={() => {
                      setSelectedPlanetId(pid);
                      setShowPlanetModal(false);
                      handleReset();
                    }}
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                      selectedPlanetId === pid
                        ? 'bg-sky-500/20 border-sky-500 text-white font-bold'
                        : 'bg-zinc-900 border-white/10 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span>{p.name}</span>
                    </div>
                    <div className="text-sky-400 font-bold text-base">{p.g.toFixed(2)} m/s²</div>
                    <div className="text-[10px] text-zinc-400">10m fall time: {tLunar.toFixed(2)}s</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function PlusCircleIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
