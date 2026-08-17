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
  Beaker,
  Zap,
  CheckCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { useDataLogger } from '../../hooks/useDataLogger';
import { labSound } from '../../utils/LabSoundManager';

interface ProjectileLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const ProjectileLab: React.FC<ProjectileLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
  onBack,
}) => {
  // Sound Enabled State
  const [soundOn, setSoundOn] = useState<boolean>(labSound.isEnabled());

  // Experiment parameters
  const [initialVelocity, setInitialVelocity] = useState<number>(Number(inputs.initialVelocity || 20)); // m/s
  const [launchAngle, setLaunchAngle] = useState<number>(Number(inputs.launchAngle || 45)); // degrees
  const [initialHeight, setInitialHeight] = useState<number>(Number(inputs.initialHeight || 0)); // m
  const [gravity, setGravity] = useState<number>(Number(inputs.gravity || 9.81)); // m/s²
  const [realisticMode, setRealisticMode] = useState<boolean>(false);

  // Run State
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [flightTime, setFlightTime] = useState<number>(0);
  const [projectilePos, setProjectilePos] = useState<{ x: number; y: number }>({ x: 0, y: Number(inputs.initialHeight || 0) });
  const [projectileVel, setProjectileVel] = useState<{ vx: number; vy: number; v: number }>({ vx: 0, vy: 0, v: 0 });

  // Progressive Disclosure Drawer / Accordion States
  const [showApparatus, setShowApparatus] = useState<boolean>(false);
  const [showCalculations, setShowCalculations] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'NOTEBOOK' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showAi, setShowAi] = useState<boolean>(false);
  const [graphTab, setGraphTab] = useState<'yx' | 'yt' | 'vt' | 'vyt'>('yx');

  // Notebook State
  const [hypothesisText, setHypothesisText] = useState('');
  const [observationText, setObservationText] = useState('');
  const [conclusionText, setConclusionText] = useState('');

  // Trajectory Flight History Points
  const [history, setHistory] = useState<Array<{
    t: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    v: number;
  }>>([]);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── PURE PHYSICS CALCULATIONS ─────────────────────────────
  const angleRad = useMemo(() => (launchAngle * Math.PI) / 180, [launchAngle]);
  const vx0 = useMemo(() => initialVelocity * Math.cos(angleRad), [initialVelocity, angleRad]);
  const vy0 = useMemo(() => initialVelocity * Math.sin(angleRad), [initialVelocity, angleRad]);

  // Quadratic time of flight for elevated launch (h0 >= 0)
  const theoreticalTotalTime = useMemo(() => {
    const term = vy0 * vy0 + 2 * gravity * initialHeight;
    return (vy0 + Math.sqrt(Math.max(0, term))) / gravity;
  }, [vy0, gravity, initialHeight]);

  const theoreticalMaxHeight = useMemo(() => {
    return initialHeight + (vy0 * vy0) / (2 * gravity);
  }, [initialHeight, vy0, gravity]);

  const theoreticalPeakTime = useMemo(() => {
    return Math.max(0, vy0 / gravity);
  }, [vy0, gravity]);

  const theoreticalRange = useMemo(() => {
    return vx0 * theoreticalTotalTime;
  }, [vx0, theoreticalTotalTime]);

  const theoreticalImpactVelocity = useMemo(() => {
    const vyImpact = vy0 - gravity * theoreticalTotalTime;
    return Math.sqrt(vx0 * vx0 + vyImpact * vyImpact);
  }, [vx0, vy0, gravity, theoreticalTotalTime]);

  // Sensor Telemetry with Noise
  const currentMeasuredX = useMemo(() => {
    return realisticMode ? MechanicsEngine.addNoise(projectilePos.x, 0.5) : projectilePos.x;
  }, [projectilePos.x, realisticMode]);

  const currentMeasuredY = useMemo(() => {
    return realisticMode ? MechanicsEngine.addNoise(projectilePos.y, 0.5) : projectilePos.y;
  }, [projectilePos.y, realisticMode]);

  const currentMeasuredVel = useMemo(() => {
    return realisticMode ? MechanicsEngine.addNoise(projectileVel.v, 0.8) : projectileVel.v;
  }, [projectileVel.v, realisticMode]);

  // Data Logger
  const { rows, record, clear, exportCSV } = useDataLogger([
    'trialId',
    'initialVelocity',
    'launchAngle',
    'initialHeight',
    'gravity',
    'timeOfFlight',
    'maxHeight',
    'range',
    'vFinal',
  ]);

  // AI Mentor Conversation
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to the Projectile Motion Virtual Laboratory! I am your AI Physics Mentor. Ask me any question about trajectory, launch angles, gravity, or horizontal range!",
    },
  ]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('initialVelocity', initialVelocity);
    onUpdateInput('launchAngle', launchAngle);
    onUpdateInput('initialHeight', initialHeight);
    onUpdateInput('gravity', gravity);
    onUpdateInput('range', theoreticalRange);
    onUpdateInput('maxHeight', theoreticalMaxHeight);
    onUpdateInput('timeOfFlight', theoreticalTotalTime);
  }, [initialVelocity, launchAngle, initialHeight, gravity, theoreticalRange, theoreticalMaxHeight, theoreticalTotalTime, onUpdateInput]);

  // Animation Loop Tick Handler
  const tick = useCallback(
    (dt: number) => {
      if (status !== 'running') return;

      const nextTime = Math.min(flightTime + dt, theoreticalTotalTime);
      setFlightTime(nextTime);

      const x = vx0 * nextTime;
      const y = Math.max(0, initialHeight + vy0 * nextTime - 0.5 * gravity * nextTime * nextTime);
      const vy = vy0 - gravity * nextTime;
      const v = Math.sqrt(vx0 * vx0 + vy * vy);

      setProjectilePos({ x, y });
      setProjectileVel({ vx: vx0, vy, v });

      // Play subtle flight sound periodically
      if (Math.random() < 0.3) {
        labSound.playFlight();
      }

      setHistory((prev) => [
        ...prev,
        {
          t: Number(nextTime.toFixed(2)),
          x: Number((realisticMode ? MechanicsEngine.addNoise(x, 0.5) : x).toFixed(2)),
          y: Number((realisticMode ? MechanicsEngine.addNoise(y, 0.5) : y).toFixed(2)),
          vx: Number(vx0.toFixed(2)),
          vy: Number((realisticMode ? MechanicsEngine.addNoise(vy, 0.8) : vy).toFixed(2)),
          v: Number((realisticMode ? MechanicsEngine.addNoise(v, 0.8) : v).toFixed(2)),
        },
      ]);

      if (nextTime >= theoreticalTotalTime / 2) {
        onCompleteStep(1);
      }

      if (nextTime >= theoreticalTotalTime || (y <= 0 && nextTime > 0.05)) {
        setStatus('completed');
        labSound.playLanding();
        labSound.playDataRecorded();
        labSound.playProcedureCompleted();

        onCompleteStep(2);
        onCompleteStep(3);

        record({
          trialId: rows.length + 1,
          initialVelocity,
          launchAngle,
          initialHeight,
          gravity,
          timeOfFlight: Number(theoreticalTotalTime.toFixed(2)),
          maxHeight: Number(theoreticalMaxHeight.toFixed(2)),
          range: Number(theoreticalRange.toFixed(2)),
          vFinal: Number(theoreticalImpactVelocity.toFixed(2)),
        });

        onRecordDataPoint();

        // AI Challenge Prompt
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `🎯 **Trial #${rows.length + 1} Completed:** Launched at **${launchAngle}°** with **${initialVelocity} m/s**. Horizontal Range reached **${theoreticalRange.toFixed(2)} m**. How would increasing launch height (h₀) affect total range?`,
          },
        ]);
      }
    },
    [
      status,
      flightTime,
      theoreticalTotalTime,
      vx0,
      vy0,
      initialHeight,
      gravity,
      realisticMode,
      onCompleteStep,
      onRecordDataPoint,
      rows.length,
      initialVelocity,
      launchAngle,
      theoreticalMaxHeight,
      theoreticalRange,
      theoreticalImpactVelocity,
      record,
    ]
  );

  useExperimentLoop(tick, status === 'running');

  // Canvas Viewport Renderer (Black & White Aesthetic)
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

    // Ground Plane Surface
    const groundY = H - 50;
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, groundY, W, H - groundY);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Meter Measurement Ticks along Ground Axis
    const maxViewRange = Math.max(40, theoreticalRange * 1.15);
    const pxPerMeter = (W - 100) / maxViewRange;
    const originX = 50;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (let m = 0; m <= maxViewRange; m += 10) {
      const mx = originX + m * pxPerMeter;
      ctx.beginPath();
      ctx.moveTo(mx, groundY);
      ctx.lineTo(mx, groundY + 8);
      ctx.stroke();

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${m}m`, mx, groundY + 20);
    }

    // Elevated Launcher Base Platform
    const maxViewHeight = Math.max(25, theoreticalMaxHeight * 1.25);
    const pxPerMeterY = (groundY - 50) / maxViewHeight;
    const platformY = groundY - initialHeight * pxPerMeterY;

    if (initialHeight > 0) {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(originX - 25, platformY, 50, groundY - platformY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(originX - 25, platformY, 50, groundY - platformY);

      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`h₀=${initialHeight}m`, originX, platformY + 14);
    }

    // Rotating Cannon Barrel
    ctx.save();
    ctx.translate(originX, platformY);
    ctx.rotate((-launchAngle * Math.PI) / 180);

    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, -6, 36, 12, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Launcher Base Pivot Circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(originX, platformY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Angle Arc Indicator (θ)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(originX, platformY, 24, 0, (-launchAngle * Math.PI) / 180, true);
    ctx.stroke();

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '10px monospace';
    ctx.fillText(`${launchAngle}°`, originX + 30, platformY - 10);

    // Full Theoretical Parabolic Curve Guide Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let t = 0; t <= theoreticalTotalTime; t += theoreticalTotalTime / 60) {
      const tx = originX + vx0 * t * pxPerMeter;
      const ty = groundY - Math.max(0, initialHeight + vy0 * t - 0.5 * gravity * t * t) * pxPerMeterY;
      if (t === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Actual Motion Trajectory Path
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    history.forEach((pt, idx) => {
      const hx = originX + pt.x * pxPerMeter;
      const hy = groundY - pt.y * pxPerMeterY;
      if (idx === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    });
    ctx.stroke();

    // Peak Max Height Marker Line & Dot
    const peakX = originX + vx0 * theoreticalPeakTime * pxPerMeter;
    const peakY = groundY - theoreticalMaxHeight * pxPerMeterY;

    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(peakX, groundY);
    ctx.lineTo(peakX, peakY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`H=${theoreticalMaxHeight.toFixed(1)}m`, peakX, peakY - 8);

    // Range Marker Line & Landing Point Dot
    const rangeX = originX + theoreticalRange * pxPerMeter;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rangeX, groundY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 9px monospace';
    ctx.fillText(`R=${theoreticalRange.toFixed(1)}m`, rangeX, groundY + 34);

    // Current Projectile Ball Position & Velocity Vectors
    const currX = originX + projectilePos.x * pxPerMeter;
    const currY = groundY - projectilePos.y * pxPerMeterY;

    if (status === 'running' || status === 'paused' || status === 'completed') {
      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(currX, currY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Velocity Vector Arrow (v)
      if (status === 'running') {
        const arrowScale = 1.2;
        const headLen = 6;
        const vxArrow = projectileVel.vx * arrowScale;
        const vyArrow = -projectileVel.vy * arrowScale;

        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(currX, currY);
        ctx.lineTo(currX + vxArrow, currY + vyArrow);
        ctx.stroke();

        const vAngle = Math.atan2(vyArrow, vxArrow);
        ctx.beginPath();
        ctx.moveTo(currX + vxArrow, currY + vyArrow);
        ctx.lineTo(currX + vxArrow - headLen * Math.cos(vAngle - 0.4), currY + vyArrow - headLen * Math.sin(vAngle - 0.4));
        ctx.lineTo(currX + vxArrow - headLen * Math.cos(vAngle + 0.4), currY + vyArrow - headLen * Math.sin(vAngle + 0.4));
        ctx.fill();

        ctx.font = '9px monospace';
        ctx.fillText(`v=${currentMeasuredVel.toFixed(1)}m/s`, currX + vxArrow + 4, currY + vyArrow - 4);
      }
    }

    // Top Timer & Progress Bar
    const progress = theoreticalTotalTime > 0 ? flightTime / theoreticalTotalTime : 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W * progress, 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${flightTime.toFixed(2)}s / ${theoreticalTotalTime.toFixed(2)}s`, W - 12, 20);

    // Canvas Sensor Readout Overlay (Bottom-Right)
    const ox = W - 160;
    const oy = H - 90;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ox, oy, 150, 80, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('X:', ox + 8, oy + 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${currentMeasuredX.toFixed(2)} m`, ox + 28, oy + 18);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('Y:', ox + 8, oy + 34);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${currentMeasuredY.toFixed(2)} m`, ox + 28, oy + 34);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('v:', ox + 8, oy + 50);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${currentMeasuredVel.toFixed(2)} m/s`, ox + 28, oy + 50);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('t:', ox + 8, oy + 66);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${flightTime.toFixed(2)} s`, ox + 28, oy + 66);
  }, [
    projectilePos,
    projectileVel,
    flightTime,
    launchAngle,
    initialHeight,
    theoreticalTotalTime,
    theoreticalMaxHeight,
    theoreticalPeakTime,
    theoreticalRange,
    vx0,
    vy0,
    gravity,
    history,
    status,
    currentMeasuredX,
    currentMeasuredY,
    currentMeasuredVel,
  ]);

  // Controls Handlers
  const handleLaunch = () => {
    if (status === 'running') return;
    labSound.playLaunch();
    setFlightTime(0);
    setHistory([]);
    setProjectilePos({ x: 0, y: initialHeight });
    setStatus('running');
  };

  const handlePause = () => {
    labSound.playPause();
    setStatus('paused');
  };

  const handleResume = () => {
    labSound.playPause();
    setStatus('running');
  };

  const handleReset = () => {
    labSound.playReset();
    setStatus('idle');
    setFlightTime(0);
    setProjectilePos({ x: 0, y: initialHeight });
    setHistory([]);
  };

  const handlePreset = (u: number, ang: number, h0: number, g: number) => {
    labSound.playReset();
    setInitialVelocity(u);
    setLaunchAngle(ang);
    setInitialHeight(h0);
    setGravity(g);
    handleReset();
  };

  const handleSoundToggle = () => {
    const next = labSound.toggleSound();
    setSoundOn(next);
    if (next) labSound.playPause();
  };

  const toggleBottomTab = (tab: typeof activeBottomTab) => {
    labSound.playPause();
    setActiveBottomTab((prev) => (prev === tab ? 'NONE' : tab));
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#000000] text-white font-mono select-none relative overflow-hidden">
      
      {/* ── TOP CONTROL & ACTION TOOLBAR ───────────────── */}
      <div className="w-full bg-[#0a0a0c] border-b border-white/20 p-2.5 px-4 flex flex-wrap items-center justify-between text-xs gap-3 shrink-0 shadow-lg z-20">
        
        {/* Left Side: Compact Parameter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Speed u:</span>
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={initialVelocity}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < 1 || val > 100) labSound.playInvalidInput();
                setInitialVelocity(Math.max(1, Math.min(100, val)));
              }}
              className="w-12 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">m/s</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Angle θ:</span>
            <input
              type="number"
              min="0"
              max="90"
              step="1"
              value={launchAngle}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < 0 || val > 90) labSound.playInvalidInput();
                setLaunchAngle(Math.min(90, Math.max(0, val)));
              }}
              className="w-10 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">°</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Height h₀:</span>
            <input
              type="number"
              min="0"
              max="50"
              step="1"
              value={initialHeight}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < 0) labSound.playInvalidInput();
                setInitialHeight(Math.max(0, val));
              }}
              className="w-10 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">m</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Gravity g:</span>
            <select
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="bg-transparent text-white font-bold outline-none text-xs cursor-pointer"
            >
              <option value="9.81" className="bg-black text-white">Earth (9.81 m/s²)</option>
              <option value="1.62" className="bg-black text-white">Moon (1.62 m/s²)</option>
              <option value="24.79" className="bg-black text-white">Jupiter (24.79 m/s²)</option>
              <option value="3.71" className="bg-black text-white">Mars (3.71 m/s²)</option>
            </select>
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
            onClick={() => handlePreset(20, 45, 0, 9.81)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            45° Max Range
          </button>
          <button
            onClick={() => handlePreset(20, 60, 0, 9.81)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            High Angle (60°)
          </button>
          <button
            onClick={() => handlePreset(20, 30, 0, 9.81)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Low Angle (30°)
          </button>
          <button
            onClick={() => handlePreset(20, 45, 10, 9.81)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Elevated Launch
          </button>
          <button
            onClick={() => handlePreset(20, 45, 0, 1.62)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Moon Gravity
          </button>
        </div>

        {/* Right Side: Simulation Control Buttons, Sound Toggle & Progressive Disclosure Drawer Buttons */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle Button */}
          <button
            onClick={handleSoundToggle}
            className="px-2.5 py-1.5 bg-zinc-900 border border-white/20 hover:border-white text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1"
            title="Toggle Scientific Sound Layer"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
            <span>Sound: {soundOn ? 'ON' : 'OFF'}</span>
          </button>

          {status === 'idle' && (
            <button
              onClick={handleLaunch}
              className="px-3.5 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1 hover:bg-zinc-200"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Launch</span>
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
            title="Reset Launcher"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="h-4 w-[1px] bg-white/20 mx-0.5" />

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
        
        {/* LEFT COLUMN (Controls Summary & Derived Physics Accordion) */}
        <div className="lg:col-span-3 flex flex-col gap-2 overflow-y-auto font-mono text-xs">
          {/* Quick Presets on smaller screens */}
          <div className="flex xl:hidden flex-wrap items-center gap-1 p-2 bg-[#0a0a0c] border border-white/20 rounded-xl">
            <span className="text-[10px] text-zinc-400 font-bold w-full">Presets:</span>
            <button onClick={() => handlePreset(20, 45, 0, 9.81)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">45° Max</button>
            <button onClick={() => handlePreset(20, 60, 0, 9.81)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">60° High</button>
            <button onClick={() => handlePreset(20, 30, 0, 9.81)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">30° Low</button>
            <button onClick={() => handlePreset(20, 45, 10, 9.81)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Elevated</button>
            <button onClick={() => handlePreset(20, 45, 0, 1.62)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Moon g</button>
          </div>

          {/* Derived Physics Card with Collapsible Accordion */}
          <div className="p-3.5 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-2">
            <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1 text-white">
                <Zap className="w-3.5 h-3.5 text-white" /> DERIVED KINEMATICS
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">Theoretical</span>
            </div>

            {/* Compact Derived Physics Summary Grid */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Time (T)</div>
                <div className="font-bold text-white text-xs">{theoreticalTotalTime.toFixed(2)}s</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Max (H)</div>
                <div className="font-bold text-white text-xs">{theoreticalMaxHeight.toFixed(1)}m</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Range (R)</div>
                <div className="font-bold text-white text-xs">{theoreticalRange.toFixed(1)}m</div>
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
                  <span className="text-zinc-400">Horizontal Velocity (v_x):</span>
                  <span className="font-bold text-white">{vx0.toFixed(2)} m/s</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Vertical Speed (v_y0):</span>
                  <span className="font-bold text-white">{vy0.toFixed(2)} m/s</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Time of Flight (T):</span>
                  <span className="font-bold text-white">{theoreticalTotalTime.toFixed(2)} s</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Maximum Altitude (H):</span>
                  <span className="font-bold text-white">{theoreticalMaxHeight.toFixed(2)} m</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Horizontal Range (R):</span>
                  <span className="font-bold text-white">{theoreticalRange.toFixed(2)} m</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Impact Velocity (v_final):</span>
                  <span className="font-bold text-white">{theoreticalImpactVelocity.toFixed(2)} m/s</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN (HERO LIVE SIMULATION VIEWPORT - LARGEST SCREEN AREA) */}
        <div className="lg:col-span-6 flex flex-col relative h-full min-h-[360px]">
          <div className="w-full h-full bg-black border border-white/20 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-2xl">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Run Completion Toast Overlay */}
            {status === 'completed' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0a0a0c] border-2 border-white rounded-xl p-3.5 shadow-2xl text-center flex flex-col items-center gap-2 z-20 animate-fade-in font-mono">
                <div className="text-white font-bold text-xs tracking-wider uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-white" /> LAUNCH COMPLETED & LOGGED
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs font-mono my-1">
                  <div>
                    <div className="text-[10px] text-zinc-400">Time (T)</div>
                    <div className="font-bold text-white">{theoreticalTotalTime.toFixed(2)} s</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">Max (H)</div>
                    <div className="font-bold text-white">{theoreticalMaxHeight.toFixed(2)} m</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">Range (R)</div>
                    <div className="font-bold text-white">{theoreticalRange.toFixed(2)} m</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">Impact v</div>
                    <div className="font-bold text-white">{theoreticalImpactVelocity.toFixed(1)} m/s</div>
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
                    ↺ Launch Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (TELEMETRY HIERARCHY) */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 font-mono overflow-y-auto">
          {/* PRIMARY TELEMETRY CARDS (Visually Prominent) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">POSITION X</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {currentMeasuredX.toFixed(2)} <span className="text-xs font-normal text-zinc-400">m</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">POSITION Y</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {currentMeasuredY.toFixed(2)} <span className="text-xs font-normal text-zinc-400">m</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">VELOCITY</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {currentMeasuredVel.toFixed(2)} <span className="text-xs font-normal text-zinc-400">m/s</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">FLIGHT TIME</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {flightTime.toFixed(2)} <span className="text-xs font-normal text-zinc-400">s</span>
              </div>
            </div>
          </div>

          {/* SECONDARY TELEMETRY (Compact Grid Strip) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Speed v_x</div>
              <div className="text-sm font-bold text-white">{vx0.toFixed(2)} m/s</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Speed v_y</div>
              <div className="text-sm font-bold text-white">{(vy0 - gravity * flightTime).toFixed(2)} m/s</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Max Height</div>
              <div className="text-sm font-bold text-white">{theoreticalMaxHeight.toFixed(2)} m</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Range</div>
              <div className="text-sm font-bold text-white">{theoreticalRange.toFixed(2)} m</div>
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
                    { stepNumber: 1, instruction: 'Set initial launch velocity (u)', action: 'Set velocity' },
                    { stepNumber: 2, instruction: 'Set launch angle (θ) and height (h₀)', action: 'Set angle & height' },
                    { stepNumber: 3, instruction: 'Confirm gravitational constant (g)', action: 'Select gravity' },
                    { stepNumber: 4, instruction: 'Click ▶ Launch to release projectile', action: 'Click Launch' },
                    { stepNumber: 5, instruction: 'Record Time of Flight (T), Max Height (H), Range (R)', action: 'Observe telemetry' },
                    { stepNumber: 6, instruction: 'Repeat trials for 30°, 45°, and 60° launch angles', action: 'Compare ranges' },
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
                  <div className="font-bold text-white text-xs uppercase tracking-wider">Logged Launch Trials ({rows.length})</div>
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
                        <th className="p-1.5">Speed u (m/s)</th>
                        <th className="p-1.5">Angle θ (°)</th>
                        <th className="p-1.5">Height h₀ (m)</th>
                        <th className="p-1.5">Gravity g (m/s²)</th>
                        <th className="p-1.5">Time T (s)</th>
                        <th className="p-1.5">Max H (m)</th>
                        <th className="p-1.5">Range R (m)</th>
                        <th className="p-1.5">Impact v (m/s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-4 text-zinc-500">
                            No trials logged yet. Click 'Launch' to record experimental trajectory points.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr key={i} className="border-b border-white/10 hover:bg-zinc-900/50">
                            <td className="p-1.5 font-bold">{r.trialId}</td>
                            <td className="p-1.5">{r.initialVelocity}</td>
                            <td className="p-1.5 font-bold text-white">{r.launchAngle}°</td>
                            <td className="p-1.5">{r.initialHeight}</td>
                            <td className="p-1.5">{r.gravity}</td>
                            <td className="p-1.5">{r.timeOfFlight}</td>
                            <td className="p-1.5 font-bold text-white">{r.maxHeight}</td>
                            <td className="p-1.5 font-bold text-white">{r.range}</td>
                            <td className="p-1.5">{r.vFinal}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {rows.length >= 2 && (
                  <div className="p-2 bg-black border border-white/20 rounded-lg text-white text-[11px] flex flex-col gap-1 font-mono">
                    <div>💡 <strong>Data Insight 1:</strong> Under equal launch/landing heights (h₀=0), 45° produces maximum horizontal range.</div>
                    <div>💡 <strong>Data Insight 2:</strong> Complementary angles (e.g. 30° and 60°) produce equal ranges under ideal level ground conditions.</div>
                  </div>
                )}
              </div>
            )}

            {/* GRAPH WORKSPACE */}
            {activeBottomTab === 'GRAPH' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs uppercase tracking-wider">Real-Time Analytics Plot</div>
                  <div className="flex gap-1 text-[10px]">
                    {(['yx', 'yt', 'vt', 'vyt'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setGraphTab(tab)}
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          graphTab === tab ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab === 'yx' ? 'Y vs X (Parabola)' : tab === 'yt' ? 'Y vs t' : tab === 'vt' ? 'v vs t' : 'v_y vs t'}
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
                          let xPixel = 30 + (pt.t / theoreticalTotalTime) * 350;
                          let val = pt.y;

                          if (graphTab === 'yx') {
                            xPixel = 30 + (pt.x / Math.max(1, theoreticalRange)) * 350;
                            val = pt.y;
                          }
                          if (graphTab === 'vt') val = pt.v;
                          if (graphTab === 'vyt') val = pt.vy;

                          const maxVal =
                            graphTab === 'yx' || graphTab === 'yt'
                              ? Math.max(10, theoreticalMaxHeight)
                              : graphTab === 'vt'
                              ? Math.max(10, initialVelocity)
                              : Math.max(10, vy0);

                          const yPixel = 105 - Math.min(90, Math.max(0, (val / (maxVal || 1)) * 90));
                          return `${acc} ${idx === 0 ? 'M' : 'L'} ${xPixel} ${yPixel}`;
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
                    placeholder="Predict how angle affects range..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Observations:</label>
                  <textarea
                    value={observationText}
                    onChange={(e) => setObservationText(e.target.value)}
                    placeholder="Record flight curvature & range notes..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Conclusion:</label>
                  <textarea
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    placeholder="Summarize trajectory observations..."
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
                  <div><strong>Experiment:</strong> Projectile Motion — Trajectory & Range</div>
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
                    <span>Demonstrate maximum range at 45° for level launch</span>
                    <span className="font-bold text-white">✓ Passed (+25 pts)</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Observe vertical velocity reaches 0 at peak height</span>
                    <span className="font-bold text-white">✓ Passed (+25 pts)</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Log launch trials across 30°, 45°, 60° angles</span>
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
                { name: 'Spring Launcher Cannon', specs: '0-90° angle adjustment with angle arc', inst: 'Aim cannon to chosen launch angle.' },
                { name: 'Projectile Ball', specs: '100g steel sphere', inst: 'Loads into launcher barrel.' },
                { name: 'Measurement Scale & Grid', specs: 'Meter markings & Range indicators', inst: 'Reads horizontal displacement and peak altitude.' },
                { name: 'Landing Surface', specs: 'Impact detection plane', inst: 'Detects impact point and final velocity.' },
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
              <h3 className="font-bold text-xs uppercase tracking-wider">ƒx Projectile Motion Formulas</h3>
              <button onClick={() => setShowFormulas(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Velocity Components:</strong><br />
                v_x = u cos(θ) | v_y0 = u sin(θ)
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Kinematic Position:</strong><br />
                x(t) = v_x t | y(t) = h₀ + v_y0 t - ½ g t²
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Vertical Velocity:</strong><br />
                v_y(t) = v_y0 - g t
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Time of Flight (Elevated h₀ ≥ 0):</strong><br />
                T = (v_y0 + √(v_y0² + 2 g h₀)) / g
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Maximum Altitude (H):</strong><br />
                H = h₀ + (v_y0²) / (2 g)
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Horizontal Range (R):</strong><br />
                R = v_x × T = u² sin(2θ) / g  (for h₀ = 0)
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
                Virtual Physics Laboratory: Projectile Motion Trajectory & Range
              </h2>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()} | <strong>Researcher:</strong> Student</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">1. Objective</h3>
              <p>To quantitatively investigate how launch angle, initial velocity, launch height, and gravity determine projectile trajectory, time of flight, maximum altitude, and horizontal range.</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">2. Apparatus</h3>
              <p>Spring launcher cannon with 0-90° angle arc, 100g projectile ball, measurement grid scale, landing detection plane, and digital sensors.</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">3. Recorded Experimental Trials</h3>
              <table className="w-full border-collapse border border-white text-left font-mono text-[10px]">
                <thead>
                  <tr className="bg-zinc-900 text-white">
                    <th className="border border-white p-1">Trial</th>
                    <th className="border border-white p-1">Speed u (m/s)</th>
                    <th className="border border-white p-1">Angle θ (°)</th>
                    <th className="border border-white p-1">Height h₀ (m)</th>
                    <th className="border border-white p-1">Gravity g</th>
                    <th className="border border-white p-1">Time T (s)</th>
                    <th className="border border-white p-1">Max H (m)</th>
                    <th className="border border-white p-1">Range R (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="border border-white p-1">{r.trialId}</td>
                      <td className="border border-white p-1">{r.initialVelocity}</td>
                      <td className="border border-white p-1">{r.launchAngle}°</td>
                      <td className="border border-white p-1">{r.initialHeight}</td>
                      <td className="border border-white p-1">{r.gravity}</td>
                      <td className="border border-white p-1">{r.timeOfFlight}</td>
                      <td className="border border-white p-1">{r.maxHeight}</td>
                      <td className="border border-white p-1 font-bold">{r.range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">4. Conclusion & Error Analysis</h3>
              <p>The logged trials confirm that maximum horizontal range occurs at θ = 45° for level launches (h₀ = 0). The parabolic trajectory follows 2D kinematic equations with constant horizontal velocity and constant vertical acceleration (-g).</p>
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
              "Explain projectile motion",
              "Why is 45° important?",
              "Explain my trajectory",
              "Why does vertical velocity change?",
              "Why doesn't horizontal velocity change?",
              "Compare my trials",
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
                        q.includes('Explain projectile')
                          ? 'Projectile motion is 2D motion under constant gravity! Horizontal velocity stays constant, while vertical velocity accelerates downward at -g.'
                          : q.includes('45°')
                          ? 'At θ = 45°, sin(2θ) = sin(90°) = 1, which yields the maximum horizontal range R = u²/g for level launches!'
                          : q.includes('trajectory')
                          ? 'The path is a parabola because vertical displacement y is quadratic in time (t²), while x is linear in time (t)!'
                          : q.includes('vertical velocity')
                          ? 'Gravity continuously accelerates the projectile downward, causing v_y to decrease, reach 0 at the peak, and become negative!'
                          : q.includes('horizontal velocity')
                          ? 'Because we ignore air resistance, no horizontal forces act on the projectile (F_x = 0), so v_x stays constant!'
                          : q.includes('Compare')
                          ? `Logged ${rows.length} trials! Compare your ranges at 30° vs 45° vs 60° to observe the symmetry of range.`
                          : 'Challenge: What launch angle θ produces a maximum height equal to half of its horizontal range?',
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
