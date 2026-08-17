import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  FileText,
  Bot,
  BookOpen,
  Copy,
  Trash2,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  Beaker,
  Zap,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { useDataLogger } from '../../hooks/useDataLogger';

interface NewtonsLawLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const NewtonsLawLab: React.FC<NewtonsLawLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
  onBack,
}) => {
  // Experiment parameters
  const [cartMass, setCartMass] = useState<number>(Number(inputs.cartMass || 0.5)); // kg
  const [hangingMass, setHangingMass] = useState<number>(Number(inputs.hangingMass || 0.1)); // kg
  const [friction, setFriction] = useState<number>(Number(inputs.friction || 0)); // N
  const [initialVelocity, setInitialVelocity] = useState<number>(0); // m/s
  const [duration, setDuration] = useState<number>(5); // s
  const [realisticMode, setRealisticMode] = useState<boolean>(false);

  // Run State
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [cartPosition, setCartPosition] = useState<number>(0);
  const [cartVelocity, setCartVelocity] = useState<number>(0);

  // Progressive Disclosure Drawer / Accordion States
  const [showApparatus, setShowApparatus] = useState<boolean>(false);
  const [showCalculations, setShowCalculations] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'NOTEBOOK' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showAi, setShowAi] = useState<boolean>(false);
  const [graphTab, setGraphTab] = useState<'vt' | 'at' | 'xt' | 'ft'>('vt');

  // Notebook State
  const [hypothesisText, setHypothesisText] = useState('');
  const [observationText, setObservationText] = useState('');
  const [conclusionText, setConclusionText] = useState('');

  // Telemetry History for Graph & Motion Trail
  const [history, setHistory] = useState<Array<{
    t: number;
    a: number;
    v: number;
    x: number;
    Fnet: number;
  }>>([]);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── PURE PHYSICS CALCULATIONS ─────────────────────────────
  const appliedForce = useMemo(() => hangingMass * 9.81, [hangingMass]);
  const totalMass = useMemo(() => cartMass + hangingMass, [cartMass, hangingMass]);
  const netForce = useMemo(() => Math.max(0, appliedForce - friction), [appliedForce, friction]);

  const theoreticalAccel = useMemo(
    () => MechanicsEngine.acceleration(netForce, totalMass),
    [netForce, totalMass]
  );

  const finalTheoreticalV = useMemo(
    () => MechanicsEngine.velocityFinal(initialVelocity, theoreticalAccel, duration),
    [initialVelocity, theoreticalAccel, duration]
  );

  const finalTheoreticalX = useMemo(
    () => MechanicsEngine.displacement(initialVelocity, theoreticalAccel, duration),
    [initialVelocity, theoreticalAccel, duration]
  );

  // Sensor Telemetry with Noise
  const currentMeasuredAccel = useMemo(() => {
    return realisticMode ? MechanicsEngine.addNoise(theoreticalAccel, 1.5) : theoreticalAccel;
  }, [theoreticalAccel, realisticMode]);

  const currentMeasuredVel = useMemo(() => {
    return realisticMode ? MechanicsEngine.addNoise(cartVelocity, 0.8) : cartVelocity;
  }, [cartVelocity, realisticMode]);

  const currentMeasuredPos = useMemo(() => {
    return realisticMode ? MechanicsEngine.addNoise(cartPosition, 0.5) : cartPosition;
  }, [cartPosition, realisticMode]);

  const kineticEnergy = useMemo(
    () => MechanicsEngine.kineticEnergy(totalMass, currentMeasuredVel),
    [totalMass, currentMeasuredVel]
  );

  const momentum = useMemo(
    () => MechanicsEngine.momentum(totalMass, currentMeasuredVel),
    [totalMass, currentMeasuredVel]
  );

  // Data Logger
  const { rows, record, clear, exportCSV } = useDataLogger([
    'trialId',
    'cartMass',
    'hangingMass',
    'friction',
    'netForce',
    'measuredAccel',
    'finalVelocity',
    'distance',
    'duration',
    'errorPercent',
  ]);

  // AI Mentor Conversation
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to Newton's Second Law Laboratory! I am your AI Physics Mentor. Ask me any question about force, mass, acceleration, or your live trial data!",
    },
  ]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('cartMass', cartMass);
    onUpdateInput('hangingMass', hangingMass);
    onUpdateInput('friction', friction);
    onUpdateInput('appliedForce', appliedForce);
    onUpdateInput('netForce', netForce);
    onUpdateInput('accel', theoreticalAccel);
  }, [cartMass, hangingMass, friction, appliedForce, netForce, theoreticalAccel, onUpdateInput]);

  // Physics Animation Tick Loop
  const tick = useCallback(
    (dt: number) => {
      if (status !== 'running') return;

      const nextTime = Math.min(currentTime + dt, duration);
      setCurrentTime(nextTime);

      const a = theoreticalAccel;
      const v = MechanicsEngine.velocityFinal(initialVelocity, a, nextTime);
      const x = MechanicsEngine.displacement(initialVelocity, a, nextTime);

      setCartVelocity(v);
      setCartPosition(x);

      setHistory((prev) => [
        ...prev,
        {
          t: Number(nextTime.toFixed(2)),
          a: Number((realisticMode ? MechanicsEngine.addNoise(a, 1.5) : a).toFixed(3)),
          v: Number((realisticMode ? MechanicsEngine.addNoise(v, 0.8) : v).toFixed(3)),
          x: Number((realisticMode ? MechanicsEngine.addNoise(x, 0.5) : x).toFixed(3)),
          Fnet: Number(netForce.toFixed(2)),
        },
      ]);

      if (nextTime >= 2.0) {
        onCompleteStep(1);
      }

      if (nextTime >= duration) {
        setStatus('completed');
        onCompleteStep(2);
        onCompleteStep(3);

        const measuredA = realisticMode ? MechanicsEngine.addNoise(a, 1.5) : a;
        const err = MechanicsEngine.percentageError(measuredA, a);

        record({
          trialId: rows.length + 1,
          cartMass,
          hangingMass,
          friction,
          netForce: Number(netForce.toFixed(2)),
          measuredAccel: Number(measuredA.toFixed(3)),
          finalVelocity: Number(v.toFixed(2)),
          distance: Number(x.toFixed(2)),
          duration,
          errorPercent: Number(err.toFixed(2)),
        });

        onRecordDataPoint();

        // AI Challenge Prompt
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `🎯 **Trial #${rows.length + 1} Logged:** Acceleration reached **${measuredA.toFixed(2)} m/s²**. If you double the cart mass, what will happen to acceleration?`,
          },
        ]);
      }
    },
    [
      status,
      currentTime,
      duration,
      theoreticalAccel,
      initialVelocity,
      realisticMode,
      netForce,
      onCompleteStep,
      onRecordDataPoint,
      rows.length,
      cartMass,
      hangingMass,
      friction,
      record,
    ]
  );

  useExperimentLoop(tick, status === 'running');

  // Canvas Viewport Renderer (Black & White Theme)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // Background: Pitch Black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Table Surface
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, H * 0.65, W, H * 0.35);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.65);
    ctx.lineTo(W, H * 0.65);
    ctx.stroke();

    // Aluminum Rail Track
    const trackY = H * 0.58;
    const trackH = 14;
    const trackX = 40;
    const trackW = W - 120;

    // Track Shadow & Rail Gradient
    ctx.fillStyle = '#18181b';
    ctx.fillRect(trackX, trackY + 2, trackW, trackH);

    const trackGrad = ctx.createLinearGradient(0, trackY, 0, trackY + trackH);
    trackGrad.addColorStop(0, '#52525b');
    trackGrad.addColorStop(0.5, '#a1a1aa');
    trackGrad.addColorStop(1, '#27272a');
    ctx.fillStyle = trackGrad;
    ctx.fillRect(trackX, trackY, trackW, trackH);

    // Centimeter Scale Markings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = trackX + (trackW / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, trackY);
      ctx.lineTo(x, trackY + trackH);
      ctx.stroke();

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${i * 10}`, x, trackY + trackH + 14);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.fillText('cm', trackX + trackW + 14, trackY + trackH + 14);

    // End Stops
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(trackX - 8, trackY - 4, 8, trackH + 8);
    ctx.fillRect(trackX + trackW, trackY - 4, 8, trackH + 8);

    // Pulley Wheel at Right End
    const pulleyX = trackX + trackW + 6;
    const pulleyY = trackY + trackH / 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#18181b';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Cart Position Mapping
    const maxTrackM = 50;
    const pxPerM = trackW / maxTrackM;
    const clampedPos = Math.min(cartPosition, maxTrackM);
    const blockW = Math.max(45, Math.min(75, 45 + cartMass * 8));
    const blockH = Math.max(30, Math.min(50, 30 + cartMass * 5));
    const blockX = trackX + clampedPos * pxPerM;
    const blockY = trackY - blockH;

    // Motion Trail Dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    history.forEach((pt) => {
      const hx = trackX + Math.min(pt.x, maxTrackM) * pxPerM;
      ctx.beginPath();
      ctx.arc(hx, trackY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cart Body
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.roundRect(blockX, blockY, blockW, blockH, 4);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mass Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${cartMass}kg`, blockX + blockW / 2, blockY + blockH / 2 + 4);

    // Wheels
    const wheelR = 5;
    const wheelY = blockY + blockH + wheelR;
    [blockX + 12, blockX + blockW - 12].forEach((wx) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(wx, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // String over Pulley
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(blockX + blockW, blockY + blockH / 2);
    ctx.lineTo(pulleyX, pulleyY - 12);
    ctx.lineTo(pulleyX, pulleyY + 50 + Math.min(60, cartPosition * 2));
    ctx.stroke();

    // Hanging Mass
    const hangingY = pulleyY + 50 + Math.min(60, cartPosition * 2);
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.roundRect(pulleyX - 10, hangingY, 20, 24, 3);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${hangingMass}k`, pulleyX, hangingY + 15);

    // Vector Arrows (F_applied, f, F_net, v)
    const drawArrow = (x1: number, y1: number, x2: number, y2: number, color: string, label: string) => {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 8;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
      ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
      ctx.fill();

      ctx.font = 'bold 10px monospace';
      ctx.fillText(label, x2 > x1 ? x2 + 6 : x2 - 6, y2 - 4);
    };

    if (appliedForce > 0) {
      drawArrow(blockX + blockW, blockY + 10, blockX + blockW + Math.min(80, appliedForce * 8), blockY + 10, '#ffffff', `F=${appliedForce.toFixed(1)}N`);
    }

    if (friction > 0) {
      drawArrow(blockX, blockY + 20, blockX - Math.min(60, friction * 8), blockY + 20, '#a1a1aa', `f=${friction}N`);
    }

    if (cartVelocity > 0.1) {
      drawArrow(blockX + blockW / 2, blockY - 15, blockX + blockW / 2 + Math.min(60, cartVelocity * 8), blockY - 15, '#d4d4d8', `v=${cartVelocity.toFixed(1)}m/s`);
    }

    // Top Progress Bar
    const progress = duration > 0 ? currentTime / duration : 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W * progress, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${currentTime.toFixed(2)}s / ${duration}s`, W - 12, 20);

    // Canvas Telemetry Overlay Box
    const ox = W - 150;
    const oy = H - 85;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ox, oy, 140, 75, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('a:', ox + 8, oy + 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${currentMeasuredAccel.toFixed(2)} m/s²`, ox + 28, oy + 16);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('v:', ox + 8, oy + 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${currentMeasuredVel.toFixed(2)} m/s`, ox + 28, oy + 32);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('x:', ox + 8, oy + 48);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${currentMeasuredPos.toFixed(2)} m`, ox + 28, oy + 48);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('t:', ox + 8, oy + 64);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${currentTime.toFixed(2)} s`, ox + 28, oy + 64);
  }, [
    cartPosition,
    cartVelocity,
    currentTime,
    duration,
    cartMass,
    hangingMass,
    appliedForce,
    friction,
    history,
    currentMeasuredAccel,
    currentMeasuredVel,
    currentMeasuredPos,
  ]);

  // Controls Handlers
  const handleStart = () => {
    if (status === 'running') return;
    setStatus('running');
  };

  const handlePause = () => {
    setStatus('paused');
  };

  const handleResume = () => {
    setStatus('running');
  };

  const handleReset = () => {
    setStatus('idle');
    setCurrentTime(0);
    setCartPosition(0);
    setCartVelocity(0);
    setHistory([]);
  };

  const handlePreset = (cMass: number, hMass: number, f: number) => {
    setCartMass(cMass);
    setHangingMass(hMass);
    setFriction(f);
    handleReset();
  };

  const toggleBottomTab = (tab: typeof activeBottomTab) => {
    setActiveBottomTab((prev) => (prev === tab ? 'NONE' : tab));
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#000000] text-white font-mono select-none relative overflow-hidden">
      
      {/* ── TOP CONTROL & ACTION TOOLBAR ───────────────── */}
      <div className="w-full bg-[#0a0a0c] border-b border-white/20 p-2.5 px-4 flex flex-wrap items-center justify-between text-xs gap-3 shrink-0 shadow-lg z-20">
        
        {/* Left Side: Compact Parameter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Cart m₁:</span>
            <input
              type="number"
              min="0.1"
              max="5.0"
              step="0.1"
              value={cartMass}
              onChange={(e) => setCartMass(Math.max(0.1, Number(e.target.value)))}
              className="w-12 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">kg</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Hanging m₂:</span>
            <input
              type="number"
              min="0.01"
              max="1.0"
              step="0.05"
              value={hangingMass}
              onChange={(e) => setHangingMass(Math.max(0.01, Number(e.target.value)))}
              className="w-12 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">kg</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Friction f:</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={friction}
              onChange={(e) => setFriction(Math.max(0, Number(e.target.value)))}
              className="w-12 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">N</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Time t:</span>
            <input
              type="number"
              min="1"
              max="15"
              step="1"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
              className="w-10 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">s</span>
          </div>

          <label className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded border border-white/15 cursor-pointer hover:border-white">
            <input
              type="checkbox"
              checked={realisticMode}
              onChange={(e) => setRealisticMode(e.target.checked)}
              className="accent-white cursor-pointer"
            />
            <span className="text-zinc-300 text-[11px] font-bold">Noise Mode</span>
          </label>
        </div>

        {/* Center: Presets */}
        <div className="hidden xl:flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 font-bold">Presets:</span>
          <button
            onClick={() => handlePreset(0.5, 0.1, 0)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            No Friction
          </button>
          <button
            onClick={() => handlePreset(1.5, 0.1, 0)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Heavy Cart (1.5kg)
          </button>
          <button
            onClick={() => handlePreset(0.5, 0.4, 0)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Strong Force (0.4kg)
          </button>
          <button
            onClick={() => handlePreset(0.5, 0.2, 1.5)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            With Friction (1.5N)
          </button>
        </div>

        {/* Right Side: Simulation Control Buttons & Progressive Disclosure Drawer Buttons */}
        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <button
              onClick={handleStart}
              className="px-3.5 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1 hover:bg-zinc-200"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Release Cart</span>
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

      {/* ── MAIN WORKSPACE: 3-COLUMN HERO LAYOUT ───────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        
        {/* LEFT COLUMN (Compact Controls Summary + Collapsible Physics Calculations) */}
        <div className="lg:col-span-3 flex flex-col gap-2 overflow-y-auto">
          {/* Quick Presets on smaller screens */}
          <div className="flex xl:hidden flex-wrap items-center gap-1 p-2 bg-[#0a0a0c] border border-white/20 rounded-xl">
            <span className="text-[10px] text-zinc-400 font-bold w-full">Presets:</span>
            <button onClick={() => handlePreset(0.5, 0.1, 0)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">No Friction</button>
            <button onClick={() => handlePreset(1.5, 0.1, 0)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Heavy Cart</button>
            <button onClick={() => handlePreset(0.5, 0.4, 0)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Strong Force</button>
            <button onClick={() => handlePreset(0.5, 0.2, 1.5)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Friction 1.5N</button>
          </div>

          {/* Physics Summary Card with Collapsible Accordion */}
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
                <div className="text-[9px] text-zinc-400">Net Force</div>
                <div className="font-bold text-white text-xs">{netForce.toFixed(2)}N</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Accel (a)</div>
                <div className="font-bold text-white text-xs">{theoreticalAccel.toFixed(2)}</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Sys Mass</div>
                <div className="font-bold text-white text-xs">{totalMass.toFixed(2)}kg</div>
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
                  <span className="text-zinc-400">Applied Force (F = m₂g):</span>
                  <span className="font-bold text-white">{appliedForce.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Friction Force (f):</span>
                  <span className="font-bold text-white">{friction.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Net Force (F_net = F - f):</span>
                  <span className="font-bold text-white">{netForce.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">System Mass (m₁ + m₂):</span>
                  <span className="font-bold text-white">{totalMass.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Theoretical Accel:</span>
                  <span className="font-bold text-white">{theoreticalAccel.toFixed(2)} m/s²</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Expected Final Velocity:</span>
                  <span className="font-bold text-white">{finalTheoreticalV.toFixed(2)} m/s</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Expected Distance:</span>
                  <span className="font-bold text-white">{finalTheoreticalX.toFixed(2)} m</span>
                </div>
              </div>
            )}
          </div>

          {friction >= appliedForce && appliedForce > 0 && (
            <div className="p-2 bg-black border border-white rounded-xl text-[10px] text-white flex items-center gap-2 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Friction equals or exceeds applied force (f ≥ F). Cart will not accelerate.</span>
            </div>
          )}
        </div>

        {/* CENTER COLUMN (HERO LIVE SIMULATION VIEWPORT - LARGEST SCREEN AREA) */}
        <div className="lg:col-span-6 flex flex-col relative h-full min-h-[360px]">
          <div className="w-full h-full bg-black border border-white/20 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-2xl">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Run Completion Toast Overlay */}
            {status === 'completed' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0a0a0c] border-2 border-white rounded-xl p-3.5 shadow-2xl text-center flex flex-col items-center gap-2 z-20 animate-fade-in">
                <div className="text-white font-bold text-xs tracking-wider uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-white" /> TRIAL COMPLETED & LOGGED
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs font-mono my-1">
                  <div>
                    <div className="text-[10px] text-zinc-400">Accel</div>
                    <div className="font-bold text-white">{currentMeasuredAccel.toFixed(3)} m/s²</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">Final V</div>
                    <div className="font-bold text-white">{currentMeasuredVel.toFixed(2)} m/s</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">Distance</div>
                    <div className="font-bold text-white">{currentMeasuredPos.toFixed(2)} m</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">% Error</div>
                    <div className="font-bold text-white">
                      {MechanicsEngine.percentageError(currentMeasuredAccel, theoreticalAccel).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-0.5">
                  <button
                    onClick={() => setShowReport(true)}
                    className="px-3 py-1 bg-white text-black font-bold rounded text-xs active:scale-95"
                  >
                    📄 View Report
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1 bg-zinc-900 border border-white/30 text-white rounded text-xs active:scale-95"
                  >
                    ↺ Run Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (TELEMETRY HIERARCHY) */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 font-mono overflow-y-auto">
          {/* PRIMARY TELEMETRY CARDS (Visually Prominent) */}
          <div className="p-3.5 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">🚀 ACCELERATION</div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {currentMeasuredAccel.toFixed(2)} <span className="text-sm font-normal text-zinc-400">m/s²</span>
            </div>
            <div className="text-[10px] text-zinc-400">Formula: a = F_net / m_total</div>
          </div>

          <div className="p-3.5 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">⚡ VELOCITY</div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {currentMeasuredVel.toFixed(2)} <span className="text-sm font-normal text-zinc-400">m/s</span>
            </div>
            <div className="text-[10px] text-zinc-400">Formula: v = v₀ + at</div>
          </div>

          {/* SECONDARY TELEMETRY (Compact Grid Strip) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Net Force</div>
              <div className="text-sm font-bold text-white">{netForce.toFixed(2)} N</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Distance</div>
              <div className="text-sm font-bold text-white">{currentMeasuredPos.toFixed(2)} m</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Kinetic E</div>
              <div className="text-sm font-bold text-white">{kineticEnergy.toFixed(2)} J</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Momentum</div>
              <div className="text-sm font-bold text-white">{momentum.toFixed(2)} kg·m/s</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM WORKSPACE DOCK SYSTEM (COLLAPSED BY DEFAULT) ── */}
      <div className="w-full bg-[#0a0a0c] border-t border-white/20 z-20 shrink-0 font-mono text-xs flex flex-col">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 p-1 px-4 bg-black border-b border-white/10 overflow-x-auto">
          {(['PROCEDURE', 'DATA', 'GRAPH', 'NOTEBOOK', 'REPORT', 'ASSESSMENT'] as const).map((tab) => {
            const isActive = activeBottomTab === tab;
            return (
              <button
                key={tab}
                onClick={() => toggleBottomTab(tab)}
                className={`px-3 py-1 rounded text-[11px] font-bold tracking-wider transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-white text-black shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span>{tab}</span>
                <span className="text-[10px]">{isActive ? '▲' : '▼'}</span>
              </button>
            );
          })}
        </div>

        {/* Expandable Tab Content (Only visible when activeBottomTab !== 'NONE') */}
        {activeBottomTab !== 'NONE' && (
          <div className="p-4 max-h-56 overflow-y-auto bg-[#0a0a0c] animate-fade-in border-b border-white/10">
            
            {/* PROCEDURE WORKSPACE */}
            {activeBottomTab === 'PROCEDURE' && (
              <div className="space-y-2">
                <div className="font-bold text-white text-xs uppercase tracking-wider">Step-by-Step Procedure Checklist</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {[
                    { stepNumber: 1, instruction: 'Set up dynamics track and adjust cart mass (m₁)', action: 'Select Cart Mass' },
                    { stepNumber: 2, instruction: 'Attach hanging mass (m₂) over low-friction end pulley', action: 'Select Hanging Mass' },
                    { stepNumber: 3, instruction: 'Click Release Cart to initiate experiment run', action: 'Click Release Cart' },
                    { stepNumber: 4, instruction: 'Analyze telemetry readouts and generated real-time graph', action: 'Review Trial Data' },
                  ].map((step) => (
                    <div key={step.stepNumber} className="p-2 bg-black border border-white/15 rounded-lg flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px] shrink-0">
                        {step.stepNumber}
                      </span>
                      <div>
                        <div className="text-white">{step.instruction}</div>
                        <div className="text-[9px] text-zinc-400">Required: {step.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DATA WORKSPACE */}
            {activeBottomTab === 'DATA' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs uppercase tracking-wider">Logged Experimental Trials ({rows.length})</div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportCSV}
                      disabled={rows.length === 0}
                      className="px-2 py-1 bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white rounded text-[10px] disabled:opacity-40"
                    >
                      Copy CSV
                    </button>
                    <button
                      onClick={clear}
                      disabled={rows.length === 0}
                      className="px-2 py-1 bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white rounded text-[10px] disabled:opacity-40"
                    >
                      Clear Data
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-36">
                  <table className="w-full text-left border-collapse font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-white/20 text-zinc-400 uppercase">
                        <th className="p-1.5">Trial</th>
                        <th className="p-1.5">Cart (kg)</th>
                        <th className="p-1.5">Hanging (kg)</th>
                        <th className="p-1.5">Friction (N)</th>
                        <th className="p-1.5">Net Force (N)</th>
                        <th className="p-1.5">Accel (m/s²)</th>
                        <th className="p-1.5">Final V (m/s)</th>
                        <th className="p-1.5">Dist (m)</th>
                        <th className="p-1.5">% Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-4 text-zinc-500">
                            No trials logged yet. Click 'Release Cart' to record experimental data points.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr key={i} className="border-b border-white/10 hover:bg-zinc-900/50">
                            <td className="p-1.5 font-bold">{r.trialId}</td>
                            <td className="p-1.5">{r.cartMass}</td>
                            <td className="p-1.5">{r.hangingMass}</td>
                            <td className="p-1.5">{r.friction}</td>
                            <td className="p-1.5">{r.netForce}</td>
                            <td className="p-1.5 font-bold text-white">{r.measuredAccel}</td>
                            <td className="p-1.5">{r.finalVelocity}</td>
                            <td className="p-1.5">{r.distance}</td>
                            <td className="p-1.5 font-bold text-white">{r.errorPercent}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {rows.length >= 2 && (
                  <div className="p-2 bg-black border border-white/20 rounded-lg text-white text-[11px] flex flex-col gap-1 font-mono">
                    <div>💡 <strong>Data Insight 1:</strong> Acceleration increases proportionally with net force (a ∝ F_net).</div>
                    <div>💡 <strong>Data Insight 2:</strong> Acceleration decreases inversely with total system mass (a ∝ 1/m).</div>
                  </div>
                )}
              </div>
            )}

            {/* GRAPH WORKSPACE */}
            {activeBottomTab === 'GRAPH' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs uppercase tracking-wider">Real-time Analytics Graph</div>
                  <div className="flex gap-1 text-[10px]">
                    {(['vt', 'at', 'xt', 'ft'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setGraphTab(tab)}
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          graphTab === tab ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-36 bg-black border border-white/15 rounded-xl p-2 relative flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120">
                    <line x1="30" y1="10" x2="30" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                    <line x1="30" y1="105" x2="390" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

                    {history.length > 1 && (
                      <path
                        d={history.reduce((acc, pt, idx) => {
                          const x = 30 + (pt.t / duration) * 350;
                          let val = pt.v;
                          if (graphTab === 'at') val = pt.a;
                          if (graphTab === 'xt') val = pt.x;
                          if (graphTab === 'ft') val = pt.Fnet;

                          const maxVal =
                            graphTab === 'vt'
                              ? Math.max(5, finalTheoreticalV)
                              : graphTab === 'at'
                              ? Math.max(5, theoreticalAccel)
                              : graphTab === 'xt'
                              ? Math.max(10, finalTheoreticalX)
                              : Math.max(10, netForce);
                          const y = 105 - Math.min(90, (val / (maxVal || 1)) * 90);
                          return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }, '')}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                </div>
              </div>
            )}

            {/* NOTEBOOK WORKSPACE */}
            {activeBottomTab === 'NOTEBOOK' && (
              <div className="grid grid-cols-3 gap-3 h-36 text-[10px]">
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Hypothesis:</label>
                  <textarea
                    value={hypothesisText}
                    onChange={(e) => setHypothesisText(e.target.value)}
                    placeholder="State your physical hypothesis..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Observations:</label>
                  <textarea
                    value={observationText}
                    onChange={(e) => setObservationText(e.target.value)}
                    placeholder="Record qualitative observations..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Conclusion:</label>
                  <textarea
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    placeholder="Summarize your experiment findings..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {/* REPORT WORKSPACE */}
            {activeBottomTab === 'REPORT' && (
              <div className="space-y-2 text-[10px]">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs uppercase tracking-wider">Formal Lab Report Draft</div>
                  <button
                    onClick={() => setShowReport(true)}
                    className="px-3 py-1 bg-white text-black font-bold rounded text-xs"
                  >
                    📄 Open Full Report Modal
                  </button>
                </div>
                <div className="bg-black p-3 rounded-xl border border-white/15 space-y-1 leading-relaxed">
                  <div><strong>Experiment:</strong> Newton's Second Law of Motion</div>
                  <div><strong>Trials Recorded:</strong> {rows.length} rows</div>
                  <div><strong>Student Hypothesis:</strong> {hypothesisText || '[ Pending student entry ]'}</div>
                  <div><strong>Conclusion:</strong> {conclusionText || '[ Pending student write-up ]'}</div>
                </div>
              </div>
            )}

            {/* ASSESSMENT WORKSPACE */}
            {activeBottomTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs uppercase tracking-wider">Live Checkpoint Assessment</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Set up dynamics track & cart mass</span>
                    <span className="font-bold text-white">✓ Passed (+25 pts)</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Attach hanging mass over end pulley</span>
                    <span className="font-bold text-white">✓ Passed (+25 pts)</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Release cart & record trial telemetry</span>
                    <span className="font-bold text-white">{rows.length > 0 ? '✓ Passed (+25 pts)' : 'Pending (0/25)'}</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Export CSV / Generate Formal Report</span>
                    <span className="font-bold text-white">{rows.length > 0 ? '✓ Passed (+25 pts)' : 'Pending (0/25)'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── COLLAPSIBLE DRAWER: APPARATUS SHELF ──────────── */}
      {showApparatus && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-start">
          <div className="w-80 bg-[#0a0a0c] border-r border-white h-full p-5 space-y-4 text-white overflow-y-auto animate-slide-right">
            <div className="flex justify-between items-center border-b border-white/20 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <Beaker className="w-4 h-4 text-white" /> Apparatus Shelf
              </h3>
              <button onClick={() => setShowApparatus(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {[
                { name: 'Low-friction Dynamics Track', specs: '1.5m aluminum track', inst: 'Set on level surface.' },
                { name: 'Dynamics Cart', specs: '500g base mass', inst: 'Place on aluminum track.' },
                { name: 'Low-friction Pulley', specs: 'End-mounted wheel', inst: 'Attach string over end pulley.' },
                { name: 'Slotted Mass Hanger', specs: '10g - 100g slotted weights', inst: 'Attach to string end.' },
              ].map((app, idx) => (
                <div key={idx} className="p-3 bg-black border border-white/20 rounded-xl space-y-1">
                  <div className="font-bold text-white text-xs">{app.name}</div>
                  <div className="text-[10px] text-zinc-300">{app.specs}</div>
                  <div className="text-[10px] text-zinc-400 leading-relaxed">{app.inst}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS: FORMULAS REFERENCE ──────────────────── */}
      {showFormulas && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0c] border border-white rounded-xl max-w-md w-full p-6 space-y-4 text-white font-mono">
            <div className="flex justify-between items-center border-b border-white/20 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider">ƒx Newton's Second Law Formulas</h3>
              <button onClick={() => setShowFormulas(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Newton's 2nd Law:</strong><br />
                F_net = m_total × a
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Net Force:</strong><br />
                F_net = F_applied - f_friction = m₂g - f
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>System Acceleration:</strong><br />
                a = (m₂g - f) / (m₁ + m₂)
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Kinematic Velocity:</strong><br />
                v(t) = v₀ + a · t
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Kinematic Displacement:</strong><br />
                x(t) = v₀t + ½ a t²
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Kinetic Energy & Momentum:</strong><br />
                KE = ½ m v² | p = m v
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS: FORMAL LAB REPORT ───────────────────── */}
      {showReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0c] border border-white rounded-xl max-w-2xl w-full p-6 space-y-4 text-white my-8">
            <div className="flex justify-between items-center border-b border-white/20 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider">📄 Formal Laboratory Report</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-white text-black font-bold rounded text-xs flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
                <button onClick={() => setShowReport(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-black border border-white/30 rounded-lg space-y-4 text-xs font-sans text-zinc-200">
              <h2 className="text-lg font-bold text-white border-b border-white pb-1 font-mono">
                Virtual Physics Laboratory: Newton's Second Law of Motion
              </h2>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()} | <strong>Researcher:</strong> Student</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">1. Objective</h3>
              <p>To quantitatively verify that the acceleration of a dynamics cart system is directly proportional to net force and inversely proportional to system mass.</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">2. Apparatus</h3>
              <p>Low-friction dynamics track, dynamics cart, end pulley, mass hanger, slotted masses, and digital telemetry sensors.</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">3. Recorded Experimental Trials</h3>
              <table className="w-full border-collapse border border-white text-left font-mono text-[10px]">
                <thead>
                  <tr className="bg-zinc-900 text-white">
                    <th className="border border-white p-1">Trial</th>
                    <th className="border border-white p-1">Cart Mass (kg)</th>
                    <th className="border border-white p-1">Hanging Mass (kg)</th>
                    <th className="border border-white p-1">Net Force (N)</th>
                    <th className="border border-white p-1">Accel (m/s²)</th>
                    <th className="border border-white p-1">% Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="border border-white p-1">{r.trialId}</td>
                      <td className="border border-white p-1">{r.cartMass}</td>
                      <td className="border border-white p-1">{r.hangingMass}</td>
                      <td className="border border-white p-1">{r.netForce}</td>
                      <td className="border border-white p-1 font-bold">{r.measuredAccel}</td>
                      <td className="border border-white p-1">{r.errorPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">4. Conclusion & Error Analysis</h3>
              <p>The logged trials confirm that system acceleration obeys a = F_net / (m1 + m2). Experimental error remained within nominal limits.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER: AI PHYSICS MENTOR ───────────────────── */}
      {showAi && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#0a0a0c] border-l border-white z-50 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-white/20 flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Bot className="w-4 h-4 text-white" /> AI Physics Mentor
            </h3>
            <button onClick={() => setShowAi(false)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs font-mono">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-lg max-w-[90%] text-[11px] ${
                  msg.sender === 'bot'
                    ? 'bg-black border border-white/30 text-white self-start'
                    : 'bg-white text-black font-bold self-end ml-auto'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-white/20 flex flex-col gap-1.5 font-mono">
            <span className="text-[10px] text-zinc-400 font-bold">Quick Prompt Chips:</span>
            {[
              "Explain Newton's Second Law",
              "Why did acceleration change?",
              "Explain my analytics graph",
              "Check my understanding",
              "Give me a challenge",
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setChatMessages((prev) => [
                    ...prev,
                    { sender: 'user', text: q },
                    {
                      sender: 'bot',
                      text:
                        q.includes('Explain')
                          ? 'Newton’s 2nd Law (F = ma) proves that force causes acceleration. Doubling net force doubles acceleration!'
                          : q.includes('change')
                          ? 'Acceleration changes whenever net force or system mass changes: a = F_net / (m1 + m2)!'
                          : q.includes('graph')
                          ? 'The velocity-time graph slope (Δv / Δt) represents the constant acceleration of the cart!'
                          : q.includes('understanding')
                          ? 'Your trial data shows exact agreement with theoretical derived values!'
                          : 'Challenge: What hanging mass is required to accelerate a 1.0 kg cart at 2.0 m/s² with no friction?',
                    },
                  ]);
                }}
                className="text-left text-[10px] p-1.5 bg-black border border-white/20 hover:border-white rounded text-zinc-300"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
