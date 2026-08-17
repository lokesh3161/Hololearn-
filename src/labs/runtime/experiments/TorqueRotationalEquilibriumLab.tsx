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
  AlertTriangle,
  Compass,
  ArrowRightLeft,
  Target,
  Maximize2,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import type { TorqueEquilibriumConfig } from '../../physics/torqueEquilibrium';
import { torqueEquilibriumConfig } from '../../physics/torqueEquilibrium';
import { labSound } from '../../utils/LabSoundManager';

interface TorqueRotationalEquilibriumLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export interface MassHangerItem {
  id: string;
  massKg: number;
  positionM: number; // -0.48m to +0.48m from center
  angleDeg: number; // 0 to 180 degrees (default 90)
  color: string;
}

export interface TorqueTrialResult {
  trialNumber: number;
  massKg: number;
  positionM: number;
  forceN: number;
  torqueNm: number;
  direction: string;
  isEquilibrium: boolean;
  timestamp: string;
}

export const TorqueRotationalEquilibriumLab: React.FC<TorqueRotationalEquilibriumLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
}) => {
  // ── 1. EXPERIMENT MODE STATE ──────────────────────────────
  const [labMode, setLabMode] = useState<'EXPLORE' | 'CHALLENGE' | 'ANGLE'>('EXPLORE');

  // ── 2. SYSTEM PARAMETERS STATE ────────────────────────────
  const [gravity, setGravity] = useState<number>(Number(inputs.gravity || 9.81));
  const [beamMass, setBeamMass] = useState<number>(0.20); // 0.20 kg
  const beamLength = 1.00; // 1.00 m total (-0.50m to +0.50m)

  // ── 3. MASS HANGERS STATE ─────────────────────────────────
  const [masses, setMasses] = useState<MassHangerItem[]>([
    { id: 'm1', massKg: 0.20, positionM: -0.30, angleDeg: 90, color: '#ec4899' },
    { id: 'm2', massKg: 0.10, positionM: 0.60 > 0.48 ? 0.45 : 0.60, angleDeg: 90, color: '#3b82f6' },
  ]);
  const [selectedMassId, setSelectedMassId] = useState<string>('m1');
  const [isDraggingMassId, setIsDraggingMassId] = useState<string | null>(null);

  // ── 4. ROTATIONAL DYNAMICS ENGINE STATE ───────────────────
  const [beamAngleDeg, setBeamAngleDeg] = useState<number>(0.0);
  const angularVelRef = useRef<number>(0.0);
  const beamAngleRef = useRef<number>(0.0);

  // ── 5. TRIAL LOGS & SYSTEM DATA ─────────────────────────
  const [trialNumber, setTrialNumber] = useState<number>(1);
  const [trials, setTrials] = useState<TorqueTrialResult[]>([]);
  const [activeTab, setActiveTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'FORMULAS' | 'AI_MENTOR' | 'ADVANCED_PHYSICS' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // AI Mentor Chat Messages
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: '👋 Welcome to the Torque & Rotational Equilibrium Laboratory! Drag masses along the meter scale or adjust their values to balance clockwise and anticlockwise torques (τ = r F sin θ).',
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // Challenge Mode Target state
  const [challengeCompleted, setChallengeCompleted] = useState<boolean>(false);

  // ── 6. TORQUE & DYNAMICS CALCULATIONS ─────────────────────
  const torqueState = useMemo(() => {
    let totalAntiTorque = 0; // Anticlockwise (Left side, r < 0)
    let totalClockTorque = 0; // Clockwise (Right side, r > 0)

    masses.forEach((m) => {
      const forceN = m.massKg * gravity;
      const angleRad = (m.angleDeg * Math.PI) / 180;
      const torqueMag = Math.abs(m.positionM) * forceN * Math.sin(angleRad);

      if (m.positionM < 0) {
        totalAntiTorque += torqueMag;
      } else if (m.positionM > 0) {
        totalClockTorque += torqueMag;
      }
    });

    const netTorque = totalAntiTorque - totalClockTorque; // N·m (positive = anticlockwise)

    // Beam Moment of Inertia I = 1/12 * M_beam * L^2 + sum(m_i * r_i^2)
    const iBeam = (1 / 12) * beamMass * Math.pow(beamLength, 2);
    const iMasses = masses.reduce((acc, m) => acc + m.massKg * Math.pow(m.positionM, 2), 0);
    const totalI = iBeam + iMasses;

    const angularAcceleration = netTorque / totalI; // rad/s²
    const isEquilibrium = Math.abs(netTorque) < 0.005;

    return {
      totalAntiTorque: Number(totalAntiTorque.toFixed(3)),
      totalClockTorque: Number(totalClockTorque.toFixed(3)),
      netTorque: Number(netTorque.toFixed(3)),
      totalI: Number(totalI.toFixed(4)),
      angularAcceleration: Number(angularAcceleration.toFixed(2)),
      isEquilibrium,
    };
  }, [masses, gravity, beamMass, beamLength]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('netTorque', torqueState.netTorque);
    onUpdateInput('isEquilibrium', torqueState.isEquilibrium);
    onUpdateInput('beamAngleDeg', Number(beamAngleDeg.toFixed(1)));
  }, [torqueState.netTorque, torqueState.isEquilibrium, beamAngleDeg, onUpdateInput]);

  // ── 7. ROTATIONAL PHYSICS ANIMATION LOOP ──────────────────
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000); // delta time in seconds
      lastTime = now;

      // Dynamics calculation: alpha = tau_net / I
      const alpha = torqueState.netTorque / torqueState.totalI; // rad/s²

      // Update angular velocity with damping
      angularVelRef.current = (angularVelRef.current + alpha * dt) * 0.94; // damping friction

      // Update beam angle (convert rad to deg)
      const nextAngle = beamAngleRef.current + (angularVelRef.current * 180) / Math.PI * dt;

      // Clamp beam angle between -25deg and +25deg (physical stops)
      const clampedAngle = Math.max(-25, Math.min(25, nextAngle));
      beamAngleRef.current = clampedAngle;
      setBeamAngleDeg(clampedAngle);

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [torqueState.netTorque, torqueState.totalI]);

  // Challenge Mode Completion Check
  useEffect(() => {
    if (labMode === 'CHALLENGE' && torqueState.isEquilibrium) {
      setChallengeCompleted(true);
      onCompleteStep(4);
      if (soundEnabled) labSound.playProcedureCompleted();
    }
  }, [labMode, torqueState.isEquilibrium, onCompleteStep, soundEnabled]);

  // ── 8. MASS HANDLERS & DRAGGING ───────────────────────────
  const handleAddMass = () => {
    if (masses.length >= 6) return;
    const newId = `m_${Date.now()}`;
    const colors = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    const newMass: MassHangerItem = {
      id: newId,
      massKg: 0.10,
      positionM: 0.30,
      angleDeg: 90,
      color: colors[masses.length % colors.length],
    };
    setMasses((prev) => [...prev, newMass]);
    setSelectedMassId(newId);
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleRemoveMass = (id: string) => {
    if (masses.length <= 1) return;
    setMasses((prev) => prev.filter((m) => m.id !== id));
    if (selectedMassId === id) {
      setSelectedMassId(masses.find((m) => m.id !== id)?.id || '');
    }
    if (soundEnabled) labSound.playReset();
  };

  const handleUpdateMass = (id: string, field: keyof MassHangerItem, val: number) => {
    setMasses((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  // Drag mass along beam scale
  const beamContainerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedMassId(id);
    setIsDraggingMassId(id);
    if (soundEnabled) labSound.playLensDrag();
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingMassId || !beamContainerRef.current) return;
      const rect = beamContainerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const fraction = Math.max(0.02, Math.min(0.98, relativeX / rect.width));
      // Convert 0..1 fraction to -0.48m .. +0.48m
      const posM = Number(((fraction - 0.5) * 1.0).toFixed(2));

      setMasses((prev) =>
        prev.map((m) => (m.id === isDraggingMassId ? { ...m, positionM: posM } : m))
      );
    },
    [isDraggingMassId]
  );

  const handlePointerUp = () => {
    if (isDraggingMassId) {
      setIsDraggingMassId(null);
    }
  };

  // Reset to default mode
  const handleResetBeam = () => {
    setMasses([
      { id: 'm1', massKg: 0.20, positionM: -0.30, angleDeg: 90, color: '#ec4899' },
      { id: 'm2', massKg: 0.10, positionM: 0.45, angleDeg: 90, color: '#3b82f6' },
    ]);
    angularVelRef.current = 0;
    beamAngleRef.current = 0;
    setBeamAngleDeg(0);
    setChallengeCompleted(false);
    if (soundEnabled) labSound.playReset();
  };

  const handleRecordTrial = () => {
    const activeM = masses.find((m) => m.id === selectedMassId) || masses[0];
    const forceN = activeM.massKg * gravity;
    const torqueNm = Math.abs(activeM.positionM) * forceN * Math.sin((activeM.angleDeg * Math.PI) / 180);

    const newTrial: TorqueTrialResult = {
      trialNumber: trials.length + 1,
      massKg: activeM.massKg,
      positionM: activeM.positionM,
      forceN: Number(forceN.toFixed(2)),
      torqueNm: Number(torqueNm.toFixed(3)),
      direction: activeM.positionM < 0 ? 'Anticlockwise (Left)' : 'Clockwise (Right)',
      isEquilibrium: torqueState.isEquilibrium,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setTrials((prev) => [...prev, newTrial]);
    onRecordDataPoint();
    if (soundEnabled) labSound.playDataRecorded();
  };

  const handleExportCSV = () => {
    if (trials.length === 0) return;
    const headers = ['Trial', 'Mass_kg', 'Position_m', 'Force_N', 'Torque_Nm', 'Direction', 'Equilibrium'];
    const rows = trials.map((t) => [t.trialNumber, t.massKg, t.positionM, t.forceN, t.torqueNm, t.direction, t.isEquilibrium ? 'Yes' : 'No']);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Torque_Equilibrium_Data_${Date.now()}.csv`;
    link.click();
  };

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userQ = aiInputText;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setAiInputText('');

    setTimeout(() => {
      let botReply = `Currently, anticlockwise torque is ${torqueState.totalAntiTorque} N·m and clockwise torque is ${torqueState.totalClockTorque} N·m (Net torque: ${torqueState.netTorque} N·m).`;

      if (userQ.toLowerCase().includes('farther') || userQ.toLowerCase().includes('distance')) {
        botReply = 'Moving a mass farther from the pivot increases the lever arm distance (r). Since Torque τ = r × F, doubling the distance doubles the rotational torque exerted!';
      } else if (userQ.toLowerCase().includes('angle') || userQ.toLowerCase().includes('90')) {
        botReply = 'Torque τ = r F sin(θ). At 90°, sin(90°) = 1.0 (maximum perpendicular lever arm). At 0° or 180°, sin(0°) = 0, so the force passes directly through the pivot and produces ZERO torque!';
      } else if (userQ.toLowerCase().includes('balance') || userQ.toLowerCase().includes('smaller')) {
        botReply = 'A smaller mass (e.g. 0.10 kg) can balance a larger mass (e.g. 0.20 kg) if placed twice as far from the pivot (0.60m vs 0.30m), because 0.10 × 0.60 = 0.20 × 0.30 = 0.06 kg·m!';
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    }, 400);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="w-full h-full flex flex-col bg-[#050505] text-white font-sans select-none relative overflow-hidden"
    >
      {/* ── TOP ESSENTIAL PARAMETER HEADER ─────────────────────── */}
      <header className="h-12 bg-zinc-950 border-b border-white/15 px-6 flex items-center justify-between shrink-0 font-mono text-xs z-20">
        {/* Lab Mode Selectors */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLabMode('EXPLORE');
              handleResetBeam();
            }}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              labMode === 'EXPLORE' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 border border-white/10'
            }`}
          >
            🔬 Free Exploration
          </button>
          <button
            onClick={() => {
              setLabMode('CHALLENGE');
              setMasses([
                { id: 'm_target', massKg: 0.20, positionM: -0.30, angleDeg: 90, color: '#ec4899' },
                { id: 'm_student', massKg: 0.10, positionM: 0.20, angleDeg: 90, color: '#3b82f6' },
              ]);
            }}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              labMode === 'CHALLENGE' ? 'bg-amber-400 text-black' : 'bg-zinc-900 text-zinc-400 border border-white/10'
            }`}
          >
            🎯 Balance Challenge
          </button>
          <button
            onClick={() => setLabMode('ANGLE')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              labMode === 'ANGLE' ? 'bg-purple-500 text-white' : 'bg-zinc-900 text-zinc-400 border border-white/10'
            }`}
          >
            📐 Force Angle Lab
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecordTrial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Trial</span>
          </button>

          <button
            onClick={handleResetBeam}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/15 transition-all active:scale-95"
            title="Reset beam position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Beam</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/10 transition-all"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ── REAL-TIME ALERTS BANNER ────────────────────────────── */}
      <AnimatePresence>
        {torqueState.isEquilibrium && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-1.5 text-[11px] font-mono text-emerald-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>✓ ROTATIONAL EQUILIBRIUM ACHIEVED — Clockwise and Anticlockwise torques are perfectly balanced (Στ = 0)!</span>
            </div>
            {labMode === 'CHALLENGE' && <span className="font-bold text-amber-400 uppercase tracking-widest text-[10px]">CHALLENGE COMPLETE! 🎉</span>}
          </motion.div>
        )}

        {!torqueState.isEquilibrium && Math.abs(beamAngleDeg) > 5 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-1.5 text-[11px] font-mono text-amber-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {torqueState.netTorque > 0 ? '⚠️ ANTICLOCKWISE ROTATION (Left side heavier torque)' : '⚠️ CLOCKWISE ROTATION (Right side heavier torque)'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN 3-ZONE WORKSTATION LAYOUT ──────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT ZONE: EXPERIMENT CONTROLS (~20% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-r border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10 flex items-center justify-between">
            <span>Experiment Controls</span>
            <button onClick={handleAddMass} disabled={masses.length >= 6} className="text-blue-400 hover:text-white font-bold text-[10px] flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Add Mass
            </button>
          </div>

          {/* Environmental Parameters */}
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-400">Gravity g:</span>
              <span className="font-bold text-white">{gravity.toFixed(2)} m/s²</span>
            </div>
            <input
              type="range"
              min="1.62"
              max="24.79"
              step="0.1"
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded accent-blue-500"
            />
          </div>

          {/* Active Mass Controls List */}
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-400 font-bold uppercase">Attached Masses ({masses.length})</div>
            {masses.map((m, idx) => (
              <div
                key={m.id}
                onClick={() => setSelectedMassId(m.id)}
                className={`p-2.5 rounded-xl border transition-all space-y-2 cursor-pointer ${
                  selectedMassId === m.id ? 'bg-zinc-900 border-blue-500/50 shadow-md' : 'bg-zinc-900/40 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    <span>Mass #{idx + 1} ({m.positionM < 0 ? 'Left' : 'Right'})</span>
                  </div>
                  {masses.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveMass(m.id); }} className="text-zinc-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Mass m (kg) slider */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] text-zinc-400">
                    <span>Mass m:</span>
                    <span className="font-bold text-white">{m.massKg.toFixed(2)} kg</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.50"
                    step="0.05"
                    value={m.massKg}
                    onChange={(e) => handleUpdateMass(m.id, 'massKg', Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded accent-emerald-500"
                  />
                </div>

                {/* Position r (m) slider */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] text-zinc-400">
                    <span>Distance r:</span>
                    <span className="font-bold text-white">{m.positionM.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="-0.48"
                    max="0.48"
                    step="0.02"
                    value={m.positionM}
                    onChange={(e) => handleUpdateMass(m.id, 'positionM', Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded accent-blue-500"
                  />
                </div>

                {/* Force Angle θ (deg) slider */}
                {labMode === 'ANGLE' && (
                  <div className="space-y-0.5 pt-1 border-t border-white/10">
                    <div className="flex justify-between text-[9px] text-purple-400">
                      <span>Angle θ:</span>
                      <span className="font-bold text-white">{m.angleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      step="5"
                      value={m.angleDeg}
                      onChange={(e) => handleUpdateMass(m.id, 'angleDeg', Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded accent-purple-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER ZONE: HERO APPARATUS VISUALIZATION (~65% Width) */}
        <main className="flex-1 min-h-0 flex flex-col bg-black relative overflow-hidden items-center justify-center p-6 select-none">
          {/* Challenge Banner Overlay */}
          {labMode === 'CHALLENGE' && (
            <div className="absolute top-4 left-6 right-6 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl font-mono text-xs text-amber-300 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>BALANCE CHALLENGE: Place Mass #2 on the right side at the exact distance r to balance Mass #1 (0.20kg at -0.30m)!</span>
              </div>
            </div>
          )}

          {/* HERO BALANCE BEAM APPARATUS CANVAS */}
          <div className="w-full max-w-4xl h-96 relative flex flex-col items-center justify-center">
            {/* ROTATING BALANCE BEAM ASSEMBLY */}
            <div
              className="w-full h-24 relative flex items-center justify-center transition-transform duration-75 origin-center"
              style={{ transform: `rotate(${beamAngleDeg}deg)` }}
            >
              {/* Meter Scale Beam Body */}
              <div
                ref={beamContainerRef}
                className="w-full h-10 bg-gradient-to-b from-amber-200 to-amber-400 border-2 border-amber-600 rounded-lg shadow-2xl relative flex items-center px-4 overflow-visible cursor-crosshair"
              >
                {/* Meter Scale Tick Marks & Labels */}
                <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none select-none text-[8px] font-mono text-amber-950 font-bold">
                  <span>-0.50m</span>
                  <span>-0.40m</span>
                  <span>-0.30m</span>
                  <span>-0.20m</span>
                  <span>-0.10m</span>
                  <span className="text-red-700 font-extrabold text-[10px]">0.00m</span>
                  <span>+0.10m</span>
                  <span>+0.20m</span>
                  <span>+0.30m</span>
                  <span>+0.40m</span>
                  <span>+0.50m</span>
                </div>

                {/* Attached Mass Hangers along Beam */}
                {masses.map((m) => {
                  // Position fraction: -0.5m -> 0%, 0m -> 50%, +0.5m -> 100%
                  const leftPct = ((m.positionM + 0.50) / 1.00) * 100;
                  const isSelected = selectedMassId === m.id;

                  return (
                    <div
                      key={m.id}
                      onPointerDown={(e) => handlePointerDown(m.id, e)}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-20 group"
                      style={{ left: `${leftPct}%` }}
                    >
                      {/* Lever Arm Bracket Pin */}
                      <div
                        className={`w-4 h-12 rounded border-2 shadow-lg transition-transform ${
                          isSelected ? 'border-white scale-110' : 'border-black/50'
                        }`}
                        style={{ backgroundColor: m.color }}
                      />

                      {/* Slotted Mass Stack */}
                      <div className="flex flex-col items-center -mt-1 space-y-0.5">
                        <div className="w-6 h-2 bg-zinc-700 border border-white/40 rounded-sm" />
                        <div className="w-8 h-6 bg-amber-500 border border-amber-300 rounded flex items-center justify-center text-[8px] font-mono font-bold text-black shadow">
                          {(m.massKg * 1000).toFixed(0)}g
                        </div>
                      </div>

                      {/* Force Vector Arrow (Downwards) */}
                      <div className="flex flex-col items-center mt-1 text-sky-400 font-mono text-[9px]">
                        <div className="w-0.5 h-6 bg-sky-400 animate-pulse" />
                        <span>F={(m.massKg * gravity).toFixed(2)}N</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FULCRUM WEDGE PIVOT SUPPORT (Fixed Stationary Base) */}
            <div className="flex flex-col items-center -mt-6 z-10">
              {/* Wedge Triangle */}
              <div className="w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[50px] border-b-zinc-700 drop-shadow-xl" />
              {/* Stand Base */}
              <div className="w-48 h-6 bg-zinc-800 border-2 border-white/20 rounded-md shadow-2xl flex items-center justify-center">
                <span className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest font-bold">Fulcrum Pivot Base</span>
              </div>
            </div>

            {/* Rotational Direction Arrows around Pivot */}
            <div className="absolute bottom-6 flex items-center gap-12 font-mono text-xs pointer-events-none">
              <div className={`flex items-center gap-1.5 transition-all ${torqueState.totalAntiTorque > 0 ? 'text-emerald-400 font-bold scale-110' : 'text-zinc-600'}`}>
                <RotateCcw className="w-4 h-4 animate-spin-slow" />
                <span>Anticlockwise τ = {torqueState.totalAntiTorque} N·m</span>
              </div>
              <div className={`flex items-center gap-1.5 transition-all ${torqueState.totalClockTorque > 0 ? 'text-emerald-400 font-bold scale-110' : 'text-zinc-600'}`}>
                <span>Clockwise τ = {torqueState.totalClockTorque} N·m</span>
                <RotateCcw className="w-4 h-4 rotate-180 scale-x-[-1]" />
              </div>
            </div>
          </div>

          {/* Dynamic Physics Insight Banner */}
          <div className="mt-4 bg-zinc-900/80 border border-white/10 px-6 py-2 rounded-2xl font-mono text-[11px] text-zinc-300 flex items-center gap-3 max-w-xl">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {torqueState.isEquilibrium
                ? 'Both sides produce equal rotational torque (Στ = 0), holding the beam in stable horizontal equilibrium.'
                : torqueState.netTorque > 0
                ? 'Anticlockwise torque dominates (Left side). Increase distance r on the right side or add mass to balance.'
                : 'Clockwise torque dominates (Right side). Increase distance r on the left side or add mass to balance.'}
            </span>
          </div>
        </main>

        {/* RIGHT ZONE: LIVE TELEMETRY (~18% Width) */}
        <aside className="w-64 bg-zinc-950/90 border-l border-white/10 flex flex-col p-4 space-y-3 overflow-y-auto min-h-0 font-mono text-xs shrink-0">
          <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pb-2 border-b border-white/10">
            Torque Telemetry
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Anticlockwise Torque (Left)</div>
            <div className="font-bold text-emerald-400 text-sm">{torqueState.totalAntiTorque.toFixed(3)} N·m</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Clockwise Torque (Right)</div>
            <div className="font-bold text-blue-400 text-sm">{torqueState.totalClockTorque.toFixed(3)} N·m</div>
          </div>

          {/* Net Torque Card */}
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
            <div className="text-[10px] text-purple-400 font-bold uppercase">Net Torque Στ</div>
            <div className="text-lg font-bold text-white">{torqueState.netTorque.toFixed(3)} N·m</div>
            <div className="text-[9px] text-zinc-400">(Στ = τ_anticlockwise - τ_clockwise)</div>
          </div>

          {/* Beam Angle Card */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-zinc-400">Beam Rotation Angle</div>
            <div className="font-bold text-amber-400 text-sm">{beamAngleDeg.toFixed(1)}°</div>
          </div>

          {/* Concordant Summary */}
          {trials.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-1 text-[10px]">
              <div className="font-bold text-white uppercase text-[9px]">Recorded Trials ({trials.length})</div>
              {trials.slice(-3).map((t) => (
                <div key={t.trialNumber} className="flex justify-between text-zinc-300">
                  <span>Trial #{t.trialNumber}:</span>
                  <span className="font-bold">{t.torqueNm.toFixed(3)} N·m</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* ── BOTTOM PROGRESSIVE DISCLOSURE DOCK ───────────────────── */}
      <div className="h-44 shrink-0 bg-zinc-950 border-t border-white/15 flex flex-col font-mono text-xs min-h-0">
        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-1 px-4 py-1.5 bg-black border-b border-white/10 text-xs shrink-0 overflow-x-auto">
          {(['NONE', 'PROCEDURE', 'DATA', 'GRAPH', 'FORMULAS', 'AI_MENTOR', 'ADVANCED_PHYSICS', 'REPORT', 'ASSESSMENT'] as const).map((tab) => (
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

        {/* Tab Body */}
        {activeTab !== 'NONE' && (
          <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-zinc-950">
            {/* 1. PROCEDURE TAB */}
            {activeTab === 'PROCEDURE' && (
              <div className="space-y-2 text-[11px]">
                <div className="font-bold text-white text-xs">Rotational Equilibrium Procedure Checklist:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">1. Mount Beam</div>
                    <div className="text-zinc-400">Place 1.00m balance beam on central fulcrum pivot at 0.00m.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">2. Apply Masses</div>
                    <div className="text-zinc-400">Attach mass m1 at distance r1. Drag along scale to alter lever arm.</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-400">3. Balance Torques</div>
                    <div className="text-zinc-400">Adjust mass m2 and distance r2 on opposite side until Στ = 0!</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DATA TABLE TAB */}
            {activeTab === 'DATA' && (
              <div className="space-y-3 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs font-mono">Recorded Torque Trials ({trials.length})</div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleRecordTrial} className="px-2.5 py-1 bg-blue-500 text-white rounded font-bold text-[10px]">
                      + Record Trial
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
                    No trials recorded yet. Adjust masses and click '+ Record Trial'.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/20 text-zinc-400 uppercase font-mono">
                          <th className="p-1.5">Trial #</th>
                          <th className="p-1.5">Mass m (kg)</th>
                          <th className="p-1.5">Distance r (m)</th>
                          <th className="p-1.5">Force F (N)</th>
                          <th className="p-1.5">Torque τ (N·m)</th>
                          <th className="p-1.5">Direction</th>
                          <th className="p-1.5">Balanced?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trials.map((t) => (
                          <tr key={t.trialNumber} className="border-b border-white/10 hover:bg-white/5 font-mono">
                            <td className="p-1.5 text-zinc-500">#{t.trialNumber}</td>
                            <td className="p-1.5 text-white">{t.massKg.toFixed(2)}</td>
                            <td className="p-1.5 text-white">{t.positionM.toFixed(2)}</td>
                            <td className="p-1.5 text-emerald-400 font-bold">{t.forceN.toFixed(2)}</td>
                            <td className="p-1.5 text-sky-400 font-bold">{t.torqueNm.toFixed(3)}</td>
                            <td className="p-1.5 text-zinc-300">{t.direction}</td>
                            <td className="p-1.5 text-zinc-400">{t.isEquilibrium ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. GRAPH TAB */}
            {activeTab === 'GRAPH' && (
              <div className="h-full flex items-center justify-between p-2 font-mono text-[11px]">
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">Torque vs Distance Curve: τ = r F sin(θ)</div>
                  <div className="text-emerald-400 text-[10px]">Linear Relationship τ ∝ r for constant weight F</div>
                  <div className="text-zinc-400 text-[10px]">Slope = Force F = {((masses[0]?.massKg || 0.20) * gravity).toFixed(2)} N</div>
                </div>

                <div className="w-80 h-28 bg-zinc-900 border border-white/15 rounded-xl p-3 flex flex-col justify-between text-[10px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Applied Torque τ (N·m)</span>
                    <span>Linear τ ∝ r</span>
                  </div>
                  <div className="h-16 w-full border-b border-l border-white/30 relative flex items-end px-2 pb-1">
                    <span className="text-[9px] text-blue-300 font-bold">Slope = F = mg</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>0.00 m</span>
                    <span>Lever Arm Distance r (m) ➔</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FORMULAS TAB */}
            {activeTab === 'FORMULAS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Torque Definition</div>
                  <div className="text-xs font-bold text-white">τ = r F sin(θ)</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Equilibrium Condition</div>
                  <div className="text-xs font-bold text-emerald-400">Στ = 0</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Moment of Inertia</div>
                  <div className="text-xs font-bold text-sky-400">I = (1/12)ML² + Σ m_i r_i²</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase">Angular Acceleration</div>
                  <div className="text-xs font-bold text-purple-400">α = τ_net / I</div>
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
                    placeholder="Ask why moving farther increases torque or why angle 90° gives max torque..."
                    className="w-full bg-zinc-900 border border-white/20 rounded-xl pl-3 pr-8 py-1.5 text-[10px] text-white focus:outline-none"
                  />
                  <button type="submit" className="absolute right-2 top-2.5 text-zinc-400 hover:text-white">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* 6. ADVANCED PHYSICS TAB */}
            {activeTab === 'ADVANCED_PHYSICS' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Total Moment of Inertia I</div>
                  <div className="text-sm font-bold text-emerald-400">{torqueState.totalI} kg·m²</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Angular Acceleration α</div>
                  <div className="text-sm font-bold text-amber-400">{torqueState.angularAcceleration} rad/s²</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Net Torque Στ</div>
                  <div className="text-sm font-bold text-sky-400">{torqueState.netTorque} N·m</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/15 space-y-1">
                  <div className="text-zinc-400 font-bold">Beam Mass</div>
                  <div className="text-sm font-bold text-purple-400">{beamMass.toFixed(2)} kg</div>
                </div>
              </div>
            )}

            {/* 7. REPORT TAB */}
            {activeTab === 'REPORT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs">Automated Physics Laboratory Report Draft</div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-white/15 space-y-1 leading-relaxed">
                  <div><strong>Experiment:</strong> Torque and Rotational Equilibrium</div>
                  <div><strong>Beam Length:</strong> 1.00 m (Aluminium Balance Scale)</div>
                  <div><strong>Gravity g:</strong> {gravity.toFixed(2)} m/s²</div>
                  <div><strong>Anticlockwise Torque:</strong> {torqueState.totalAntiTorque} N·m</div>
                  <div><strong>Clockwise Torque:</strong> {torqueState.totalClockTorque} N·m</div>
                  <div><strong>Net Torque Στ:</strong> {torqueState.netTorque} N·m</div>
                  <div><strong>Equilibrium Status:</strong> {torqueState.isEquilibrium ? 'Rotational Equilibrium Achieved' : 'Unbalanced Rotation'}</div>
                </div>
              </div>
            )}

            {/* 8. ASSESSMENT TAB */}
            {activeTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs font-mono font-bold">Assessment Checkpoints:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>1. Achieved Rotational Equilibrium (Στ = 0)</span>
                    <span className="font-bold">+40 pts</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                    <span>2. Completed "Balance Challenge" Mode</span>
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
