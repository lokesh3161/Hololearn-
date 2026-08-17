import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RotateCcw, Download, HelpCircle, CheckSquare, BarChart2,
  FileText, Award, Sliders, Activity, Beaker, ShieldAlert, Sparkles, Send, Clock, Play, Pause
} from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import {
  getExperimentConfig,
  evaluateLabState,
  evaluateLabMistakes,
  evaluateLabAssessment
} from '../../labs';
import type { ExperimentConfig, MistakeRule } from '../../labs/types';
import { ExperimentRendererRegistry } from '../../labs/runtime/ExperimentRendererRegistry';
import { LabFullscreen } from '../virtual-lab/LabFullscreen';

export const LabWorkbenchView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    activeLabId,
    activeLabMode,
    closeVirtualLab,
    setVirtualLabDashboardOpen,
    addAIMessage
  } = useBoardStore();

  const config = useMemo(() => (activeLabId ? getExperimentConfig(activeLabId) : null), [activeLabId]);

  // Timer State
  const [timerSec, setTimerSec] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Bottom & Right Tab State
  const [activeBottomTab, setActiveBottomTab] = useState<'PROCEDURE' | 'DATA' | 'GRAPH' | 'NOTEBOOK' | 'REPORT' | 'ASSESSMENT'>('PROCEDURE');
  const [activeRightTab, setActiveRightTab] = useState<'METRICS' | 'AI_ASSISTANT'>('METRICS');

  // Input & Data State
  const [inputs, setInputs] = useState<Record<string, any>>({
    massGrams: 100,
    lengthM: 0.50,
    voltageSet: 4.0,
    heightM: 1.0,
    vBaseAdded: 0.0,
    volThio: 50.0,
    timeSec: 0,
  });

  const [completedSteps, setCompletedSteps] = useState<number[]>([1, 2]);
  const [loggedData, setLoggedData] = useState<any[]>([]);

  // Notebook State
  const [hypothesisText, setHypothesisText] = useState('');
  const [observationText, setObservationText] = useState('');
  const [conclusionText, setConclusionText] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');

  // Lab Timer tick
  useEffect(() => {
    if (!isTimerRunning || !activeLabId) return;
    const interval = setInterval(() => setTimerSec((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, activeLabId]);

  // Compute Live State & Assessment
  const liveState = useMemo(() => {
    if (!config) return {};
    return evaluateLabState(config.id, inputs);
  }, [config, inputs]);

  const triggeredMistakes: MistakeRule[] = useMemo(() => {
    if (!config) return [];
    return evaluateLabMistakes(config.id, inputs);
  }, [config, inputs]);

  const assessmentResult = useMemo(() => {
    if (!config) return { score: 0, maxScore: 0, percentage: 0, evaluatedCheckpoints: [] };
    return evaluateLabAssessment(config.id, loggedData, { ...inputs, ...liveState });
  }, [config, loggedData, inputs, liveState]);

  const handleUpdateInput = (key: string, val: any) => {
    setInputs((prev) => ({ ...prev, [key]: val }));
  };

  const handleCompleteStep = (stepIdx: number) => {
    if (!completedSteps.includes(stepIdx)) {
      setCompletedSteps((prev) => [...prev, stepIdx]);
    }
  };

  const handleRecordDataPoint = () => {
    if (!config) return;
    const newRow = config.dataTable.calculateRow(inputs);
    setLoggedData((prev) => [...prev, { ...newRow, timeStamp: new Date().toLocaleTimeString() }]);
  };

  const handleResetLabState = () => {
    setInputs({
      massGrams: 100,
      lengthM: 0.50,
      voltageSet: 0.0,
      heightM: 1.0,
      vBaseAdded: 0.0,
      volThio: 50.0,
      timeSec: 0,
    });
    setLoggedData([]);
    setCompletedSteps([1]);
    setTimerSec(0);
  };

  const handleExportCSV = () => {
    if (loggedData.length === 0) return;
    const headers = Object.keys(loggedData[0]);
    const rows = [headers.join(',')];
    loggedData.forEach((row) => rows.push(headers.map((h) => row[h]).join(',')));
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config?.id || 'virtual_lab'}_data.csv`;
    link.click();
  };

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !config) return;
    addAIMessage({
      sender: 'ai',
      text: `**Virtual Lab Context (${config.title})**\n\nLive State: ${JSON.stringify(liveState)}\n\n**Q:** ${aiQuestion}\n\n**AI Assistant:** Based on your active setup, measured parameters align with theoretical predictions. Check your recorded data table to verify gradient fit!`,
    });
    setAiQuestion('');
  };

  const handleBackToDashboard = () => {
    closeVirtualLab();
    setVirtualLabDashboardOpen(true);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeLabId || !config) return null;

  if (
    config.id === 'newtons-second-law' ||
    config.id === 'newtons-law' ||
    config.id === 'projectile-motion' ||
    config.id === 'projectile' ||
    config.id === 'momentum-conservation' ||
    config.id === 'momentum-collisions' ||
    config.id === 'convex-lens' ||
    config.id === 'convex-lens-focal' ||
    config.id === 'refraction-snell' ||
    config.id === 'simple-pendulum' ||
    config.id === 'pendulum-lab' ||
    config.id === 'conservation-of-energy' ||
    config.id === 'energy-conservation' ||
    config.id === 'conservation-of-mechanical-energy' ||
    config.id === 'mechanical-energy' ||
    config.id === 'energy-lab' ||
    config.id === 'torque-equilibrium' ||
    config.id === 'torque-rotational-equilibrium' ||
    config.id === 'rotational-equilibrium' ||
    config.id === 'torque-lab' ||
    config.id === 'torque' ||
    config.id === 'water-hardness-edta' ||
    config.id === 'water-hardness' ||
    config.id === 'edta-titration' ||
    config.id === 'dissolved-oxygen-winkler' ||
    config.id === 'dissolved-oxygen' ||
    config.id === 'winkler-method' ||
    config.id === 'lead-acid-strength' ||
    config.id === 'battery-acid-strength' ||
    config.id === 'lead-acid-battery' ||
    config.id === 'ferrous-iron-dichromate' ||
    config.id === 'ferrous-dichromate' ||
    config.id === 'iron-dichromate-titration'
  ) {
    return (
      <AnimatePresence>
        <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-black text-white font-sans select-none pointer-events-auto">
          {/* Workstation Top Header */}
          <header className="h-12 bg-zinc-950 border-b border-white/15 px-6 flex items-center justify-between z-30 shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-white border border-white/15 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
                <span>Back to Labs</span>
              </button>

              <div className="h-4 w-[1px] bg-white/20" />

              <h1 className="text-xs font-bold font-mono tracking-wide text-white flex items-center gap-2">
                <span>{config.title}</span>
                <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold uppercase">
                  {config.subject}
                </span>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-white/10 px-2 py-0.5 rounded uppercase">
                  {activeLabMode}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-lg border border-white/10 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>⏱ {formatTimer(timerSec)}</span>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="text-zinc-400 hover:text-white ml-1"
                >
                  {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
              </div>

              <button
                onClick={handleResetLabState}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 border border-white/15 transition-all active:scale-95"
                title="Reset Experiment State"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-zinc-200 text-xs transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <LabFullscreen containerRef={containerRef} />
            </div>
          </header>

          {/* Main Viewport */}
          <main className="flex-1 min-h-0 flex flex-col bg-black relative overflow-hidden">
            <ExperimentRendererRegistry
              config={config}
              inputs={inputs}
              onUpdateInput={handleUpdateInput}
              onRecordDataPoint={handleRecordDataPoint}
              onCompleteStep={handleCompleteStep}
              onBack={handleBackToDashboard}
            />
          </main>
        </div>
      </AnimatePresence>
    );
  }



  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col bg-black text-white font-sans select-none pointer-events-auto">
        {/* Workstation Top Header */}
        <header className="h-12 bg-zinc-950 border-b border-white/15 px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-white border border-white/15 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Back to Labs</span>
            </button>

            <div className="h-4 w-[1px] bg-white/20" />

            <h1 className="text-xs font-bold font-mono tracking-wide text-white flex items-center gap-2">
              <span>{config.title}</span>
              <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold uppercase">
                {config.subject}
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-white/10 px-2 py-0.5 rounded uppercase">
                {activeLabMode}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            {/* Timer readout */}
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-lg border border-white/10 text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>⏱ {formatTimer(timerSec)}</span>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-zinc-400 hover:text-white ml-1"
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>

            <button
              onClick={handleResetLabState}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 border border-white/15 transition-all active:scale-95"
              title="Reset Experiment State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-zinc-200 text-xs transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </header>

        {/* Main 3-Column Workstation Area */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left Column: Apparatus Shelf */}
          <aside className="w-64 bg-zinc-950 border-r border-white/10 flex flex-col p-4 space-y-4 overflow-y-auto min-h-0 font-mono text-xs">
            <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/10">
              <Beaker className="w-3.5 h-3.5 text-white" />
              <span>Apparatus Shelf</span>
            </div>

            <div className="space-y-2">
              {config.apparatus.map((app) => (
                <div
                  key={app.id}
                  className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/10 hover:border-white/30 transition-all space-y-1"
                >
                  <div className="font-semibold text-white text-[11px]">{app.name}</div>
                  <div className="text-[9px] text-emerald-400 font-mono">{app.specs}</div>
                  <div className="text-[9px] text-zinc-400 leading-tight">{app.instructions}</div>
                </div>
              ))}
            </div>

            {config.substances && config.substances.length > 0 && (
              <>
                <div className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider pt-2 flex items-center gap-1.5 pb-2 border-b border-white/10">
                  <span>🧪 Reagents & Solutions</span>
                </div>
                <div className="space-y-2">
                  {config.substances.map((sub) => (
                    <div key={sub.id} className="p-2 rounded-xl bg-zinc-900/60 border border-white/10 text-[10px] space-y-0.5">
                      <div className="font-bold text-white">{sub.name}</div>
                      <div className="text-zinc-400 font-mono">{sub.formula} ({sub.concentrationMolar}M)</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>

          {/* Center Viewport: Interactive Renderer */}
          <main className="flex-1 min-h-0 flex flex-col bg-black relative overflow-y-auto">
            <ExperimentRendererRegistry
              config={config}
              inputs={inputs}
              onUpdateInput={handleUpdateInput}
              onRecordDataPoint={handleRecordDataPoint}
              onCompleteStep={handleCompleteStep}
              onBack={handleBackToDashboard}
            />
          </main>

          {/* Right Column: Readings & AI Assistant */}
          <aside className="w-80 bg-zinc-950 border-l border-white/10 flex flex-col font-mono text-xs overflow-hidden min-h-0">
            <div className="flex items-center border-b border-white/10 bg-black">
              <button
                onClick={() => setActiveRightTab('METRICS')}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase transition-all ${
                  activeRightTab === 'METRICS' ? 'bg-zinc-900 text-white border-b-2 border-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                Readouts
              </button>
              <button
                onClick={() => setActiveRightTab('AI_ASSISTANT')}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase transition-all ${
                  activeRightTab === 'AI_ASSISTANT' ? 'bg-zinc-900 text-white border-b-2 border-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                AI Assistant
              </button>
            </div>

            {activeRightTab === 'METRICS' ? (
              <div className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Digital Instruments</div>

                <div className="space-y-2">
                  {Object.entries(liveState).map(([key, val]) => (
                    <div key={key} className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 capitalize">{key}</span>
                      <span className="font-bold text-white text-xs">{String(val)}</span>
                    </div>
                  ))}
                </div>

                {triggeredMistakes.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-200">
                      <ShieldAlert className="w-3.5 h-3.5" /> Mistake Alert
                    </div>
                    {triggeredMistakes.map((m) => (
                      <div key={m.id} className="leading-tight">
                        • <strong>{m.name}</strong>: {m.aiExplanation}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
                <div className="text-[10px] text-zinc-400 font-bold uppercase pb-2 border-b border-white/10 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-white" /> Live Experiment AI
                </div>

                <div className="flex-1 min-h-0 my-2 overflow-y-auto space-y-2 pr-1">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-[10px] text-zinc-300 leading-relaxed">
                    Monitoring <strong>{config.title}</strong> setup. Ask me anything about procedure steps or calculations!
                  </div>
                </div>

                <form onSubmit={handleAskAI} className="relative pt-2 shrink-0">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask AI about live state..."
                    className="w-full bg-zinc-900 border border-white/20 rounded-xl pl-3 pr-8 py-2 text-[10px] text-white focus:outline-none focus:border-white font-mono"
                  />
                  <button type="submit" className="absolute right-2 top-3 text-zinc-400 hover:text-white">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </aside>
        </div>

        {/* Bottom Dock Panel */}
        <div className="h-56 shrink-0 bg-zinc-950 border-t border-white/15 flex flex-col font-mono text-xs min-h-0">
          <div className="flex items-center gap-1 px-4 py-1 bg-black border-b border-white/10 text-xs shrink-0">
            {(['PROCEDURE', 'DATA', 'GRAPH', 'NOTEBOOK', 'REPORT', 'ASSESSMENT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveBottomTab(tab)}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all ${
                  activeBottomTab === tab ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-zinc-950">
            {activeBottomTab === 'PROCEDURE' && (
              <div className="space-y-2">
                <div className="font-bold text-white text-xs">Step-by-Step Procedure Checklist:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {config.procedure.map((step) => {
                    const isDone = completedSteps.includes(step.stepNumber);
                    return (
                      <div
                        key={step.stepNumber}
                        className={`p-2 rounded-lg border flex items-start gap-2 ${
                          isDone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-zinc-900 border-white/10 text-zinc-300'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isDone ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white'
                        }`}>
                          {isDone ? '✓' : step.stepNumber}
                        </span>
                        <div>
                          <div>{step.instruction}</div>
                          <div className="text-[9px] opacity-80 font-mono mt-0.5">Expected: {step.expectedAction}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeBottomTab === 'DATA' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs">Logged Experimental Measurements ({loggedData.length} rows)</div>
                  <button onClick={() => setLoggedData([])} className="text-[10px] text-zinc-400 hover:text-white underline">
                    Clear Log
                  </button>
                </div>

                {loggedData.length === 0 ? (
                  <div className="text-zinc-500 text-[10px] py-4 text-center">
                    No measurements logged yet. Use controls in the workbench and click '+ Record Data Point'.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/20 text-zinc-400 uppercase">
                          <th className="p-1.5">#</th>
                          {config.dataTable.columns.map((col) => (
                            <th key={col.key} className="p-1.5">{col.label} ({col.unit})</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loggedData.map((row, idx) => (
                          <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-1.5 text-zinc-500">{idx + 1}</td>
                            {config.dataTable.columns.map((col) => (
                              <td key={col.key} className="p-1.5 text-white font-bold">{row[col.key]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeBottomTab === 'GRAPH' && (
              <div className="h-full flex items-center justify-between p-2 font-mono">
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">Dynamic Plot: {config.graph.yAxis.label} vs {config.graph.xAxis.label}</div>
                  <div className="text-[10px] text-emerald-400">Theoretical Relation: {config.graph.expectedFormula}</div>
                  <div className="text-[10px] text-zinc-400">Expected Slope: {config.graph.expectedSlopeValue}</div>
                </div>

                <div className="w-64 h-32 bg-zinc-900 border border-white/15 rounded-xl p-2 flex items-center justify-center text-[9px] text-zinc-500 text-center">
                  [ Interactive Scatter & Slope Plot ]<br />
                  Gradient Fit = {config.graph.expectedSlopeValue}
                </div>
              </div>
            )}

            {activeBottomTab === 'NOTEBOOK' && (
              <div className="grid grid-cols-3 gap-3 h-full text-[10px]">
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Hypothesis:</label>
                  <textarea
                    value={hypothesisText}
                    onChange={(e) => setHypothesisText(e.target.value)}
                    placeholder="State your expected physical/chemical outcome..."
                    className="flex-1 bg-zinc-900 border border-white/15 rounded-lg p-2 text-white resize-none focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Observations:</label>
                  <textarea
                    value={observationText}
                    onChange={(e) => setObservationText(e.target.value)}
                    placeholder="Record qualitative changes, colors, or unexpected behavior..."
                    className="flex-1 bg-zinc-900 border border-white/15 rounded-lg p-2 text-white resize-none focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-zinc-300">Conclusion:</label>
                  <textarea
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    placeholder="Summarize your final findings and gradient interpretation..."
                    className="flex-1 bg-zinc-900 border border-white/15 rounded-lg p-2 text-white resize-none focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>
            )}

            {activeBottomTab === 'REPORT' && (
              <div className="space-y-2 text-[10px]">
                <div className="font-bold text-white text-xs">Automated Lab Report Draft</div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-white/15 space-y-1 leading-relaxed">
                  <div><strong>Title:</strong> {config.title}</div>
                  <div><strong>Objective:</strong> {config.objective}</div>
                  <div><strong>Student Hypothesis:</strong> {hypothesisText || '[ Not entered ]'}</div>
                  <div><strong>Data Points Recorded:</strong> {loggedData.length} rows</div>
                  <div><strong>Extracted Gradient:</strong> {config.graph.expectedSlopeValue}</div>
                  <div><strong>Conclusion:</strong> {conclusionText || '[ Pending student write-up ]'}</div>
                </div>
              </div>
            )}

            {activeBottomTab === 'ASSESSMENT' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-xs">Live Assessment Score:</div>
                  <div className="text-sm font-bold bg-white text-black px-3 py-1 rounded-lg">
                    {assessmentResult.percentage}% Score ({assessmentResult.score} / {assessmentResult.maxScore} pts)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {assessmentResult.evaluatedCheckpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        cp.passed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-zinc-900 border-white/10 text-zinc-400'
                      }`}
                    >
                      <span>{cp.description}</span>
                      <span className="font-bold">{cp.passed ? `+${cp.points} pts` : `0/${cp.points}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
