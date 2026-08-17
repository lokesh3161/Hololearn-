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
  ArrowRight,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { MechanicsEngine } from '../../engines/MechanicsEngine';
import { useExperimentLoop } from '../../hooks/useExperimentLoop';
import { useDataLogger } from '../../hooks/useDataLogger';
import { labSound } from '../../utils/LabSoundManager';

interface MomentumLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const MomentumLab: React.FC<MomentumLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
  onBack,
}) => {
  // Sound Enabled State
  const [soundOn, setSoundOn] = useState<boolean>(labSound.isEnabled());

  // Experiment Parameters
  const [cart1Mass, setCart1Mass] = useState<number>(Number(inputs.cart1Mass || 0.50)); // kg
  const [cart2Mass, setCart2Mass] = useState<number>(Number(inputs.cart2Mass || 0.50)); // kg
  const [cart1Vel, setCart1Vel] = useState<number>(Number(inputs.cart1Vel || 1.00)); // m/s
  const [cart2Vel, setCart2Vel] = useState<number>(Number(inputs.cart2Vel || -1.00)); // m/s
  const [collisionType, setCollisionType] = useState<'elastic' | 'perfectly-inelastic' | 'partially-inelastic'>('elastic');
  const [restitution, setRestitution] = useState<number>(0.50);
  const [realisticMode, setRealisticMode] = useState<boolean>(false);

  // Prediction Mode State
  const [showPredictionModal, setShowPredictionModal] = useState<boolean>(false);
  const [predictedCart1Dir, setPredictedCart1Dir] = useState<'left' | 'stop' | 'right'>('left');
  const [predictedCart2Dir, setPredictedCart2Dir] = useState<'left' | 'stop' | 'right'>('right');
  const [predictedMomentumOutcome, setPredictedMomentumOutcome] = useState<'conserved' | 'changed'>('conserved');
  const [hasSubmittedPrediction, setHasSubmittedPrediction] = useState<boolean>(false);

  // Run State
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [collisionPhase, setCollisionPhase] = useState<'PRE-COLLISION' | 'COLLISION' | 'POST-COLLISION'>('PRE-COLLISION');
  const [time, setTime] = useState<number>(0);
  const [collisionTime, setCollisionTime] = useState<number | null>(null);

  // Cart Positions & Velocities
  const [cart1Pos, setCart1Pos] = useState<number>(0.4); // meters along 2.0m track
  const [cart2Pos, setCart2Pos] = useState<number>(1.6); // meters along 2.0m track
  const [currV1, setCurrV1] = useState<number>(Number(inputs.cart1Vel || 1.00));
  const [currV2, setCurrV2] = useState<number>(Number(inputs.cart2Vel || -1.00));

  // Progressive Disclosure States
  const [showApparatus, setShowApparatus] = useState<boolean>(false);
  const [showCalculations, setShowCalculations] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'NOTEBOOK' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showAi, setShowAi] = useState<boolean>(false);
  const [graphTab, setGraphTab] = useState<'ptotal' | 'velocities' | 'ke' | 'positions'>('ptotal');

  // Notebook State
  const [hypothesisText, setHypothesisText] = useState('');
  const [observationText, setObservationText] = useState('');
  const [conclusionText, setConclusionText] = useState('');

  // Simulation History for Analytics Graph
  const [history, setHistory] = useState<Array<{
    t: number;
    x1: number;
    x2: number;
    v1: number;
    v2: number;
    p1: number;
    p2: number;
    pTotal: number;
    keTotal: number;
  }>>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── PURE DETERMINISTIC PHYSICS ENGINE ─────────────────────
  const effectiveRestitution = useMemo(() => {
    if (collisionType === 'elastic') return 1.0;
    if (collisionType === 'perfectly-inelastic') return 0.0;
    return restitution;
  }, [collisionType, restitution]);

  // Initial System Physics
  const p1Init = useMemo(() => cart1Mass * cart1Vel, [cart1Mass, cart1Vel]);
  const p2Init = useMemo(() => cart2Mass * cart2Vel, [cart2Mass, cart2Vel]);
  const pTotalInit = useMemo(() => p1Init + p2Init, [p1Init, p2Init]);
  const keInit = useMemo(() => 0.5 * cart1Mass * cart1Vel * cart1Vel + 0.5 * cart2Mass * cart2Vel * cart2Vel, [cart1Mass, cart1Vel, cart2Mass, cart2Vel]);

  // Theoretical Post-Collision Final Velocities
  const { finalV1, finalV2 } = useMemo(() => {
    const m1 = cart1Mass;
    const m2 = cart2Mass;
    const v1 = cart1Vel;
    const v2 = cart2Vel;
    const e = effectiveRestitution;

    if (collisionType === 'perfectly-inelastic') {
      const vCommon = (m1 * v1 + m2 * v2) / (m1 + m2);
      return { finalV1: vCommon, finalV2: vCommon };
    } else {
      const v1Prime = (m1 * v1 + m2 * v2 - m2 * e * (v1 - v2)) / (m1 + m2);
      const v2Prime = (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / (m1 + m2);
      return { finalV1: v1Prime, finalV2: v2Prime };
    }
  }, [cart1Mass, cart2Mass, cart1Vel, cart2Vel, collisionType, effectiveRestitution]);

  // Final System Physics
  const p1Final = useMemo(() => cart1Mass * finalV1, [cart1Mass, finalV1]);
  const p2Final = useMemo(() => cart2Mass * finalV2, [cart2Mass, finalV2]);
  const pTotalFinal = useMemo(() => p1Final + p2Final, [p1Final, p2Final]);
  const keFinal = useMemo(() => 0.5 * cart1Mass * finalV1 * finalV1 + 0.5 * cart2Mass * finalV2 * finalV2, [cart1Mass, finalV1, cart2Mass, finalV2]);

  const momentumErrorPct = useMemo(() => {
    const absInit = Math.abs(pTotalInit);
    if (absInit < 0.001) return Math.abs(pTotalFinal - pTotalInit) * 100;
    return (Math.abs(pTotalFinal - pTotalInit) / absInit) * 100;
  }, [pTotalInit, pTotalFinal]);

  const keChange = useMemo(() => keFinal - keInit, [keFinal, keInit]);

  // Sensor Telemetry with Optional Noise
  const measuredV1 = useMemo(() => (realisticMode ? MechanicsEngine.addNoise(currV1, 0.05) : currV1), [currV1, realisticMode]);
  const measuredV2 = useMemo(() => (realisticMode ? MechanicsEngine.addNoise(currV2, 0.05) : currV2), [currV2, realisticMode]);
  const measuredP1 = useMemo(() => cart1Mass * measuredV1, [cart1Mass, measuredV1]);
  const measuredP2 = useMemo(() => cart2Mass * measuredV2, [cart2Mass, measuredV2]);
  const measuredPTotal = useMemo(() => measuredP1 + measuredP2, [measuredP1, measuredP2]);
  const measuredKETotal = useMemo(() => 0.5 * cart1Mass * measuredV1 * measuredV1 + 0.5 * cart2Mass * measuredV2 * measuredV2, [cart1Mass, measuredV1, cart2Mass, measuredV2]);

  // Data Logger
  const { rows, record, clear, exportCSV } = useDataLogger([
    'trialId',
    'collisionType',
    'm1',
    'm2',
    'v1',
    'v2',
    'v1_final',
    'v2_final',
    'p_init',
    'p_final',
    'p_err',
    'ke_init',
    'ke_final',
  ]);

  // AI Mentor Conversation
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to the 1D Momentum Collision Laboratory! I am your AI Physics Mentor. Ask me any question about linear momentum (p = mv), elastic vs inelastic collisions, or energy loss!",
    },
  ]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('cart1Mass', cart1Mass);
    onUpdateInput('cart2Mass', cart2Mass);
    onUpdateInput('cart1Vel', cart1Vel);
    onUpdateInput('cart2Vel', cart2Vel);
    onUpdateInput('collisionType', collisionType);
    onUpdateInput('restitution', effectiveRestitution);
    onUpdateInput('p_init', pTotalInit);
    onUpdateInput('p_final', pTotalFinal);
  }, [cart1Mass, cart2Mass, cart1Vel, cart2Vel, collisionType, effectiveRestitution, pTotalInit, pTotalFinal, onUpdateInput]);

  // Animation Loop Tick Handler
  const tick = useCallback(
    (dt: number) => {
      if (status !== 'running') return;

      const nextTime = time + dt;
      setTime(nextTime);

      const cartWidthMeters = 0.16; // 16cm cart width in simulation scale
      let nextX1 = cart1Pos + currV1 * dt;
      let nextX2 = cart2Pos + currV2 * dt;

      // Check Collision Event (Front bumper of Cart 1 touches Front bumper of Cart 2)
      const dist = nextX2 - nextX1;

      if (collisionPhase === 'PRE-COLLISION' && dist <= cartWidthMeters) {
        // Collision Triggered!
        setCollisionPhase('COLLISION');
        setCollisionTime(Number(nextTime.toFixed(2)));

        if (collisionType === 'perfectly-inelastic') {
          labSound.playLanding(); // Heavy impact
        } else {
          labSound.playLanding(); // Standard impact
        }

        // Apply Physics Engine Final Velocities
        setCurrV1(finalV1);
        setCurrV2(finalV2);
        setCollisionPhase('POST-COLLISION');

        // Prevent carts from overlapping
        const midPoint = (nextX1 + nextX2) / 2;
        nextX1 = midPoint - cartWidthMeters / 2;
        nextX2 = midPoint + cartWidthMeters / 2;
      }

      // Check Track Boundaries (0.05m left wall, 1.95m right wall)
      if (nextX1 <= 0.05) {
        nextX1 = 0.05;
        if (currV1 < 0) setCurrV1(0);
      }
      if (nextX2 >= 1.95) {
        nextX2 = 1.95;
        if (currV2 > 0) setCurrV2(0);
      }

      setCart1Pos(nextX1);
      setCart2Pos(nextX2);

      // Record History for Real-Time Analytics Graph
      const p1 = cart1Mass * currV1;
      const p2 = cart2Mass * currV2;
      const pTot = p1 + p2;
      const keTot = 0.5 * cart1Mass * currV1 * currV1 + 0.5 * cart2Mass * currV2 * currV2;

      setHistory((prev) => [
        ...prev,
        {
          t: Number(nextTime.toFixed(2)),
          x1: Number(nextX1.toFixed(2)),
          x2: Number(nextX2.toFixed(2)),
          v1: Number(currV1.toFixed(2)),
          v2: Number(currV2.toFixed(2)),
          p1: Number(p1.toFixed(2)),
          p2: Number(p2.toFixed(2)),
          pTotal: Number(pTot.toFixed(2)),
          keTotal: Number(keTot.toFixed(2)),
        },
      ]);

      // Complete run after 3 seconds or carts reaching boundary
      if (nextTime >= 3.0 || (collisionPhase === 'POST-COLLISION' && nextTime - (collisionTime || 0) > 1.5)) {
        setStatus('completed');
        labSound.playDataRecorded();
        labSound.playProcedureCompleted();

        onCompleteStep(1);
        onCompleteStep(2);
        onCompleteStep(3);

        record({
          trialId: rows.length + 1,
          collisionType: collisionType === 'elastic' ? 'Elastic' : collisionType === 'perfectly-inelastic' ? 'Inelastic' : `e=${effectiveRestitution}`,
          m1: cart1Mass,
          m2: cart2Mass,
          v1: cart1Vel,
          v2: cart2Vel,
          v1_final: Number(finalV1.toFixed(2)),
          v2_final: Number(finalV2.toFixed(2)),
          p_init: Number(pTotalInit.toFixed(2)),
          p_final: Number(pTotalFinal.toFixed(2)),
          p_err: Number(momentumErrorPct.toFixed(1)),
          ke_init: Number(keInit.toFixed(2)),
          ke_final: Number(keFinal.toFixed(2)),
        });

        onRecordDataPoint();

        // AI Mentor Prompt
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `🎯 **Trial #${rows.length + 1} Logged:** Mode = **${collisionType}**. Initial Momentum pᵢ = **${pTotalInit.toFixed(2)} kg·m/s**, Final Momentum p_f = **${pTotalFinal.toFixed(2)} kg·m/s** (Error: ${momentumErrorPct.toFixed(1)}%). Kinetic Energy changed by **${keChange.toFixed(2)} J**.`,
          },
        ]);
      }
    },
    [
      status,
      time,
      cart1Pos,
      cart2Pos,
      currV1,
      currV2,
      collisionPhase,
      collisionType,
      finalV1,
      finalV2,
      cart1Mass,
      cart2Mass,
      collisionTime,
      effectiveRestitution,
      pTotalInit,
      pTotalFinal,
      momentumErrorPct,
      keInit,
      keFinal,
      keChange,
      onCompleteStep,
      onRecordDataPoint,
      rows.length,
      cart1Vel,
      cart2Vel,
      record,
    ]
  );

  useExperimentLoop(tick, status === 'running');

  // Canvas Viewport Renderer (Black & White Scientific Aesthetic)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // Pitch Black Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Track Surface Line & Ground Base
    const trackY = H / 2 + 25;
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, trackY, W, H - trackY);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, trackY);
    ctx.lineTo(W - 20, trackY);
    ctx.stroke();

    // Track End Bumpers
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(10, trackY - 45, 10, 45);
    ctx.strokeRect(10, trackY - 45, 10, 45);

    ctx.fillRect(W - 20, trackY - 45, 10, 45);
    ctx.strokeRect(W - 20, trackY - 45, 10, 45);

    // Track Position Ruler Ticks (0.0m to 2.0m)
    const trackStart = 30;
    const trackEnd = W - 30;
    const trackLengthPx = trackEnd - trackStart;
    const pxPerMeter = trackLengthPx / 2.0;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (let m = 0; m <= 2.0; m += 0.2) {
      const tx = trackStart + m * pxPerMeter;
      ctx.beginPath();
      ctx.moveTo(tx, trackY);
      ctx.lineTo(tx, trackY + 8);
      ctx.stroke();

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${m.toFixed(1)}m`, tx, trackY + 20);
    }

    // Render Cart 1 (Left - White Body)
    const cartWidthPx = 70;
    const cartHeightPx = 35;
    const c1X = trackStart + cart1Pos * pxPerMeter - cartWidthPx / 2;
    const c1Y = trackY - cartHeightPx - 6;

    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c1X, c1Y, cartWidthPx, cartHeightPx, 4);
    ctx.fill();
    ctx.stroke();

    // Cart 1 Wheels
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(c1X + 15, trackY - 3, 5, 0, Math.PI * 2);
    ctx.arc(c1X + cartWidthPx - 15, trackY - 3, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cart 1 Text Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CART 1`, c1X + cartWidthPx / 2, c1Y + 14);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(`${cart1Mass.toFixed(2)}kg`, c1X + cartWidthPx / 2, c1Y + 26);

    // Render Cart 2 (Right - Zinc Body)
    const c2X = trackStart + cart2Pos * pxPerMeter - cartWidthPx / 2;
    const c2Y = trackY - cartHeightPx - 6;

    ctx.fillStyle = '#27272a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c2X, c2Y, cartWidthPx, cartHeightPx, 4);
    ctx.fill();
    ctx.stroke();

    // Cart 2 Wheels
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(c2X + 15, trackY - 3, 5, 0, Math.PI * 2);
    ctx.arc(c2X + cartWidthPx - 15, trackY - 3, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cart 2 Text Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CART 2`, c2X + cartWidthPx / 2, c2Y + 14);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(`${cart2Mass.toFixed(2)}kg`, c2X + cartWidthPx / 2, c2Y + 26);

    // Sticking Coupler visual effect for Perfectly Inelastic
    if (collisionType === 'perfectly-inelastic' && collisionPhase === 'POST-COLLISION') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((c1X + cartWidthPx + c2X) / 2 - 4, c1Y + 12, 8, 10);
    }

    // Velocity Arrows for Cart 1 & Cart 2
    const drawArrow = (x: number, y: number, vel: number, label: string) => {
      if (Math.abs(vel) < 0.01) return;
      const arrowLength = Math.min(60, Math.max(20, Math.abs(vel) * 30));
      const dir = vel > 0 ? 1 : -1;
      const startX = x;
      const endX = x + dir * arrowLength;

      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(endX, y);
      ctx.lineTo(endX - dir * 6, y - 4);
      ctx.lineTo(endX - dir * 6, y + 4);
      ctx.fill();

      ctx.font = 'bold 9px monospace';
      ctx.textAlign = dir > 0 ? 'left' : 'right';
      ctx.fillText(`${label}: ${vel.toFixed(2)}m/s`, endX + dir * 4, y + 3);
    };

    drawArrow(c1X + cartWidthPx / 2, c1Y - 12, currV1, 'v₁');
    drawArrow(c2X + cartWidthPx / 2, c2Y - 12, currV2, 'v₂');

    // Collision Event Badge
    if (collisionTime !== null) {
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 65, 12, 130, 22, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`COLLISION @ t = ${collisionTime.toFixed(2)}s`, W / 2, 26);
    }

    // Top Status Indicator (PRE-COLLISION / POST-COLLISION)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`STATUS: ${collisionPhase}`, 20, 24);

    // Canvas Sensor Overlay Box (Bottom Right)
    const ox = W - 180;
    const oy = H - 85;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ox, oy, 170, 75, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('p_total:', ox + 8, oy + 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${measuredPTotal.toFixed(2)} kg·m/s`, ox + 65, oy + 18);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('KE_total:', ox + 8, oy + 34);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${measuredKETotal.toFixed(2)} J`, ox + 65, oy + 34);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('Error:', ox + 8, oy + 50);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${momentumErrorPct.toFixed(1)}%`, ox + 65, oy + 50);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('Time t:', ox + 8, oy + 66);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${time.toFixed(2)} s`, ox + 65, oy + 66);
  }, [
    cart1Pos,
    cart2Pos,
    currV1,
    currV2,
    cart1Mass,
    cart2Mass,
    collisionPhase,
    collisionTime,
    collisionType,
    measuredPTotal,
    measuredKETotal,
    momentumErrorPct,
    time,
  ]);

  // Action Handlers
  const handleLaunch = () => {
    if (status === 'running') return;

    if (!hasSubmittedPrediction) {
      setShowPredictionModal(true);
      return;
    }

    labSound.playLaunch();
    setTime(0);
    setCollisionTime(null);
    setHistory([]);
    setCollisionPhase('PRE-COLLISION');
    setCurrV1(cart1Vel);
    setCurrV2(cart2Vel);
    setCart1Pos(0.4);
    setCart2Pos(1.6);
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
    setCollisionPhase('PRE-COLLISION');
    setTime(0);
    setCollisionTime(null);
    setCart1Pos(0.4);
    setCart2Pos(1.6);
    setCurrV1(cart1Vel);
    setCurrV2(cart2Vel);
    setHistory([]);
  };

  const handlePreset = (m1: number, m2: number, v1: number, v2: number, mode: 'elastic' | 'perfectly-inelastic') => {
    labSound.playReset();
    setCart1Mass(m1);
    setCart2Mass(m2);
    setCart1Vel(v1);
    setCart2Vel(v2);
    setCollisionType(mode);
    setHasSubmittedPrediction(false);
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
      
      {/* ── TOP CONTROL TOOLBAR ───────────────────────── */}
      <div className="w-full bg-[#0a0a0c] border-b border-white/20 p-2.5 px-4 flex flex-wrap items-center justify-between text-xs gap-3 shrink-0 shadow-lg z-20">
        
        {/* Left Side: Parameters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Cart 1 Controls */}
          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">m₁:</span>
            <input
              type="number"
              min="0.1"
              max="2.0"
              step="0.05"
              value={cart1Mass}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < 0.1 || val > 2.0) labSound.playInvalidInput();
                setCart1Mass(Math.max(0.1, Math.min(2.0, val)));
              }}
              className="w-10 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">kg</span>
            <span className="text-zinc-400 font-bold ml-1">v₁:</span>
            <input
              type="number"
              min="-5.0"
              max="5.0"
              step="0.1"
              value={cart1Vel}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCart1Vel(val);
                setCurrV1(val);
              }}
              className="w-12 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">m/s</span>
          </div>

          {/* Cart 2 Controls */}
          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">m₂:</span>
            <input
              type="number"
              min="0.1"
              max="2.0"
              step="0.05"
              value={cart2Mass}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < 0.1 || val > 2.0) labSound.playInvalidInput();
                setCart2Mass(Math.max(0.1, Math.min(2.0, val)));
              }}
              className="w-10 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">kg</span>
            <span className="text-zinc-400 font-bold ml-1">v₂:</span>
            <input
              type="number"
              min="-5.0"
              max="5.0"
              step="0.1"
              value={cart2Vel}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCart2Vel(val);
                setCurrV2(val);
              }}
              className="w-12 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">m/s</span>
          </div>

          {/* Collision Mode Selector */}
          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Collision Mode:</span>
            <select
              value={collisionType}
              onChange={(e) => setCollisionType(e.target.value as any)}
              className="bg-transparent text-white font-bold outline-none text-xs cursor-pointer"
            >
              <option value="elastic" className="bg-black text-white">Elastic (e = 1.0)</option>
              <option value="partially-inelastic" className="bg-black text-white">Partially Inelastic (0 &lt; e &lt; 1)</option>
              <option value="perfectly-inelastic" className="bg-black text-white">Perfectly Inelastic (e = 0)</option>
            </select>
          </div>

          {/* Restitution Slider when Partially Inelastic */}
          {collisionType === 'partially-inelastic' && (
            <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
              <span className="text-zinc-400 font-bold">Restitution e:</span>
              <input
                type="number"
                min="0.0"
                max="1.0"
                step="0.05"
                value={restitution}
                onChange={(e) => setRestitution(Math.max(0, Math.min(1, Number(e.target.value))))}
                className="w-10 bg-transparent text-white font-bold outline-none text-center"
              />
            </div>
          )}

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
            onClick={() => handlePreset(0.5, 0.5, 1.0, -1.0, 'elastic')}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Equal Mass Head-On
          </button>
          <button
            onClick={() => handlePreset(1.0, 0.5, 1.0, 0.0, 'elastic')}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Heavy Hits Light
          </button>
          <button
            onClick={() => handlePreset(0.5, 1.0, 1.0, 0.0, 'elastic')}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Light Hits Heavy
          </button>
          <button
            onClick={() => handlePreset(0.5, 0.5, 1.0, -0.5, 'perfectly-inelastic')}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Sticking Collision
          </button>
        </div>

        {/* Right Side: Action Buttons */}
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

          {!hasSubmittedPrediction && (
            <button
              onClick={() => setShowPredictionModal(true)}
              className="px-3 py-1.5 bg-zinc-900 border border-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-zinc-800"
            >
              <HelpCircle className="w-3.5 h-3.5 text-white" />
              <span>Predict</span>
            </button>
          )}

          {status === 'idle' && (
            <button
              onClick={handleLaunch}
              className="px-3.5 py-1.5 bg-white text-black font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1 hover:bg-zinc-200"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Start Collision</span>
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
            title="Reset Collision Carts"
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
        
        {/* LEFT COLUMN (Controls & Derived Kinematics Accordion) */}
        <div className="lg:col-span-3 flex flex-col gap-2 overflow-y-auto font-mono text-xs">
          {/* Derived Kinematics Card */}
          <div className="p-3.5 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-2">
            <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1 text-white">
                <Zap className="w-3.5 h-3.5 text-white" /> SYSTEM MOMENTUM & ENERGY
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">Theoretical</span>
            </div>

            {/* Compact Derived Summary */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">p_init</div>
                <div className="font-bold text-white text-xs">{pTotalInit.toFixed(2)}</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">p_final</div>
                <div className="font-bold text-white text-xs">{pTotalFinal.toFixed(2)}</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">% Error</div>
                <div className="font-bold text-white text-xs">{momentumErrorPct.toFixed(1)}%</div>
              </div>
            </div>

            {/* Collapsible Accordion Button */}
            <button
              onClick={() => setShowCalculations(!showCalculations)}
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded text-[11px] text-zinc-300 font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <span>{showCalculations ? 'Hide Calculations ↑' : 'View Calculations ↓'}</span>
            </button>

            {/* Expanded Detailed Calculations Accordion */}
            {showCalculations && (
              <div className="space-y-1.5 text-[11px] pt-1 font-mono animate-fade-in border-t border-white/10">
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Initial Momentum (pᵢ):</span>
                  <span className="font-bold text-white">{pTotalInit.toFixed(2)} kg·m/s</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Final Momentum (p_f):</span>
                  <span className="font-bold text-white">{pTotalFinal.toFixed(2)} kg·m/s</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Cart 1 Final Speed (v₁'):</span>
                  <span className="font-bold text-white">{finalV1.toFixed(2)} m/s</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Cart 2 Final Speed (v₂'):</span>
                  <span className="font-bold text-white">{finalV2.toFixed(2)} m/s</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Initial Kinetic Energy (KEᵢ):</span>
                  <span className="font-bold text-white">{keInit.toFixed(2)} J</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Final Kinetic Energy (KE_f):</span>
                  <span className="font-bold text-white">{keFinal.toFixed(2)} J</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Energy Change (ΔKE):</span>
                  <span className="font-bold text-white">{keChange.toFixed(2)} J</span>
                </div>
              </div>
            )}
          </div>

          {/* Student Prediction Summary (if submitted) */}
          {hasSubmittedPrediction && (
            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center justify-between border-b border-white/10 pb-1">
                <span>🎯 Your Prediction</span>
                <span className="text-[9px] text-zinc-400">Inquiry Mode</span>
              </div>
              <div className="text-[10px] space-y-1 text-zinc-300">
                <div>Cart 1 predicted: <strong className="text-white uppercase">{predictedCart1Dir}</strong></div>
                <div>Cart 2 predicted: <strong className="text-white uppercase">{predictedCart2Dir}</strong></div>
                <div>Momentum predicted: <strong className="text-white uppercase">{predictedMomentumOutcome}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* CENTER COLUMN (HERO LIVE SIMULATION VIEWPORT - LARGEST SCREEN AREA) */}
        <div className="lg:col-span-6 flex flex-col relative h-full min-h-[360px]">
          <div className="w-full h-full bg-black border border-white/20 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-2xl">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Run Completion Toast Banner */}
            {status === 'completed' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0a0a0c] border-2 border-white rounded-xl p-3.5 shadow-2xl text-center flex flex-col items-center gap-2 z-20 animate-fade-in font-mono">
                <div className="text-white font-bold text-xs tracking-wider uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-white" /> COLLISION COMPLETED & LOGGED
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs font-mono my-1">
                  <div>
                    <div className="text-[10px] text-zinc-400">p_init</div>
                    <div className="font-bold text-white">{pTotalInit.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">p_final</div>
                    <div className="font-bold text-white">{pTotalFinal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">v₁'</div>
                    <div className="font-bold text-white">{finalV1.toFixed(2)} m/s</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">v₂'</div>
                    <div className="font-bold text-white">{finalV2.toFixed(2)} m/s</div>
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
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">CART 1 VELOCITY</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {measuredV1.toFixed(2)} <span className="text-xs font-normal text-zinc-400">m/s</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">CART 2 VELOCITY</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {measuredV2.toFixed(2)} <span className="text-xs font-normal text-zinc-400">m/s</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">TOTAL MOMENTUM</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {measuredPTotal.toFixed(2)} <span className="text-xs font-normal text-zinc-400">kg·m/s</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">KINETIC ENERGY</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {measuredKETotal.toFixed(2)} <span className="text-xs font-normal text-zinc-400">J</span>
              </div>
            </div>
          </div>

          {/* SECONDARY TELEMETRY (Compact Grid Strip) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Cart 1 Momentum</div>
              <div className="text-sm font-bold text-white">{measuredP1.toFixed(2)} kg·m/s</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Cart 2 Momentum</div>
              <div className="text-sm font-bold text-white">{measuredP2.toFixed(2)} kg·m/s</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Restitution e</div>
              <div className="text-sm font-bold text-white">{effectiveRestitution.toFixed(2)}</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Error %</div>
              <div className="text-sm font-bold text-white">{momentumErrorPct.toFixed(1)}%</div>
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
                <div className="font-bold text-white text-xs uppercase tracking-wider">Step-by-Step Collision Checklist</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {[
                    { stepNumber: 1, instruction: 'Set Cart 1 mass (m₁) and Cart 2 mass (m₂)', action: 'Set masses' },
                    { stepNumber: 2, instruction: 'Set initial velocities v₁ and v₂ with sign (+ right, - left)', action: 'Set velocities' },
                    { stepNumber: 3, instruction: 'Select Collision Mode (Elastic, Inelastic, Restitution e)', action: 'Select mode' },
                    { stepNumber: 4, instruction: 'Click Predict to record your expected outcome', action: 'Submit prediction' },
                    { stepNumber: 5, instruction: 'Click ▶ Start Collision to launch carts', action: 'Run collision' },
                    { stepNumber: 6, instruction: 'Compare total momentum pᵢ and p_f across multiple trials', action: 'Observe conservation' },
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
                  <div className="font-bold text-white text-xs uppercase tracking-wider font-mono">Logged Collision Trials ({rows.length})</div>
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
                        <th className="p-1.5">Mode</th>
                        <th className="p-1.5">m₁ (kg)</th>
                        <th className="p-1.5">m₂ (kg)</th>
                        <th className="p-1.5">v₁ (m/s)</th>
                        <th className="p-1.5">v₂ (m/s)</th>
                        <th className="p-1.5">v₁' (m/s)</th>
                        <th className="p-1.5">v₂' (m/s)</th>
                        <th className="p-1.5">pᵢ</th>
                        <th className="p-1.5">p_f</th>
                        <th className="p-1.5">% Error</th>
                        <th className="p-1.5">KEᵢ (J)</th>
                        <th className="p-1.5">KE_f (J)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="text-center py-4 text-zinc-500">
                            No collision trials logged yet. Click 'Start Collision' to record data points.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr key={i} className="border-b border-white/10 hover:bg-zinc-900/50">
                            <td className="p-1.5 font-bold">{r.trialId}</td>
                            <td className="p-1.5 text-white font-bold">{r.collisionType}</td>
                            <td className="p-1.5">{r.m1}</td>
                            <td className="p-1.5">{r.m2}</td>
                            <td className="p-1.5">{r.v1}</td>
                            <td className="p-1.5">{r.v2}</td>
                            <td className="p-1.5 font-bold text-white">{r.v1_final}</td>
                            <td className="p-1.5 font-bold text-white">{r.v2_final}</td>
                            <td className="p-1.5">{r.p_init}</td>
                            <td className="p-1.5 font-bold text-white">{r.p_final}</td>
                            <td className="p-1.5">{r.p_err}%</td>
                            <td className="p-1.5">{r.ke_init}</td>
                            <td className="p-1.5 font-bold text-white">{r.ke_final}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {rows.length >= 2 && (
                  <div className="p-2 bg-black border border-white/20 rounded-lg text-white text-[11px] flex flex-col gap-1 font-mono">
                    <div>💡 <strong>Insight 1:</strong> Total momentum (p_total) remains constant before and after collisions regardless of collision type.</div>
                    <div>💡 <strong>Insight 2:</strong> Inelastic collisions lose kinetic energy to heat/deformation while preserving momentum!</div>
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
                    {(['ptotal', 'velocities', 'ke', 'positions'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setGraphTab(tab)}
                        className={`px-2 py-0.5 rounded font-bold uppercase ${
                          graphTab === tab ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab === 'ptotal' ? 'Total Momentum vs t' : tab === 'velocities' ? 'v₁ & v₂ vs t' : tab === 'ke' ? 'KE vs t' : 'x₁ & x₂ vs t'}
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
                          const xPixel = 30 + (pt.t / 3.0) * 350;
                          let val = pt.pTotal;

                          if (graphTab === 'velocities') val = pt.v1;
                          if (graphTab === 'ke') val = pt.keTotal;
                          if (graphTab === 'positions') val = pt.x1;

                          const maxVal = Math.max(5, Math.abs(pTotalInit) * 1.5 || 5);
                          const yPixel = 60 - Math.min(45, Math.max(-45, (val / maxVal) * 45));
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
                    placeholder="Predict how mass ratio affects recoil..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Observations:</label>
                  <textarea
                    value={observationText}
                    onChange={(e) => setObservationText(e.target.value)}
                    placeholder="Record collision velocity notes..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Conclusion:</label>
                  <textarea
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    placeholder="Summarize momentum conservation..."
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
                  <div><strong>Experiment:</strong> Conservation of Linear Momentum in 1D Collisions</div>
                  <div><strong>Logged Trials:</strong> {rows.length} rows</div>
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
                    <span>Verify total momentum conservation (p_init ≈ p_final)</span>
                    <span className="font-bold text-white">✓ Passed (+25 pts)</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Demonstrate kinetic energy loss in inelastic collision</span>
                    <span className="font-bold text-white">✓ Passed (+25 pts)</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Log collision trials across elastic and inelastic modes</span>
                    <span className="font-bold text-white">{rows.length > 0 ? '✓ Passed (+25 pts)' : 'Pending (0/25)'}</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Export CSV / Generate Formal Collision Report</span>
                    <span className="font-bold text-white">{rows.length > 0 ? '✓ Passed (+25 pts)' : 'Pending (0/25)'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── MODALS: PREDICTION MODAL ────────────────────── */}
      {showPredictionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0c] border border-white rounded-xl max-w-md w-full p-6 space-y-4 text-white font-mono">
            <div className="flex justify-between items-center border-b border-white/20 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-white" /> Make Your Prediction
              </h3>
              <button onClick={() => setShowPredictionModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">1. Cart 1 Motion Post-Collision:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['left', 'stop', 'right'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setPredictedCart1Dir(dir)}
                      className={`py-1.5 border rounded uppercase font-bold text-[10px] ${
                        predictedCart1Dir === dir ? 'bg-white text-black border-white' : 'bg-black text-zinc-300 border-white/20'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">2. Cart 2 Motion Post-Collision:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['left', 'stop', 'right'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setPredictedCart2Dir(dir)}
                      className={`py-1.5 border rounded uppercase font-bold text-[10px] ${
                        predictedCart2Dir === dir ? 'bg-white text-black border-white' : 'bg-black text-zinc-300 border-white/20'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">3. Total Momentum Outcome:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['conserved', 'changed'] as const).map((outcome) => (
                    <button
                      key={outcome}
                      onClick={() => setPredictedMomentumOutcome(outcome)}
                      className={`py-1.5 border rounded uppercase font-bold text-[10px] ${
                        predictedMomentumOutcome === outcome ? 'bg-white text-black border-white' : 'bg-black text-zinc-300 border-white/20'
                      }`}
                    >
                      {outcome}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setHasSubmittedPrediction(true);
                setShowPredictionModal(false);
                handleLaunch();
              }}
              className="w-full py-2 bg-white text-black font-bold rounded-lg text-xs active:scale-95"
            >
              Submit Prediction & Start Collision ▶
            </button>
          </div>
        </div>
      )}

      {/* ── COLLAPSED DRAWER: APPARATUS SHELF ──────────── */}
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
                { name: 'Low-friction Dynamics Track', specs: '2.0m precision aluminum track with end bumpers', inst: 'Set level on workbench.' },
                { name: 'Dynamics Cart 1 (Left)', specs: 'Base mass m₁, magnetic / Velcro bumpers', inst: 'Launches from left.' },
                { name: 'Dynamics Cart 2 (Right)', specs: 'Base mass m₂, magnetic / Velcro bumpers', inst: 'Launches from right.' },
                { name: 'Dual Motion Photogates', specs: 'Ultrasonic position & velocity sensors', inst: 'Measures pre and post collision velocities.' },
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
              <h3 className="font-bold text-xs uppercase tracking-wider">ƒx 1D Collision Formulas</h3>
              <button onClick={() => setShowFormulas(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Linear Momentum:</strong><br />
                p = m v
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Conservation of Momentum:</strong><br />
                pᵢ = m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂' = p_f
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Coefficient of Restitution (e):</strong><br />
                e = (v₂' - v₁') / (v₁ - v₂)
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Perfectly Inelastic Collision (e = 0):</strong><br />
                v' = (m₁v₁ + m₂v₂) / (m₁ + m₂)
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Kinetic Energy (KE):</strong><br />
                KE = ½ m v² | KEᵢ = ½m₁v₁² + ½m₂v₂²
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
                Virtual Physics Laboratory: Conservation of Linear Momentum in 1D Collisions
              </h2>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()} | <strong>Researcher:</strong> Student</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">1. Objective</h3>
              <p>To experimentally investigate how cart mass, initial velocity, and collision type affect post-collision dynamics while verifying the law of conservation of linear momentum.</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">2. Recorded Collision Trials</h3>
              <table className="w-full border-collapse border border-white text-left font-mono text-[10px]">
                <thead>
                  <tr className="bg-zinc-900 text-white">
                    <th className="border border-white p-1">Trial</th>
                    <th className="border border-white p-1">Mode</th>
                    <th className="border border-white p-1">m₁</th>
                    <th className="border border-white p-1">m₂</th>
                    <th className="border border-white p-1">v₁</th>
                    <th className="border border-white p-1">v₂</th>
                    <th className="border border-white p-1">v₁'</th>
                    <th className="border border-white p-1">v₂'</th>
                    <th className="border border-white p-1">pᵢ</th>
                    <th className="border border-white p-1">p_f</th>
                    <th className="border border-white p-1">% Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="border border-white p-1">{r.trialId}</td>
                      <td className="border border-white p-1">{r.collisionType}</td>
                      <td className="border border-white p-1">{r.m1}</td>
                      <td className="border border-white p-1">{r.m2}</td>
                      <td className="border border-white p-1">{r.v1}</td>
                      <td className="border border-white p-1">{r.v2}</td>
                      <td className="border border-white p-1">{r.v1_final}</td>
                      <td className="border border-white p-1">{r.v2_final}</td>
                      <td className="border border-white p-1">{r.p_init}</td>
                      <td className="border border-white p-1 font-bold">{r.p_final}</td>
                      <td className="border border-white p-1">{r.p_err}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">3. Conclusion</h3>
              <p>Across all logged trials, total linear momentum p_total remained conserved within experimental tolerance. Kinetic energy was conserved during elastic collisions (e=1.0) and transformed into mechanical deformation/heat during inelastic collisions.</p>
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
              "Explain momentum",
              "Why is momentum conserved?",
              "Why did the carts bounce?",
              "Why did kinetic energy change?",
              "Explain my collision",
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
                        q.includes('Explain momentum')
                          ? 'Linear momentum (p = mv) measures an object’s mass in motion. It is a vector quantity with magnitude and direction!'
                          : q.includes('conserved')
                          ? 'According to Newton’s Third Law, internal collision forces between carts are equal and opposite (F₁₂ = -F₂₁), meaning net external impulse is zero!'
                          : q.includes('bounce')
                          ? 'In an elastic collision, springy bumpers store and return mechanical energy, causing the carts to bounce apart with restitution e = 1.0.'
                          : q.includes('kinetic energy')
                          ? 'During inelastic collisions, kinetic energy transforms into internal thermal energy, sound, and structural deformation, though momentum remains 100% conserved!'
                          : q.includes('collision')
                          ? `Logged trial: Initial momentum pᵢ = ${pTotalInit.toFixed(2)} kg·m/s matches final momentum p_f = ${pTotalFinal.toFixed(2)} kg·m/s!`
                          : q.includes('Compare')
                          ? `Compare your trials in the Data tab: notice how p_total is identical in elastic vs inelastic mode!`
                          : 'Challenge: What mass ratio m₁/m₂ causes Cart 1 to come to a complete stop post-collision when Cart 2 is initially stationary?',
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
