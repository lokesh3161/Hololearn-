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
  ShieldAlert,
  Zap,
  Beaker,
  Printer,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
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
  // Experiment parameters
  const [method, setMethod] = useState<Method>('horizontal');
  const [surfacePair, setSurfacePair] = useState<SurfacePair>('wood-wood');
  const [blockMass, setBlockMass] = useState<number>(0.50); // kg
  const [additionalLoad, setAdditionalLoad] = useState<number>(0.00); // kg
  const [appliedForceInput, setAppliedForceInput] = useState<number>(0.0); // N
  const [angleDegInput, setAngleDegInput] = useState<number>(0.0); // deg
  const [noiseEnabled, setNoiseEnabled] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Run State (matching Newton's Law Lab state style)
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');

  // Simulation Engine State
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

  // Track Frictional Energy Dissipated (Work W_f = ∫ f_k dx)
  const [workFrictionJoules, setWorkFrictionJoules] = useState<number>(0.0);

  // Progressive Disclosure Drawer & Tab States (exact match to Newton's Law Lab)
  const [showApparatus, setShowApparatus] = useState<boolean>(false);
  const [showCalculations, setShowCalculations] = useState<boolean>(false);
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [showAi, setShowAi] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<
    'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'NOTEBOOK' | 'REPORT' | 'ASSESSMENT'
  >('NONE');
  const [graphTab, setGraphTab] = useState<'fs_N' | 'fk_N' | 'force_time' | 'friction_applied'>('fs_N');

  // Notebook State
  const [hypothesisText, setHypothesisText] = useState('');
  const [observationText, setObservationText] = useState('');
  const [conclusionText, setConclusionText] = useState('');

  // Quiz Assessment State
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  // Recorded Trials State
  const [trials, setTrials] = useState<FrictionTrial[]>([]);

  // Detection tracking for current run
  const [maxStaticObserved, setMaxStaticObserved] = useState<number | null>(null);
  const [kineticObserved, setKineticObserved] = useState<number | null>(null);
  const [criticalAngleObserved, setCriticalAngleObserved] = useState<number | null>(null);
  const [hasReachedThreshold, setHasReachedThreshold] = useState<boolean>(false);

  // Telemetry History
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

  // AI Mentor Chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to Friction & Coefficients Laboratory! I am your AI Physics Mentor. Ask me any question about static equilibrium, kinetic sliding, or experimental error!",
    },
  ]);
  const [aiQuestionInput, setAiQuestionInput] = useState('');

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Data Logger
  const { rows, record: recordToLogger, clear, exportCSV } = useDataLogger([
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

  // Audio Toggle
  const handleToggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    LabSoundManager.setSoundEnabled(next);
  }, [soundOn]);

  // Noise Displayed Readouts
  const currentMeasuredAccel = useMemo(() => {
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

  // Reset Lab State Handler
  const handleReset = useCallback(() => {
    setStatus('idle');
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

  // Simulation Controls (Release Pull / Pause / Resume)
  const handleStart = () => {
    setStatus('running');
    if (appliedForceInput === 0 && method === 'horizontal') {
      setAppliedForceInput(Number((trueMaxStaticFriction + 0.5).toFixed(2)));
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

  // Quick Preset Helper
  const handlePreset = (surf: SurfacePair, mass: number, addLoad: number) => {
    setSurfacePair(surf);
    setBlockMass(mass);
    setAdditionalLoad(addLoad);
  };

  // Physics Simulation Tick Loop
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

  // Record Trial Data Point
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

  // Linear Regression
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

  // Canvas Viewport Renderer (Black & White Theme - Newton's Law Style)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // Dark sleek background
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, W, H);

    // Subtle Grid overlay
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    const gridSize = 25;
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
      const trackStart = 50;
      const trackEnd = W - 100;

      // Track Base
      ctx.fillStyle = '#18181b';
      ctx.fillRect(trackStart, trackY, trackEnd - trackStart, 20);
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2;
      ctx.strokeRect(trackStart, trackY, trackEnd - trackStart, 20);

      // Material Strip
      ctx.strokeStyle = profile.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(trackStart, trackY);
      ctx.lineTo(trackEnd, trackY);
      ctx.stroke();

      // Measurement Ticks
      ctx.fillStyle = '#71717a';
      ctx.font = '9px monospace';
      const numTicks = 6;
      for (let i = 0; i <= numTicks; i++) {
        const tx = trackStart + (i / numTicks) * (trackEnd - trackStart);
        ctx.beginPath();
        ctx.moveTo(tx, trackY);
        ctx.lineTo(tx, trackY + 6);
        ctx.strokeStyle = '#52525b';
        ctx.stroke();
        ctx.fillText(`${((i / numTicks) * 2.5).toFixed(1)}m`, tx - 8, trackY + 16);
      }

      // End Pulley Rig
      const pulleyX = trackEnd + 15;
      const pulleyY = trackY - 10;
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pulleyX, pulleyY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Block Math
      const blockW = 110;
      const blockH = 55;
      const maxDist = trackEnd - trackStart - blockW - 40;
      const blockX = trackStart + (simState.position / 2.5) * maxDist;
      const blockY = trackY - blockH;

      // Block Body
      ctx.fillStyle = '#27272a';
      ctx.fillRect(blockX, blockY, blockW, blockH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(blockX, blockY, blockW, blockH);

      // Contact Surface Strip
      ctx.fillStyle = profile.color;
      ctx.fillRect(blockX + 2, blockY + blockH - 6, blockW - 4, 5);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${totalMass.toFixed(2)} kg`, blockX + 25, blockY + 24);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '9px monospace';
      ctx.fillText(profile.label, blockX + 15, blockY + 38);

      // Additional Weights Stack
      if (additionalLoad > 0) {
        const loadH = 12;
        const loadW = 70;
        const loadX = blockX + (blockW - loadW) / 2;
        const loadY = blockY - loadH;
        ctx.fillStyle = '#52525b';
        ctx.fillRect(loadX, loadY, loadW, loadH);
        ctx.strokeStyle = '#a1a1aa';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(loadX, loadY, loadW, loadH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`+${additionalLoad.toFixed(2)}kg`, loadX + 12, loadY + 9);
      }

      // Spring Scale & Hook
      const hookX = blockX + blockW;
      const hookY = blockY + blockH / 2;
      const springW = 50 + (appliedForceInput / 30) * 20;

      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hookX, hookY);
      const coils = 8;
      for (let c = 0; c <= coils; c++) {
        const cx = hookX + (c / coils) * springW;
        const cy = hookY + (c % 2 === 0 ? -6 : 6);
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(hookX + springW, hookY);
      ctx.stroke();

      const scaleX = hookX + springW;
      ctx.fillStyle = '#18181b';
      ctx.fillRect(scaleX, hookY - 12, 60, 24);
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(scaleX, hookY - 12, 60, 24);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(scaleX + 2, hookY - 10, (appliedForceInput / 50) * 56, 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${displayedAppliedForce.toFixed(2)}N`, scaleX + 8, hookY + 4);

      // Force Vectors
      if (appliedForceInput > 0) {
        const vecLen = Math.min(70, appliedForceInput * 3);
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(scaleX + 60, hookY);
        ctx.lineTo(scaleX + 60 + vecLen, hookY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(scaleX + 60 + vecLen, hookY);
        ctx.lineTo(scaleX + 60 + vecLen - 8, hookY - 4);
        ctx.lineTo(scaleX + 60 + vecLen - 8, hookY + 4);
        ctx.fill();
      }

      if (simState.frictionForce > 0) {
        const vecLen = Math.min(70, simState.frictionForce * 3);
        ctx.strokeStyle = '#f97316';
        ctx.fillStyle = '#f97316';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(blockX, trackY);
        ctx.lineTo(blockX - vecLen, trackY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(blockX - vecLen, trackY);
        ctx.lineTo(blockX - vecLen + 8, trackY - 4);
        ctx.lineTo(blockX - vecLen + 8, trackY + 4);
        ctx.fill();
        ctx.font = '9px monospace';
        ctx.fillText(`f=${displayedFrictionForce.toFixed(2)}N`, blockX - vecLen - 45, trackY - 4);
      }

      const nLen = Math.min(50, simState.normalForce * 3);
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(blockX + blockW / 2, blockY);
      ctx.lineTo(blockX + blockW / 2, blockY - nLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(blockX + blockW / 2, blockY - nLen);
      ctx.lineTo(blockX + blockW / 2 - 4, blockY - nLen + 7);
      ctx.lineTo(blockX + blockW / 2 + 4, blockY - nLen + 7);
      ctx.fill();
      ctx.fillText(`N=${displayedNormalForce.toFixed(2)}N`, blockX + blockW / 2 + 6, blockY - nLen + 10);
    } else {
      // Inclined Ramp
      const pivotX = 80;
      const pivotY = H - 70;
      const rampLength = W - 160;
      const angleRad = (angleDegInput * Math.PI) / 180;

      const endX = pivotX + rampLength * Math.cos(angleRad);
      const endY = pivotY - rampLength * Math.sin(angleRad);

      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX + rampLength, pivotY);
      ctx.stroke();

      ctx.fillStyle = profile.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 45, 0, -angleRad, true);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`θ = ${displayedAngle.toFixed(1)}°`, pivotX + 55, pivotY - 12);

      const blockW = 90;
      const blockH = 45;
      const distOnRamp = 60 + (simState.position / 2.5) * (rampLength - blockW - 80);

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
      ctx.fillRect(2, -6, blockW - 4, 5);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${totalMass.toFixed(2)} kg`, 18, -20);

      ctx.restore();
    }
  }, [method, simState, profile, appliedForceInput, angleDegInput, displayedAppliedForce, displayedFrictionForce, displayedNormalForce, displayedAngle, totalMass, additionalLoad]);

  // AI Mentor Query Handler
  const handleAskAi = useCallback(
    (questionText?: string) => {
      const q = questionText || aiQuestionInput;
      if (!q.trim()) return;

      setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
      setAiQuestionInput('');

      const qLower = q.toLowerCase();
      let reply = '';

      if (qLower.includes('static') || qLower.includes('impending')) {
        reply = `🔍 **Static Friction Analysis:** Static friction $f_s \\le \\mu_s N$ is reactive. Normal force $N = ${displayedNormalForce.toFixed(
          2
        )}\\text{ N}$. Max static threshold $f_{s,\\max} = \\mu_s N = ${trueMaxStaticFriction.toFixed(
          2
        )}\\text{ N}$. Until applied force reaches $f_{s,\\max}$, the block remains stationary with $f_s = F_{\\text{applied}}$.`;
      } else if (qLower.includes('kinetic') || qLower.includes('sliding')) {
        reply = `⚡ **Kinetic Friction Analysis:** Once motion begins, friction drops to a roughly constant kinetic force $f_k = \\mu_k N = ${simState.frictionForce.toFixed(
          2
        )}\\text{ N}$. Notice that $\\mu_k < \\mu_s$ because unbonding static microscopic cold welds requires higher force than sliding.`;
      } else if (qLower.includes('critical angle') || qLower.includes('incline')) {
        reply = `📐 **Critical Angle:** On an inclined plane, downslope force $F_\\parallel = Mg \\sin\\theta$ pulls downhill while $N = Mg \\cos\\theta$. At impending motion, $Mg \\sin\\theta_c = \\mu_s Mg \\cos\\theta_c \\implies \\tan(\\theta_c) = \\mu_s$.`;
      } else if (qLower.includes('error') || qLower.includes('uncertainty')) {
        reply = `📊 **Experimental Uncertainty:** Real sensors experience baseline noise. Recording multiple trials across different normal forces $N$ allows linear regression to extract reliable slopes ($\mu_s, \mu_k$).`;
      } else {
        reply = `💡 **Physics Mentor:** You are testing **${profile.label}** using the **${method}** method. You have logged **${trials.length} trials**. Try varying mass or surface profiles to compare experimental slopes!`;
      }

      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
      }, 400);
    },
    [aiQuestionInput, displayedNormalForce, trueMaxStaticFriction, simState.frictionForce, profile, method, trials.length]
  );

  // 10 Assessment Quiz Questions
  const assessmentQuestions = useMemo(
    () => [
      { id: 1, q: "Is static friction always equal to μₛN?", options: ["Yes, static friction is constant", "No, static friction fₛ ≤ μₛN matches applied force until maximum threshold", "No, static friction equals kinetic friction", "Static friction is zero"], correct: 1 },
      { id: 2, q: "What happens when applied force exceeds fₛ,max?", options: ["Block remains static", "Block enters kinetic sliding phase", "Normal force drops to zero", "Gravity doubles"], correct: 1 },
      { id: 3, q: "Why is μₛ generally greater than μₖ?", options: ["Static contact allows microscopic cold welds to form", "Kinetic motion increases mass", "Normal force decreases during sliding", "Friction reverses direction"], correct: 0 },
      { id: 4, q: "How is μₛ determined on an inclined plane at impending motion?", options: ["μₛ = sin(θ)", "μₛ = cos(θ)", "μₛ = tan(θ_c)", "μₛ = 1 / tan(θ)"], correct: 2 },
      { id: 5, q: "How does normal force N affect maximum static friction fₛ,max?", options: ["fₛ,max increases linearly with N (fₛ,max ∝ N)", "fₛ,max is independent of N", "fₛ,max decreases as N increases", "fₛ,max varies inversely"], correct: 0 },
      { id: 6, q: "What does the slope of a fₖ vs N graph represent?", options: ["Mass of block", "Coefficient of kinetic friction (μₖ)", "Acceleration due to gravity", "Critical angle"], correct: 1 },
      { id: 7, q: "In kinetic sliding at constant velocity, what is net horizontal force?", options: ["Net force = 0 N (F_applied = fₖ)", "Net force = μₛN", "Net force = mg", "Net force = 50 N"], correct: 0 },
      { id: 8, q: "Why are multiple trials with different loads important in friction experiments?", options: ["To compute linear regression and reduce random sensor uncertainty", "To change the surface material", "To increase friction coefficient", "To eliminate normal force"], correct: 0 },
      { id: 9, q: "What is the normal force N for a mass m on a level horizontal track?", options: ["N = mg", "N = mg sin(θ)", "N = mg / 2", "N = 0 N"], correct: 0 },
      { id: 10, q: "What happens to kinetic friction force fₖ when velocity doubles?", options: ["fₖ remains approximately constant (fₖ = μₖN)", "fₖ doubles", "fₖ quadruples", "fₖ drops to zero"], correct: 0 },
    ],
    []
  );

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-4 bg-[#0a0a0a] text-white font-mono select-none relative overflow-y-auto min-h-0">
      {/* ── TOP CONTROLS & HEADER BAR (Exact Newton's Law Lab Style) ────────── */}
      <div className="w-full flex flex-wrap items-center justify-between bg-zinc-950/90 border border-white/15 p-3 rounded-xl text-xs gap-3">
        {/* Left Side: Back & Experiment Title Badges */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs font-bold transition-all"
            >
              ← Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs tracking-wide">
              Friction & Coefficients of Friction (μₛ, μₖ)
            </span>
            <span className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px] text-zinc-400">
              PHYSICS
            </span>
            <span className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px] text-zinc-400">
              GUIDED
            </span>
          </div>
        </div>

        {/* Right Side: Action Controls & Progressive Disclosure Drawer Buttons */}
        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <button
              onClick={handleStart}
              className="px-3.5 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1 hover:bg-zinc-200"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Pull Slowly</span>
            </button>
          )}

          {status === 'running' && (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 bg-zinc-900 border border-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {status === 'paused' && (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 bg-white text-black font-bold rounded-lg text-xs flex items-center gap-1 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Resume</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1 active:scale-95"
            title="Reset Position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="h-4 w-[1px] bg-white/20 mx-0.5" />

          {/* Drawer Trigger Buttons */}
          <button
            onClick={() => setShowApparatus(true)}
            className="px-2.5 py-1.5 bg-zinc-900 border border-white/20 hover:border-white text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1"
          >
            <Beaker className="w-3.5 h-3.5" />
            <span>Apparatus</span>
          </button>

          <button
            onClick={() => setShowFormulas(true)}
            className="px-2.5 py-1.5 bg-zinc-900 border border-white/20 hover:border-white text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Formulas</span>
          </button>

          <button
            onClick={() => setShowAi(true)}
            className="px-2.5 py-1.5 bg-zinc-900 border border-white/20 hover:border-white text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Mentor</span>
          </button>

          <button
            onClick={() => setShowReport(true)}
            disabled={rows.length === 0}
            className="px-3 py-1.5 bg-white text-black font-bold rounded-lg text-xs flex items-center gap-1 disabled:opacity-40"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: 3-COLUMN HERO LAYOUT ─────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        
        {/* LEFT COLUMN (Controls, Presets, and Collapsible Physics Calculations) */}
        <div className="lg:col-span-3 flex flex-col gap-2 overflow-y-auto">
          {/* Method Selector Tabs */}
          <div className="p-2 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-2">
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Experiment Method</div>
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
              <button
                onClick={() => setMethod('horizontal')}
                className={`py-1 rounded font-bold border transition-all ${
                  method === 'horizontal' ? 'bg-white text-black border-white' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                Horizontal Pull
              </button>
              <button
                onClick={() => setMethod('inclined')}
                className={`py-1 rounded font-bold border transition-all ${
                  method === 'inclined' ? 'bg-white text-black border-white' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                Inclined Ramp
              </button>
            </div>
          </div>

          {/* Surface Material Selection */}
          <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Testing Surface Pair</div>
            <select
              value={surfacePair}
              onChange={(e) => setSurfacePair(e.target.value as SurfacePair)}
              className="w-full bg-zinc-900 border border-white/20 rounded p-1.5 text-white font-bold text-xs outline-none cursor-pointer"
            >
              {Object.values(SURFACE_PROFILES).map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.label}
                </option>
              ))}
            </select>

            {/* Surface Presets */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[10px] text-zinc-500 w-full font-mono">Quick Presets:</span>
              <button onClick={() => handlePreset('wood-wood', 0.5, 0.0)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Wood/Wood</button>
              <button onClick={() => handlePreset('rubber-wood', 0.5, 0.0)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Rubber/Wood</button>
              <button onClick={() => handlePreset('glass-glass', 0.5, 0.0)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Glass/Glass</button>
              <button onClick={() => handlePreset('wood-wood', 1.5, 1.0)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Heavy 2.5kg</button>
            </div>
          </div>

          {/* Derived Physics Card with Collapsible Accordion */}
          <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1 text-white">
                <Zap className="w-3.5 h-3.5 text-white" /> DERIVED PHYSICS
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">Theoretical</span>
            </div>

            {/* Compact Top Physics Summary */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Normal N</div>
                <div className="font-bold text-white text-xs">{simState.normalForce.toFixed(2)}N</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Max fₛ</div>
                <div className="font-bold text-white text-xs">{trueMaxStaticFriction.toFixed(2)}N</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Kinetic fₖ</div>
                <div className="font-bold text-white text-xs">{(profile.muKRef * simState.normalForce).toFixed(2)}N</div>
              </div>
            </div>

            {/* Collapsible Accordion Button */}
            <button
              onClick={() => setShowCalculations(!showCalculations)}
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded text-[11px] text-zinc-300 font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <span>{showCalculations ? 'Hide Calculations ↑' : 'View Calculations ↓'}</span>
            </button>

            {/* Expanded Detailed Physics Calculations Accordion */}
            {showCalculations && (
              <div className="space-y-1.5 text-[11px] pt-1 font-mono animate-fade-in border-t border-white/10">
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Normal Force N = Mg cosθ:</span>
                  <span className="font-bold text-white">{simState.normalForce.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Max Static Threshold fₛ,max:</span>
                  <span className="font-bold text-white">{trueMaxStaticFriction.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Kinetic Friction fₖ = μₖN:</span>
                  <span className="font-bold text-white">{(profile.muKRef * simState.normalForce).toFixed(2)} N</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Critical Angle θ_c = arctan(μₛ):</span>
                  <span className="font-bold text-white">{(Math.atan(profile.muSRef) * (180 / Math.PI)).toFixed(1)}°</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN (HERO LIVE SIMULATION VIEWPORT - LARGEST SCREEN AREA) */}
        <div className="lg:col-span-6 flex flex-col relative h-full min-h-[360px]">
          <div className="w-full h-full bg-black border border-white/20 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-2xl">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Motion State Badge Overlay */}
            <div className="absolute top-3 left-3 bg-zinc-950/90 border border-white/20 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 z-10">
              <span className={`w-2 h-2 rounded-full ${simState.motionState === 'sliding' ? 'bg-emerald-400 animate-pulse' : simState.motionState === 'impending' ? 'bg-amber-400 animate-ping' : 'bg-zinc-400'}`} />
              <span className="uppercase text-white">
                {simState.motionState === 'sliding' ? 'KINETIC SLIDING' : simState.motionState === 'impending' ? 'IMPENDING MOTION' : 'STATIC EQUILIBRIUM'}
              </span>
            </div>

            {/* Threshold Progress Bar Overlay */}
            <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/90 border border-white/20 p-2 rounded-xl text-[10px] font-mono z-10 space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Applied Pull Force: <strong className="text-white">{displayedAppliedForce.toFixed(2)}N</strong></span>
                <span>Threshold Limit fₛ,max: <strong className="text-white">{trueMaxStaticFriction.toFixed(2)}N</strong></span>
              </div>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/10">
                <div
                  className={`h-full transition-all duration-75 ${simState.motionState === 'sliding' ? 'bg-emerald-400' : simState.motionState === 'impending' ? 'bg-amber-400' : 'bg-white'}`}
                  style={{ width: `${Math.min(100, ((appliedForceInput / (trueMaxStaticFriction || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Run Completion Toast Overlay */}
            {hasReachedThreshold && (
              <div className="absolute top-4 right-4 bg-zinc-950 border border-white/30 rounded-xl p-2.5 shadow-2xl text-center flex items-center gap-2 z-20 animate-fade-in text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Threshold Reached! Ready to Record Trial.</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (LIVE TELEMETRY & EXPERIMENTAL COEFFICIENTS) */}
        <div className="lg:col-span-3 flex flex-col gap-2 overflow-y-auto">
          {/* Live Sensor Telemetry */}
          <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] border-b border-white/10 pb-1 flex justify-between items-center">
              <span className="text-white font-bold">SENSOR TELEMETRY</span>
              <span className="text-[9px] text-zinc-500 font-mono">Live</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 font-mono text-center">
              <div className="p-2 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Normal N</div>
                <div className="font-bold text-white text-xs">{displayedNormalForce.toFixed(2)} N</div>
              </div>
              <div className="p-2 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Friction f</div>
                <div className="font-bold text-white text-xs">{displayedFrictionForce.toFixed(2)} N</div>
              </div>
              <div className="p-2 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Velocity v</div>
                <div className="font-bold text-white text-xs">{simState.velocity.toFixed(2)} m/s</div>
              </div>
              <div className="p-2 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Work W_f</div>
                <div className="font-bold text-amber-400 text-xs">{workFrictionJoules.toFixed(2)} J</div>
              </div>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-zinc-400 hover:text-white pt-1">
              <input type="checkbox" checked={noiseEnabled} onChange={(e) => setNoiseEnabled(e.target.checked)} className="accent-white" />
              <span>Realistic Sensor Noise (Jitter)</span>
            </label>
          </div>

          {/* Record Trial & Experimental μ Summary */}
          <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-2 text-xs font-mono">
            <button
              onClick={handleRecordTrial}
              disabled={!hasReachedThreshold}
              className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                hasReachedThreshold ? 'bg-white text-black hover:bg-zinc-200 active:scale-95' : 'bg-zinc-900 border border-white/10 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <PlusCircle className="w-4 h-4 fill-black text-white" />
              <span>⊕ Record Trial ({trials.length})</span>
            </button>

            {trials.length >= 2 ? (
              <div className="space-y-1.5 pt-1 border-t border-white/10 text-[10px]">
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Exp μₛ (Slope):</span>
                  <span className="font-bold text-white">{staticRegression?.slope.toFixed(3) ?? '-'}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Exp μₖ (Slope):</span>
                  <span className="font-bold text-white">{kineticRegression?.slope.toFixed(3) ?? '-'}</span>
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-zinc-500 text-center py-1">Record ≥2 trials with varying mass for linear regression slope.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM FORCE CONTROL SLIDERS BAR ────────────────────── */}
      <div className="w-full max-w-5xl bg-zinc-950 border border-white/15 p-3 rounded-2xl flex flex-col gap-2 font-mono text-xs mb-2">
        {method === 'horizontal' ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-300">Applied Pull Force:</span>
            <input
              type="range"
              min="0"
              max="30"
              step="0.1"
              value={appliedForceInput}
              onChange={(e) => setAppliedForceInput(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <span className="font-bold text-white w-20 text-right">{displayedAppliedForce.toFixed(2)} N</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-300">Ramp Angle (θ):</span>
            <input
              type="range"
              min="0"
              max="80"
              step="0.5"
              value={angleDegInput}
              onChange={(e) => setAngleDegInput(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <span className="font-bold text-white w-20 text-right">{displayedAngle.toFixed(1)}°</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/10 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-400">Block Mass:</span>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={blockMass}
              onChange={(e) => setBlockMass(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <span className="font-bold text-white">{blockMass.toFixed(2)} kg</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-400">Extra Load:</span>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.1"
              value={additionalLoad}
              onChange={(e) => setAdditionalLoad(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <span className="font-bold text-white">+{additionalLoad.toFixed(2)} kg</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM PROGRESSIVE DISCLOSURE WORKSPACE TABS ─────────── */}
      <div className="w-full bg-zinc-950 border border-white/15 rounded-2xl overflow-hidden">
        {/* Tab Buttons Bar */}
        <div className="flex items-center justify-between bg-zinc-900 border-b border-white/10 px-3 py-1.5 text-xs font-mono">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveBottomTab(activeBottomTab === 'PROCEDURE' ? 'NONE' : 'PROCEDURE')}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${activeBottomTab === 'PROCEDURE' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              PROCEDURE
            </button>
            <button
              onClick={() => setActiveBottomTab(activeBottomTab === 'DATA' ? 'NONE' : 'DATA')}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${activeBottomTab === 'DATA' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              DATA LOG ({trials.length})
            </button>
            <button
              onClick={() => setActiveBottomTab(activeBottomTab === 'GRAPH' ? 'NONE' : 'GRAPH')}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${activeBottomTab === 'GRAPH' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              GRAPH WORKSPACE
            </button>
            <button
              onClick={() => setActiveBottomTab(activeBottomTab === 'NOTEBOOK' ? 'NONE' : 'NOTEBOOK')}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${activeBottomTab === 'NOTEBOOK' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              NOTEBOOK
            </button>
            <button
              onClick={() => setActiveBottomTab(activeBottomTab === 'REPORT' ? 'NONE' : 'REPORT')}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${activeBottomTab === 'REPORT' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              LAB REPORT
            </button>
            <button
              onClick={() => setActiveBottomTab(activeBottomTab === 'ASSESSMENT' ? 'NONE' : 'ASSESSMENT')}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${activeBottomTab === 'ASSESSMENT' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              ASSESSMENT
            </button>
          </div>
        </div>

        {/* Tab Contents Workspace */}
        {activeBottomTab !== 'NONE' && (
          <div className="p-4 bg-zinc-950 max-h-72 overflow-y-auto">
            {activeBottomTab === 'PROCEDURE' && (
              <div className="space-y-2 text-xs font-mono">
                <div className="font-bold text-white text-[11px] uppercase tracking-wider">Experimental Protocol:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                  {config.procedure.map((step) => (
                    <div key={step.stepNumber} className="p-2 bg-black border border-white/10 rounded-lg flex items-start gap-2">
                      <span className="font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded">{step.stepNumber}</span>
                      <div>
                        <div className="text-zinc-200">{step.instruction}</div>
                        <div className="text-zinc-500 text-[9px]">Action: {step.expectedAction}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeBottomTab === 'DATA' && (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white uppercase">Recorded Data Table</span>
                  <button onClick={exportCSV} className="px-2.5 py-1 bg-zinc-900 border border-white/20 rounded text-[10px] text-white">
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto border border-white/15 rounded-lg">
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-zinc-900 text-zinc-400 border-b border-white/15">
                      <tr>
                        <th className="p-1.5">#</th>
                        <th className="p-1.5">Method</th>
                        <th className="p-1.5">Surface</th>
                        <th className="p-1.5">Total Mass (kg)</th>
                        <th className="p-1.5">Normal N (N)</th>
                        <th className="p-1.5">Max fₛ (N)</th>
                        <th className="p-1.5">Kinetic fₖ (N)</th>
                        <th className="p-1.5">μₛ (exp)</th>
                        <th className="p-1.5">μₖ (exp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trials.map((t) => (
                        <tr key={t.id} className="border-b border-white/10 bg-black">
                          <td className="p-1.5 font-bold text-white">{t.id}</td>
                          <td className="p-1.5 text-zinc-300">{t.method}</td>
                          <td className="p-1.5 text-zinc-300">{SURFACE_PROFILES[t.surface].label}</td>
                          <td className="p-1.5 text-white">{t.totalMass.toFixed(3)}</td>
                          <td className="p-1.5 text-white">{t.normalForce.toFixed(2)}</td>
                          <td className="p-1.5 text-white">{t.maxStaticFriction?.toFixed(2) ?? '-'}</td>
                          <td className="p-1.5 text-white">{t.kineticFriction?.toFixed(2) ?? '-'}</td>
                          <td className="p-1.5 font-bold text-white">{t.muSExperimental?.toFixed(3) ?? '-'}</td>
                          <td className="p-1.5 font-bold text-white">{t.muKExperimental?.toFixed(3) ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeBottomTab === 'GRAPH' && (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-white/10 pb-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setGraphTab('fs_N')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${graphTab === 'fs_N' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
                    >
                      fₛ vs N (μₛ)
                    </button>
                    <button
                      onClick={() => setGraphTab('fk_N')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${graphTab === 'fk_N' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
                    >
                      fₖ vs N (μₖ)
                    </button>
                    <button
                      onClick={() => setGraphTab('force_time')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${graphTab === 'force_time' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
                    >
                      Force vs Time
                    </button>
                    <button
                      onClick={() => setGraphTab('friction_applied')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${graphTab === 'friction_applied' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
                    >
                      Friction vs Applied
                    </button>
                  </div>
                </div>

                <div className="w-full h-44 bg-black border border-white/15 rounded-xl p-2 relative flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible">
                    <line x1="40" y1="20" x2="40" y2="140" stroke="#27272a" strokeWidth="1" />
                    <line x1="40" y1="140" x2="360" y2="140" stroke="#27272a" strokeWidth="1" />

                    {graphTab === 'fs_N' && (
                      <g>
                        {trials.map((t, idx) => {
                          const x = 40 + (t.normalForce / 50) * 320;
                          const y = 140 - ((t.maxStaticFriction || 0) / 25) * 120;
                          return <circle key={idx} cx={x} cy={y} r="4" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />;
                        })}
                        {staticRegression && staticRegression.count >= 2 && (
                          <line
                            x1="40"
                            y1={140 - (staticRegression.intercept / 25) * 120}
                            x2="360"
                            y2={140 - ((staticRegression.slope * 50 + staticRegression.intercept) / 25) * 120}
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                        )}
                        <text x="50" y="35" fill="#38bdf8" fontSize="10" fontFamily="monospace">
                          Slope μₛ = {staticRegression?.slope.toFixed(3) ?? 'Needs ≥2 points'}
                        </text>
                      </g>
                    )}

                    {graphTab === 'fk_N' && (
                      <g>
                        {trials.map((t, idx) => {
                          const x = 40 + (t.normalForce / 50) * 320;
                          const y = 140 - ((t.kineticFriction || 0) / 25) * 120;
                          return <circle key={idx} cx={x} cy={y} r="4" fill="#f97316" stroke="#000000" strokeWidth="1.5" />;
                        })}
                        {kineticRegression && kineticRegression.count >= 2 && (
                          <line
                            x1="40"
                            y1={140 - (kineticRegression.intercept / 25) * 120}
                            x2="360"
                            y2={140 - ((kineticRegression.slope * 50 + kineticRegression.intercept) / 25) * 120}
                            stroke="#f97316"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                        )}
                        <text x="50" y="35" fill="#f97316" fontSize="10" fontFamily="monospace">
                          Slope μₖ = {kineticRegression?.slope.toFixed(3) ?? 'Needs ≥2 points'}
                        </text>
                      </g>
                    )}

                    {graphTab === 'force_time' && (
                      <path
                        d={telemetryHistory.reduce((acc, pt, idx) => {
                          const x = 40 + (idx / Math.max(1, telemetryHistory.length - 1)) * 320;
                          const y = 140 - (pt.appliedF / 30) * 120;
                          return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }, '')}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    )}

                    {graphTab === 'friction_applied' && (
                      <path
                        d={telemetryHistory.reduce((acc, pt, idx) => {
                          const x = 40 + (pt.appliedF / 30) * 320;
                          const y = 140 - (pt.frictionF / 25) * 120;
                          return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }, '')}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                </div>
              </div>
            )}

            {activeBottomTab === 'NOTEBOOK' && (
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Hypothesis:</label>
                  <textarea
                    value={hypothesisText}
                    onChange={(e) => setHypothesisText(e.target.value)}
                    placeholder="State your physical hypothesis..."
                    className="flex-1 bg-black border border-white/20 rounded p-2 text-white resize-none outline-none"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Observations:</label>
                  <textarea
                    value={observationText}
                    onChange={(e) => setObservationText(e.target.value)}
                    placeholder="Record qualitative observations..."
                    className="flex-1 bg-black border border-white/20 rounded p-2 text-white resize-none outline-none"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Conclusion:</label>
                  <textarea
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    placeholder="Summarize your experiment findings..."
                    className="flex-1 bg-black border border-white/20 rounded p-2 text-white resize-none outline-none"
                  />
                </div>
              </div>
            )}

            {activeBottomTab === 'REPORT' && (
              <div className="space-y-2 text-[10px] font-mono">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white uppercase">Formal Lab Report</span>
                  <button onClick={() => setShowReport(true)} className="px-3 py-1 bg-white text-black font-bold rounded">
                    Open Full Report Modal 📄
                  </button>
                </div>
                <div className="bg-black p-3 rounded-xl border border-white/15 space-y-1">
                  <div><strong>Surface Pair:</strong> {profile.label}</div>
                  <div><strong>Trials Recorded:</strong> {trials.length} trials</div>
                  <div><strong>Exp Static μₛ:</strong> {staticRegression ? staticRegression.slope.toFixed(3) : 'Pending'}</div>
                  <div><strong>Exp Kinetic μₖ:</strong> {kineticRegression ? kineticRegression.slope.toFixed(3) : 'Pending'}</div>
                </div>
              </div>
            )}

            {activeBottomTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px] font-mono">
                <div className="font-bold text-white text-xs uppercase">Interactive Quiz (10 Questions)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {assessmentQuestions.slice(0, 4).map((q) => (
                    <div key={q.id} className="p-2 bg-black border border-white/15 rounded-lg space-y-1">
                      <div className="font-bold text-white">{q.id}. {q.q}</div>
                      <div className="grid grid-cols-1 gap-1">
                        {q.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => setUserAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                            className={`p-1 rounded text-left font-mono text-[9px] border ${userAnswers[q.id] === idx ? 'bg-white text-black font-bold' : 'bg-zinc-900 border-white/10 text-zinc-300'}`}
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
          </div>
        )}
      </div>

      {/* ── COLLAPSIBLE DRAWER MODALS (Matching Newton's Law Lab) ───────── */}
      {showApparatus && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-2xl p-4 space-y-3 font-mono text-xs text-white">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <span className="font-bold text-sm uppercase flex items-center gap-1.5">
                <Beaker className="w-4 h-4" /> Apparatus Specifications
              </span>
              <button onClick={() => setShowApparatus(false)} className="text-zinc-400 hover:text-white font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-[11px]">
              <div><strong>Surface Track:</strong> 2.5m Low-Friction Track Rail</div>
              <div><strong>Friction Block:</strong> 0.50kg Base Block with Load Pegs</div>
              <div><strong>Force Sensor:</strong> Digital Spring Balance (0-50N)</div>
              <div><strong>Incline Ramp:</strong> 0-80° Precision Ramp</div>
            </div>
          </div>
        </div>
      )}

      {showFormulas && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-2xl p-4 space-y-3 font-mono text-xs text-white">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <span className="font-bold text-sm uppercase flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Physics Equations
              </span>
              <button onClick={() => setShowFormulas(false)} className="text-zinc-400 hover:text-white font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="p-2 bg-black border border-white/10 rounded">
                <div className="text-zinc-400">Static Friction (Reactive):</div>
                <div className="font-bold text-white text-xs">fₛ ≤ μₛ · N</div>
              </div>
              <div className="p-2 bg-black border border-white/10 rounded">
                <div className="text-zinc-400">Max Static Threshold:</div>
                <div className="font-bold text-white text-xs">fₛ,max = μₛ · N</div>
              </div>
              <div className="p-2 bg-black border border-white/10 rounded">
                <div className="text-zinc-400">Kinetic Friction:</div>
                <div className="font-bold text-white text-xs">fₖ = μₖ · N</div>
              </div>
              <div className="p-2 bg-black border border-white/10 rounded">
                <div className="text-zinc-400">Inclined Critical Angle:</div>
                <div className="font-bold text-white text-xs">tan(θ_c) = μₛ</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAi && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-2xl p-4 space-y-3 font-mono text-xs text-white flex flex-col h-[480px]">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <span className="font-bold text-sm uppercase flex items-center gap-1.5">
                <Bot className="w-4 h-4" /> AI Physics Mentor
              </span>
              <button onClick={() => setShowAi(false)} className="text-zinc-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-black border border-white/10 rounded-xl text-[10px]">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`p-2 rounded-xl ${msg.sender === 'user' ? 'bg-white text-black font-bold' : 'bg-zinc-900 text-zinc-200'}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={aiQuestionInput}
                onChange={(e) => setAiQuestionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                placeholder="Ask physics mentor..."
                className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
              />
              <button onClick={() => handleAskAi()} className="px-3 py-1.5 bg-white text-black font-bold rounded-lg text-xs">
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-2xl p-5 space-y-4 font-mono text-xs text-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/15 pb-2">
              <div>
                <h3 className="font-bold text-base text-white">FORMAL PHYSICS LABORATORY REPORT</h3>
                <p className="text-[10px] text-zinc-400">Experiment: Friction & Coefficients of Friction (μₛ, μₖ)</p>
              </div>
              <button onClick={() => setShowReport(false)} className="text-zinc-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[10px]">
              <div className="p-3 bg-black border border-white/10 rounded-xl space-y-1">
                <div><strong>Testing Surface Pair:</strong> {profile.label}</div>
                <div><strong>Total Trials Recorded:</strong> {trials.length}</div>
                <div><strong>Student Hypothesis:</strong> {hypothesisText || '[ Student did not enter hypothesis ]'}</div>
                <div><strong>Frictional Work:</strong> {workFrictionJoules.toFixed(2)} J</div>
              </div>

              <div className="p-3 bg-black border border-white/15 rounded-xl space-y-2">
                <div className="font-bold text-white text-xs uppercase border-b border-white/10 pb-1">
                  Experimental Results & Reference Verification
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 bg-zinc-900 border border-white/10 rounded-lg">
                    <div className="text-[9px] text-zinc-400">Measured Static μₛ</div>
                    <div className="font-bold text-white text-sm">{staticRegression?.slope.toFixed(3) ?? '-'}</div>
                    <div className="text-[9px] text-zinc-400 mt-1">Ref μₛ: {profile.muSRef.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-zinc-900 border border-white/10 rounded-lg">
                    <div className="text-[9px] text-zinc-400">Measured Kinetic μₖ</div>
                    <div className="font-bold text-white text-sm">{kineticRegression?.slope.toFixed(3) ?? '-'}</div>
                    <div className="text-[9px] text-zinc-400 mt-1">Ref μₖ: {profile.muKRef.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setShowReport(false)} className="px-4 py-2 bg-white text-black font-bold rounded-lg text-xs">
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
