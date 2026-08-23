import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  PlusCircle,
  BarChart2,
  Sliders,
  Layers,
  Zap,
  Beaker,
  Compass,
  Trash2,
  Download,
  X,
  Info,
  Check,
  Scale,
  Target,
  ShieldAlert,
  RefreshCw,
  Edit3,
  Eraser,
  PenTool,
  ArrowRight,
} from 'lucide-react';
import katex from 'katex';
import type { ExperimentConfig } from '../../types';
import { useDataLogger } from '../../hooks/useDataLogger';
import { labSound } from '../../utils/LabSoundManager';

export interface CentripetalLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export interface CentripetalTrial {
  id: string;
  trialNum: number;
  massKg: number;
  velocityMs: number;
  radiusM: number;
  centripetalAccel: number; // m/s²
  centripetalForce: number; // N
  timestamp: string;
}

export interface QuizChallenge {
  id: number;
  m: number;
  v: number;
  r: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_CHALLENGES: QuizChallenge[] = [
  {
    id: 1,
    m: 2.0,
    v: 4.0,
    r: 2.0,
    question: "If tangential velocity (v) is doubled from 4 m/s to 8 m/s while mass (2 kg) and radius (2 m) remain constant, what happens to the centripetal force F_c?",
    options: [
      "F_c remains the same (16 N)",
      "F_c doubles to 32 N",
      "F_c increases 4-fold to 64 N (since F_c ∝ v²)",
      "F_c is halved to 8 N",
    ],
    correctIndex: 2,
    explanation: "Because F_c = m v² / r, force depends quadratically on velocity. Doubling velocity (2²) increases centripetal force by 4×: 16 N → 64 N.",
  },
  {
    id: 2,
    m: 2.0,
    v: 5.0,
    r: 2.0,
    question: "If mass (m) is doubled from 2 kg to 4 kg while velocity (5 m/s) and radius (2 m) remain constant, what happens to centripetal force F_c?",
    options: [
      "F_c quadruples to 100 N",
      "F_c doubles to 50 N (since F_c ∝ m)",
      "F_c decreases by half to 12.5 N",
      "F_c remains unchanged at 25 N",
    ],
    correctIndex: 1,
    explanation: "Centripetal force is directly proportional to mass (F_c ∝ m). Doubling mass from 2 kg to 4 kg exactly doubles F_c from 25 N to 50 N.",
  },
  {
    id: 3,
    m: 2.0,
    v: 5.0,
    r: 2.0,
    question: "If orbital radius (r) is doubled from 2 m to 4 m while mass (2 kg) and velocity (5 m/s) remain constant, how does centripetal force F_c change?",
    options: [
      "F_c doubles to 50 N",
      "F_c quadruples to 100 N",
      "F_c becomes half (12.5 N) since F_c ∝ 1/r",
      "F_c drops to 0 N",
    ],
    correctIndex: 2,
    explanation: "For a fixed speed v, centripetal force is inversely proportional to radius (F_c ∝ 1/r). Doubling the radius halves the required inward force.",
  },
  {
    id: 4,
    m: 2.0,
    v: 4.0,
    r: 2.0,
    question: "If BOTH velocity (v) AND radius (r) are doubled (v: 4→8 m/s, r: 2→4 m), what is the net change in centripetal force F_c?",
    options: [
      "F_c remains unchanged",
      "F_c doubles (increases by 2×)",
      "F_c quadruples (increases by 4×)",
      "F_c increases 8-fold",
    ],
    correctIndex: 1,
    explanation: "F_c,new = m (2v)² / (2r) = 2 · (m v² / r) = 2 · F_c,old. Velocity squared contributes 4×, divided by 2× radius = net 2× increase.",
  },
  {
    id: 5,
    m: 2.0,
    v: 5.0,
    r: 2.0,
    question: "Which vector statement accurately describes uniform circular motion at constant speed?",
    options: [
      "Velocity is constant because speed is constant",
      "Acceleration is zero because speed does not change",
      "Velocity vector is tangential to path; centripetal acceleration & force vectors point inward toward center",
      "Centripetal force points outward away from the center",
    ],
    correctIndex: 2,
    explanation: "Even at constant speed, direction continuously changes. Instantaneous velocity is tangential, while acceleration and net force point radially inward toward the center.",
  },
];

export const CentripetalLab: React.FC<CentripetalLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
  onBack,
}) => {
  // ── 1. CORE EXPERIMENTAL PARAMETERS ───────────────────────────────────────
  const [massKg, setMassKg] = useState<number>(1.0); // 0.1 kg to 10.0 kg
  const [velocityMs, setVelocityMs] = useState<number>(5.0); // 1.0 m/s to 20.0 m/s
  const [radiusM, setRadiusM] = useState<number>(2.0); // 0.5 m to 10.0 m
  const [direction, setDirection] = useState<'ccw' | 'cw'>('ccw');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Vector Display Options
  const [showVelVector, setShowVelVector] = useState<boolean>(true);
  const [showForceVector, setShowForceVector] = useState<boolean>(true);
  const [showAccelVector, setShowAccelVector] = useState<boolean>(true);
  const [showTrail, setShowTrail] = useState<boolean>(true);

  // Navigation Tabs
  const [activeSection, setActiveSection] = useState<
    'SIMULATION' | 'EXPERIMENT' | 'OBSERVATIONS' | 'GRAPHS' | 'THEORY' | 'CHALLENGE'
  >('SIMULATION');
  const [graphTab, setGraphTab] = useState<'Fc_vs_v' | 'Fc_vs_m' | 'Fc_vs_r'>('Fc_vs_v');

  // Recorded Experimental Trials
  const [trials, setTrials] = useState<CentripetalTrial[]>([]);

  // Challenge Quiz Answers & State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // HoloLearn Data Logger Hook
  const { record: recordToLogger, exportCSV } = useDataLogger([
    'trialNum',
    'massKg',
    'velocityMs',
    'radiusM',
    'centripetalAccel',
    'centripetalForce',
  ]);

  // ── 2. DYNAMIC PHYSICS ENGINE CALCULATIONS ──────────────────────────────
  const centripetalAccel = useMemo(() => (velocityMs * velocityMs) / radiusM, [velocityMs, radiusM]);
  const centripetalForce = useMemo(() => massKg * centripetalAccel, [massKg, centripetalAccel]);
  const angularVelocityRadS = useMemo(() => velocityMs / radiusM, [velocityMs, radiusM]);
  const periodSec = useMemo(() => (2 * Math.PI * radiusM) / velocityMs, [radiusM, velocityMs]);

  // Synchronize inputs with workbench parent
  useEffect(() => {
    onUpdateInput('mass', massKg);
    onUpdateInput('velocity', velocityMs);
    onUpdateInput('radius', radiusM);
    onUpdateInput('centripetalAccel', Number(centripetalAccel.toFixed(2)));
    onUpdateInput('centripetalForce', Number(centripetalForce.toFixed(2)));
    onUpdateInput('angularVelocity', Number(angularVelocityRadS.toFixed(2)));
    onUpdateInput('periodSec', Number(periodSec.toFixed(2)));
  }, [massKg, velocityMs, radiusM, centripetalAccel, centripetalForce, angularVelocityRadS, periodSec, onUpdateInput]);

  // ── 3. SMOOTH ANIMATION LOOP FOR CIRCULAR ORBIT ──────────────────────────
  const [angleRad, setAngleRad] = useState<number>(0);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000.0, 0.032);
      lastTimeRef.current = time;

      if (!isPaused) {
        const deltaAngle = angularVelocityRadS * dt * (direction === 'ccw' ? 1 : -1);
        setAngleRad((prev) => (prev + deltaAngle) % (2 * Math.PI));
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [angularVelocityRadS, isPaused, direction]);

  // ── 4. RECORD / RESET / CLEAR HANDLERS ────────────────────────────────────
  const handleRecordTrial = useCallback(() => {
    const trialNum = trials.length + 1;
    const newTrial: CentripetalTrial = {
      id: `trial-${Date.now()}`,
      trialNum,
      massKg,
      velocityMs,
      radiusM,
      centripetalAccel: Number(centripetalAccel.toFixed(2)),
      centripetalForce: Number(centripetalForce.toFixed(2)),
      timestamp: new Date().toLocaleTimeString(),
    };

    setTrials((prev) => [...prev, newTrial]);

    recordToLogger({
      trialNum,
      massKg,
      velocityMs,
      radiusM,
      centripetalAccel: Number(centripetalAccel.toFixed(2)),
      centripetalForce: Number(centripetalForce.toFixed(2)),
    });

    onRecordDataPoint();
    labSound.playDataRecorded();

    if (trials.length >= 4) onCompleteStep(4);
  }, [trials.length, massKg, velocityMs, radiusM, centripetalAccel, centripetalForce, recordToLogger, onRecordDataPoint, onCompleteStep]);

  const handleDeleteTrial = (id: string) => {
    setTrials((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearTrials = () => {
    setTrials([]);
    labSound.playReset();
  };

  const handleResetLab = () => {
    setMassKg(1.0);
    setVelocityMs(5.0);
    setRadiusM(2.0);
    setDirection('ccw');
    setIsPaused(false);
    setTrials([]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    labSound.playReset();
  };

  // Helper for KaTeX LaTeX rendering
  const renderMath = (tex: string) => {
    try {
      return { __html: katex.renderToString(tex, { throwOnError: false }) };
    } catch {
      return { __html: tex };
    }
  };

  // ── 5. MAIN RENDER ────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-black text-white font-sans select-none overflow-hidden relative">
      {/* ── NAVIGATION SYSTEM (TAB BAR & VECTOR LEGEND) ─────────────────────── */}
      <nav className="h-10 bg-zinc-950 border-b border-white/15 px-4 flex items-center justify-between shrink-0 text-xs font-sans z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'SIMULATION', label: 'Simulation', icon: Scale },
            { id: 'EXPERIMENT', label: 'Systematic Experiments', icon: Beaker },
            { id: 'OBSERVATIONS', label: 'Data Table', icon: Layers },
            { id: 'GRAPHS', label: 'Graphs & Analysis', icon: BarChart2 },
            { id: 'THEORY', label: 'Theory & Applications', icon: BookOpen },
            { id: 'CHALLENGE', label: 'Prediction Challenge', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 text-xs whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black shadow-lg font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Telemetry Badge */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-lg text-[11px] font-bold">
            <span>F_c = m v² / r</span>
          </div>

          <button
            onClick={handleResetLab}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/15 transition-all active:scale-95 text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset</span>
          </button>
        </div>
      </nav>

      {/* ── MAIN WORKSPACE CONTENT AREA (NO PAGE SCROLL ON SIMULATION TAB) ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-black p-3">
        {/* ── SECTION 1: SIMULATION & CONTROLS (HERO GRID LAYOUT) ──────────── */}
        {activeSection === 'SIMULATION' && (
          <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
            {/* LEFT COLUMN: HERO VISUAL SIMULATION VIEWPORT (8 COLS / ~65%) */}
            <div className="lg:col-span-8 bg-zinc-950 border border-white/15 rounded-2xl p-3 shadow-2xl flex flex-col justify-between min-h-0 h-full relative overflow-hidden">
              {/* Toolbar & Controls Bar */}
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-2 mb-1 text-xs shrink-0">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs">Circular Motion Visual Hero Viewport</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="px-3 py-1 rounded-lg bg-white text-black font-bold flex items-center gap-1 hover:bg-zinc-200 text-xs shadow-md transition-all active:scale-95"
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-zinc-900 fill-zinc-900" />}
                    <span>{isPaused ? 'START' : 'PAUSE'}</span>
                  </button>

                  <button
                    onClick={() => setDirection((d) => (d === 'ccw' ? 'cw' : 'ccw'))}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold flex items-center gap-1 border border-white/15 text-xs"
                    title="Toggle Rotation Direction"
                  >
                    <RefreshCw className="w-3 h-3 text-zinc-400" />
                    <span>{direction.toUpperCase()}</span>
                  </button>

                  {/* Vector Toggle Buttons */}
                  <div className="flex items-center gap-1.5 bg-black p-1 rounded-lg border border-white/10 text-[11px] font-mono">
                    <label className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-900">
                      <input type="checkbox" checked={showVelVector} onChange={(e) => setShowVelVector(e.target.checked)} className="accent-cyan-400" />
                      <span className="text-cyan-400 font-bold">v</span>
                    </label>
                    <label className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-900">
                      <input type="checkbox" checked={showForceVector} onChange={(e) => setShowForceVector(e.target.checked)} className="accent-emerald-400" />
                      <span className="text-emerald-400 font-bold">F_c</span>
                    </label>
                    <label className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-900">
                      <input type="checkbox" checked={showAccelVector} onChange={(e) => setShowAccelVector(e.target.checked)} className="accent-purple-400" />
                      <span className="text-purple-400 font-bold">a_c</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* HERO LARGE SVG CANVAS VIEWPORT */}
              <div className="w-full flex-1 min-h-0 relative flex items-center justify-center overflow-hidden bg-black rounded-xl border border-white/10">
                <svg className="w-full h-full max-h-[460px] overflow-visible" viewBox="0 0 600 440" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </radialGradient>
                    <marker id="arrowForce" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
                    </marker>
                    <marker id="arrowVel" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                    </marker>
                    <marker id="arrowAccel" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#c084fc" />
                    </marker>
                  </defs>

                  {/* Dark Grid Pattern */}
                  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  </pattern>
                  <rect width="600" height="440" fill="url(#grid)" />

                  {/* Dynamic Large Simulation Radius Calculation */}
                  {(() => {
                    const cx = 300;
                    const cy = 220;
                    // simulationRadius = 0.35 * min(width, height)
                    const orbitalRadiusPx = Math.min(170, Math.max(50, radiusM * 20.0));

                    const objX = cx + orbitalRadiusPx * Math.cos(angleRad);
                    const objY = cy + orbitalRadiusPx * Math.sin(angleRad);

                    const tangAngle = angleRad + (direction === 'ccw' ? Math.PI / 2 : -Math.PI / 2);
                    const velLengthPx = Math.min(75, Math.max(25, velocityMs * 3.5));
                    const velX = objX + velLengthPx * Math.cos(tangAngle);
                    const velY = objY + velLengthPx * Math.sin(tangAngle);

                    const forceLengthPx = Math.min(orbitalRadiusPx - 15, Math.max(25, (centripetalForce / 80.0) * 100));
                    const forceDirX = (cx - objX) / orbitalRadiusPx;
                    const forceDirY = (cy - objY) / orbitalRadiusPx;

                    const forceEndX = objX + forceLengthPx * forceDirX;
                    const forceEndY = objY + forceLengthPx * forceDirY;

                    const accelLengthPx = Math.min(forceLengthPx * 0.7, Math.max(18, (centripetalAccel / 20.0) * 50));
                    const accelEndX = objX + accelLengthPx * forceDirX;
                    const accelEndY = objY + accelLengthPx * forceDirY;

                    return (
                      <g>
                        {/* 1. Large Circular Trajectory Path */}
                        <circle cx={cx} cy={cy} r={orbitalRadiusPx} fill="none" stroke="#3f3f46" strokeWidth="2" strokeDasharray="6,4" />

                        {/* Motion Trail */}
                        {showTrail && (
                          <path
                            d={`M ${cx + orbitalRadiusPx * Math.cos(angleRad - 0.5)} ${cy + orbitalRadiusPx * Math.sin(angleRad - 0.5)} A ${orbitalRadiusPx} ${orbitalRadiusPx} 0 0 ${direction === 'ccw' ? 1 : 0} ${objX} ${objY}`}
                            fill="none"
                            stroke="#34d399"
                            strokeWidth="3"
                            strokeOpacity="0.5"
                            strokeLinecap="round"
                          />
                        )}

                        {/* 2. Center Pivot Point */}
                        <circle cx={cx} cy={cy} r="28" fill="url(#centerGlow)" />
                        <circle cx={cx} cy={cy} r="9" fill="#09090b" stroke="#34d399" strokeWidth="2.5" />
                        <text x={cx} y={cy + 24} textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          PIVOT CENTER
                        </text>

                        {/* 3. Radius Line (r) */}
                        <line x1={cx} y1={cy} x2={objX} y2={objY} stroke="#71717a" strokeWidth="1.5" strokeDasharray="4,4" />
                        <text
                          x={(cx + objX) / 2}
                          y={(cy + objY) / 2 - 8}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          r = {radiusM.toFixed(2)} m
                        </text>

                        {/* 4. Centripetal Force Vector (F_c) -> Points Radially Inward */}
                        {showForceVector && (
                          <g>
                            <line
                              x1={objX}
                              y1={objY}
                              x2={forceEndX}
                              y2={forceEndY}
                              stroke="#34d399"
                              strokeWidth="3.5"
                              markerEnd="url(#arrowForce)"
                            />
                            <text
                              x={(objX + forceEndX) / 2 + 12}
                              y={(objY + forceEndY) / 2 - 6}
                              fill="#34d399"
                              fontSize="11"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              F_c = {centripetalForce.toFixed(2)} N
                            </text>
                          </g>
                        )}

                        {/* 5. Radial Acceleration Vector (a_c) -> Points Radially Inward */}
                        {showAccelVector && (
                          <g>
                            <line
                              x1={objX}
                              y1={objY}
                              x2={accelEndX}
                              y2={accelEndY}
                              stroke="#c084fc"
                              strokeWidth="2.5"
                              strokeDasharray="4,2"
                              markerEnd="url(#arrowAccel)"
                            />
                            <text
                              x={(objX + accelEndX) / 2 - 16}
                              y={(objY + accelEndY) / 2 + 16}
                              fill="#c084fc"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              a_c = {centripetalAccel.toFixed(2)} m/s²
                            </text>
                          </g>
                        )}

                        {/* 6. Tangential Velocity Vector (v) -> Tangent to Orbit Path */}
                        {showVelVector && (
                          <g>
                            <line
                              x1={objX}
                              y1={objY}
                              x2={velX}
                              y2={velY}
                              stroke="#38bdf8"
                              strokeWidth="3"
                              markerEnd="url(#arrowVel)"
                            />
                            <text
                              x={velX + 8}
                              y={velY + 4}
                              fill="#38bdf8"
                              fontSize="11"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              v = {velocityMs.toFixed(2)} m/s
                            </text>
                          </g>
                        )}

                        {/* 7. Large Orbital Mass Object */}
                        <circle cx={objX} cy={objY} r={Math.min(22, Math.max(14, massKg * 2.5))} fill="#18181b" stroke="#ffffff" strokeWidth="3" />
                        <text x={objX} y={objY + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          {massKg.toFixed(1)}kg
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* BOTTOM CONTEXTUAL STATUS BAR (COMPACT & CLEAN) */}
              <div className="w-full bg-zinc-900 border border-white/10 px-3 py-2 rounded-xl flex items-center justify-between text-xs shrink-0 mt-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                    <span className="text-zinc-200">{isPaused ? 'PAUSED' : 'SIMULATION RUNNING'}</span>
                  </div>
                  <span className="text-zinc-600">|</span>
                  <div className="text-zinc-300 font-mono">
                    Centripetal Force: <span className="text-emerald-400 font-bold">{centripetalForce.toFixed(2)} N</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-zinc-400 text-[11px] font-mono">
                    F_c ∝ v² | F_c ∝ 1/r
                  </div>
                  <button
                    onClick={() => setActiveSection('THEORY')}
                    className="flex items-center gap-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-cyan-300 px-2 py-0.5 rounded border border-white/10 font-bold transition-all"
                  >
                    <span>Explore Relationships</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: COMPACT CONTROLS & LIVE TELEMETRY PANEL (4 COLS / MAX 340PX) */}
            <div className="lg:col-span-4 max-w-[340px] h-full flex flex-col justify-between overflow-y-auto bg-zinc-950 border border-white/15 rounded-2xl p-4 shadow-2xl space-y-4 text-xs">
              {/* 1. LIVE TELEMETRY READOUTS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Live Telemetry</span>
                  </h3>
                  <span className="text-[10px] bg-zinc-900 text-zinc-400 border border-white/10 px-2 py-0.5 rounded font-mono font-bold">
                    SI UNITS
                  </span>
                </div>

                {/* Primary Telemetry Stat Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-black border border-white/10 rounded-xl space-y-0.5">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Force F_c</div>
                    <div className="text-lg font-bold font-mono text-emerald-400">{centripetalForce.toFixed(2)} N</div>
                  </div>

                  <div className="p-3 bg-black border border-white/10 rounded-xl space-y-0.5">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Accel a_c</div>
                    <div className="text-lg font-bold font-mono text-purple-400">{centripetalAccel.toFixed(2)} m/s²</div>
                  </div>

                  <div className="p-2.5 bg-black border border-white/10 rounded-xl space-y-0.5">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Angular Speed ω</div>
                    <div className="text-sm font-bold font-mono text-cyan-400">{angularVelocityRadS.toFixed(2)} rad/s</div>
                  </div>

                  <div className="p-2.5 bg-black border border-white/10 rounded-xl space-y-0.5">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase">Period T</div>
                    <div className="text-sm font-bold font-mono text-amber-400">{periodSec.toFixed(2)} s</div>
                  </div>
                </div>

                {/* Formula Equation Summary */}
                <div className="p-2.5 bg-zinc-900 border border-white/10 rounded-xl text-zinc-300 font-mono text-[11px]">
                  F_c = ({massKg.toFixed(1)}kg × ({velocityMs.toFixed(1)}m/s)²) / {radiusM.toFixed(1)}m = <span className="text-emerald-400 font-bold">{centripetalForce.toFixed(2)} N</span>
                </div>
              </div>

              {/* 2. COMPACT EXPERIMENTAL CONTROLS */}
              <div className="space-y-3.5 border-t border-white/10 pt-3">
                <div className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-zinc-300" />
                  <span>Lab Inputs</span>
                </div>

                {/* Mass Slider (m) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                    <span>Mass (m):</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min="0.1"
                        max="10.0"
                        step="0.1"
                        value={massKg}
                        onChange={(e) => setMassKg(Math.min(10, Math.max(0.1, Number(e.target.value))))}
                        className="w-16 bg-black border border-white/15 px-2 py-0.5 rounded text-right font-bold text-white focus:outline-none focus:border-white"
                      />
                      <span className="text-zinc-400 font-bold">kg</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={massKg}
                    onChange={(e) => setMassKg(Number(e.target.value))}
                    className="w-full accent-white cursor-pointer"
                  />
                </div>

                {/* Velocity Slider (v) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                    <span>Velocity (v):</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min="1.0"
                        max="20.0"
                        step="0.5"
                        value={velocityMs}
                        onChange={(e) => setVelocityMs(Math.min(20, Math.max(1, Number(e.target.value))))}
                        className="w-16 bg-black border border-white/15 px-2 py-0.5 rounded text-right font-bold text-white focus:outline-none focus:border-cyan-400"
                      />
                      <span className="text-zinc-400 font-bold">m/s</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="20.0"
                    step="0.5"
                    value={velocityMs}
                    onChange={(e) => setVelocityMs(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Radius Slider (r) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                    <span>Radius (r):</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min="0.5"
                        max="10.0"
                        step="0.5"
                        value={radiusM}
                        onChange={(e) => setRadiusM(Math.min(10, Math.max(0.5, Number(e.target.value))))}
                        className="w-16 bg-black border border-white/15 px-2 py-0.5 rounded text-right font-bold text-white focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-zinc-400 font-bold">m</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.5"
                    value={radiusM}
                    onChange={(e) => setRadiusM(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* RECORD TRIAL ACTION BUTTON */}
              <button
                onClick={handleRecordTrial}
                className="w-full py-2.5 bg-white text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
              >
                <PlusCircle className="w-4 h-4" />
                <span>RECORD TRIAL #{trials.length + 1}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION 2: SYSTEMATIC EXPERIMENTS MODE ───────────────────────── */}
        {activeSection === 'EXPERIMENT' && (
          <div className="w-full h-full overflow-y-auto bg-zinc-950 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Beaker className="w-5 h-5 text-emerald-400" />
                <span>SYSTEMATIC ENGINEERING EXPERIMENT WORKSPACE</span>
              </h2>
              <p className="text-zinc-400 text-xs pt-0.5">Isolate single variables (velocity, mass, or radius) to systematically test mathematical scaling laws.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Experiment A */}
              <div className="p-4 bg-black border border-white/10 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs">A</span>
                    <span>Experiment A: Force vs Velocity</span>
                  </div>
                  <p className="text-zinc-300 text-xs">
                    <strong>Aim:</strong> Verify quadratic relationship F_c ∝ v² while holding mass (m = 1.0 kg) and radius (r = 2.0 m) constant.
                  </p>
                  <div className="space-y-1 text-zinc-400 text-xs">
                    <div>1. Keep m = 1.0 kg, r = 2.0 m</div>
                    <div>2. Step velocity v from 2 m/s to 12 m/s</div>
                    <div>3. Log trial points to data table</div>
                    <div>4. Plot F_c vs v² on graph</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMassKg(1.0);
                    setRadiusM(2.0);
                    setVelocityMs(4.0);
                    setActiveSection('SIMULATION');
                  }}
                  className="w-full py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-zinc-200 transition-all"
                >
                  Load Experiment A Setup
                </button>
              </div>

              {/* Experiment B */}
              <div className="p-4 bg-black border border-white/10 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs">B</span>
                    <span>Experiment B: Force vs Mass</span>
                  </div>
                  <p className="text-zinc-300 text-xs">
                    <strong>Aim:</strong> Verify direct linear relationship F_c ∝ m while holding velocity (v = 5.0 m/s) and radius (r = 2.0 m) constant.
                  </p>
                  <div className="space-y-1 text-zinc-400 text-xs">
                    <div>1. Keep v = 5.0 m/s, r = 2.0 m</div>
                    <div>2. Step mass m from 0.5 kg to 5.0 kg</div>
                    <div>3. Log trial points to data table</div>
                    <div>4. Plot F_c vs m on graph</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setVelocityMs(5.0);
                    setRadiusM(2.0);
                    setMassKg(1.0);
                    setActiveSection('SIMULATION');
                  }}
                  className="w-full py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-zinc-200 transition-all"
                >
                  Load Experiment B Setup
                </button>
              </div>

              {/* Experiment C */}
              <div className="p-4 bg-black border border-white/10 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs">C</span>
                    <span>Experiment C: Force vs Radius</span>
                  </div>
                  <p className="text-zinc-300 text-xs">
                    <strong>Aim:</strong> Verify inverse relationship F_c ∝ 1/r while holding mass (m = 1.0 kg) and velocity (v = 5.0 m/s) constant.
                  </p>
                  <div className="space-y-1 text-zinc-400 text-xs">
                    <div>1. Keep m = 1.0 kg, v = 5.0 m/s</div>
                    <div>2. Step radius r from 1.0 m to 6.0 m</div>
                    <div>3. Log trial points to data table</div>
                    <div>4. Plot F_c vs 1/r on graph</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMassKg(1.0);
                    setVelocityMs(5.0);
                    setRadiusM(1.0);
                    setActiveSection('SIMULATION');
                  }}
                  className="w-full py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-zinc-200 transition-all"
                >
                  Load Experiment C Setup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 3: OBSERVATIONS & DATA TABLE ───────────────────────────── */}
        {activeSection === 'OBSERVATIONS' && (
          <div className="w-full h-full overflow-y-auto bg-zinc-950 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>EXPERIMENTAL OBSERVATION DATA TABLE</span>
                </h2>
                <p className="text-zinc-400 text-xs pt-0.5 font-sans">Recorded empirical trial measurements for centripetal force and centripetal acceleration.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  disabled={trials.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-white text-black font-bold flex items-center gap-1.5 disabled:opacity-40 hover:bg-zinc-200 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleClearTrials}
                  disabled={trials.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1.5 disabled:opacity-40 hover:bg-red-500/30 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Table</span>
                </button>
              </div>
            </div>

            {trials.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-zinc-500 space-y-2 font-sans">
                <Layers className="w-12 h-12 text-zinc-700 stroke-[1.5]" />
                <p className="text-sm font-bold text-zinc-300">No trial measurements recorded yet.</p>
                <p className="text-xs text-zinc-500">Go to the "Simulation" tab and click "RECORD TRIAL".</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-white/15 text-zinc-400 text-xs font-bold">
                      <th className="p-3">Trial #</th>
                      <th className="p-3">Mass m (kg)</th>
                      <th className="p-3">Velocity v (m/s)</th>
                      <th className="p-3">Radius r (m)</th>
                      <th className="p-3">Accel a_c (m/s²)</th>
                      <th className="p-3">Calculated F_c (N)</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trials.map((t) => (
                      <tr key={t.id} className="border-b border-white/10 hover:bg-zinc-900/50 transition-all">
                        <td className="p-3 font-bold text-white">#{t.trialNum}</td>
                        <td className="p-3 text-zinc-200">{t.massKg.toFixed(2)} kg</td>
                        <td className="p-3 text-cyan-400 font-bold">{t.velocityMs.toFixed(2)} m/s</td>
                        <td className="p-3 text-emerald-400 font-bold">{t.radiusM.toFixed(2)} m</td>
                        <td className="p-3 text-purple-400 font-bold">{t.centripetalAccel.toFixed(2)} m/s²</td>
                        <td className="p-3 text-emerald-400 font-bold">{t.centripetalForce.toFixed(2)} N</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteTrial(t.id)}
                            className="p-1 text-zinc-400 hover:text-red-400 rounded"
                            title="Delete Row"
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

        {/* ── SECTION 4: GRAPHS & ANALYSIS ─────────────────────────────────── */}
        {activeSection === 'GRAPHS' && (
          <div className="w-full h-full overflow-y-auto bg-zinc-950 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                {[
                  { id: 'Fc_vs_v', label: 'F_c vs VELOCITY (v²)' },
                  { id: 'Fc_vs_m', label: 'F_c vs MASS (m)' },
                  { id: 'Fc_vs_r', label: 'F_c vs RADIUS (1/r)' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGraphTab(g.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      graphTab === g.id
                        ? 'bg-white text-black shadow-lg font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LARGE GRAPH DISPLAY CANVAS */}
            <div className="w-full bg-black border border-white/10 rounded-xl p-5 flex flex-col justify-between min-h-[420px]">
              {graphTab === 'Fc_vs_v' && (
                <div className="space-y-3">
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Empirical Quadratic Curve: Centripetal Force F_c vs Velocity v</span>
                    <span className="text-xs text-cyan-400 font-mono">F_c ∝ v²</span>
                  </div>
                  <div className="w-full h-72 relative bg-zinc-950 border border-white/10 rounded-xl p-4">
                    <svg className="w-full h-full" viewBox="0 0 500 240">
                      <line x1="40" y1="20" x2="40" y2="200" stroke="#27272a" strokeWidth="1.5" />
                      <line x1="40" y1="200" x2="480" y2="200" stroke="#27272a" strokeWidth="1.5" />
                      <path d="M 40 200 Q 260 195, 480 30" fill="none" stroke="#38bdf8" strokeWidth="3" />
                      {trials.map((t, idx) => {
                        const px = 40 + (t.velocityMs / 20.0) * 440;
                        const py = 200 - (t.centripetalForce / 200.0) * 180;
                        return <circle key={idx} cx={px} cy={py} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />;
                      })}
                      <text x="260" y="225" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="monospace">Velocity v (m/s) ➔</text>
                      <text x="20" y="110" textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="monospace" transform="rotate(-90 20 110)">F_c (N) ➔</text>
                    </svg>
                  </div>
                  <p className="p-3 bg-zinc-900 border border-white/10 rounded-lg text-zinc-300 text-xs">
                    <strong>Interpretation:</strong> The F_c vs v curve is parabolic. Plotting F_c against v² yields a straight line with slope = m / r.
                  </p>
                </div>
              )}

              {graphTab === 'Fc_vs_m' && (
                <div className="space-y-3">
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Linear Proportional Graph: Centripetal Force F_c vs Mass m</span>
                    <span className="text-xs text-emerald-400 font-mono">F_c ∝ m</span>
                  </div>
                  <div className="w-full h-72 relative bg-zinc-950 border border-white/10 rounded-xl p-4">
                    <svg className="w-full h-full" viewBox="0 0 500 240">
                      <line x1="40" y1="20" x2="40" y2="200" stroke="#27272a" strokeWidth="1.5" />
                      <line x1="40" y1="200" x2="480" y2="200" stroke="#27272a" strokeWidth="1.5" />
                      <line x1="40" y1="200" x2="480" y2="30" stroke="#34d399" strokeWidth="3" />
                      {trials.map((t, idx) => {
                        const px = 40 + (t.massKg / 10.0) * 440;
                        const py = 200 - (t.centripetalForce / 200.0) * 180;
                        return <circle key={idx} cx={px} cy={py} r="5" fill="#34d399" stroke="#ffffff" strokeWidth="2" />;
                      })}
                      <text x="260" y="225" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="monospace">Mass m (kg) ➔</text>
                      <text x="20" y="110" textAnchor="middle" fill="#34d399" fontSize="11" fontFamily="monospace" transform="rotate(-90 20 110)">F_c (N) ➔</text>
                    </svg>
                  </div>
                  <p className="p-3 bg-zinc-900 border border-white/10 rounded-lg text-zinc-300 text-xs">
                    <strong>Interpretation:</strong> The F_c vs m graph passes directly through the origin. The slope equals radial acceleration a_c = v² / r.
                  </p>
                </div>
              )}

              {graphTab === 'Fc_vs_r' && (
                <div className="space-y-3">
                  <div className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Inverse Decay Graph: Centripetal Force F_c vs Radius r</span>
                    <span className="text-xs text-purple-400 font-mono">F_c ∝ 1/r</span>
                  </div>
                  <div className="w-full h-72 relative bg-zinc-950 border border-white/10 rounded-xl p-4">
                    <svg className="w-full h-full" viewBox="0 0 500 240">
                      <line x1="40" y1="20" x2="40" y2="200" stroke="#27272a" strokeWidth="1.5" />
                      <line x1="40" y1="200" x2="480" y2="200" stroke="#27272a" strokeWidth="1.5" />
                      <path d="M 50 30 Q 120 170, 480 190" fill="none" stroke="#c084fc" strokeWidth="3" />
                      {trials.map((t, idx) => {
                        const px = 40 + (t.radiusM / 10.0) * 440;
                        const py = 200 - (t.centripetalForce / 200.0) * 180;
                        return <circle key={idx} cx={px} cy={py} r="5" fill="#c084fc" stroke="#ffffff" strokeWidth="2" />;
                      })}
                      <text x="260" y="225" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="monospace">Radius r (m) ➔</text>
                      <text x="20" y="110" textAnchor="middle" fill="#c084fc" fontSize="11" fontFamily="monospace" transform="rotate(-90 20 110)">F_c (N) ➔</text>
                    </svg>
                  </div>
                  <p className="p-3 bg-zinc-900 border border-white/10 rounded-lg text-zinc-300 text-xs">
                    <strong>Interpretation:</strong> Centripetal force decays hyperbolically as radius increases at constant tangential velocity (F_c ∝ 1/r).
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 5: THEORY & REAL WORLD APPLICATIONS ─────────────────── */}
        {activeSection === 'THEORY' && (
          <div className="w-full h-full overflow-y-auto bg-zinc-950 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-6 text-xs font-sans">
            {/* PROPORTIONALITY RELATIONSHIPS */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>MATHEMATICAL PROPORTIONALITY LAWS</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
                <div className="p-4 bg-black border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>MASS DEPENDENCY</span>
                    <span className="text-xs bg-white text-black px-2 py-0.5 rounded font-bold">F_c ∝ m</span>
                  </div>
                  <p className="text-zinc-300 text-xs font-sans">Doubling mass doubles the required centripetal force at constant velocity and radius.</p>
                </div>

                <div className="p-4 bg-black border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>VELOCITY DEPENDENCY</span>
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold">F_c ∝ v²</span>
                  </div>
                  <p className="text-zinc-300 text-xs font-sans">Doubling tangential speed quadruples (4×) required centripetal force!</p>
                </div>

                <div className="p-4 bg-black border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>RADIUS DEPENDENCY</span>
                    <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold">F_c ∝ 1/r</span>
                  </div>
                  <p className="text-zinc-300 text-xs font-sans">Doubling radius cuts required centripetal force in half at constant speed.</p>
                </div>
              </div>
            </div>

            {/* REAL-WORLD APPLICATIONS */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>REAL-WORLD PHYSICAL INTERACTIONS</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "Car Turning on Curved Road", forceType: "Static Friction", desc: "Static friction (f_s = μ_s N) between road surface and tires provides the required inward force. High speeds demand excessive friction causing skidding." },
                  { title: "Satellite Orbiting Earth", forceType: "Gravitational Force", desc: "Earth's gravity (F_g = G M m / r²) pulls inward continuously, maintaining a smooth orbital circle." },
                  { title: "Roller Coaster Loop", forceType: "Normal Force & Gravity", desc: "At the loop apex, normal force N and gravity mg combine to provide net inward centripetal acceleration." },
                  { title: "Stone Whirled on String", forceType: "String Tension", desc: "Mechanical tension T pulls the stone inward. If tension vanishes (string breaks), stone flies tangentially." },
                  { title: "Washing Machine Spin", forceType: "Wall Normal Force", desc: "The drum wall exerts normal force on wet clothes. Water drops pass through wall perforations tangentially." },
                  { title: "Planets Orbiting Sun", forceType: "Solar Gravitational Attraction", desc: "Solar gravity accelerates planets inward toward the Sun, balancing orbital kinetic motion." },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-black border border-white/10 rounded-xl space-y-1.5">
                    <div className="font-bold text-white text-xs">{item.title}</div>
                    <div className="text-[11px] text-emerald-400 font-bold font-mono">Inward Provider: {item.forceType}</div>
                    <p className="text-zinc-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* COMMON MISCONCEPTIONS VS FACTS */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>COMMON MISCONCEPTIONS VS PHYSICAL REALITY</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { myth: "Centripetal force is a new fundamental force.", fact: "Centripetal force is simply the net inward force role supplied by friction, gravity, tension, or normal force." },
                  { myth: "Velocity points toward the center.", fact: "Velocity is always strictly tangential to the circle. Only force and acceleration point inward." },
                  { myth: "Constant speed implies zero acceleration.", fact: "Continuous change of velocity vector direction creates constant radial acceleration (a_c = v²/r)." },
                  { myth: "Increasing radius increases force.", fact: "At constant speed v, centripetal force is inversely proportional to radius (F_c ∝ 1/r)." },
                ].map((m, idx) => (
                  <div key={idx} className="p-3 bg-black border border-white/10 rounded-xl space-y-1">
                    <div className="text-red-400 font-bold text-xs">MYTH: {m.myth}</div>
                    <div className="text-emerald-400 text-xs">✓ FACT: {m.fact}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* THEORY DERIVATION */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>THEORETICAL DERIVATION OF CENTRIPETAL ACCELERATION</span>
              </h2>
              <div className="p-4 bg-black border border-white/10 text-white rounded-xl text-center space-y-2 text-sm font-mono">
                <div dangerouslySetInnerHTML={renderMath("\\frac{|\\Delta v|}{v} = \\frac{|\\Delta r|}{r}")} />
                <div dangerouslySetInnerHTML={renderMath("a_c = \\lim_{\\Delta t \\to 0} \\frac{|\\Delta v|}{\\Delta t} = \\frac{v}{r} \\cdot \\frac{\\Delta r}{\\Delta t} = \\frac{v^2}{r}")} />
                <div className="text-emerald-400 font-bold pt-1" dangerouslySetInnerHTML={renderMath("F_c = m a_c = \\frac{m v^2}{r}")} />
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 6: PREDICTION CHALLENGE ───────────────────────────────── */}
        {activeSection === 'CHALLENGE' && (
          <div className="w-full h-full overflow-y-auto bg-zinc-950 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  <span>PREDICTION CHALLENGE (TEST YOUR PHYSICAL INTUITION)</span>
                </h2>
                <p className="text-zinc-400 text-xs pt-0.5">Predict outcomes of circular motion parameter scaling and verify via simulation.</p>
              </div>

              {quizSubmitted && (
                <div className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs font-mono">
                  Score: {Object.keys(quizAnswers).filter((id) => quizAnswers[Number(id)] === QUIZ_CHALLENGES.find((q) => q.id === Number(id))?.correctIndex).length} / {QUIZ_CHALLENGES.length}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {QUIZ_CHALLENGES.map((q, idx) => (
                <div key={q.id} className="p-4 bg-black border border-white/10 rounded-xl space-y-3">
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-zinc-900 border border-white/20 text-white flex items-center justify-center text-xs font-mono">
                      Q{idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>

                  <div className="space-y-1.5 pl-7">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = quizAnswers[q.id] === oIdx;
                      const isCorrect = q.correctIndex === oIdx;

                      return (
                        <button
                          key={oIdx}
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                          disabled={quizSubmitted}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                            quizSubmitted
                              ? isCorrect
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                                : isSelected
                                ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                : 'bg-zinc-900 border-white/10 text-zinc-400'
                              : isSelected
                              ? 'bg-white text-black border-white font-bold'
                              : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-300'
                          }`}
                        >
                          <span>{opt}</span>
                          {quizSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && (
                    <div className="pl-7 text-xs text-zinc-400 italic">
                      Explanation: {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!quizSubmitted && (
              <button
                onClick={() => {
                  setQuizSubmitted(true);
                  labSound.playProcedureCompleted();
                }}
                className="w-full py-3 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200 shadow-xl transition-all"
              >
                SUBMIT PREDICTION ANSWERS
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
