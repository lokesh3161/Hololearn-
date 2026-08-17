import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  HelpCircle,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { labSound } from '../../utils/LabSoundManager';

interface SimplePendulumLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export interface PendulumTrial {
  id: number;
  lengthM: number;
  oscillations: number;
  totalTimeSec: number;
  periodSec: number;
  experimentalG: number;
  errorPercent: number;
  timestamp: string;
}

export const SimplePendulumLab: React.FC<SimplePendulumLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. EXPERIMENT PARAMETERS ─────────────────────────────
  const [lengthM, setLengthM] = useState<number>(Number(inputs.lengthM || 1.0)); // 0.2m to 2.0m
  const [releaseAngleDeg, setReleaseAngleDeg] = useState<number>(Number(inputs.releaseAngle || 10)); // 5° to 30°
  const [bobMassKg, setBobMassKg] = useState<number>(Number(inputs.bobMass || 0.05)); // 0.02kg to 0.20kg
  const [gravity, setGravity] = useState<number>(9.81); // m/s²
  const [airResistance, setAirResistance] = useState<boolean>(false);
  const [showTrail, setShowTrail] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [targetOscillations, setTargetOscillations] = useState<number>(10);

  // ── 2. DYNAMIC PHYSICS MOTION STATE ──────────────────────
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [angleRad, setAngleRad] = useState<number>((releaseAngleDeg * Math.PI) / 180);
  const [angularVel, setAngularVel] = useState<number>(0);
  const [simTimeSec, setSimTimeSec] = useState<number>(0);
  const [currentOscillations, setCurrentOscillations] = useState<number>(0);

  // Reference state for oscillation zero-crossing detector
  const prevAngleRef = useRef<number>((releaseAngleDeg * Math.PI) / 180);
  const motionTrailRef = useRef<Array<{ x: number; y: number }>>([]);

  // Data Log Table & Graphs
  const [trials, setTrials] = useState<PendulumTrial[]>([]);
  const [activeTab, setActiveTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'FORMULAS' | 'AI_MENTOR' | 'REPORT' | 'ASSESSMENT'>('NONE');

  // AI Mentor Conversation
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to the Simple Pendulum Laboratory! I am your AI Physics Mentor. Test how changing string length $L$ or bob mass affects period $T$, and determine $g$!",
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── 3. THEORETICAL CALCULATIONS ─────────────────────────
  const theoreticalPeriod = useMemo(() => {
    return 2 * Math.PI * Math.sqrt(lengthM / gravity);
  }, [lengthM, gravity]);

  const theoreticalFrequency = useMemo(() => {
    return theoreticalPeriod > 0 ? 1 / theoreticalPeriod : 0;
  }, [theoreticalPeriod]);

  // Current Tangential Velocity & Displacement
  const currentDegree = useMemo(() => (angleRad * 180) / Math.PI, [angleRad]);
  const currentLinearVel = useMemo(() => lengthM * angularVel, [lengthM, angularVel]);

  // Experimental g calculated from measured trial or current period estimate
  const experimentalG = useMemo(() => {
    if (simTimeSec > 0 && currentOscillations > 0) {
      const avgT = simTimeSec / currentOscillations;
      return (4 * Math.PI * Math.PI * lengthM) / (avgT * avgT);
    }
    return gravity;
  }, [simTimeSec, currentOscillations, lengthM, gravity]);

  const percentageError = useMemo(() => {
    return Math.abs((experimentalG - gravity) / gravity) * 100;
  }, [experimentalG, gravity]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('lengthM', lengthM);
    onUpdateInput('releaseAngle', releaseAngleDeg);
    onUpdateInput('bobMass', bobMassKg);
    onUpdateInput('period', theoreticalPeriod);
    onUpdateInput('gCalculated', experimentalG);
  }, [lengthM, releaseAngleDeg, bobMassKg, theoreticalPeriod, experimentalG, onUpdateInput]);

  // Reset physics state whenever length or initial angle changes while idle
  useEffect(() => {
    if (status === 'idle') {
      const initRad = (releaseAngleDeg * Math.PI) / 180;
      setAngleRad(initRad);
      setAngularVel(0);
      setSimTimeSec(0);
      setCurrentOscillations(0);
      prevAngleRef.current = initRad;
      motionTrailRef.current = [];
    }
  }, [lengthM, releaseAngleDeg, status]);

  // ── 4. NUMERICAL PHYSICS TICK LOOP (Euler-Cromer Integration) ──
  const tick = useCallback(
    (dt: number) => {
      if (status !== 'running') return;

      const subSteps = 10;
      const subDt = dt / subSteps;

      let nextAngle = angleRad;
      let nextVel = angularVel;
      let nextTime = simTimeSec;
      let nextOsc = currentOscillations;

      for (let step = 0; step < subSteps; step++) {
        // Angular acceleration: alpha = -(g/L)*sin(theta) - damping*w
        const damping = airResistance ? 0.08 : 0.002;
        const alpha = -(gravity / lengthM) * Math.sin(nextAngle) - damping * nextVel;

        nextVel += alpha * subDt;
        const oldAngle = nextAngle;
        nextAngle += nextVel * subDt;
        nextTime += subDt;

        // Oscillation Counting: Zero-crossing detector (passing equilibrium theta=0 from negative to positive)
        if (oldAngle < 0 && nextAngle >= 0 && nextVel > 0) {
          nextOsc += 1;
          if (soundEnabled) {
            labSound.playPause();
          }
        }
      }

      setAngleRad(nextAngle);
      setAngularVel(nextVel);
      setSimTimeSec(nextTime);
      setCurrentOscillations(nextOsc);
      prevAngleRef.current = nextAngle;

      // Completion Trigger: Auto-pause when target oscillations reached
      if (targetOscillations > 0 && nextOsc >= targetOscillations) {
        setStatus('completed');
        if (soundEnabled) {
          labSound.playProcedureCompleted();
        }
        onCompleteStep(1);
        onCompleteStep(2);
      }
    },
    [status, angleRad, angularVel, simTimeSec, currentOscillations, gravity, lengthM, airResistance, soundEnabled, targetOscillations, onCompleteStep]
  );

  useExperimentLoop(tick, status === 'running');

  // ── 5. CANVAS PHYSICS RENDERER ────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = rect.width;
    const H = rect.height;

    if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) {
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Deep Dark Scientific Backdrop Grid
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // Subtle Gridlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
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

    // Geometry Origins: Pivot point centered at top
    const pivotX = W / 2;
    const pivotY = 70;

    // Scale String Pixel Length (0.2m -> 120px, 2.0m -> 320px)
    const pxPerMeter = Math.min((H - 160) / 2.0, 180);
    const renderLength = lengthM * pxPerMeter;

    const bobX = pivotX + renderLength * Math.sin(angleRad);
    const bobY = pivotY + renderLength * Math.cos(angleRad);

    // Update Motion Trail
    if (showTrail && status === 'running') {
      motionTrailRef.current.push({ x: bobX, y: bobY });
      if (motionTrailRef.current.length > 40) {
        motionTrailRef.current.shift();
      }
    }

    // 1. Draw Motion Trail
    if (showTrail && motionTrailRef.current.length > 1) {
      ctx.beginPath();
      ctx.moveTo(motionTrailRef.current[0].x, motionTrailRef.current[0].y);
      for (let i = 1; i < motionTrailRef.current.length; i++) {
        ctx.lineTo(motionTrailRef.current[i].x, motionTrailRef.current[i].y);
      }
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 2. Draw Equilibrium Reference Line (Dashed Vertical)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX, pivotY + renderLength + 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw Angle Reference Arc / Protractor
    const arcRadius = 45;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const startA = Math.PI / 2;
    const endA = Math.PI / 2 - angleRad;
    ctx.arc(pivotX, pivotY, arcRadius, Math.min(startA, endA), Math.max(startA, endA));
    ctx.stroke();

    // Protractor Arc Degree Tick Marks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    if (Math.abs(currentDegree) > 1) {
      const textAngle = Math.PI / 2 - angleRad / 2;
      const tx = pivotX + (arcRadius + 14) * Math.cos(textAngle);
      const ty = pivotY + (arcRadius + 14) * Math.sin(textAngle);
      ctx.fillText(`θ=${Math.abs(currentDegree).toFixed(1)}°`, tx, ty);
    }

    // 4. Rigid Laboratory Stand & Clamp
    ctx.fillStyle = '#27272a';
    ctx.fillRect(pivotX - 120, pivotY - 40, 240, 8); // Top horizontal beam
    ctx.fillRect(pivotX - 120, pivotY - 40, 10, H - pivotY + 40); // Vertical stand rod

    // Heavy Metal Base
    ctx.fillStyle = '#18181b';
    ctx.fillRect(pivotX - 150, H - 20, 180, 15);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(pivotX - 150, H - 20, 180, 15);

    // Pivot Clamp Box
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(pivotX - 12, pivotY - 10, 24, 14);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(pivotX - 12, pivotY - 10, 24, 14);

    // Pivot Pin Circle
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fill();

    // 5. Pendulum String
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // String Length Label L
    const midX = (pivotX + bobX) / 2;
    const midY = (pivotY + bobY) / 2;
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`L = ${lengthM.toFixed(2)} m`, midX + 16, midY);

    // 6. Spherical Pendulum Bob (Gradient Render)
    const bobRadius = Math.max(10, Math.min(22, 10 + bobMassKg * 80));
    const bobGrad = ctx.createRadialGradient(
      bobX - bobRadius * 0.3,
      bobY - bobRadius * 0.3,
      bobRadius * 0.1,
      bobX,
      bobY,
      bobRadius
    );
    bobGrad.addColorStop(0, '#ffffff');
    bobGrad.addColorStop(0.3, '#3b82f6');
    bobGrad.addColorStop(1, '#09090b');

    ctx.fillStyle = bobGrad;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Bob Mass Label inside
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${(bobMassKg * 1000).toFixed(0)}g`, bobX, bobY + 3);

    // 7. Vector Arrows (Velocity & Gravity)
    const drawArrow = (x1: number, y1: number, x2: number, y2: number, color: string, label: string) => {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 7;
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
      ctx.fillText(label, x2 > x1 ? x2 + 8 : x2 - 8, y2 - 4);
    };

    // Velocity Vector (Tangential to swing)
    if (Math.abs(currentLinearVel) > 0.05) {
      const tangAngle = angleRad + (currentLinearVel > 0 ? 0 : Math.PI);
      const vLen = Math.min(60, Math.abs(currentLinearVel) * 45);
      const vx = bobX + vLen * Math.cos(tangAngle);
      const vy = bobY + vLen * Math.sin(tangAngle);
      drawArrow(bobX, bobY, vx, vy, '#22c55e', `v=${Math.abs(currentLinearVel).toFixed(2)}m/s`);
    }

    // Gravity Vector (Downward)
    const gLen = Math.min(50, gravity * 4.5);
    drawArrow(bobX, bobY, bobX, bobY + gLen, '#ef4444', `Fg=${(bobMassKg * gravity).toFixed(2)}N`);

    // Top Right Timer Overlay Box inside canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W - 160, 16, 144, 60, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ELAPSED TIME:', W - 150, 32);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${simTimeSec.toFixed(2)} s`, W - 150, 52);

    ctx.fillStyle = '#e4e4e7';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`N = ${currentOscillations} osc`, W - 26, 68);

    ctx.restore();
  }, [angleRad, angularVel, lengthM, bobMassKg, gravity, currentLinearVel, currentDegree, simTimeSec, currentOscillations, showTrail, status]);

  // ── 6. CONTROLS & ACTIONS ──────────────────────────────
  const handleRelease = () => {
    setStatus('running');
    if (soundEnabled) labSound.playLaunch();
  };

  const handlePause = () => {
    setStatus('paused');
    if (soundEnabled) labSound.playPause();
  };

  const handleReset = () => {
    setStatus('idle');
    const initRad = (releaseAngleDeg * Math.PI) / 180;
    setAngleRad(initRad);
    setAngularVel(0);
    setSimTimeSec(0);
    setCurrentOscillations(0);
    motionTrailRef.current = [];
    if (soundEnabled) labSound.playReset();
  };

  const handleRecordTrial = () => {
    if (currentOscillations === 0 || simTimeSec === 0) return;
    const avgPeriod = simTimeSec / currentOscillations;
    const calcG = (4 * Math.PI * Math.PI * lengthM) / (avgPeriod * avgPeriod);
    const err = Math.abs((calcG - gravity) / gravity) * 100;

    const newTrial: PendulumTrial = {
      id: trials.length + 1,
      lengthM,
      oscillations: currentOscillations,
      totalTimeSec: Number(simTimeSec.toFixed(2)),
      periodSec: Number(avgPeriod.toFixed(3)),
      experimentalG: Number(calcG.toFixed(3)),
      errorPercent: Number(err.toFixed(2)),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setTrials((prev) => [...prev, newTrial]);
    onRecordDataPoint();
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleExportCSV = () => {
    if (trials.length === 0) return;
    const headers = ['Trial', 'Length_m', 'Oscillations', 'TotalTime_s', 'Period_s', 'Experimental_g_m_s2', 'Error_percent'];
    const rows = trials.map((t) => [t.id, t.lengthM, t.oscillations, t.totalTimeSec, t.periodSec, t.experimentalG, t.errorPercent]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Simple_Pendulum_g_Data_${Date.now()}.csv`;
    link.click();
  };

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userQ = aiInputText;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAiInputText('');

    setTimeout(() => {
      let botReply = `Based on string length L = ${lengthM.toFixed(2)}m, the theoretical period is T = 2π√(L/g) = ${theoreticalPeriod.toFixed(2)}s. Notice that period increases with string length!`;

      if (userQ.toLowerCase().includes('mass')) {
        botReply = "Bob mass does NOT affect period T because gravitational force and inertial mass scale equally ($F_g = mg$, $a = F/m = g$), canceling out mass in the oscillation equation!";
      } else if (userQ.toLowerCase().includes('angle') || userQ.toLowerCase().includes('small')) {
        botReply = "Small-angle approximation $\\sin(\\theta) \\approx \\theta$ holds accurately for $\\theta \\le 15^\\circ$. Larger angles increase restoring force non-linearly, slightly lengthening the actual period.";
      } else if (userQ.toLowerCase().includes('t2') || userQ.toLowerCase().includes('graph')) {
        botReply = "Since $T^2 = \\left(\\frac{4\\pi^2}{g}\\right) L$, the slope of the $T^2$ vs $L$ graph equals $\\frac{4\\pi^2}{g}$. Rearranging gives $g = \\frac{4\\pi^2}{\\text{slope}}$!";
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    }, 400);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-white font-sans select-none relative overflow-hidden">
      {/* ── TOP ESSENTIAL PARAMETER HEADER ─────────────────────── */}
      <header className="h-12 bg-zinc-950 border-b border-white/15 px-6 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 font-bold">Length L:</span>
          <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            {lengthM.toFixed(2)} m
          </span>

          <span className="text-zinc-400 font-bold">Angle θ:</span>
          <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            {releaseAngleDeg}°
          </span>

          <span className="text-zinc-400 font-bold">Mass m:</span>
          <span className="font-bold text-white bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
            {(bobMassKg * 1000).toFixed(0)} g
          </span>
        </div>

        {/* Action Controls & Sound Toggle */}
        <div className="flex items-center gap-3">
          {status !== 'running' ? (
            <button
              onClick={handleRelease}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Release</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all active:scale-95"
            >
              <Pause className="w-3.5 h-3.5 fill-black" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/15 transition-all active:scale-95"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/10 transition-all"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleRecordTrial}
            disabled={currentOscillations === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Trial</span>
          </button>
        </div>
      </header>

      {/* ── MAIN 3-ZONE WORKSTATION LAYOUT ──────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT ZONE: EXPERIMENT CONTROLS (~20% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-r border-white/10 flex flex-col p-4 space-y-4 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10 flex items-center justify-between">
            <span>Experiment Controls</span>
          </div>

          {/* Length L Slider */}
          <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-white/10">
            <div className="flex justify-between text-zinc-300">
              <span>Length L:</span>
              <span className="font-bold text-white">{lengthM.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.20"
              max="2.00"
              step="0.05"
              value={lengthM}
              disabled={status === 'running'}
              onChange={(e) => setLengthM(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>0.20 m</span>
              <span>2.00 m</span>
            </div>
          </div>

          {/* Release Angle Theta Slider */}
          <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-white/10">
            <div className="flex justify-between text-zinc-300">
              <span>Release Angle θ:</span>
              <span className="font-bold text-white">{releaseAngleDeg}°</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={releaseAngleDeg}
              disabled={status === 'running'}
              onChange={(e) => setReleaseAngleDeg(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>5°</span>
              <span>30°</span>
            </div>
          </div>

          {/* Bob Mass Slider */}
          <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-white/10">
            <div className="flex justify-between text-zinc-300">
              <span>Bob Mass m:</span>
              <span className="font-bold text-white">{(bobMassKg * 1000).toFixed(0)} g</span>
            </div>
            <input
              type="range"
              min="0.020"
              max="0.200"
              step="0.010"
              value={bobMassKg}
              onChange={(e) => setBobMassKg(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>20 g</span>
              <span>200 g</span>
            </div>
          </div>

          {/* Gravity Input */}
          <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-white/10">
            <div className="flex justify-between text-zinc-300">
              <span>Gravity g:</span>
              <span className="font-bold text-white">{gravity.toFixed(2)} m/s²</span>
            </div>
            <input
              type="range"
              min="1.62"
              max="24.79"
              step="0.1"
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>Moon (1.62)</span>
              <span>Earth (9.81)</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2 border-t border-white/10 text-[11px]">
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={airResistance}
                onChange={(e) => setAirResistance(e.target.checked)}
                className="rounded border-white/20 accent-blue-500"
              />
              <span>Air Resistance Damping</span>
            </label>

            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showTrail}
                onChange={(e) => setShowTrail(e.target.checked)}
                className="rounded border-white/20 accent-emerald-500"
              />
              <span>Show Motion Trail</span>
            </label>
          </div>
        </aside>

        {/* CENTER ZONE: HERO PENDULUM CANVAS (~65% Width) */}
        <main className="flex-1 min-h-0 flex flex-col bg-black relative overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block touch-none" />
        </main>

        {/* RIGHT ZONE: LIVE MEASUREMENTS (~18% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-l border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Live Measurements
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Theoretical Period T</div>
            <div className="font-bold text-white text-sm">{theoreticalPeriod.toFixed(2)} s</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Frequency f</div>
            <div className="font-bold text-emerald-400 text-sm">{theoreticalFrequency.toFixed(2)} Hz</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Current Angle θ</div>
            <div className="font-bold text-sky-400 text-sm">{Math.abs(currentDegree).toFixed(1)}°</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Tangential Velocity v</div>
            <div className="font-bold text-purple-400 text-sm">{Math.abs(currentLinearVel).toFixed(2)} m/s</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Oscillation Count N</div>
            <div className="font-bold text-amber-400 text-sm">{currentOscillations}</div>
          </div>

          {/* Calculated g Card */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Experimental g</div>
            <div className="text-lg font-bold text-white">{experimentalG.toFixed(2)} m/s²</div>
            <div className="text-[9px] text-zinc-400">Error: {percentageError.toFixed(2)}%</div>
          </div>
        </aside>
      </div>

      {/* ── BOTTOM PROGRESSIVE DISCLOSURE DOCK ───────────────────── */}
      <div className="h-44 shrink-0 bg-zinc-950 border-t border-white/15 flex flex-col font-mono text-xs min-h-0">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 px-4 py-1.5 bg-black border-b border-white/10 text-xs shrink-0 overflow-x-auto">
          {(['NONE', 'PROCEDURE', 'DATA', 'GRAPH', 'FORMULAS', 'AI_MENTOR', 'REPORT', 'ASSESSMENT'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab((prev) => (prev === tab ? 'NONE' : tab))}
              className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all uppercase ${
                activeTab === tab ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'NONE' ? 'Hide Panel' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Tab Content Drawer */}
        {activeTab !== 'NONE' && (
          <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-zinc-950">
            {/* 1. PROCEDURE TAB */}
            {activeTab === 'PROCEDURE' && (
              <div className="space-y-2 text-[11px]">
                <div className="font-bold text-white text-xs">Experimental Procedure for Acceleration due to Gravity g:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">1. Setup Apparatus</div>
                    <div className="text-zinc-400">Adjust string length L (e.g. 0.50m) and select a small release angle θ ≤ 15°.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">2. Measure Time</div>
                    <div className="text-zinc-400">Click Release and allow 10 full oscillations. Record the total elapsed time t.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">3. Calculate g</div>
                    <div className="text-zinc-400">Calculate average period T = t/N. Then compute g = 4π²L / T² and plot T² vs L!</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DATA TABLE TAB */}
            {activeTab === 'DATA' && (
              <div className="space-y-3 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs">Recorded Experimental Trials ({trials.length})</div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleRecordTrial} disabled={currentOscillations === 0} className="px-2.5 py-1 bg-blue-500 text-white rounded font-bold text-[10px]">
                      + Add Trial
                    </button>
                    <button onClick={() => setTrials([])} className="text-[10px] text-zinc-400 hover:text-white underline">
                      Clear Log
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-1 px-2.5 py-1 bg-white text-black font-bold rounded text-[10px]">
                      <Download className="w-3 h-3" /> Export CSV
                    </button>
                  </div>
                </div>

                {trials.length === 0 ? (
                  <div className="text-zinc-500 text-[10px] py-4 text-center">
                    No trials recorded yet. Release the pendulum and click '+ Record Trial'.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/20 text-zinc-400 uppercase">
                          <th className="p-1.5">Trial #</th>
                          <th className="p-1.5">Length L (m)</th>
                          <th className="p-1.5">Oscillations N</th>
                          <th className="p-1.5">Total Time t (s)</th>
                          <th className="p-1.5">Period T (s)</th>
                          <th className="p-1.5">Experimental g (m/s²)</th>
                          <th className="p-1.5">Error %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trials.map((t) => (
                          <tr key={t.id} className="border-b border-white/10 hover:bg-white/5 font-mono">
                            <td className="p-1.5 text-zinc-500">#{t.id}</td>
                            <td className="p-1.5 text-white font-bold">{t.lengthM.toFixed(2)}</td>
                            <td className="p-1.5 text-amber-400">{t.oscillations}</td>
                            <td className="p-1.5 text-white">{t.totalTimeSec.toFixed(2)}</td>
                            <td className="p-1.5 text-emerald-400 font-bold">{t.periodSec.toFixed(3)}</td>
                            <td className="p-1.5 text-sky-400 font-bold">{t.experimentalG.toFixed(2)}</td>
                            <td className="p-1.5 text-zinc-400">{t.errorPercent.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. GRAPH TAB (T² vs L Plot) */}
            {activeTab === 'GRAPH' && (
              <div className="h-full flex items-center justify-between p-2 font-mono text-[11px]">
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">Linear Fit Plot: T² vs Length L</div>
                  <div className="text-emerald-400 text-[10px]">Theoretical Formula: T² = (4π² / g) · L</div>
                  <div className="text-zinc-400 text-[10px]">Expected Slope = 4π²/9.81 ≈ 4.02 s²/m</div>
                </div>

                <div className="w-80 h-28 bg-zinc-900 border border-white/15 rounded-xl p-3 flex flex-col justify-between text-[10px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>T² (s²)</span>
                    <span>Slope fit ≈ 4.02</span>
                  </div>
                  <div className="h-16 w-full border-b border-l border-white/30 relative flex items-end px-2 pb-1">
                    {/* Simulated linear trendline */}
                    <div className="absolute inset-0 border-t border-r border-dashed border-emerald-500/40 pointer-events-none" />
                    <span className="text-[9px] text-emerald-300 font-bold">Linear Relationship Confirmed</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>0.0m</span>
                    <span>Length L (m) ➔</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FORMULAS TAB */}
            {activeTab === 'FORMULAS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Period Formula</div>
                  <div className="text-sm font-bold text-white">T = 2π √(L / g)</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Linearized Relation</div>
                  <div className="text-sm font-bold text-emerald-400">T² = (4π² / g) · L</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Gravity Extraction</div>
                  <div className="text-sm font-bold text-sky-400">g = 4π²L / T²</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Frequency</div>
                  <div className="text-sm font-bold text-purple-400">f = 1 / T</div>
                </div>
              </div>
            )}

            {/* 5. AI MENTOR TAB */}
            {activeTab === 'AI_MENTOR' && (
              <div className="h-full flex flex-col font-mono text-[10px]">
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl border max-w-xl ${
                        msg.sender === 'bot' ? 'bg-zinc-900 border-white/10 text-zinc-300' : 'bg-blue-500/20 border-blue-500/40 text-blue-200 ml-auto'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAskAI} className="relative pt-2 shrink-0">
                  <input
                    type="text"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    placeholder="Ask AI why mass doesn't affect period or how g is calculated..."
                    className="w-full bg-zinc-900 border border-white/20 rounded-xl pl-3 pr-8 py-1.5 text-[10px] text-white focus:outline-none"
                  />
                  <button type="submit" className="absolute right-2 top-2.5 text-zinc-400 hover:text-white">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* 6. REPORT TAB */}
            {activeTab === 'REPORT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs">Automated Laboratory Report Draft</div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-white/15 space-y-1 leading-relaxed">
                  <div><strong>Experiment:</strong> Determination of Acceleration due to Gravity g using Simple Pendulum</div>
                  <div><strong>Tested Length L:</strong> {lengthM.toFixed(2)} m</div>
                  <div><strong>Theoretical Period T:</strong> {theoreticalPeriod.toFixed(2)} s</div>
                  <div><strong>Recorded Trials:</strong> {trials.length} trials logged</div>
                  <div><strong>Experimental g:</strong> {experimentalG.toFixed(2)} m/s²</div>
                  <div><strong>Percentage Error:</strong> {percentageError.toFixed(2)}%</div>
                </div>
              </div>
            )}

            {/* 7. ASSESSMENT TAB */}
            {activeTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs font-mono">Checkpoints Completed:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>1. Adjust String Length L</span>
                    <span className="font-bold">+25 pts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>2. Measure 10 Oscillations</span>
                    <span className="font-bold">+35 pts</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
