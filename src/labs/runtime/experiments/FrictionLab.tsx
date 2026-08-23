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
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { useDataLogger } from '../../hooks/useDataLogger';
import { LabSoundManager } from '../../utils/LabSoundManager';
import { SURFACE_PROFILES } from '../../physics/frictionTypes';
import type {
  SurfacePair,
  SurfaceProfile,
  MotionState,
  Method,
  SimulationState,
  FrictionTrial,
} from '../../physics/frictionTypes';
import { FrictionEngine } from '../../engines/FrictionEngine';

interface FrictionLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const FrictionLab: React.FC<FrictionLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
  onBack,
}) => {
  // ── 1. SIMULATION & EXPERIMENT STATE ──────────────────────────────────────
  const [method, setMethod] = useState<Method>('horizontal');
  const [surfacePair, setSurfacePair] = useState<SurfacePair>('wood-wood');
  const [blockMass, setBlockMass] = useState<number>(0.50); // kg
  const [additionalLoad, setAdditionalLoad] = useState<number>(0.00); // kg
  const [appliedForceInput, setAppliedForceInput] = useState<number>(0.0); // N
  const [angleDegInput, setAngleDegInput] = useState<number>(0.0); // deg
  const [noiseEnabled, setNoiseEnabled] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Simulation Execution Status
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Native Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Core Simulation Engine State
  const [simState, setSimState] = useState<SimulationState>({
    method: 'horizontal',
    surface: 'wood-wood',
    blockMass: 0.50,
    additionalLoad: 0.00,
    appliedForce: 0.0,
    angleDeg: 0.0,
    velocity: 0.0,
    position: 0.0,
    motionState: 'static',
    frictionForce: 0.0,
    normalForce: FrictionEngine.calculateNormalForce(0.50, 0.0),
    noiseEnabled: false,
    timestamp: 0.0,
  });

  // Energy & Telemetry Metrics
  const [workFrictionJoules, setWorkFrictionJoules] = useState<number>(0.0);

  // ── 2. DRAWER & WORKSPACE NAVIGATION STATES ─────────────────────────────
  const [activeTab, setActiveTab] = useState<
    'EXPERIMENT' | 'DATA' | 'GRAPH' | 'PROCEDURE' | 'NOTEBOOK' | 'REPORT' | 'ASSESSMENT'
  >('EXPERIMENT');

  // Overlay Drawers
  const [showApparatusDrawer, setShowApparatusDrawer] = useState<boolean>(false);
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState<boolean>(false);
  const [showPhysicsDrawer, setShowPhysicsDrawer] = useState<boolean>(false);
  const [showFbdDrawer, setShowFbdDrawer] = useState<boolean>(false);
  const [showFormulasDrawer, setShowFormulasDrawer] = useState<boolean>(false);
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);
  const [showProcedureDrawer, setShowProcedureDrawer] = useState<boolean>(false);
  const [showReportDrawer, setShowReportDrawer] = useState<boolean>(false);

  // Graph tab view
  const [graphTab, setGraphTab] = useState<'fs_N' | 'fk_N' | 'force_time' | 'friction_applied'>('fs_N');

  // Notebook State
  const [hypothesisText, setHypothesisText] = useState<string>('');
  const [observationText, setObservationText] = useState<string>('');
  const [conclusionText, setConclusionText] = useState<string>('');

  // Assessment Quiz Answers
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  // Experimental Trials Logged
  const [trials, setTrials] = useState<FrictionTrial[]>([]);

  // Friction Detection Tracking
  const [maxStaticObserved, setMaxStaticObserved] = useState<number | null>(null);
  const [kineticObserved, setKineticObserved] = useState<number | null>(null);
  const [criticalAngleObserved, setCriticalAngleObserved] = useState<number | null>(null);
  const [hasReachedThreshold, setHasReachedThreshold] = useState<boolean>(false);

  // Telemetry History Stream
  const [telemetryHistory, setTelemetryHistory] = useState<
    Array<{
      t: number;
      appliedF: number;
      frictionF: number;
      normalF: number;
      vel: number;
      state: MotionState;
    }>
  >([]);

  // AI Mentor Chat Stream
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to the Friction Laboratory! I am your AI Physics Mentor. Ask me about static friction limits, kinetic sliding forces, or finding the critical angle on an inclined plane.",
    },
  ]);
  const [aiQuestionInput, setAiQuestionInput] = useState<string>('');

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // HoloLearn Data Logger Hook
  const { record: recordToLogger, clear: clearDataLogger, exportCSV } = useDataLogger([
    'id',
    'method',
    'surface',
    'totalMass',
    'normalForce',
    'maxStaticFriction',
    'kineticFriction',
    'criticalAngleDeg',
    'muSExperimental',
    'muKExperimental',
  ]);

  const profile: SurfaceProfile = useMemo(() => SURFACE_PROFILES[surfacePair], [surfacePair]);
  const totalMass = useMemo(() => blockMass + additionalLoad, [blockMass, additionalLoad]);

  // Fullscreen Handler via Native Browser Fullscreen API
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => console.warn(err));
    } else {
      document.exitFullscreen?.().catch((err) => console.warn(err));
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Timer counter
  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sound Toggle Handler
  const handleToggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    LabSoundManager.setSoundEnabled(next);
  }, [soundOn]);

  // Noisy Display Readouts
  const currentAccel = useMemo(() => {
    const netF = Math.max(0, appliedForceInput - simState.frictionForce);
    const a = totalMass > 0 ? netF / totalMass : 0;
    return noiseEnabled ? FrictionEngine.gaussianNoise(a, 0.05) : a;
  }, [appliedForceInput, simState.frictionForce, totalMass, noiseEnabled]);

  const displayedAppliedForce = useMemo(
    () => FrictionEngine.applyNoiseToDisplay(appliedForceInput, profile.noiseAmplitude, 0.01, noiseEnabled),
    [appliedForceInput, profile.noiseAmplitude, noiseEnabled]
  );

  const displayedFrictionForce = useMemo(
    () => FrictionEngine.applyNoiseToDisplay(simState.frictionForce, profile.noiseAmplitude, 0.01, noiseEnabled),
    [simState.frictionForce, profile.noiseAmplitude, noiseEnabled]
  );

  const displayedNormalForce = useMemo(
    () => FrictionEngine.applyNoiseToDisplay(simState.normalForce, profile.noiseAmplitude, 0.01, noiseEnabled),
    [simState.normalForce, profile.noiseAmplitude, noiseEnabled]
  );

  const displayedAngle = useMemo(
    () => FrictionEngine.applyNoiseToDisplay(angleDegInput, profile.noiseAmplitude * 2, 0.1, noiseEnabled),
    [angleDegInput, profile.noiseAmplitude, noiseEnabled]
  );

  const trueMaxStaticFriction = useMemo(
    () => profile.muSRef * simState.normalForce,
    [profile.muSRef, simState.normalForce]
  );

  // Synchronize inputs with workbench parent
  useEffect(() => {
    onUpdateInput('method', method);
    onUpdateInput('surface', surfacePair);
    onUpdateInput('blockMass', blockMass);
    onUpdateInput('additionalLoad', additionalLoad);
    onUpdateInput('appliedForce', appliedForceInput);
    onUpdateInput('angleDeg', angleDegInput);
    onUpdateInput('motionState', simState.motionState);
  }, [method, surfacePair, blockMass, additionalLoad, appliedForceInput, angleDegInput, simState.motionState, onUpdateInput]);

  // Reset Lab State
  const handleReset = useCallback(() => {
    setStatus('idle');
    setElapsedTime(0);
    setAppliedForceInput(0);
    setAngleDegInput(0);
    setMaxStaticObserved(null);
    setKineticObserved(null);
    setCriticalAngleObserved(null);
    setHasReachedThreshold(false);
    setWorkFrictionJoules(0.0);
    setTelemetryHistory([]);
    setSimState({
      method,
      surface: surfacePair,
      blockMass,
      additionalLoad,
      appliedForce: 0,
      angleDeg: 0,
      velocity: 0,
      position: 0,
      motionState: 'static',
      frictionForce: 0,
      normalForce: FrictionEngine.calculateNormalForce(blockMass + additionalLoad, 0),
      noiseEnabled,
      timestamp: 0,
    });
    LabSoundManager.playReset();
  }, [method, surfacePair, blockMass, additionalLoad, noiseEnabled]);

  useEffect(() => {
    handleReset();
  }, [method, surfacePair, blockMass, additionalLoad]);

  // Controls Handlers
  const handleStart = () => {
    setStatus('running');
    if (appliedForceInput === 0 && method === 'horizontal') {
      setAppliedForceInput(Number((trueMaxStaticFriction * 0.5).toFixed(2)));
    }
    LabSoundManager.playLaunch();
  };

  const handlePause = () => {
    setStatus('paused');
    LabSoundManager.playPause();
  };

  const handleResume = () => {
    setStatus('running');
  };

  // Physics Simulation Step Tick
  const tick = useCallback(
    (dt: number) => {
      setSimState((prev) => {
        let next: SimulationState;
        if (method === 'horizontal') {
          next = FrictionEngine.stepHorizontal(
            { ...prev, appliedForce: appliedForceInput, blockMass, additionalLoad, noiseEnabled },
            profile,
            dt
          );
        } else {
          next = FrictionEngine.stepInclined(
            { ...prev, angleDeg: angleDegInput, blockMass, additionalLoad, noiseEnabled },
            profile,
            dt
          );
        }

        if (next.motionState === 'sliding') {
          const dW = next.frictionForce * next.velocity * dt;
          setWorkFrictionJoules((w) => w + dW);
        }

        if (next.motionState === 'impending' || next.motionState === 'sliding') {
          setHasReachedThreshold(true);
          onCompleteStep(1);

          if (next.motionState === 'impending' || (prev.motionState === 'impending' && next.motionState === 'sliding')) {
            const peak = profile.muSRef * next.normalForce;
            setMaxStaticObserved(peak);
          }
          if (next.motionState === 'sliding') {
            const kin = profile.muKRef * next.normalForce;
            setKineticObserved(kin);
            if (method === 'inclined' && criticalAngleObserved === null) {
              setCriticalAngleObserved(angleDegInput);
              LabSoundManager.playSuccess();
            }
          }
        }

        setTelemetryHistory((hist) => {
          const newEntry = {
            t: Number(next.timestamp.toFixed(2)),
            appliedF: method === 'horizontal' ? appliedForceInput : next.normalForce * Math.tan((angleDegInput * Math.PI) / 180),
            frictionF: next.frictionForce,
            normalF: next.normalForce,
            vel: next.velocity,
            state: next.motionState,
          };
          if (hist.length > 300) return [...hist.slice(1), newEntry];
          return [...hist, newEntry];
        });

        return next;
      });
    },
    [method, appliedForceInput, angleDegInput, blockMass, additionalLoad, noiseEnabled, profile, criticalAngleObserved, onCompleteStep]
  );

  useExperimentLoop(tick, status === 'running' || status === 'idle');

  // Record Trial Handler
  const handleRecordTrial = useCallback(() => {
    if (!hasReachedThreshold) return;

    const N = simState.normalForce;
    const maxFs = maxStaticObserved ?? profile.muSRef * N;
    const kF = kineticObserved ?? profile.muKRef * N;
    const critAngle = method === 'inclined' ? (criticalAngleObserved ?? angleDegInput) : undefined;

    const muSExp = method === 'horizontal' ? maxFs / N : Math.tan(((critAngle ?? 0) * Math.PI) / 180);
    const muKExp = kF / N;

    const percentErrMuS = FrictionEngine.percentError(muSExp, profile.muSRef);
    const percentErrMuK = FrictionEngine.percentError(muKExp, profile.muKRef);
    const uncertainty = noiseEnabled ? profile.noiseAmplitude * 1.5 : 0.01;

    const newTrial: FrictionTrial = {
      id: String(trials.length + 1),
      method,
      surface: surfacePair,
      blockMass,
      additionalLoad,
      totalMass,
      normalForce: Number(N.toFixed(2)),
      maxStaticFriction: Number(maxFs.toFixed(2)),
      kineticFriction: Number(kF.toFixed(2)),
      criticalAngleDeg: critAngle ? Number(critAngle.toFixed(1)) : undefined,
      muSExperimental: Number(muSExp.toFixed(3)),
      muKExperimental: Number(muKExp.toFixed(3)),
      muSReference: profile.muSRef,
      muKReference: profile.muKRef,
      percentErrorMuS: percentErrMuS,
      percentErrorMuK: percentErrMuK,
      measurementUncertainty: Number(uncertainty.toFixed(3)),
      recordedAt: Date.now(),
    };

    setTrials((prev) => [...prev, newTrial]);
    recordToLogger({
      id: newTrial.id,
      method: newTrial.method,
      surface: profile.label,
      totalMass: newTrial.totalMass,
      normalForce: newTrial.normalForce,
      maxStaticFriction: newTrial.maxStaticFriction,
      kineticFriction: newTrial.kineticFriction,
      criticalAngleDeg: newTrial.criticalAngleDeg ?? '-',
      muSExperimental: newTrial.muSExperimental,
      muKExperimental: newTrial.muKExperimental,
    });

    onRecordDataPoint();
    LabSoundManager.playSuccess();

    if (trials.length + 1 >= 2) {
      onCompleteStep(2);
      onCompleteStep(3);
    }
  }, [
    hasReachedThreshold,
    simState.normalForce,
    maxStaticObserved,
    kineticObserved,
    method,
    criticalAngleObserved,
    angleDegInput,
    profile,
    noiseEnabled,
    trials.length,
    surfacePair,
    blockMass,
    additionalLoad,
    totalMass,
    recordToLogger,
    onRecordDataPoint,
    onCompleteStep,
  ]);

  const handleClearTrials = useCallback(() => {
    setTrials([]);
    clearDataLogger();
    LabSoundManager.playReset();
  }, [clearDataLogger]);

  const handleCopyCSV = useCallback(() => {
    if (trials.length === 0) return;
    const header = "Trial,Method,Surface,TotalMass(kg),NormalForce(N),MaxStaticFriction(N),KineticFriction(N),Exp_muS,Exp_muK\n";
    const rowsText = trials
      .map(
        (t) =>
          `${t.id},${t.method},${SURFACE_PROFILES[t.surface].label},${t.totalMass},${t.normalForce},${
            t.maxStaticFriction ?? ''
          },${t.kineticFriction ?? ''},${t.muSExperimental ?? ''},${t.muKExperimental ?? ''}`
      )
      .join('\n');
    navigator.clipboard.writeText(header + rowsText);
    LabSoundManager.playSuccess();
  }, [trials]);

  // Regressions
  const staticRegression = useMemo(() => {
    const points = trials
      .filter((t) => t.maxStaticFriction !== undefined)
      .map((t) => ({ x: t.normalForce, y: t.maxStaticFriction! }));
    return FrictionEngine.computeLinearRegression(points);
  }, [trials]);

  const kineticRegression = useMemo(() => {
    const points = trials
      .filter((t) => t.kineticFriction !== undefined)
      .map((t) => ({ x: t.normalForce, y: t.kineticFriction! }));
    return FrictionEngine.computeLinearRegression(points);
  }, [trials]);

  // AI Mentor Handler
  const handleAskAi = useCallback(
    (questionText?: string) => {
      const q = questionText || aiQuestionInput;
      if (!q.trim()) return;

      setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
      setAiQuestionInput('');

      const qLower = q.toLowerCase();
      let reply = '';

      if (qLower.includes('static') || qLower.includes('impending')) {
        reply = `🔍 **Static Friction:** Static friction obeys $f_s \\le \\mu_s N$. Normal Force $N = ${displayedNormalForce.toFixed(
          2
        )}\\text{ N}$. Max static threshold $f_{s,\\max} = \\mu_s N = ${trueMaxStaticFriction.toFixed(
          2
        )}\\text{ N}$. The friction force dynamically balances applied force until threshold is reached.`;
      } else if (qLower.includes('kinetic') || qLower.includes('sliding')) {
        reply = `⚡ **Kinetic Friction:** In motion, friction drops to kinetic force $f_k = \\mu_k N = ${(
          profile.muKRef * simState.normalForce
        ).toFixed(
          2
        )}\\text{ N}$. $\\mu_k < \\mu_s$ because shearing stationary asperities requires more peak force than moving past them.`;
      } else if (qLower.includes('critical angle') || qLower.includes('incline')) {
        reply = `📐 **Critical Angle:** On an inclined plane, downslope force $F_\\parallel = mg \\sin\\theta$ pulls downhill while $N = mg \\cos\\theta$. At impending motion, $mg \\sin\\theta_c = \\mu_s mg \\cos\\theta_c \\implies \\tan(\\theta_c) = \\mu_s$.`;
      } else if (qLower.includes('graph') || qLower.includes('error')) {
        reply = `📊 **Regression Slope:** By taking multiple trials at different masses, the slope of $f_{s,\\max}$ vs $N$ gives $\\mu_s$, and $f_k$ vs $N$ gives $\\mu_k$.`;
      } else {
        reply = `💡 **Physics Mentor:** You are testing **${profile.label}** using **${method}** mode with **${trials.length} recorded trials**. Increase load or change surface to compare friction coefficients!`;
      }

      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
      }, 300);
    },
    [aiQuestionInput, displayedNormalForce, trueMaxStaticFriction, simState.normalForce, profile, method, trials.length]
  );

  // 10 Conceptual Assessment Questions
  const assessmentQuestions = useMemo(
    () => [
      { id: 1, q: "Is static friction always equal to μₛN at all times?", options: ["Yes, static friction is constant", "No, static friction fₛ ≤ μₛN matches applied force until maximum threshold", "No, static friction equals kinetic friction", "Static friction is zero"], correct: 1 },
      { id: 2, q: "What happens when applied force exceeds fₛ,max?", options: ["Block remains static", "Block enters kinetic sliding phase and friction drops to f▖", "Normal force drops to zero", "Gravity doubles"], correct: 1 },
      { id: 3, q: "Why is μₛ generally greater than μₖ?", options: ["Static contact allows microscopic cold welds to form", "Kinetic motion increases mass", "Normal force decreases during sliding", "Friction reverses direction"], correct: 0 },
      { id: 4, q: "How is μₛ determined on an inclined plane at impending motion?", options: ["μₛ = sin(θ)", "μₛ = cos(θ)", "μₛ = tan(θ_c)", "μₛ = 1 / tan(θ)"], correct: 2 },
      { id: 5, q: "How does normal force N affect maximum static friction fₛ,max?", options: ["fₛ,max increases linearly with N (fₛ,max ∝ N)", "fₛ,max is independent of N", "fₛ,max decreases as N increases", "fₛ,max varies inversely"], correct: 0 },
      { id: 6, q: "What does the slope of a f▖ vs N graph represent?", options: ["Mass of block", "Coefficient of kinetic friction (μ▖)", "Acceleration due to gravity", "Critical angle"], correct: 1 },
      { id: 7, q: "In kinetic sliding at constant velocity, what is applied horizontal force?", options: ["F_applied ≈ f▖ = μ▖N", "F_applied = fₛ,max = μ⛛N", "F_applied = 0 N", "F_applied = 50 N"], correct: 0 },
      { id: 8, q: "Why are multiple trials across different loads important?", options: ["To compute linear regression and reduce random sensor noise", "To change the surface material", "To increase friction coefficient", "To eliminate normal force"], correct: 0 },
      { id: 9, q: "What is normal force N for a mass m on a level horizontal track?", options: ["N = mg", "N = mg sin(θ)", "N = mg / 2", "N = 0 N"], correct: 0 },
      { id: 10, q: "What happens to kinetic friction force f▖ when velocity doubles?", options: ["f▖ remains approximately constant (f▖ = μ▖N)", "f▖ doubles", "f▖ quadruples", "f▖ drops to zero"], correct: 0 },
    ],
    []
  );

  // ── HERO CANVAS VIEWPORT RENDERER ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // Deep Dark Viewport
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    // Subtle Grid lines
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    if (method === 'horizontal') {
      const trackY = H - 90;
      const trackStart = 70;
      const trackEnd = W - 90;

      // Heavy Track Structure Base
      ctx.fillStyle = '#18181b';
      ctx.fillRect(trackStart, trackY, trackEnd - trackStart, 26);
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2;
      ctx.strokeRect(trackStart, trackY, trackEnd - trackStart, 26);

      // Surface Material Texture Strip
      ctx.fillStyle = profile.color;
      ctx.fillRect(trackStart + 2, trackY, trackEnd - trackStart - 4, 7);

      // Scale Ticks
      ctx.fillStyle = '#71717a';
      ctx.font = '10px sans-serif';
      const numTicks = 8;
      for (let i = 0; i <= numTicks; i++) {
        const tx = trackStart + (i / numTicks) * (trackEnd - trackStart);
        ctx.beginPath();
        ctx.moveTo(tx, trackY + 26);
        ctx.lineTo(tx, trackY + 32);
        ctx.strokeStyle = '#52525b';
        ctx.stroke();
        ctx.fillText(`${((i / numTicks) * 2.5).toFixed(1)}m`, tx - 10, trackY + 44);
      }

      // End Pulley Anchor
      const pulleyX = trackEnd + 16;
      const pulleyY = trackY - 12;
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pulleyX, pulleyY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Block Metrics
      const blockW = 140;
      const blockH = 65;
      const maxDist = trackEnd - trackStart - blockW - 60;
      const blockX = trackStart + (simState.position / 2.5) * maxDist;
      const blockY = trackY - blockH;

      // Wooden Block Body
      ctx.fillStyle = '#27272a';
      ctx.fillRect(blockX, blockY, blockW, blockH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(blockX, blockY, blockW, blockH);

      // Contact Surface Strip
      ctx.fillStyle = profile.color;
      ctx.fillRect(blockX + 2, blockY + blockH - 8, blockW - 4, 7);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${totalMass.toFixed(2)} kg`, blockX + 35, blockY + 28);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '11px sans-serif';
      ctx.fillText(profile.label, blockX + 24, blockY + 46);

      // Stacked Extra Load Plates
      if (additionalLoad > 0) {
        const loadH = 16;
        const loadW = 90;
        const loadX = blockX + (blockW - loadW) / 2;
        const loadY = blockY - loadH;
        ctx.fillStyle = '#52525b';
        ctx.fillRect(loadX, loadY, loadW, loadH);
        ctx.strokeStyle = '#a1a1aa';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(loadX, loadY, loadW, loadH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`+${additionalLoad.toFixed(2)}kg Load`, loadX + 10, loadY + 12);
      }

      // Dynamic Spring Scale & Hook
      const hookX = blockX + blockW;
      const hookY = blockY + blockH / 2;
      const springW = 60 + (appliedForceInput / 30) * 30; // Dynamic visual stretching!

      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hookX, hookY);
      const coils = 12;
      for (let c = 0; c <= coils; c++) {
        const cx = hookX + (c / coils) * springW;
        const cy = hookY + (c % 2 === 0 ? -8 : 8);
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(hookX + springW, hookY);
      ctx.stroke();

      // Digital Force Sensor Readout Display Unit
      const scaleX = hookX + springW;
      ctx.fillStyle = '#18181b';
      ctx.fillRect(scaleX, hookY - 16, 75, 32);
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 2;
      ctx.strokeRect(scaleX, hookY - 16, 75, 32);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(scaleX + 3, hookY - 13, (appliedForceInput / 30) * 69, 26);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${displayedAppliedForce.toFixed(2)}N`, scaleX + 10, hookY + 4);

      // Force Vector Arrows
      // 1. Applied Force Arrow -> (White)
      if (appliedForceInput > 0) {
        const vecLen = Math.min(90, appliedForceInput * 4);
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(scaleX + 75, hookY);
        ctx.lineTo(scaleX + 75 + vecLen, hookY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(scaleX + 75 + vecLen, hookY);
        ctx.lineTo(scaleX + 75 + vecLen - 9, hookY - 5);
        ctx.lineTo(scaleX + 75 + vecLen - 9, hookY + 5);
        ctx.fill();
        ctx.font = '11px monospace';
        ctx.fillText(`F_app=${displayedAppliedForce.toFixed(2)}N`, scaleX + 80, hookY - 8);
      }

      // 2. Friction Force Arrow <- (Orange/Amber)
      if (simState.frictionForce > 0) {
        const vecLen = Math.min(90, simState.frictionForce * 4);
        ctx.strokeStyle = '#f97316';
        ctx.fillStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(blockX, trackY);
        ctx.lineTo(blockX - vecLen, trackY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(blockX - vecLen, trackY);
        ctx.lineTo(blockX - vecLen + 9, trackY - 5);
        ctx.lineTo(blockX - vecLen + 9, trackY + 5);
        ctx.fill();
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`f=${displayedFrictionForce.toFixed(2)}N`, blockX - vecLen - 60, trackY - 8);
      }

      // 3. Normal Force Arrow ^ (Cyan/Blue)
      const nLen = Math.min(70, simState.normalForce * 3.5);
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(blockX + blockW / 2, blockY);
      ctx.lineTo(blockX + blockW / 2, blockY - nLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(blockX + blockW / 2, blockY - nLen);
      ctx.lineTo(blockX + blockW / 2 - 5, blockY - nLen + 8);
      ctx.lineTo(blockX + blockW / 2 + 5, blockY - nLen + 8);
      ctx.fill();
      ctx.font = '11px monospace';
      ctx.fillText(`N=${displayedNormalForce.toFixed(2)}N`, blockX + blockW / 2 + 8, blockY - nLen + 12);

      // 4. Weight Force Arrow v (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(blockX + blockW / 2, trackY);
      ctx.lineTo(blockX + blockW / 2, trackY + nLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(blockX + blockW / 2, trackY + nLen);
      ctx.lineTo(blockX + blockW / 2 - 5, trackY + nLen - 8);
      ctx.lineTo(blockX + blockW / 2 + 5, trackY + nLen - 8);
      ctx.fill();
      ctx.font = '11px monospace';
      ctx.fillText(`mg=${displayedNormalForce.toFixed(2)}N`, blockX + blockW / 2 + 8, trackY + nLen - 4);

    } else {
      // INCLINED PLANE RAMP VIEWPORT
      const pivotX = 100;
      const pivotY = H - 85;
      const rampLength = W - 200;
      const angleRad = (angleDegInput * Math.PI) / 180;

      const endX = pivotX + rampLength * Math.cos(angleRad);
      const endY = pivotY - rampLength * Math.sin(angleRad);

      // Base Platform
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX + rampLength, pivotY);
      ctx.stroke();

      // Hinged Ramp Surface
      ctx.strokeStyle = profile.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Protractor Arc
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 60, 0, -angleRad, true);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`θ = ${displayedAngle.toFixed(1)}°`, pivotX + 70, pivotY - 16);

      // Block on Ramp
      const blockW = 110;
      const blockH = 55;
      const distOnRamp = 80 + (simState.position / 2.5) * (rampLength - blockW - 120);

      const bx = pivotX + distOnRamp * Math.cos(angleRad);
      const by = pivotY - distOnRamp * Math.sin(angleRad);

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-angleRad);

      ctx.fillStyle = '#27272a';
      ctx.fillRect(0, -blockH, blockW, blockH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, -blockH, blockW, blockH);

      ctx.fillStyle = profile.color;
      ctx.fillRect(2, -8, blockW - 4, 7);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${totalMass.toFixed(2)} kg`, 24, -24);

      ctx.restore();
    }
  }, [
    method,
    simState,
    profile,
    appliedForceInput,
    angleDegInput,
    displayedAppliedForce,
    displayedFrictionForce,
    displayedNormalForce,
    displayedAngle,
    totalMass,
    additionalLoad,
  ]);

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] bg-[#09090b] text-white font-sans flex flex-col overflow-hidden select-none relative">
      
      {/* ── 1. SINGLE UNIFIED TOP HEADER BAR (44px) ───────────────────────── */}
      <header className="h-11 bg-zinc-950/95 border-b border-white/15 px-4 flex items-center justify-between shrink-0 font-sans text-xs z-30">
        {/* Left Side: Back & Experiment Title */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-zinc-400 hover:text-white flex items-center gap-1 font-bold transition-all text-xs"
            >
              ← Back to Labs
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs tracking-wide">
              Friction & Coefficients of Friction (μₛ, μₖ)
            </span>
            <span className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px] text-zinc-400 font-mono">
              PHYSICS
            </span>
            <span className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px] text-zinc-400 font-mono">
              GUIDED
            </span>
          </div>
        </div>

        {/* Right Side: Timer, Reset, Export, Fullscreen */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-zinc-400 px-2 py-1 bg-zinc-900 border border-white/15 rounded-lg font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formatTimer(elapsedTime)}</span>
          </div>

          <button
            onClick={handleReset}
            className="px-3 py-1 bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
            title="Reset Experiment"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={trials.length === 0}
            className="px-3 py-1 bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-40"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="px-3 py-1 bg-white text-black font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-zinc-200 active:scale-95 transition-all"
            title="Toggle Native Browser Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* ── 2. COMPACT TOP PARAMETER CONTROL STRIP (38px) ─────────────────── */}
      <div className="h-10 bg-[#09090b] border-b border-white/15 px-4 flex items-center justify-between shrink-0 text-xs font-sans z-20">
        {/* Method Picker Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Method:</span>
          <div className="flex items-center bg-zinc-900 border border-white/15 p-0.5 rounded-lg">
            <button
              onClick={() => setMethod('horizontal')}
              className={`px-3 py-0.5 rounded-md font-bold transition-all text-xs ${
                method === 'horizontal' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Horizontal Force
            </button>
            <button
              onClick={() => setMethod('inclined')}
              className={`px-3 py-0.5 rounded-md font-bold transition-all text-xs ${
                method === 'inclined' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Inclined Plane
            </button>
          </div>
        </div>

        {/* Surface Material Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Surface:</span>
          <select
            value={surfacePair}
            onChange={(e) => setSurfacePair(e.target.value as SurfacePair)}
            className="bg-zinc-900 border border-white/20 rounded-lg px-2 py-0.5 text-white font-bold text-xs outline-none cursor-pointer"
          >
            {Object.values(SURFACE_PROFILES).map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mass & Extra Load Compact Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Mass:</span>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={blockMass}
              onChange={(e) => setBlockMass(Number(e.target.value))}
              className="w-20 accent-white cursor-pointer"
            />
            <span className="font-mono text-white font-bold text-xs">{blockMass.toFixed(2)}kg</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Load:</span>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.1"
              value={additionalLoad}
              onChange={(e) => setAdditionalLoad(Number(e.target.value))}
              className="w-20 accent-white cursor-pointer"
            />
            <span className="font-mono text-white font-bold text-xs">+{additionalLoad.toFixed(2)}kg</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-zinc-400 hover:text-white font-mono">
            <input type="checkbox" checked={noiseEnabled} onChange={(e) => setNoiseEnabled(e.target.checked)} className="accent-white cursor-pointer" />
            <span>Noise</span>
          </label>
        </div>

        {/* Start / Pause Execution Button */}
        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <button
              onClick={handleStart}
              className="px-3.5 py-1 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1 hover:bg-zinc-200"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>START EXPERIMENT</span>
            </button>
          )}

          {status === 'running' && (
            <button
              onClick={handlePause}
              className="px-3.5 py-1 bg-zinc-900 border border-white/30 text-white font-bold rounded-lg text-xs flex items-center gap-1 active:scale-95"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE</span>
            </button>
          )}

          {status === 'paused' && (
            <button
              onClick={handleResume}
              className="px-3.5 py-1 bg-white text-black font-bold rounded-lg text-xs flex items-center gap-1 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>RESUME</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE VIEWPORT (100dvh - Header - Control Strip - Toolbar) ──────── */}
      <main className="flex-1 w-full relative overflow-hidden bg-black flex flex-col">
        {activeTab === 'EXPERIMENT' && (
          <div ref={viewportRef} className="w-full h-full relative flex flex-col overflow-hidden">
            {/* HERO CANVAS VIEWPORT */}
            <div className="flex-1 w-full relative overflow-hidden flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full block" />

              {/* Floating Apparatus Pill (Top Left) */}
              <button
                onClick={() => setShowApparatusDrawer(true)}
                className="absolute top-3 left-3 bg-zinc-950/90 hover:bg-zinc-900 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 z-20 shadow-xl transition-all active:scale-95"
              >
                <Beaker className="w-3.5 h-3.5 text-emerald-400" />
                <span>⚙ APPARATUS</span>
              </button>

              {/* Motion State Indicator Badge (Top Center) */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-white/20 px-4 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 z-20 shadow-xl">
                <span className={`w-2.5 h-2.5 rounded-full ${simState.motionState === 'sliding' ? 'bg-emerald-400 animate-pulse' : simState.motionState === 'impending' ? 'bg-amber-400 animate-ping' : 'bg-zinc-400'}`} />
                <span className="uppercase text-white">
                  {simState.motionState === 'sliding' ? '● SLIDING (KINETIC)' : simState.motionState === 'impending' ? '● IMPENDING MOTION' : '● STATIC EQUILIBRIUM'}
                </span>
              </div>

              {/* FLOATING COMPACT TELEMETRY CARD (Top Right) */}
              <div className="absolute top-3 right-3 bg-zinc-950/95 border border-white/20 p-3 rounded-2xl z-20 shadow-2xl font-mono text-xs space-y-1.5 w-56 backdrop-blur-md">
                <div className="flex justify-between items-center border-b border-white/10 pb-1 text-[10px] text-zinc-400 font-bold uppercase">
                  <span>Telemetry</span>
                  <button onClick={() => setShowTelemetryDrawer(true)} className="text-emerald-400 hover:underline">
                    [ MORE ]
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">NORMAL FORCE</span>
                  <span className="font-bold text-white">{displayedNormalForce.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">APPLIED FORCE</span>
                  <span className="font-bold text-white">{displayedAppliedForce.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">FRICTION</span>
                  <span className="font-bold text-amber-400">{displayedFrictionForce.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">VELOCITY</span>
                  <span className="font-bold text-emerald-400">{simState.velocity.toFixed(2)} m/s</span>
                </div>
              </div>

              {/* Critical Angle Alert (Inclined Plane Mode) */}
              {method === 'inclined' && criticalAngleObserved !== null && (
                <div className="absolute top-16 right-3 bg-emerald-950/95 border border-emerald-500/40 text-emerald-300 px-3.5 py-1.5 rounded-2xl text-xs font-mono font-bold flex items-center gap-2 z-20 shadow-2xl animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CRITICAL ANGLE θ⛛ = {criticalAngleObserved.toFixed(1)}° (μₛ = tanθ = {Math.tan((criticalAngleObserved * Math.PI) / 180).toFixed(3)})</span>
                </div>
              )}
            </div>

            {/* FORCE CONTROL SLIDER DIRECTLY UNDERNEATH APPARATUS */}
            <div className="h-16 bg-zinc-950 border-t border-white/15 px-6 flex items-center justify-between gap-6 shrink-0 font-mono text-xs z-20">
              {method === 'horizontal' ? (
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-zinc-300 font-bold whitespace-nowrap">APPLIED FORCE (F_app):</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.1"
                    value={appliedForceInput}
                    onChange={(e) => setAppliedForceInput(Number(e.target.value))}
                    className="flex-1 accent-white cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="bg-black border border-white/15 px-3 py-1 rounded-lg font-bold text-white">
                      Current: {displayedAppliedForce.toFixed(2)} N
                    </span>
                    <span className="bg-zinc-900 border border-amber-500/30 px-3 py-1 rounded-lg font-bold text-amber-400">
                      Static Limit fₛ,max: {trueMaxStaticFriction.toFixed(2)} N
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-zinc-300 font-bold whitespace-nowrap">RAMP ANGLE (θ):</span>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="0.5"
                    value={angleDegInput}
                    onChange={(e) => setAngleDegInput(Number(e.target.value))}
                    className="flex-1 accent-white cursor-pointer"
                  />
                  <span className="bg-black border border-white/15 px-3 py-1 rounded-lg font-bold text-white">
                    Angle: {displayedAngle.toFixed(1)}°
                  </span>
                </div>
              )}

              <button
                onClick={handleRecordTrial}
                disabled={!hasReachedThreshold}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  hasReachedThreshold
                    ? 'bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-lg'
                    : 'bg-zinc-900 border border-white/10 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <PlusCircle className="w-4 h-4 fill-black text-white" />
                <span>Record Trial ({trials.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* WORKSPACE TAB: DATA TABLE */}
        {activeTab === 'DATA' && (
          <div className="w-full h-full p-4 overflow-y-auto font-mono text-xs space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white uppercase text-sm">Experimental Trial Data Table</span>
              <div className="flex items-center gap-2">
                <button onClick={handleCopyCSV} className="px-3 py-1.5 bg-zinc-900 border border-white/20 rounded-xl text-xs text-white flex items-center gap-1 hover:bg-zinc-800">
                  <Copy className="w-3.5 h-3.5" /> Copy CSV
                </button>
                <button onClick={handleClearTrials} className="px-3 py-1.5 bg-zinc-900 border border-white/20 rounded-xl text-xs text-red-400 flex items-center gap-1 hover:bg-zinc-800">
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              </div>
            </div>
            <div className="border border-white/15 rounded-2xl overflow-hidden bg-black">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-900 text-zinc-400 border-b border-white/15">
                  <tr>
                    <th className="p-3">Trial #</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Surface</th>
                    <th className="p-3">Total Mass (kg)</th>
                    <th className="p-3">Normal N (N)</th>
                    <th className="p-3">Max fₛ (N)</th>
                    <th className="p-3">Kinetic f▖ (N)</th>
                    <th className="p-3">Exp μ⛛</th>
                    <th className="p-3">Exp μ▖</th>
                  </tr>
                </thead>
                <tbody>
                  {trials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-zinc-600">No trials recorded yet. Pull force to threshold limit and click "Record Trial".</td>
                    </tr>
                  ) : (
                    trials.map((t) => (
                      <tr key={t.id} className="border-b border-white/10 hover:bg-zinc-900/50">
                        <td className="p-3 font-bold text-white">{t.id}</td>
                        <td className="p-3 text-zinc-300">{t.method}</td>
                        <td className="p-3 text-zinc-300">{SURFACE_PROFILES[t.surface].label}</td>
                        <td className="p-3 text-white">{t.totalMass.toFixed(2)}</td>
                        <td className="p-3 text-white">{t.normalForce.toFixed(2)}</td>
                        <td className="p-3 text-white">{t.maxStaticFriction?.toFixed(2) ?? '-'}</td>
                        <td className="p-3 text-white">{t.kineticFriction?.toFixed(2) ?? '-'}</td>
                        <td className="p-3 font-bold text-emerald-400">{t.muSExperimental?.toFixed(3) ?? '-'}</td>
                        <td className="p-3 font-bold text-amber-400">{t.muKExperimental?.toFixed(3) ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WORKSPACE TAB: GRAPH WORKSPACE */}
        {activeTab === 'GRAPH' && (
          <div className="w-full h-full p-4 overflow-y-auto font-mono text-xs space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
              <span className="font-bold text-white uppercase text-sm">Interactive Physics Data Graphs & Regression Slopes</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGraphTab('fs_N')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${graphTab === 'fs_N' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                >
                  fₛ,max vs N (μ⛛ slope)
                </button>
                <button
                  onClick={() => setGraphTab('fk_N')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${graphTab === 'fk_N' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                >
                  f▖ vs N (μ▖ slope)
                </button>
                <button
                  onClick={() => setGraphTab('force_time')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${graphTab === 'force_time' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                >
                  Force vs Time
                </button>
                <button
                  onClick={() => setGraphTab('friction_applied')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${graphTab === 'friction_applied' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                >
                  Friction vs Applied
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-black border border-white/15 rounded-2xl p-4 relative flex items-center justify-center min-h-[300px]">
              <svg className="w-full h-full overflow-visible">
                <line x1="50" y1="20" x2="50" y2="240" stroke="#27272a" strokeWidth="2" />
                <line x1="50" y1="240" x2="550" y2="240" stroke="#27272a" strokeWidth="2" />

                {graphTab === 'fs_N' && (
                  <g>
                    {trials.map((t, idx) => {
                      const x = 50 + (t.normalForce / 50) * 500;
                      const y = 240 - ((t.maxStaticFriction || 0) / 30) * 220;
                      return <circle key={idx} cx={x} cy={y} r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />;
                    })}
                    {staticRegression && staticRegression.count >= 2 && (
                      <line
                        x1="50"
                        y1={240 - (staticRegression.intercept / 30) * 220}
                        x2="550"
                        y2={240 - ((staticRegression.slope * 50 + staticRegression.intercept) / 30) * 220}
                        stroke="#38bdf8"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                      />
                    )}
                    <text x="70" y="45" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      Linear Regression Slope (μ⛛) = {staticRegression?.slope.toFixed(3) ?? 'Record ≥2 trials'} (R² = {staticRegression?.r2.toFixed(3) ?? '-'})
                    </text>
                  </g>
                )}

                {graphTab === 'fk_N' && (
                  <g>
                    {trials.map((t, idx) => {
                      const x = 50 + (t.normalForce / 50) * 500;
                      const y = 240 - ((t.kineticFriction || 0) / 30) * 220;
                      return <circle key={idx} cx={x} cy={y} r="6" fill="#f97316" stroke="#ffffff" strokeWidth="2" />;
                    })}
                    {kineticRegression && kineticRegression.count >= 2 && (
                      <line
                        x1="50"
                        y1={240 - (kineticRegression.intercept / 30) * 220}
                        x2="550"
                        y2={240 - ((kineticRegression.slope * 50 + kineticRegression.intercept) / 30) * 220}
                        stroke="#f97316"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                      />
                    )}
                    <text x="70" y="45" fill="#f97316" fontSize="13" fontFamily="monospace" fontWeight="bold">
                      Linear Regression Slope (μ▖) = {kineticRegression?.slope.toFixed(3) ?? 'Record ≥2 trials'} (R² = {kineticRegression?.r2.toFixed(3) ?? '-'})
                    </text>
                  </g>
                )}

                {graphTab === 'force_time' && (
                  <g>
                    <path
                      d={telemetryHistory.reduce((acc, pt, idx) => {
                        const x = 50 + (idx / Math.max(1, telemetryHistory.length - 1)) * 500;
                        const y = 240 - (pt.appliedF / 35) * 220;
                        return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }, '')}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                    <text x="70" y="45" fill="#ffffff" fontSize="12" fontFamily="monospace">Applied Pull Force vs Time (s)</text>
                  </g>
                )}

                {graphTab === 'friction_applied' && (
                  <g>
                    <path
                      d={telemetryHistory.reduce((acc, pt, idx) => {
                        const x = 50 + (pt.appliedF / 35) * 500;
                        const y = 240 - (pt.frictionF / 30) * 220;
                        return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }, '')}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                    />
                    <text x="70" y="45" fill="#f97316" fontSize="12" fontFamily="monospace">Friction Force vs Applied Pull Force (1:1 static rise -&gt; peak -&gt; sliding plateau)</text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* WORKSPACE TAB: PROCEDURE */}
        {activeTab === 'PROCEDURE' && (
          <div className="w-full h-full p-4 overflow-y-auto font-sans text-xs space-y-3">
            <div className="font-bold text-white uppercase text-sm">14-Step Experimental Protocol</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {config.procedure.map((step) => (
                <div key={step.stepNumber} className="p-3 bg-zinc-950 border border-white/15 rounded-2xl flex items-start gap-3">
                  <span className="font-bold text-white bg-zinc-800 px-2.5 py-1 rounded-xl font-mono">{step.stepNumber}</span>
                  <div>
                    <div className="text-zinc-200 font-bold">{step.instruction}</div>
                    <div className="text-zinc-500 text-[11px] font-mono mt-0.5">Action: {step.expectedAction}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKSPACE TAB: NOTEBOOK */}
        {activeTab === 'NOTEBOOK' && (
          <div className="w-full h-full p-4 overflow-y-auto font-sans text-xs space-y-3">
            <div className="font-bold text-white uppercase text-sm">Lab Notebook & Observations</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full pb-8">
              <div className="space-y-1.5 flex flex-col">
                <label className="font-bold text-zinc-300">Student Hypothesis:</label>
                <textarea
                  value={hypothesisText}
                  onChange={(e) => setHypothesisText(e.target.value)}
                  placeholder="State your physical hypothesis about how total mass affects maximum static friction..."
                  className="flex-1 bg-zinc-950 border border-white/20 rounded-2xl p-3 text-white font-mono resize-none outline-none text-xs"
                />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="font-bold text-zinc-300">Observations:</label>
                <textarea
                  value={observationText}
                  onChange={(e) => setObservationText(e.target.value)}
                  placeholder="Record qualitative observations (e.g. static phase balancing force, drop at sliding)..."
                  className="flex-1 bg-zinc-950 border border-white/20 rounded-2xl p-3 text-white font-mono resize-none outline-none text-xs"
                />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="font-bold text-zinc-300">Conclusions:</label>
                <textarea
                  value={conclusionText}
                  onChange={(e) => setConclusionText(e.target.value)}
                  placeholder="Summarize your experimental determination of μₛ and μ▖..."
                  className="flex-1 bg-zinc-950 border border-white/20 rounded-2xl p-3 text-white font-mono resize-none outline-none text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE TAB: REPORT */}
        {activeTab === 'REPORT' && (
          <div className="w-full h-full p-4 overflow-y-auto font-mono text-xs space-y-3">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="font-bold text-white uppercase text-sm">Formal Physics Laboratory Summary</span>
              <button onClick={() => window.print()} className="px-4 py-1.5 bg-white text-black font-bold rounded-xl flex items-center gap-1.5 hover:bg-zinc-200">
                <Printer className="w-4 h-4" /> Print Full Report
              </button>
            </div>
            <div className="bg-zinc-950 p-4 rounded-2xl border border-white/15 space-y-2 text-xs">
              <div><strong>Testing Surface Pair:</strong> {profile.label}</div>
              <div><strong>Trials Completed:</strong> {trials.length} trials</div>
              <div><strong>Experimental μ⛛ (Static Slope):</strong> {staticRegression ? staticRegression.slope.toFixed(3) : 'Pending trials'}</div>
              <div><strong>Experimental μ▖ (Kinetic Slope):</strong> {kineticRegression ? kineticRegression.slope.toFixed(3) : 'Pending trials'}</div>
              <div><strong>Total Frictional Work Dissipated:</strong> {workFrictionJoules.toFixed(2)} J</div>
            </div>
          </div>
        )}

        {/* WORKSPACE TAB: ASSESSMENT */}
        {activeTab === 'ASSESSMENT' && (
          <div className="w-full h-full p-4 overflow-y-auto font-sans text-xs space-y-4">
            <div className="font-bold text-white uppercase text-sm">Conceptual Quiz Assessment (10 Questions)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
              {assessmentQuestions.map((q) => (
                <div key={q.id} className="p-4 bg-zinc-950 border border-white/15 rounded-2xl space-y-2">
                  <div className="font-bold text-white text-xs">{q.id}. {q.q}</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {q.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setUserAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                        className={`p-2 rounded-xl text-left font-mono text-xs border transition-all ${
                          userAnswers[q.id] === idx
                            ? idx === q.correct
                              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold'
                              : 'bg-red-950/80 border-red-500 text-red-200 font-bold'
                            : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-white/30'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── 4. SINGLE COMPACT BOTTOM TOOLBAR (44px) ───────────────────────── */}
      <footer className="h-11 bg-zinc-950/95 border-t border-white/15 px-4 flex items-center justify-between shrink-0 font-mono text-xs z-30">
        {/* Left Side Workspace Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('EXPERIMENT')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'EXPERIMENT' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ EXPERIMENT ]
          </button>
          <button
            onClick={() => setActiveTab('DATA')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'DATA' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ DATA ({trials.length}) ]
          </button>
          <button
            onClick={() => setActiveTab('GRAPH')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'GRAPH' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ GRAPH ]
          </button>
          <button
            onClick={() => setActiveTab('PROCEDURE')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'PROCEDURE' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ PROCEDURE ]
          </button>
          <button
            onClick={() => setActiveTab('NOTEBOOK')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'NOTEBOOK' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ NOTEBOOK ]
          </button>
          <button
            onClick={() => setActiveTab('REPORT')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'REPORT' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ REPORT ]
          </button>
          <button
            onClick={() => setActiveTab('ASSESSMENT')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'ASSESSMENT' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            [ ASSESSMENT ]
          </button>
        </div>

        {/* Right Side Tools: FBD, Physics, AI Mentor */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFbdDrawer(true)}
            className="px-2.5 py-1 bg-zinc-900 border border-white/20 hover:border-white text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1 font-mono"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>FBD</span>
          </button>

          <button
            onClick={() => setShowPhysicsDrawer(true)}
            className="px-2.5 py-1 bg-zinc-900 border border-white/20 hover:border-white text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1 font-mono"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Physics</span>
          </button>

          <button
            onClick={() => setShowAiDrawer(true)}
            className="px-3 py-1 bg-zinc-900 border border-white/20 hover:border-white text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5 font-mono"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Mentor</span>
          </button>
        </div>
      </footer>

      {/* ── 5. SLIDE-OVER OVERLAY DRAWERS & MODALS ───────────────────────────── */}
      {/* 1. APPARATUS LEFT SLIDE-OVER DRAWER */}
      {showApparatusDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-start">
          <div className="w-80 h-full bg-zinc-950 border-r border-white/20 p-5 space-y-4 font-mono text-xs text-white shadow-2xl overflow-y-auto animate-slide-right">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <span className="font-bold text-sm uppercase flex items-center gap-2">
                <Beaker className="w-4 h-4 text-emerald-400" /> APPARATUS SHELF
              </span>
              <button onClick={() => setShowApparatusDrawer(false)} className="text-zinc-400 hover:text-white font-bold text-base">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black border border-white/10 rounded-xl space-y-1">
                <div className="font-bold text-white">Surface Track Rail</div>
                <div className="text-[11px] text-zinc-400">2.5m precision track rail with interchangeable material surface strips.</div>
              </div>
              <div className="p-3 bg-black border border-white/10 rounded-xl space-y-1">
                <div className="font-bold text-white">Sliding Block & Loads</div>
                <div className="text-[11px] text-zinc-400">0.50kg base wooden block with stackable extra weight plates.</div>
              </div>
              <div className="p-3 bg-black border border-white/10 rounded-xl space-y-1">
                <div className="font-bold text-white">Force Sensor / Spring Scale</div>
                <div className="text-[11px] text-zinc-400">Digital load cell sensor with coiling spring scale (0 - 50N).</div>
              </div>
              <div className="p-3 bg-black border border-white/10 rounded-xl space-y-1">
                <div className="font-bold text-white">Precision Incline Ramp</div>
                <div className="text-[11px] text-zinc-400">Pivoted ramp with protractor angle arc adjustable from 0° to 60°.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TELEMETRY RIGHT SLIDE-OVER DRAWER [MORE] */}
      {showTelemetryDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-80 h-full bg-zinc-950 border-l border-white/20 p-5 space-y-4 font-mono text-xs text-white shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <span className="font-bold text-sm uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> DETAILED TELEMETRY
              </span>
              <button onClick={() => setShowTelemetryDrawer(false)} className="text-zinc-400 hover:text-white font-bold text-base">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Total Mass (m):</span>
                <span className="font-bold text-white">{totalMass.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between p-2.5 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Acceleration (a):</span>
                <span className="font-bold text-white">{currentAccel.toFixed(2)} m/s²</span>
              </div>
              <div className="flex justify-between p-2.5 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Distance (x):</span>
                <span className="font-bold text-white">{simState.position.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between p-2.5 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Frictional Work (W_f):</span>
                <span className="font-bold text-amber-400">{workFrictionJoules.toFixed(2)} J</span>
              </div>
              <div className="flex justify-between p-2.5 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Kinetic Energy (E_k):</span>
                <span className="font-bold text-emerald-400">{(0.5 * totalMass * Math.pow(simState.velocity, 2)).toFixed(2)} J</span>
              </div>
              <div className="flex justify-between p-2.5 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Momentum (p):</span>
                <span className="font-bold text-white">{(totalMass * simState.velocity).toFixed(2)} kg·m/s</span>
              </div>
              {method === 'inclined' && (
                <div className="flex justify-between p-2.5 bg-black border border-white/10 rounded-xl">
                  <span className="text-zinc-400">Ramp Angle (θ):</span>
                  <span className="font-bold text-white">{displayedAngle.toFixed(1)}°</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. DERIVED PHYSICS COMPACT DRAWER */}
      {showPhysicsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-2xl p-5 space-y-3 font-mono text-xs text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <span className="font-bold text-sm uppercase flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> DERIVED PHYSICS EQUATIONS
              </span>
              <button onClick={() => setShowPhysicsDrawer(false)} className="text-zinc-400 hover:text-white font-bold text-base">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Normal Force:</span>
                <span className="font-bold text-white">N = mg cos(θ) = {simState.normalForce.toFixed(2)} N</span>
              </div>
              <div className="flex justify-between p-2 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Max Static Threshold:</span>
                <span className="font-bold text-white">fₛ,max = μ⛛N = {trueMaxStaticFriction.toFixed(2)} N</span>
              </div>
              <div className="flex justify-between p-2 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Kinetic Friction:</span>
                <span className="font-bold text-white">f▖ = μ▖N = {(profile.muKRef * simState.normalForce).toFixed(2)} N</span>
              </div>
              <div className="flex justify-between p-2 bg-black border border-white/10 rounded-xl">
                <span className="text-zinc-400">Critical Angle Equation:</span>
                <span className="font-bold text-white">tan(θ_c) = μ⛛ = {(Math.atan(profile.muSRef) * (180 / Math.PI)).toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FREE-BODY DIAGRAM DRAWER */}
      {showFbdDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-2xl p-5 space-y-4 font-mono text-xs text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <span className="font-bold text-sm uppercase flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" /> Free-Body Diagram (FBD)
              </span>
              <button onClick={() => setShowFbdDrawer(false)} className="text-zinc-400 hover:text-white font-bold text-base">✕</button>
            </div>

            <div className="w-full h-56 bg-black border border-white/15 rounded-2xl p-3 flex items-center justify-center relative">
              <svg className="w-full h-full" viewBox="0 0 300 200">
                <rect x="120" y="80" width="60" height="40" fill="#27272a" stroke="#ffffff" strokeWidth="2" />
                <text x="132" y="104" fill="#ffffff" fontSize="10" fontFamily="monospace">m={totalMass.toFixed(2)}kg</text>

                {/* Normal N ^ */}
                <line x1="150" y1="80" x2="150" y2="25" stroke="#38bdf8" strokeWidth="2.5" />
                <polygon points="150,20 145,30 155,30" fill="#38bdf8" />
                <text x="156" y="32" fill="#38bdf8" fontSize="10" fontFamily="monospace">N={displayedNormalForce.toFixed(2)}N</text>

                {/* Weight mg v */}
                <line x1="150" y1="120" x2="150" y2="175" stroke="#ef4444" strokeWidth="2.5" />
                <polygon points="150,180 145,170 155,170" fill="#ef4444" />
                <text x="156" y="175" fill="#ef4444" fontSize="10" fontFamily="monospace">mg={displayedNormalForce.toFixed(2)}N</text>

                {/* Applied Pull -> */}
                {method === 'horizontal' && (
                  <g>
                    <line x1="180" y1="100" x2="245" y2="100" stroke="#ffffff" strokeWidth="2.5" />
                    <polygon points="250,100 240,95 240,105" fill="#ffffff" />
                    <text x="190" y="92" fill="#ffffff" fontSize="10" fontFamily="monospace">F_app={displayedAppliedForce.toFixed(2)}N</text>
                  </g>
                )}

                {/* Friction <- */}
                <line x1="120" y1="100" x2="55" y2="100" stroke="#f97316" strokeWidth="2.5" />
                <polygon points="50,100 60,95 60,105" fill="#f97316" />
                <text x="55" y="92" fill="#f97316" fontSize="10" fontFamily="monospace">f={displayedFrictionForce.toFixed(2)}N</text>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 5. AI MENTOR RIGHT SLIDE-OVER DRAWER */}
      {showAiDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-end">
          <div className="w-96 h-full bg-zinc-950 border-l border-white/20 p-5 space-y-3 font-mono text-xs text-white flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <span className="font-bold text-sm uppercase flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" /> AI Physics Mentor
              </span>
              <button onClick={() => setShowAiDrawer(false)} className="text-zinc-400 hover:text-white font-bold text-base">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-black border border-white/10 rounded-2xl text-[11px]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl ${
                    msg.sender === 'user' ? 'bg-white text-black font-bold ml-4' : 'bg-zinc-900 text-zinc-200 mr-4 border border-white/10'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 pt-1">
              <button onClick={() => handleAskAi("Explain static friction")} className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded text-[9px]">Explain static friction</button>
              <button onClick={() => handleAskAi("Why did the block move?")} className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded text-[9px]">Why start moving?</button>
              <button onClick={() => handleAskAi("Why is μ⛛ greater than μ▖?")} className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded text-[9px]">Why μ⛛ &gt; μ▖?</button>
              <button onClick={() => handleAskAi("Explain critical angle")} className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded text-[9px]">Critical angle</button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={aiQuestionInput}
                onChange={(e) => setAiQuestionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                placeholder="Ask mentor a question..."
                className="flex-1 bg-black border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              />
              <button onClick={() => handleAskAi()} className="px-3 py-1.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
