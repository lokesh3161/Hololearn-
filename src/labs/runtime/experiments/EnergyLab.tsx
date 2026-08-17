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
  Flame,
  Zap,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { labSound } from '../../utils/LabSoundManager';

interface EnergyLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export interface EnergyDataRow {
  id: number;
  timeSec: number;
  heightM: number;
  velocityMS: number;
  peJoules: number;
  keJoules: number;
  thermalJoules: number;
  totalEnergyJoules: number;
  timestamp: string;
}

export const EnergyLab: React.FC<EnergyLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. EXPERIMENT PARAMETERS ─────────────────────────────
  const [startHeightM, setStartHeightM] = useState<number>(Number(inputs.startHeight || 1.5)); // 0.5m to 2.5m
  const [ballMassKg, setBallMassKg] = useState<number>(Number(inputs.ballMass || 0.5)); // 0.1kg to 2.0kg
  const [gravity, setGravity] = useState<number>(Number(inputs.gravity || 9.81)); // 1.62 to 24.79 m/s²
  const [frictionPercent, setFrictionPercent] = useState<number>(Number(inputs.frictionPercent || 0)); // 0% to 50%
  const [airResistance, setAirResistance] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // ── 2. DYNAMIC SIMULATION MOTION STATE ────────────────────
  // Position along track x in meters [-W_track, W_track]
  const [posX, setPosX] = useState<number>(-1.5);
  const [velocity, setVelocity] = useState<number>(0);
  const [simTimeSec, setSimTimeSec] = useState<number>(0);
  const [thermalEnergyJoules, setThermalEnergyJoules] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');

  // Track geometry parameters
  const trackWidthM = 1.5; // half-width of U-track

  // Tab & Data State
  const [loggedRows, setLoggedRows] = useState<EnergyDataRow[]>([]);
  const [activeTab, setActiveTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'FORMULAS' | 'AI_MENTOR' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [graphMode, setGraphMode] = useState<'ENERGY_VS_TIME' | 'ENERGY_VS_HEIGHT'>('ENERGY_VS_TIME');

  // Telemetry History for Real-time Graphs
  const [history, setHistory] = useState<Array<{ t: number; h: number; v: number; pe: number; ke: number; total: number; thermal: number }>>([]);

  // AI Mentor Chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to the Conservation of Mechanical Energy Laboratory! Release the ball down the U-shaped track and observe how Potential Energy converts into Kinetic Energy!",
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── 3. PHYSICS & ENERGY CALCULATIONS ─────────────────────
  // Parabolic U-track shape equation: y(x) = startHeight * (x / trackWidth)^2
  const currentHeightM = useMemo(() => {
    const normRatio = posX / trackWidthM;
    return Math.max(0, Math.min(startHeightM, startHeightM * normRatio * normRatio));
  }, [posX, trackWidthM, startHeightM]);

  // Initial Mechanical Energy = m * g * h_start
  const initialEnergyJoules = useMemo(() => {
    return ballMassKg * gravity * startHeightM;
  }, [ballMassKg, gravity, startHeightM]);

  // Current Potential Energy PE = m * g * h
  const currentPE = useMemo(() => {
    return Math.max(0, ballMassKg * gravity * currentHeightM);
  }, [ballMassKg, gravity, currentHeightM]);

  // Current Kinetic Energy KE = 1/2 * m * v^2
  const currentKE = useMemo(() => {
    return Math.max(0, 0.5 * ballMassKg * velocity * velocity);
  }, [ballMassKg, velocity]);

  // Total Mechanical Energy E_mech = PE + KE
  const currentMechanicalEnergy = useMemo(() => {
    return currentPE + currentKE;
  }, [currentPE, currentKE]);

  // Total Energy (including Thermal Energy from friction)
  const currentTotalEnergy = useMemo(() => {
    return currentMechanicalEnergy + thermalEnergyJoules;
  }, [currentMechanicalEnergy, thermalEnergyJoules]);

  // Energy Error (%) against Initial Energy
  const energyErrorPercent = useMemo(() => {
    if (initialEnergyJoules === 0) return 0;
    return Math.abs((currentTotalEnergy - initialEnergyJoules) / initialEnergyJoules) * 100;
  }, [currentTotalEnergy, initialEnergyJoules]);

  // Dynamic Educational Insight Message
  const educationalInsight = useMemo(() => {
    if (frictionPercent > 0 && thermalEnergyJoules > 0.5) {
      return `🔥 Friction is converting mechanical energy into ${thermalEnergyJoules.toFixed(1)} J of Thermal Energy. Notice how total energy remains conserved!`;
    }
    if (currentHeightM > startHeightM * 0.85) {
      return "⛰️ At maximum height, velocity is zero and energy is almost 100% Gravitational Potential Energy (PE = mgh).";
    }
    if (currentHeightM < startHeightM * 0.15) {
      return "⚡ At the lowest point (h ≈ 0), Potential Energy drops to zero and Kinetic Energy reaches maximum speed!";
    }
    if (velocity > 0) {
      return "📈 Moving upward: Kinetic Energy is converting back into Gravitational Potential Energy.";
    }
    return "📉 Moving downward: Gravitational Potential Energy is converting into Kinetic Energy.";
  }, [frictionPercent, thermalEnergyJoules, currentHeightM, startHeightM, velocity]);

  // Synchronize with parent state
  useEffect(() => {
    onUpdateInput('startHeight', startHeightM);
    onUpdateInput('ballMass', ballMassKg);
    onUpdateInput('gravity', gravity);
    onUpdateInput('pe', currentPE);
    onUpdateInput('ke', currentKE);
    onUpdateInput('totalEnergy', currentTotalEnergy);
  }, [startHeightM, ballMassKg, gravity, currentPE, currentKE, currentTotalEnergy, onUpdateInput]);

  // Reset physics state whenever starting height or track parameters change while idle
  useEffect(() => {
    if (status === 'idle') {
      setPosX(-trackWidthM);
      setVelocity(0);
      setSimTimeSec(0);
      setThermalEnergyJoules(0);
      setHistory([]);
    }
  }, [startHeightM, trackWidthM, status]);

  // ── 4. NUMERICAL PHYSICS TICK LOOP (Tangential Track Physics) ──
  const tick = useCallback(
    (dt: number) => {
      if (status !== 'running') return;

      const subSteps = 10;
      const subDt = dt / subSteps;

      let curX = posX;
      let curV = velocity;
      let curThermal = thermalEnergyJoules;
      let curTime = simTimeSec;

      for (let step = 0; step < subSteps; step++) {
        // Track slope dy/dx = 2 * h_start * x / W^2
        const slope = (2 * startHeightM * curX) / (trackWidthM * trackWidthM);
        const theta = Math.atan(slope);

        // Tangential acceleration components
        // a_gravity = -g * sin(theta)
        const aGrav = -gravity * Math.sin(theta);

        // Friction retardation a_friction = -mu * g * cos(theta) * sgn(v)
        const mu = (frictionPercent / 100) * 0.15;
        const sgnV = curV > 0 ? 1 : curV < 0 ? -1 : 0;
        const aFric = -mu * gravity * Math.cos(theta) * sgnV;

        // Air resistance damping
        const aAir = airResistance ? -0.05 * curV : 0;

        const aTotal = aGrav + aFric + aAir;

        curV += aTotal * subDt;
        const deltaS = curV * subDt;
        const deltaX = deltaS * Math.cos(theta);
        curX += deltaX;

        // Bound position within U-track limits [-trackWidthM, trackWidthM]
        if (curX > trackWidthM) {
          curX = trackWidthM;
          curV = -curV * 0.95; // bouncy turning point
        } else if (curX < -trackWidthM) {
          curX = -trackWidthM;
          curV = -curV * 0.95;
        }

        // Calculate thermal energy dissipated by friction
        if (Math.abs(aFric) > 0) {
          const workFric = Math.abs(ballMassKg * aFric * deltaS);
          curThermal += workFric;
        }

        curTime += subDt;
      }

      setPosX(curX);
      setVelocity(curV);
      setThermalEnergyJoules(curThermal);
      setSimTimeSec(curTime);

      // Record History for Graph Plotting
      const hNorm = Math.max(0, startHeightM * (curX / trackWidthM) ** 2);
      const peNorm = Math.max(0, ballMassKg * gravity * hNorm);
      const keNorm = Math.max(0, 0.5 * ballMassKg * curV * curV);

      setHistory((prev) => [
        ...prev.slice(-150),
        {
          t: Number(curTime.toFixed(2)),
          h: Number(hNorm.toFixed(2)),
          v: Number(Math.abs(curV).toFixed(2)),
          pe: Number(peNorm.toFixed(1)),
          ke: Number(keNorm.toFixed(1)),
          total: Number((peNorm + keNorm + curThermal).toFixed(1)),
          thermal: Number(curThermal.toFixed(1)),
        },
      ]);

      if (curTime >= 1.0) {
        onCompleteStep(1);
      }
      if (curTime >= 3.0) {
        onCompleteStep(2);
      }
    },
    [status, posX, velocity, thermalEnergyJoules, simTimeSec, startHeightM, trackWidthM, gravity, frictionPercent, airResistance, ballMassKg, onCompleteStep]
  );

  useExperimentLoop(tick, status === 'running');

  // ── 5. CANVAS U-TRACK & ENERGY BARS RENDERER ─────────────
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

    // Dark Scientific Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // Subtle Grid background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Geometry Mapping: Ground level y=H-60, track width spans W-120
    const marginX = 80;
    const groundY = H - 60;
    const maxTrackH = H - 140;

    const worldToCanvasX = (x: number) => W / 2 + (x / trackWidthM) * (W / 2 - marginX);
    const worldToCanvasY = (y: number) => groundY - (y / 2.5) * maxTrackH;

    // 1. Draw Reference Ground Line & Height Ruler
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(30, groundY);
    ctx.lineTo(W - 30, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Ground Level (y = 0 m)', 35, groundY + 16);

    // Height Scale Ticks on Left
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(45, groundY);
    ctx.lineTo(45, worldToCanvasY(2.5));
    ctx.stroke();

    [0, 0.5, 1.0, 1.5, 2.0, 2.5].forEach((hVal) => {
      const hy = worldToCanvasY(hVal);
      ctx.beginPath();
      ctx.moveTo(40, hy);
      ctx.lineTo(50, hy);
      ctx.stroke();
      ctx.fillStyle = '#71717a';
      ctx.fillText(`${hVal.toFixed(1)}m`, 15, hy + 3);
    });

    // 2. Draw Start Height Reference Line (Dashed Orange)
    const startYPx = worldToCanvasY(startHeightM);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(45, startYPx);
    ctx.lineTo(W - 45, startYPx);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`h_start = ${startHeightM.toFixed(2)} m`, W - 45, startYPx - 6);

    // 3. Draw Metallic U-Track Curves (Outer Thick Pipe & Inner Metallic Rail)
    ctx.beginPath();
    const numPoints = 120;
    for (let i = 0; i <= numPoints; i++) {
      const xVal = -trackWidthM + (i / numPoints) * (2 * trackWidthM);
      const yVal = startHeightM * (xVal / trackWidthM) ** 2;
      const cx = worldToCanvasX(xVal);
      const cy = worldToCanvasY(yVal);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Metallic Support Legs
    [-1.2, -0.6, 0, 0.6, 1.2].forEach((xVal) => {
      const cx = worldToCanvasX(xVal);
      const yVal = startHeightM * (xVal / trackWidthM) ** 2;
      const cy = worldToCanvasY(yVal);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(cx - 2, cy, 4, groundY - cy);
    });

    // 4. Draw Roller Ball / Cart (Spherical Metallic Ball with Radial Glow)
    const ballCx = worldToCanvasX(posX);
    const ballCy = worldToCanvasY(currentHeightM);
    const ballRadius = Math.max(12, Math.min(22, 12 + ballMassKg * 6));

    // Radial gradient glow
    const ballGrad = ctx.createRadialGradient(
      ballCx - ballRadius * 0.3,
      ballCy - ballRadius * 0.3,
      ballRadius * 0.1,
      ballCx,
      ballCy,
      ballRadius
    );
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.4, '#38bdf8');
    ballGrad.addColorStop(1, '#09090b');

    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ballCx, ballCy, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. Draw Tangential Velocity & Gravity Vectors
    if (Math.abs(velocity) > 0.1) {
      const slope = (2 * startHeightM * posX) / (trackWidthM * trackWidthM);
      const theta = Math.atan(slope);
      const vDir = velocity > 0 ? 1 : -1;
      const vLen = Math.min(50, Math.abs(velocity) * 12);

      const vx = ballCx + vLen * Math.cos(theta) * vDir;
      const vy = ballCy - vLen * Math.sin(theta) * vDir;

      // Velocity Arrow (Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ballCx, ballCy);
      ctx.lineTo(vx, vy);
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillText(`v=${Math.abs(velocity).toFixed(2)}m/s`, vx + 4, vy);
    }

    // 6. Draw LIVE CANVAS ENERGY BARS OVERLAY (Top-Left of Canvas)
    const barBoxX = 65;
    const barBoxY = 16;
    const barBoxW = 260;
    const barBoxH = 80;

    ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barBoxX, barBoxY, barBoxW, barBoxH, 8);
    ctx.fill();
    ctx.stroke();

    const maxE = Math.max(1, initialEnergyJoules);
    const drawEnergyBar = (y: number, label: string, value: number, color: string) => {
      const barW = 120;
      const fillW = Math.max(0, Math.min(barW, (value / maxE) * barW));

      ctx.fillStyle = '#a1a1aa';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, barBoxX + 10, y + 10);

      // Track background bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(barBoxX + 85, y + 2, barW, 10, 3);
      ctx.fill();

      // Active energy fill bar
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(barBoxX + 85, y + 2, fillW, 10, 3);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${value.toFixed(1)} J`, barBoxX + 212, y + 10);
    };

    drawEnergyBar(barBoxY + 6, 'PE (mgh)', currentPE, '#f59e0b');
    drawEnergyBar(barBoxY + 24, 'KE (½mv²)', currentKE, '#3b82f6');
    if (frictionPercent > 0) {
      drawEnergyBar(barBoxY + 42, 'Thermal', thermalEnergyJoules, '#ef4444');
      drawEnergyBar(barBoxY + 60, 'Total E', currentTotalEnergy, '#10b981');
    } else {
      drawEnergyBar(barBoxY + 42, 'Total E', currentTotalEnergy, '#10b981');
    }

    ctx.restore();
  }, [posX, currentHeightM, velocity, startHeightM, trackWidthM, ballMassKg, gravity, initialEnergyJoules, currentPE, currentKE, thermalEnergyJoules, currentTotalEnergy, frictionPercent, status]);

  // ── 7. PRESET SELECTORS & HANDLERS ─────────────────────────
  const handleApplyPreset = (preset: 'ideal' | 'lowFriction' | 'highStart' | 'heavyBall') => {
    setStatus('idle');
    setThermalEnergyJoules(0);
    setHistory([]);

    switch (preset) {
      case 'ideal':
        setFrictionPercent(0);
        setAirResistance(false);
        setStartHeightM(1.5);
        setBallMassKg(0.5);
        break;
      case 'lowFriction':
        setFrictionPercent(15);
        setAirResistance(true);
        setStartHeightM(1.5);
        break;
      case 'highStart':
        setStartHeightM(2.2);
        setFrictionPercent(0);
        break;
      case 'heavyBall':
        setBallMassKg(1.5);
        setFrictionPercent(0);
        break;
    }
    if (soundEnabled) labSound.playLensDrag();
  };

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
    setPosX(-trackWidthM);
    setVelocity(0);
    setSimTimeSec(0);
    setThermalEnergyJoules(0);
    setHistory([]);
    if (soundEnabled) labSound.playReset();
  };

  const handleRecordPoint = () => {
    const newRow: EnergyDataRow = {
      id: loggedRows.length + 1,
      timeSec: Number(simTimeSec.toFixed(2)),
      heightM: Number(currentHeightM.toFixed(2)),
      velocityMS: Number(Math.abs(velocity).toFixed(2)),
      peJoules: Number(currentPE.toFixed(1)),
      keJoules: Number(currentKE.toFixed(1)),
      thermalJoules: Number(thermalEnergyJoules.toFixed(1)),
      totalEnergyJoules: Number(currentTotalEnergy.toFixed(1)),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setLoggedRows((prev) => [...prev, newRow]);
    onRecordDataPoint();
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleExportCSV = () => {
    if (loggedRows.length === 0) return;
    const headers = ['Point', 'Time_s', 'Height_m', 'Speed_m_s', 'PE_J', 'KE_J', 'Thermal_J', 'TotalEnergy_J'];
    const csvRows = loggedRows.map((r) => [r.id, r.timeSec, r.heightM, r.velocityMS, r.peJoules, r.keJoules, r.thermalJoules, r.totalEnergyJoules]);
    const csvContent = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Conservation_of_Energy_Data_${Date.now()}.csv`;
    link.click();
  };

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userQ = aiInputText;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAiInputText('');

    setTimeout(() => {
      let botReply = `Currently at height h = ${currentHeightM.toFixed(2)}m and speed v = ${Math.abs(velocity).toFixed(2)}m/s. PE = ${currentPE.toFixed(1)}J and KE = ${currentKE.toFixed(1)}J. Notice that their sum equals Total Energy ${currentTotalEnergy.toFixed(1)}J!`;

      if (userQ.toLowerCase().includes('friction')) {
        botReply = "When friction is enabled, mechanical energy (PE + KE) decreases because work done by friction converts mechanical energy into Thermal Energy. Total energy (Mechanical + Thermal) remains 100% conserved!";
      } else if (userQ.toLowerCase().includes('mass')) {
        botReply = "In frictionless gravity, speed $v = \\sqrt{2g(h_{\\text{start}} - h)}$ is completely independent of mass! However, PE, KE, and Total Energy scale linearly with mass ($m$).";
      } else if (userQ.toLowerCase().includes('lowest') || userQ.toLowerCase().includes('maximum speed')) {
        botReply = "At the lowest point of the track (h = 0), PE drops to 0, so 100% of the initial potential energy has converted into Kinetic Energy, yielding maximum speed!";
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    }, 400);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-white font-sans select-none relative overflow-hidden">
      {/* ── TOP ESSENTIAL PARAMETER HEADER ─────────────────────── */}
      <header className="h-12 bg-zinc-950 border-b border-white/15 px-6 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        {/* Preset Selectors */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-bold mr-1">Presets:</span>
          <button
            onClick={() => handleApplyPreset('ideal')}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
              frictionPercent === 0 ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
            }`}
          >
            Ideal (No Friction)
          </button>
          <button
            onClick={() => handleApplyPreset('lowFriction')}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
              frictionPercent > 0 ? 'bg-amber-500 text-black border-amber-400' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30'
            }`}
          >
            With Friction (15%)
          </button>
          <button
            onClick={() => handleApplyPreset('highStart')}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-white/10 hover:border-white/30 text-[11px]"
          >
            High Start (2.2m)
          </button>
        </div>

        {/* Action Controls & Sound Toggle */}
        <div className="flex items-center gap-3">
          {status !== 'running' ? (
            <button
              onClick={handleRelease}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Release Ball</span>
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
            title="Reset Ball to Top"
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
            onClick={handleRecordPoint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Point</span>
          </button>
        </div>
      </header>

      {/* ── DYNAMIC EDUCATIONAL INSIGHT BANNER ──────────────────── */}
      <div className="bg-zinc-950/80 border-b border-white/10 px-6 py-1.5 text-[11px] font-mono text-emerald-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{educationalInsight}</span>
        </div>
        <span className="text-zinc-500 text-[10px]">E_initial = {initialEnergyJoules.toFixed(1)} J</span>
      </div>

      {/* ── MAIN 3-ZONE WORKSTATION LAYOUT ──────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT ZONE: EXPERIMENT CONTROLS (~20% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-r border-white/10 flex flex-col p-4 space-y-4 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Experiment Controls
          </div>

          {/* Starting Height Slider */}
          <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-white/10">
            <div className="flex justify-between text-zinc-300">
              <span>Starting Height h:</span>
              <span className="font-bold text-white">{startHeightM.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="2.50"
              step="0.05"
              value={startHeightM}
              disabled={status === 'running'}
              onChange={(e) => setStartHeightM(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>0.50 m</span>
              <span>2.50 m</span>
            </div>
          </div>

          {/* Ball Mass Slider */}
          <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-white/10">
            <div className="flex justify-between text-zinc-300">
              <span>Ball Mass m:</span>
              <span className="font-bold text-white">{ballMassKg.toFixed(2)} kg</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="2.00"
              step="0.1"
              value={ballMassKg}
              onChange={(e) => setBallMassKg(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>0.10 kg</span>
              <span>2.00 kg</span>
            </div>
          </div>

          {/* Gravity Slider */}
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
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>Moon (1.62)</span>
              <span>Earth (9.81)</span>
            </div>
          </div>

          {/* Friction Slider */}
          <div className="space-y-1.5 bg-zinc-900/60 p-3 rounded-xl border border-white/10">
            <div className="flex justify-between text-zinc-300">
              <span>Friction μ:</span>
              <span className="font-bold text-amber-400">{frictionPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={frictionPercent}
              onChange={(e) => setFrictionPercent(Number(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>0% (Ideal)</span>
              <span>50% (High)</span>
            </div>
          </div>

          {/* Air Resistance Toggle */}
          <div className="pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={airResistance}
                onChange={(e) => setAirResistance(e.target.checked)}
                className="rounded border-white/20 accent-blue-500"
              />
              <span>Air Drag Damping</span>
            </label>
          </div>
        </aside>

        {/* CENTER ZONE: HERO ROLLER COASTER CANVAS (~65% Width) */}
        <main className="flex-1 min-h-0 flex flex-col bg-black relative overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block touch-none" />
        </main>

        {/* RIGHT ZONE: LIVE MEASUREMENTS (~18% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-l border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Live Telemetry
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Current Height h</div>
            <div className="font-bold text-white text-sm">{currentHeightM.toFixed(2)} m</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Velocity v</div>
            <div className="font-bold text-emerald-400 text-sm">{Math.abs(velocity).toFixed(2)} m/s</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-amber-400 font-bold">Potential Energy (PE)</div>
            <div className="font-bold text-white text-sm">{currentPE.toFixed(1)} J</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-blue-400 font-bold">Kinetic Energy (KE)</div>
            <div className="font-bold text-white text-sm">{currentKE.toFixed(1)} J</div>
          </div>

          {frictionPercent > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-0.5">
              <div className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> Thermal Energy Lost
              </div>
              <div className="font-bold text-white text-sm">{thermalEnergyJoules.toFixed(1)} J</div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Total Mechanical Energy</div>
            <div className="text-lg font-bold text-white">{currentMechanicalEnergy.toFixed(1)} J</div>
            <div className="text-[9px] text-zinc-400">Error: {energyErrorPercent.toFixed(2)}%</div>
          </div>
        </aside>
      </div>

      {/* ── BOTTOM PROGRESSIVE DISCLOSURE DOCK ───────────────────── */}
      <div className="h-44 shrink-0 bg-zinc-950 border-t border-white/15 flex flex-col font-mono text-xs min-h-0">
        {/* Tab Selector Buttons */}
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

        {/* Tab Drawer Body */}
        {activeTab !== 'NONE' && (
          <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-zinc-950">
            {/* 1. PROCEDURE TAB */}
            {activeTab === 'PROCEDURE' && (
              <div className="space-y-2 text-[11px]">
                <div className="font-bold text-white text-xs">Step-by-Step Procedure:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">1. Set Starting Height</div>
                    <div className="text-zinc-400">Adjust starting height h (e.g. 1.50m) and ball mass m. Set friction to 0%.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">2. Observe Energy Conversion</div>
                    <div className="text-zinc-400">Release ball. Watch PE decrease as KE increases while Total Energy remains constant.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">3. Introduce Friction</div>
                    <div className="text-zinc-400">Increase friction to observe mechanical energy transformation into Thermal Energy.</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DATA TABLE TAB */}
            {activeTab === 'DATA' && (
              <div className="space-y-3 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs">Logged Measurements ({loggedRows.length})</div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleRecordPoint} className="px-2.5 py-1 bg-blue-500 text-white rounded font-bold text-[10px]">
                      + Record Point
                    </button>
                    <button onClick={() => setLoggedRows([])} className="text-[10px] text-zinc-400 hover:text-white underline">
                      Clear Log
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-1 px-2.5 py-1 bg-white text-black font-bold rounded text-[10px]">
                      <Download className="w-3 h-3" /> Export CSV
                    </button>
                  </div>
                </div>

                {loggedRows.length === 0 ? (
                  <div className="text-zinc-500 text-[10px] py-4 text-center">
                    No measurements logged yet. Click '+ Record Point' while the ball is moving.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/20 text-zinc-400 uppercase font-mono">
                          <th className="p-1.5">#</th>
                          <th className="p-1.5">Time (s)</th>
                          <th className="p-1.5">Height h (m)</th>
                          <th className="p-1.5">Speed v (m/s)</th>
                          <th className="p-1.5">PE (J)</th>
                          <th className="p-1.5">KE (J)</th>
                          <th className="p-1.5">Thermal (J)</th>
                          <th className="p-1.5">Total E (J)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loggedRows.map((r) => (
                          <tr key={r.id} className="border-b border-white/10 hover:bg-white/5 font-mono">
                            <td className="p-1.5 text-zinc-500">#{r.id}</td>
                            <td className="p-1.5 text-white">{r.timeSec.toFixed(2)}</td>
                            <td className="p-1.5 text-amber-400 font-bold">{r.heightM.toFixed(2)}</td>
                            <td className="p-1.5 text-blue-400 font-bold">{r.velocityMS.toFixed(2)}</td>
                            <td className="p-1.5 text-amber-300">{r.peJoules.toFixed(1)}</td>
                            <td className="p-1.5 text-blue-300">{r.keJoules.toFixed(1)}</td>
                            <td className="p-1.5 text-red-400">{r.thermalJoules.toFixed(1)}</td>
                            <td className="p-1.5 text-emerald-400 font-bold">{r.totalEnergyJoules.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. GRAPH TAB (Energy vs Time & Energy vs Height) */}
            {activeTab === 'GRAPH' && (
              <div className="h-full flex flex-col space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs">Real-Time Energy Curves:</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGraphMode('ENERGY_VS_TIME')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                        graphMode === 'ENERGY_VS_TIME' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      Energy vs Time
                    </button>
                    <button
                      onClick={() => setGraphMode('ENERGY_VS_HEIGHT')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                        graphMode === 'ENERGY_VS_HEIGHT' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      Energy vs Height
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-zinc-900 border border-white/15 rounded-xl p-3 flex items-center justify-between text-[10px]">
                  <div className="space-y-1">
                    <div className="text-amber-400 font-bold">─ PE (Potential Energy)</div>
                    <div className="text-blue-400 font-bold">─ KE (Kinetic Energy)</div>
                    <div className="text-emerald-400 font-bold">─ Total Mechanical Energy</div>
                  </div>
                  <div className="w-80 h-24 border-b border-l border-white/30 relative flex items-end px-2 pb-1">
                    <span className="text-[9px] text-emerald-300 font-bold">
                      {graphMode === 'ENERGY_VS_TIME' ? 'PE drops while KE rises (Sum = Constant)' : 'PE scales linearly with height h'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FORMULAS TAB */}
            {activeTab === 'FORMULAS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-amber-400 font-bold uppercase">Potential Energy</div>
                  <div className="text-sm font-bold text-white">PE = m · g · h</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-blue-400 font-bold uppercase">Kinetic Energy</div>
                  <div className="text-sm font-bold text-white">KE = ½ · m · v²</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-emerald-400 font-bold uppercase">Mechanical Conservation</div>
                  <div className="text-sm font-bold text-emerald-300">E_total = PE + KE</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-purple-400 font-bold uppercase">Speed at Height h</div>
                  <div className="text-sm font-bold text-white">v = √(2g(h_start - h))</div>
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
                    placeholder="Ask why KE is maximum at lowest point or how friction affects mechanical energy..."
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
                  <div><strong>Experiment:</strong> Verification of Conservation of Mechanical Energy</div>
                  <div><strong>Start Height h₀:</strong> {startHeightM.toFixed(2)} m</div>
                  <div><strong>Ball Mass m:</strong> {ballMassKg.toFixed(2)} kg</div>
                  <div><strong>Initial Mechanical Energy:</strong> {initialEnergyJoules.toFixed(1)} J</div>
                  <div><strong>Friction Coefficient:</strong> {frictionPercent}%</div>
                  <div><strong>Logged Data Points:</strong> {loggedRows.length} points</div>
                </div>
              </div>
            )}

            {/* 7. ASSESSMENT TAB */}
            {activeTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs font-mono font-bold">Interactive Quiz Checkpoints:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>1. Release Ball from Start Height</span>
                    <span className="font-bold">+30 pts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>2. Verify PE converts to KE</span>
                    <span className="font-bold">+40 pts</span>
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

// Export alias for native architecture compatibility
export const ConservationOfMechanicalEnergyLab = EnergyLab;
