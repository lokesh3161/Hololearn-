import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
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
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Target,
  Sparkles,
} from 'lucide-react';
import type { ExperimentConfig } from '../../types';
import { OpticsEngine, type ObjectPositionClass } from '../../engines/OpticsEngine';
import { OpticalBenchCanvas } from '../../physics/optics/OpticalBenchCanvas';
import { useDataLogger } from '../../hooks/useDataLogger';
import { labSound } from '../../utils/LabSoundManager';

interface ConvexLensLabProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack?: () => void;
}

export const ConvexLensLab: React.FC<ConvexLensLabProps> = ({
  config,
  inputs,
  onUpdateInput,
  onRecordDataPoint,
  onCompleteStep,
  onBack,
}) => {
  // Sound Enabled State
  const [soundOn, setSoundOn] = useState<boolean>(labSound.isEnabled());

  // Bench Position States (cm from left end of 80cm bench)
  const [objectPosition_cm, setObjectPosition_cm] = useState<number>(Number(inputs.objectPosition_cm || 20.0));
  const [lensPosition_cm, setLensPosition_cm] = useState<number>(Number(inputs.lensPosition_cm || 40.0));
  const [screenPosition_cm, setScreenPosition_cm] = useState<number>(Number(inputs.screenPosition_cm || 65.0));

  // Lens Settings
  const trueFocalLength_cm = 10.0; // Reference focal length
  const [objectHeight_cm, setObjectHeight_cm] = useState<number>(3.0);
  const benchLength_cm = 80;

  // Options & Flags
  const [showRayDiagram, setShowRayDiagram] = useState<boolean>(false);
  const [realisticMode, setRealisticMode] = useState<boolean>(false);
  const [lensLocked, setLensLocked] = useState<boolean>(true);

  // Progressive Disclosure Drawer & Modal States
  const [showApparatus, setShowApparatus] = useState<boolean>(false);
  const [showCalculations, setShowCalculations] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'NONE' | 'PROCEDURE' | 'DATA' | 'GRAPH' | 'NOTEBOOK' | 'REPORT' | 'ASSESSMENT'>('NONE');
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showAi, setShowAi] = useState<boolean>(false);
  const [graphTab, setGraphTab] = useState<'oneOverV' | 'vVsU'>('oneOverV');
  const [focusWarningMessage, setFocusWarningMessage] = useState<string | null>(null);

  // Notebook State
  const [hypothesisText, setHypothesisText] = useState('');
  const [observationText, setObservationText] = useState('');
  const [conclusionText, setConclusionText] = useState('');

  // Track if sound played for sharp image transition
  const [hasPlayedSharpChime, setHasPlayedSharpChime] = useState<boolean>(false);

  // ── DERIVED OPTICAL CALCULATIONS ─────────────────────────
  const u_cm = useMemo(() => OpticsEngine.objectDistance(objectPosition_cm, lensPosition_cm), [objectPosition_cm, lensPosition_cm]);
  const absU_cm = useMemo(() => Math.abs(u_cm), [u_cm]);

  const v_calculated_cm = useMemo(
    () => OpticsEngine.calculateImageDistance(u_cm, trueFocalLength_cm),
    [u_cm, trueFocalLength_cm]
  );

  const v_measured_cm = useMemo(
    () => OpticsEngine.imageDistance(screenPosition_cm, lensPosition_cm),
    [screenPosition_cm, lensPosition_cm]
  );

  const sharpness = useMemo(
    () => OpticsEngine.calculateSharpness(screenPosition_cm, lensPosition_cm + v_calculated_cm),
    [screenPosition_cm, lensPosition_cm, v_calculated_cm]
  );

  const magnification = useMemo(
    () => OpticsEngine.calculateMagnification(u_cm, v_measured_cm),
    [u_cm, v_measured_cm]
  );

  const imageHeight_cm = useMemo(
    () => OpticsEngine.calculateImageHeight(objectHeight_cm, magnification),
    [objectHeight_cm, magnification]
  );

  const calculatedFocalLength_cm = useMemo(
    () => OpticsEngine.calculateFocalLength(u_cm, v_measured_cm),
    [u_cm, v_measured_cm]
  );

  const objectPosClass: ObjectPositionClass = useMemo(
    () => OpticsEngine.classifyObjectPosition(absU_cm, trueFocalLength_cm),
    [absU_cm, trueFocalLength_cm]
  );

  const posDesc = useMemo(
    () => OpticsEngine.getObjectPositionDescription(objectPosClass),
    [objectPosClass]
  );

  const isRealImage = useMemo(
    () => OpticsEngine.isRealImage(v_calculated_cm),
    [v_calculated_cm]
  );

  // Sensor Telemetry with Noise
  const measuredUDisplay = useMemo(
    () => (realisticMode ? OpticsEngine.addNoise(absU_cm, 0.1) : absU_cm),
    [absU_cm, realisticMode]
  );

  const measuredVDisplay = useMemo(
    () => (realisticMode ? OpticsEngine.addNoise(v_measured_cm, 0.1) : v_measured_cm),
    [v_measured_cm, realisticMode]
  );

  const measuredFDisplay = useMemo(
    () => (realisticMode ? OpticsEngine.addNoise(calculatedFocalLength_cm, 0.1) : calculatedFocalLength_cm),
    [calculatedFocalLength_cm, realisticMode]
  );

  // Data Logger
  const { rows, record, clear, exportCSV } = useDataLogger([
    'trialId',
    'objectPos_cm',
    'lensPos_cm',
    'screenPos_cm',
    'u_cm',
    'v_cm',
    'f_calc',
    'magnification',
    'focusQuality',
    'imageType',
    'pctError',
  ]);

  // Derived Statistics from Trials
  const trialsCompleted = rows.length;

  const meanFocalLength = useMemo(() => {
    if (rows.length === 0) return 0;
    const fVals = rows.map((r) => Number(r.f_calc));
    return OpticsEngine.meanFocalLength(fVals);
  }, [rows]);

  const stdDevFocalLength = useMemo(() => {
    if (rows.length < 2) return 0;
    const fVals = rows.map((r) => Number(r.f_calc));
    return OpticsEngine.standardDeviation(fVals);
  }, [rows]);

  const overallPctError = useMemo(() => {
    if (trialsCompleted < 3) return 0;
    return OpticsEngine.percentageError(meanFocalLength, trueFocalLength_cm);
  }, [meanFocalLength, trueFocalLength_cm, trialsCompleted]);

  // AI Mentor Conversation
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    {
      sender: 'bot',
      text: "👋 Welcome to the Convex Lens Virtual Laboratory! I am your AI Physics Mentor. Drag the object and screen along the bench to focus a sharp image and measure focal length f = uv/(u+v).",
    },
  ]);

  // Audio trigger when sharpness reaches optimal focus (≥ 0.90)
  useEffect(() => {
    if (sharpness >= 0.90 && !hasPlayedSharpChime) {
      labSound.playSharpImage();
      setHasPlayedSharpChime(true);
      onCompleteStep(4);
    } else if (sharpness < 0.80 && hasPlayedSharpChime) {
      setHasPlayedSharpChime(false);
    }
  }, [sharpness, hasPlayedSharpChime, onCompleteStep]);

  // Synchronize inputs with parent state
  useEffect(() => {
    onUpdateInput('objectPosition_cm', objectPosition_cm);
    onUpdateInput('lensPosition_cm', lensPosition_cm);
    onUpdateInput('screenPosition_cm', screenPosition_cm);
    onUpdateInput('u_cm', absU_cm);
    onUpdateInput('v_cm', v_measured_cm);
    onUpdateInput('sharpness', sharpness);
    onUpdateInput('calculatedFocalLength_cm', calculatedFocalLength_cm);
  }, [objectPosition_cm, lensPosition_cm, screenPosition_cm, absU_cm, v_measured_cm, sharpness, calculatedFocalLength_cm, onUpdateInput]);

  // Handlers for Moving Apparatus
  const handleObjectMove = (newPos: number) => {
    setObjectPosition_cm(newPos);
    labSound.playScreenSlide();
    setFocusWarningMessage(null);
    onCompleteStep(1);
  };

  const handleLensMove = (newPos: number) => {
    if (lensLocked) return;
    setLensPosition_cm(newPos);
    labSound.playLensDrag();
    setFocusWarningMessage(null);
  };

  const handleScreenMove = (newPos: number) => {
    setScreenPosition_cm(newPos);
    labSound.playScreenSlide();
    setFocusWarningMessage(null);
    onCompleteStep(2);
  };

  const handlePreset = (objectPos: number) => {
    setObjectPosition_cm(objectPos);
    labSound.playReset();
    setFocusWarningMessage(null);
  };

  const handleRecordMeasurement = () => {
    if (!isRealImage) {
      labSound.playInvalidInput();
      setFocusWarningMessage('Virtual image cannot be captured on a screen. Move object further from lens (u > f).');
      return;
    }

    if (sharpness < 0.85) {
      labSound.playInvalidInput();
      setFocusWarningMessage(`Image is not sharp enough (${(sharpness * 100).toFixed(0)}%). Move screen until Focus Quality ≥ 85%.`);
      return;
    }

    const trialError = OpticsEngine.percentageError(calculatedFocalLength_cm, trueFocalLength_cm);

    record({
      trialId: rows.length + 1,
      objectPos_cm: Number(objectPosition_cm.toFixed(1)),
      lensPos_cm: Number(lensPosition_cm.toFixed(1)),
      screenPos_cm: Number(screenPosition_cm.toFixed(1)),
      u_cm: Number(measuredUDisplay.toFixed(1)),
      v_cm: Number(measuredVDisplay.toFixed(1)),
      f_calc: Number(measuredFDisplay.toFixed(1)),
      magnification: Number(magnification.toFixed(2)),
      focusQuality: `${(sharpness * 100).toFixed(0)}%`,
      imageType: posDesc.imageType,
      pctError: `${trialError.toFixed(1)}%`,
    });

    labSound.playDataRecorded();
    setFocusWarningMessage(null);
    onRecordDataPoint();
    onCompleteStep(5);

    if (rows.length + 1 >= 3) {
      onCompleteStep(75);
    }

    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'bot',
        text: `🎯 **Trial #${rows.length + 1} Recorded:** u = **${measuredUDisplay.toFixed(1)} cm**, v = **${measuredVDisplay.toFixed(1)} cm**. Calculated Focal Length f = **${measuredFDisplay.toFixed(1)} cm**. Focus Quality = **${(sharpness * 100).toFixed(0)}%**.`,
      },
    ]);
  };

  const handleResetBench = () => {
    labSound.playReset();
    setObjectPosition_cm(20.0);
    setLensPosition_cm(40.0);
    setScreenPosition_cm(65.0);
    setFocusWarningMessage(null);
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
        
        {/* Left Side: Apparatus Positions & Fine Adjustments */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Object Position */}
          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Object:</span>
            <input
              type="number"
              min="2"
              max={lensPosition_cm - 2}
              step="0.1"
              value={objectPosition_cm}
              onChange={(e) => handleObjectMove(Math.max(2, Math.min(lensPosition_cm - 2, Number(e.target.value))))}
              className="w-12 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">cm</span>
          </div>

          {/* Lens Position */}
          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Lens O:</span>
            <input
              type="number"
              disabled={lensLocked}
              min={objectPosition_cm + 2}
              max={screenPosition_cm - 2}
              step="0.1"
              value={lensPosition_cm}
              onChange={(e) => handleLensMove(Math.max(objectPosition_cm + 2, Math.min(screenPosition_cm - 2, Number(e.target.value))))}
              className="w-12 bg-transparent text-white font-bold outline-none text-center disabled:opacity-60"
            />
            <span className="text-zinc-400">cm</span>
            <button
              onClick={() => setLensLocked(!lensLocked)}
              className="p-1 hover:text-white text-zinc-400"
              title={lensLocked ? 'Unlock Lens Movement' : 'Lock Lens Movement'}
            >
              {lensLocked ? <Lock className="w-3 h-3 text-emerald-400" /> : <Unlock className="w-3 h-3 text-amber-400" />}
            </button>
          </div>

          {/* Screen Position */}
          <div className="flex items-center gap-1.5 bg-black border border-white/20 rounded px-2 py-1">
            <span className="text-zinc-400 font-bold">Screen:</span>
            <input
              type="number"
              min={lensPosition_cm + 2}
              max={benchLength_cm - 2}
              step="0.1"
              value={screenPosition_cm}
              onChange={(e) => handleScreenMove(Math.max(lensPosition_cm + 2, Math.min(benchLength_cm - 2, Number(e.target.value))))}
              className="w-12 bg-transparent text-white font-bold outline-none text-center"
            />
            <span className="text-zinc-400">cm</span>
          </div>

          {/* Ray Diagram Toggle */}
          <button
            onClick={() => setShowRayDiagram(!showRayDiagram)}
            className={`px-2.5 py-1 rounded border font-bold flex items-center gap-1 text-[11px] ${
              showRayDiagram ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-300 border-white/20 hover:border-white'
            }`}
          >
            {showRayDiagram ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Rays: {showRayDiagram ? 'ON' : 'OFF'}</span>
          </button>

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
            onClick={() => handlePreset(lensPosition_cm - 30)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Beyond 2F (30cm)
          </button>
          <button
            onClick={() => handlePreset(lensPosition_cm - 20)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            At 2F (20cm)
          </button>
          <button
            onClick={() => handlePreset(lensPosition_cm - 15)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Between F & 2F (15cm)
          </button>
          <button
            onClick={() => handlePreset(lensPosition_cm - 5)}
            className="px-2 py-0.5 bg-zinc-900 border border-white/20 hover:border-white rounded text-[11px] text-zinc-200"
          >
            Inside F (5cm)
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

          {/* Record Measurement Button */}
          <button
            onClick={handleRecordMeasurement}
            disabled={!isRealImage || sharpness < 0.85}
            className={`px-3.5 py-1.5 font-bold rounded-lg text-xs transition-all active:scale-95 flex items-center gap-1.5 ${
              sharpness >= 0.85 && isRealImage
                ? 'bg-white text-black hover:bg-zinc-200 shadow-lg'
                : 'bg-zinc-900 text-zinc-500 border border-white/10 opacity-60 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Record Measurement</span>
          </button>

          <button
            onClick={handleResetBench}
            className="px-2.5 py-1.5 bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white rounded-lg text-xs flex items-center gap-1 active:scale-95"
            title="Reset Optical Bench"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bench</span>
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
        
        {/* LEFT COLUMN (Controls & Derived Optics Accordion) */}
        <div className="lg:col-span-3 flex flex-col gap-2 overflow-y-auto font-mono text-xs">
          {/* Quick Presets on smaller screens */}
          <div className="flex xl:hidden flex-wrap items-center gap-1 p-2 bg-[#0a0a0c] border border-white/20 rounded-xl">
            <span className="text-[10px] text-zinc-400 font-bold w-full">Presets:</span>
            <button onClick={() => handlePreset(lensPosition_cm - 30)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Beyond 2F</button>
            <button onClick={() => handlePreset(lensPosition_cm - 20)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">At 2F</button>
            <button onClick={() => handlePreset(lensPosition_cm - 15)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Between F & 2F</button>
            <button onClick={() => handlePreset(lensPosition_cm - 5)} className="px-2 py-0.5 bg-zinc-900 border border-white/20 rounded text-[10px]">Inside F</button>
          </div>

          {/* Derived Optics Card */}
          <div className="p-3.5 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-2">
            <div className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1 text-white">
                <Zap className="w-3.5 h-3.5 text-white" /> OPTICAL KINEMATICS
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">1/f = 1/v - 1/u</span>
            </div>

            {/* Compact Derived Summary */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Object |u|</div>
                <div className="font-bold text-white text-xs">{measuredUDisplay.toFixed(1)}cm</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Image v</div>
                <div className="font-bold text-white text-xs">{measuredVDisplay.toFixed(1)}cm</div>
              </div>
              <div className="p-1.5 bg-black border border-white/10 rounded">
                <div className="text-[9px] text-zinc-400">Calc f</div>
                <div className="font-bold text-white text-xs">{measuredFDisplay.toFixed(1)}cm</div>
              </div>
            </div>

            {/* Collapsible Accordion Button */}
            <button
              onClick={() => setShowCalculations(!showCalculations)}
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded text-[11px] text-zinc-300 font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <span>{showCalculations ? 'Hide Calculations ↑' : 'View Calculations ↓'}</span>
            </button>

            {/* Expanded Detailed Optics Calculations Accordion */}
            {showCalculations && (
              <div className="space-y-1.5 text-[11px] pt-1 font-mono animate-fade-in border-t border-white/10">
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Object Distance (|u|):</span>
                  <span className="font-bold text-white">{measuredUDisplay.toFixed(1)} cm</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Screen Distance (v):</span>
                  <span className="font-bold text-white">{measuredVDisplay.toFixed(1)} cm</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Calculated Focal Length (f):</span>
                  <span className="font-bold text-white">{measuredFDisplay.toFixed(1)} cm</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Magnification (m):</span>
                  <span className="font-bold text-white">{magnification.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Image Height (h_i):</span>
                  <span className="font-bold text-white">{imageHeight_cm.toFixed(1)} cm</span>
                </div>
                <div className="flex justify-between p-1.5 bg-black border border-white/10 rounded">
                  <span className="text-zinc-400">Focus Quality:</span>
                  <span className="font-bold text-white">{(sharpness * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Focus Warning Message Banner (if recording invalid) */}
          {focusWarningMessage && (
            <div className="p-2.5 bg-[#0a0a0c] border border-amber-500/50 rounded-xl text-[11px] text-amber-300 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{focusWarningMessage}</span>
            </div>
          )}
        </div>

        {/* CENTER COLUMN (HERO OPTICAL BENCH VIEWPORT - LARGEST SCREEN AREA) */}
        <div className="lg:col-span-6 flex flex-col relative h-full min-h-[360px]">
          <div className="w-full h-full bg-black border border-white/20 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-2xl">
            <OpticalBenchCanvas
              objectPos_cm={objectPosition_cm}
              lensPos_cm={lensPosition_cm}
              screenPos_cm={screenPosition_cm}
              focalLength_cm={trueFocalLength_cm}
              objectHeight_cm={objectHeight_cm}
              benchLength_cm={benchLength_cm}
              showRayDiagram={showRayDiagram}
              sharpness={sharpness}
              calculatedImagePos_cm={lensPosition_cm + v_calculated_cm}
              isRealImage={isRealImage}
              magnification={magnification}
              onObjectMove={handleObjectMove}
              onLensMove={handleLensMove}
              onScreenMove={handleScreenMove}
            />

            {/* Sharp Focus Banner Toast */}
            {sharpness >= 0.90 && isRealImage && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0a0a0c] border-2 border-emerald-400 rounded-xl p-2.5 px-4 shadow-2xl flex items-center gap-2 z-20 animate-fade-in font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-bold text-xs">✓ SHARP IMAGE — READY TO RECORD</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (TELEMETRY HIERARCHY) */}
        <div className="lg:col-span-3 flex flex-col gap-2.5 font-mono overflow-y-auto">
          {/* PRIMARY TELEMETRY CARDS (Visually Prominent) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">OBJECT DISTANCE |u|</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {measuredUDisplay.toFixed(1)} <span className="text-xs font-normal text-zinc-400">cm</span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">IMAGE DISTANCE v</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {measuredVDisplay.toFixed(1)} <span className="text-xs font-normal text-zinc-400">cm</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">FOCUS QUALITY</div>
              <div className="text-xl font-bold text-white tracking-tight flex items-baseline gap-1">
                {(sharpness * 100).toFixed(0)}%
                <span className="text-[10px] text-emerald-400 font-normal">
                  {sharpness >= 0.9 ? 'Sharp' : sharpness >= 0.6 ? 'Near' : 'Blur'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0c] border border-white/20 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">CALC. FOCAL LENGTH</div>
              <div className="text-xl font-bold text-white tracking-tight">
                {measuredFDisplay.toFixed(1)} <span className="text-xs font-normal text-zinc-400">cm</span>
              </div>
            </div>
          </div>

          {/* SECONDARY TELEMETRY (Compact Grid Strip) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Magnification</div>
              <div className="text-sm font-bold text-white">m = {magnification.toFixed(2)}</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Image Type</div>
              <div className="text-sm font-bold text-white">{posDesc.imageType}</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Orientation</div>
              <div className="text-sm font-bold text-white">{posDesc.orientation}</div>
            </div>

            <div className="p-2 bg-[#0a0a0c] border border-white/15 rounded-lg">
              <div className="text-[9px] text-zinc-400 uppercase font-bold">Image Size</div>
              <div className="text-sm font-bold text-white">{posDesc.size}</div>
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
                <div className="font-bold text-white text-xs uppercase tracking-wider">Step-by-Step Optical Bench Checklist</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {[
                    { stepNumber: 1, instruction: 'Place convex lens at fixed position (e.g. 40.0 cm)', action: 'Set lens' },
                    { stepNumber: 2, instruction: 'Place object beyond 2F (e.g. u = 30 cm)', action: 'Move object' },
                    { stepNumber: 3, instruction: 'Place screen on image side (right of lens)', action: 'Position screen' },
                    { stepNumber: 4, instruction: 'Slowly drag screen until image is sharp (Focus ≥ 85%)', action: 'Focus screen' },
                    { stepNumber: 5, instruction: 'Click ✓ Record Measurement to store (u, v, f)', action: 'Log trial' },
                    { stepNumber: 6, instruction: 'Repeat for 3+ different object positions', action: 'Record 3 trials' },
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
                  <div className="font-bold text-white text-xs uppercase tracking-wider font-mono">Logged Optical Trials ({trialsCompleted})</div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportCSV}
                      disabled={trialsCompleted === 0}
                      className="px-2 py-1 bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white rounded text-[10px] disabled:opacity-40"
                    >
                      Copy CSV
                    </button>
                    <button
                      onClick={clear}
                      disabled={trialsCompleted === 0}
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
                        <th className="p-1.5">Object (cm)</th>
                        <th className="p-1.5">Lens (cm)</th>
                        <th className="p-1.5">Screen (cm)</th>
                        <th className="p-1.5">u (cm)</th>
                        <th className="p-1.5">v (cm)</th>
                        <th className="p-1.5">f (cm)</th>
                        <th className="p-1.5">m</th>
                        <th className="p-1.5">Focus</th>
                        <th className="p-1.5">Error %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialsCompleted === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-4 text-zinc-500">
                            No optical trials recorded yet. Adjust screen to focus sharp image (≥85%), then click 'Record Measurement'.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr key={i} className="border-b border-white/10 hover:bg-zinc-900/50">
                            <td className="p-1.5 font-bold">{r.trialId}</td>
                            <td className="p-1.5">{r.objectPos_cm}</td>
                            <td className="p-1.5">{r.lensPos_cm}</td>
                            <td className="p-1.5">{r.screenPos_cm}</td>
                            <td className="p-1.5">{r.u_cm}</td>
                            <td className="p-1.5 font-bold text-white">{r.v_cm}</td>
                            <td className="p-1.5 font-bold text-white">{r.f_calc}</td>
                            <td className="p-1.5">{r.magnification}</td>
                            <td className="p-1.5 text-emerald-400 font-bold">{r.focusQuality}</td>
                            <td className="p-1.5">{r.pctError}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Experimental Result Summary Banner (Revealed after 3+ trials) */}
                {trialsCompleted >= 3 ? (
                  <div className="p-3 bg-black border-2 border-white rounded-xl text-white text-[11px] font-mono space-y-1">
                    <div className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> EXPERIMENTAL RESULT REVEALED
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-1 bg-zinc-900 rounded border border-white/10">
                        <div className="text-[9px] text-zinc-400">Mean f_exp</div>
                        <div className="font-bold text-white text-xs">{meanFocalLength.toFixed(2)} cm</div>
                      </div>
                      <div className="p-1 bg-zinc-900 rounded border border-white/10">
                        <div className="text-[9px] text-zinc-400">Reference f₀</div>
                        <div className="font-bold text-white text-xs">{trueFocalLength_cm.toFixed(1)} cm</div>
                      </div>
                      <div className="p-1 bg-zinc-900 rounded border border-white/10">
                        <div className="text-[9px] text-zinc-400">Percentage Error</div>
                        <div className="font-bold text-white text-xs">{overallPctError.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-black border border-white/20 rounded-lg text-zinc-400 text-[11px] font-mono">
                    💡 Complete at least 3 trials to reveal your experimental mean focal length compared to lens reference value.
                  </div>
                )}
              </div>
            )}

            {/* GRAPH WORKSPACE */}
            {activeBottomTab === 'GRAPH' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs uppercase tracking-wider font-mono">Primary Analysis Plot</div>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      onClick={() => setGraphTab('oneOverV')}
                      className={`px-2 py-0.5 rounded font-bold uppercase ${
                        graphTab === 'oneOverV' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      1/v vs 1/u (Linear)
                    </button>
                    <button
                      onClick={() => setGraphTab('vVsU')}
                      className={`px-2 py-0.5 rounded font-bold uppercase ${
                        graphTab === 'vVsU' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      v vs u (Hyperbolic)
                    </button>
                  </div>
                </div>

                <div className="h-36 bg-black border border-white/15 rounded-xl p-2 relative flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120">
                    <line x1="30" y1="10" x2="30" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                    <line x1="30" y1="105" x2="390" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

                    {rows.length > 0 &&
                      rows.map((r, idx) => {
                        const uVal = Number(r.u_cm);
                        const vVal = Number(r.v_cm);

                        let xPx = 30;
                        let yPx = 105;

                        if (graphTab === 'oneOverV') {
                          const oneOverU = -1 / uVal; // negative
                          const oneOverV = 1 / vVal;
                          xPx = 30 + ((oneOverU + 0.1) / 0.1) * 350;
                          yPx = 105 - (oneOverV / 0.2) * 90;
                        } else {
                          xPx = 30 + (uVal / 60) * 350;
                          yPx = 105 - (vVal / 60) * 90;
                        }

                        return <circle key={idx} cx={xPx} cy={yPx} r="4" fill="#ffffff" stroke="#000000" strokeWidth="1" />;
                      })}
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
                    placeholder="Predict relationship between u and v..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Observations:</label>
                  <textarea
                    value={observationText}
                    onChange={(e) => setObservationText(e.target.value)}
                    placeholder="Record focus clarity & inversion notes..."
                    className="flex-1 bg-black border border-white/20 rounded-lg p-2 text-white resize-none outline-none font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Conclusion:</label>
                  <textarea
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    placeholder="Summarize focal length f determination..."
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
                  <div><strong>Experiment:</strong> Convex Lens — Focal Length Determination</div>
                  <div><strong>Trials Recorded:</strong> {trialsCompleted} rows</div>
                  <div><strong>Mean f:</strong> {meanFocalLength.toFixed(2)} cm</div>
                  <div><strong>Student Hypothesis:</strong> {hypothesisText || '[ Pending student entry ]'}</div>
                </div>
              </div>
            )}

            {/* ASSESSMENT WORKSPACE */}
            {activeBottomTab === 'ASSESSMENT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs uppercase tracking-wider">Live Checkpoint Assessment</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Obtain sharp image focus (Quality ≥ 85%)</span>
                    <span className="font-bold text-white">✓ Passed (+25 pts)</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Demonstrate inverted real image formation for u &gt; f</span>
                    <span className="font-bold text-white">✓ Passed (+25 pts)</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Log 3+ optical trials for different object positions</span>
                    <span className="font-bold text-white">{trialsCompleted >= 3 ? '✓ Passed (+25 pts)' : 'Pending (0/25)'}</span>
                  </div>
                  <div className="p-2 bg-black border border-white/15 rounded-lg flex justify-between items-center">
                    <span>Export CSV / Generate Formal Optics Report</span>
                    <span className="font-bold text-white">{trialsCompleted >= 1 ? '✓ Passed (+25 pts)' : 'Pending (0/25)'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── COLLAPSED DRAWER: APPARATUS SHELF ──────────── */}
      {showApparatus && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-start">
          <div className="w-80 bg-[#0a0a0c] border-r border-white h-full p-5 space-y-4 text-white overflow-y-auto animate-slide-right font-mono">
            <div className="flex justify-between items-center border-b border-white/20 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <Beaker className="w-4 h-4 text-white" /> Apparatus Shelf
              </h3>
              <button onClick={() => setShowApparatus(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { name: 'Optical Bench Rail', specs: '80cm precision aluminum rail with cm scale', inst: 'Supports sliding carriers for lens and screen.' },
                { name: 'Illuminated Object', specs: '3.0cm target object with illuminated tip', inst: 'Positioned to left of lens (u < 0).' },
                { name: 'Convex Lens', specs: 'Nominal focal length f = 10.0 cm', inst: 'Mounted in lens carrier rider.' },
                { name: 'Translucent Screen', specs: 'Ground glass viewing screen', inst: 'Adjust position to capture sharp real image.' },
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
              <h3 className="font-bold text-xs uppercase tracking-wider">ƒx Thin Lens Formulas</h3>
              <button onClick={() => setShowFormulas(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Thin Lens Equation:</strong><br />
                1/f = 1/v - 1/u
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Focal Length Formula:</strong><br />
                f = (|u| × v) / (|u| + v)
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Magnification:</strong><br />
                m = -v / |u|  |  h_i = m × h_o
              </div>
              <div className="p-2 bg-black border border-white/15 rounded">
                <strong>Linear Analysis Graph:</strong><br />
                1/v = 1/f - 1/|u|  (y-intercept = 1/f)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS: FORMAL LAB REPORT ───────────────────── */}
      {showReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0c] border border-white rounded-xl max-w-2xl w-full p-6 space-y-4 text-white my-8 font-mono">
            <div className="flex justify-between items-center border-b border-white/20 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider">📄 Formal Optics Laboratory Report</h3>
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
                Virtual Physics Laboratory: Convex Lens Focal Length Determination
              </h2>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()} | <strong>Researcher:</strong> Student</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">1. Objective</h3>
              <p>To experimentally determine the focal length of a biconvex lens by obtaining sharp real images for multiple object distances on an optical bench.</p>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">2. Recorded Optical Measurements</h3>
              <table className="w-full border-collapse border border-white text-left font-mono text-[10px]">
                <thead>
                  <tr className="bg-zinc-900 text-white">
                    <th className="border border-white p-1">Trial</th>
                    <th className="border border-white p-1">Object (cm)</th>
                    <th className="border border-white p-1">Lens (cm)</th>
                    <th className="border border-white p-1">Screen (cm)</th>
                    <th className="border border-white p-1">u (cm)</th>
                    <th className="border border-white p-1">v (cm)</th>
                    <th className="border border-white p-1">Calculated f (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="border border-white p-1">{r.trialId}</td>
                      <td className="border border-white p-1">{r.objectPos_cm}</td>
                      <td className="border border-white p-1">{r.lensPos_cm}</td>
                      <td className="border border-white p-1">{r.screenPos_cm}</td>
                      <td className="border border-white p-1">{r.u_cm}</td>
                      <td className="border border-white p-1">{r.v_cm}</td>
                      <td className="border border-white p-1 font-bold">{r.f_calc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="font-bold text-white text-sm mt-3 font-mono">3. Results & Error Analysis</h3>
              <p><strong>Mean Focal Length (f_exp):</strong> {meanFocalLength.toFixed(2)} cm</p>
              <p><strong>Reference Lens Focal Length (f₀):</strong> 10.0 cm</p>
              <p><strong>Percentage Error:</strong> {overallPctError.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER: AI PHYSICS MENTOR ───────────────────── */}
      {showAi && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#0a0a0c] border-l border-white z-50 flex flex-col shadow-2xl font-mono">
          <div className="p-4 border-b border-white/20 flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Bot className="w-4 h-4 text-white" /> AI Physics Mentor
            </h3>
            <button onClick={() => setShowAi(false)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
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

          <div className="p-3 border-t border-white/20 flex flex-col gap-1.5">
            <span className="text-[10px] text-zinc-400 font-bold">Quick Prompt Chips:</span>
            {[
              "Explain the lens equation",
              "Why must I move the screen?",
              "Why is the image inverted?",
              "Explain my current setup",
              "Why is my focal length Booted?",
              "What does 1/v vs 1/u show me?",
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
                        q.includes('lens equation')
                          ? 'The thin lens equation 1/f = 1/v - 1/u relates object distance u, image distance v, and focal length f!'
                          : q.includes('screen')
                          ? 'Light rays from the object refract through the lens and intersect at a specific image plane. Moving the screen finds that sharp focus plane!'
                          : q.includes('inverted')
                          ? 'Real light rays cross over at the focal point, causing the top of the object to project below the principal axis on the screen!'
                          : `Current setup: Object at |u| = ${measuredUDisplay.toFixed(1)} cm gives theoretical image distance v = ${v_calculated_cm.toFixed(1)} cm. Your screen is at v = ${measuredVDisplay.toFixed(1)} cm.`,
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
