import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, HelpCircle, Minimize2, Maximize2, Move, Download, Table, Activity, Play, Pause, RotateCcw } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { ProjectileMotionSim } from './ProjectileMotionSim';
import { NewtonForceSim } from './NewtonForceSim';
import { OhmLawSim } from './OhmLawSim';
import { QuadraticGraphSim } from './QuadraticGraphSim';
import { WaveEquationSim } from './WaveEquationSim';
import { HarmonicMotionSim } from './HarmonicMotionSim';
import { CircleAreaSim } from './CircleAreaSim';
import { KineticSim } from './KineticSim';
import { GravitationSim } from './GravitationSim';
import { LensSim } from './LensSim';
import { GasSim } from './GasSim';
import { PendulumSim } from './PendulumSim';
import { CircuitSim } from './CircuitSim';
import { LorentzSim } from './LorentzSim';
import { ThermodynamicSim } from './ThermodynamicSim';
import { FluidSim } from './FluidSim';
import { InterferenceSim } from './InterferenceSim';
import { PhotoelectricSim } from './PhotoelectricSim';
import { DecaySim } from './DecaySim';
import { Geometry3DSim } from './Geometry3DSim';
import { ChemistrySim } from './ChemistrySim';
import { TitrationSim } from '../../subjects/chemistry/simulations/TitrationSim';
import { WaterLabSim } from '../../subjects/chemistry/simulations/WaterLabSim';
import { GasLawSim } from '../../subjects/chemistry/simulations/GasLawSim';
import { KineticsSim } from '../../subjects/chemistry/simulations/KineticsSim';
import { EquilibriumSim } from '../../subjects/chemistry/simulations/EquilibriumSim';
import { ElectrochemistrySim } from '../../subjects/chemistry/simulations/ElectrochemistrySim';
import { simulationMetadata } from '../../registry/simulationRegistry';
import { virtualLab, type DataPoint } from '../../engines/VirtualLab';

type OverlayTab = 'SIMULATION' | 'FORMULA' | 'GRAPH' | 'EXPLAIN' | 'QUIZ' | 'DATA';

export const SimulationOverlay: React.FC = () => {
  const {
    activeSimulation,
    isSimulationMinimized,
    toggleMinimizeSimulation,
    closeSimulation,
    addAIMessage,
    toggleAIPanel,
    aiPanelOpen,
    setActiveTab,
  } = useBoardStore();

  const [activeOverlayTab, setActiveOverlayTab] = useState<OverlayTab>('SIMULATION');
  const [isLabLogging, setIsLabLogging] = useState<boolean>(false);
  const [labLogData, setLabLogData] = useState<DataPoint[]>([]);

  const dragControls = useDragControls();

  useEffect(() => {
    if (!activeSimulation) return;
    console.log('[Pipeline Step 9 & 10] Loading & Rendering simulation component for:', activeSimulation);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSimulation();
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [activeSimulation, closeSimulation]);

  if (!activeSimulation) return null;

  const metadata = simulationMetadata[activeSimulation] || {
    name: 'Interactive STEM Simulation',
    description: 'Dynamic parameter simulation',
    equations: [],
    subject: 'physics',
  };

  const handleExplain = () => {
    if (!aiPanelOpen) toggleAIPanel();
    setActiveTab('Explain');
    addAIMessage({
      sender: 'ai',
      text: `**Active Simulation Context: ${metadata.name}**\n\n${metadata.description}\n\nAdjust parameter sliders or hotkeys to observe live mathematical scaling.`,
    });
  };

  const toggleVirtualLab = () => {
    if (!isLabLogging) {
      virtualLab.startLogging(`Virtual Experiment Log for ${metadata.name}`);
      setIsLabLogging(true);
      // Sample mock data for lab logger
      const interval = setInterval(() => {
        if (!virtualLab.getDataLog()) {
          clearInterval(interval);
          return;
        }
        virtualLab.recordDataPoint({
          value: Number((Math.random() * 20 + 5).toFixed(2)),
          ratio: Number((Math.random() * 2 + 1).toFixed(3)),
        });
        setLabLogData([...virtualLab.getDataLog()]);
      }, 500);
    } else {
      virtualLab.stopLogging();
      setIsLabLogging(false);
    }
  };

  const handleExportCSV = () => {
    virtualLab.exportToCSV(`${activeSimulation}_experiment_data.csv`);
  };

  const renderSimComponent = () => {
    switch (activeSimulation) {
      case 'projectile':
        return <ProjectileMotionSim />;
      case 'newton':
      case 'circular':
      case 'torque':
        return <NewtonForceSim />;
      case 'ohm':
        return <OhmLawSim />;
      case 'graph':
        return <QuadraticGraphSim />;
      case 'wave':
        return <WaveEquationSim />;
      case 'shm':
        return <HarmonicMotionSim />;
      case 'circle-area':
        return <CircleAreaSim />;
      case 'kinetic':
      case 'einstein':
        return <KineticSim />;
      case 'gravitation':
        return <GravitationSim />;
      case 'lens':
      case 'refraction':
        return <LensSim />;
      case 'gas':
        return <GasSim />;
      case 'pendulum':
        return <PendulumSim />;
      case 'circuit':
      case 'capacitor':
        return <CircuitSim />;
      case 'lorentz':
      case 'coulomb':
      case 'field':
        return <LorentzSim />;
      case 'thermodynamic':
      case 'heat':
        return <ThermodynamicSim />;
      case 'fluid':
        return <FluidSim />;
      case 'interference':
        return <InterferenceSim />;
      case 'photoelectric':
        return <PhotoelectricSim />;
      case 'decay':
        return <DecaySim />;
      case 'geometry3d':
        return <Geometry3DSim />;
      case 'chemistry':
        return <ChemistrySim />;
      case 'titration':
        return <TitrationSim />;
      case 'water-lab':
        return <WaterLabSim />;
      case 'kinetics':
        return <KineticsSim />;
      case 'equilibrium':
        return <EquilibriumSim />;
      case 'electrochemistry':
        return <ElectrochemistrySim />;
      default:
        return <NewtonForceSim />;
    }
  };

  // Minimized Widget View
  if (isSimulationMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#111111] border border-white/20 rounded-xl shadow-2xl p-3 flex items-center gap-3 backdrop-blur-xl text-white select-none"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold">{metadata.name}</span>
            <span className="text-[10px] text-zinc-400 font-mono">Simulating Active</span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={toggleMinimizeSimulation}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Expand Simulation"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={closeSimulation}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Close Simulation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Full Screen Modal Overlay View
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md pointer-events-auto select-none">
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[88vw] max-w-6xl h-[82vh] bg-[#0d0d0d] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden glass-panel-elevated"
        >
          {/* Simulation Header / Drag Bar */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/50 cursor-move"
          >
            <div className="flex items-center gap-3">
              <Move className="w-4 h-4 text-zinc-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <div>
                <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  {metadata.name}
                  <span className="text-[10px] font-mono text-black font-bold bg-white px-2 py-0.5 rounded border border-white uppercase shadow-sm">
                    {metadata.subject || 'PHYSICS'}
                  </span>
                </h2>
              </div>
            </div>

            {/* Overlay Navigation Tabs */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-white/10 text-xs">
              {(['SIMULATION', 'FORMULA', 'GRAPH', 'EXPLAIN', 'DATA'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveOverlayTab(tab)}
                  className={`px-3 py-1 rounded-md font-mono text-[11px] transition-all ${
                    activeOverlayTab === tab
                      ? 'bg-white text-black font-semibold shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExplain}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white border border-white/15 transition-all font-medium active:scale-95"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Explain</span>
              </button>

              <button
                onClick={toggleMinimizeSimulation}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize Widget"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              <button
                onClick={closeSimulation}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-view Content based on activeOverlayTab */}
          {activeOverlayTab === 'SIMULATION' && (
            <div className="flex-1 flex overflow-hidden">
              {renderSimComponent()}
            </div>
          )}

          {activeOverlayTab === 'FORMULA' && (
            <div className="flex-1 p-8 text-white space-y-4 overflow-y-auto font-mono bg-black/80">
              <h3 className="text-base font-bold border-b border-white/10 pb-2">Mathematical Formulation</h3>
              <p className="text-sm text-zinc-300">{metadata.description}</p>
              <div className="bg-zinc-900 p-4 rounded-xl border border-white/15 text-sm space-y-2">
                <div className="text-zinc-400 uppercase text-xs">Equations in this Domain:</div>
                {metadata.equations.map((eq: string, i: number) => (
                  <div key={i} className="font-mono text-white text-base">
                    \({eq}\)
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeOverlayTab === 'GRAPH' && (
            <div className="flex-1 flex overflow-hidden">
              <QuadraticGraphSim />
            </div>
          )}

          {activeOverlayTab === 'EXPLAIN' && (
            <div className="flex-1 p-8 text-white space-y-4 overflow-y-auto bg-black/80">
              <h3 className="text-base font-bold border-b border-white/10 pb-2 font-mono">Conceptual Overview & JEE Strategy</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                This simulation models non-linear variable scaling across physical state transitions. Master the exact quadratic and linear dependencies to solve complex entrance examination problems.
              </p>
            </div>
          )}

          {activeOverlayTab === 'DATA' && (
            <div className="flex-1 p-6 text-white space-y-4 overflow-y-auto font-mono bg-black/90">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Table className="w-4 h-4 text-white" />
                    Virtual Laboratory Data Logger
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time physical parameter sampling table
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleVirtualLab}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isLabLogging
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                        : 'bg-white text-black border-white hover:bg-zinc-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{isLabLogging ? 'Logging Data...' : 'Start Virtual Lab'}</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-white/15 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 border-b border-white/10 text-zinc-400 text-[10px] uppercase font-mono">
                    <tr>
                      <th className="p-2.5">Time (s)</th>
                      <th className="p-2.5">Recorded Parameter</th>
                      <th className="p-2.5">Ratio Factor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                    {labLogData.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-zinc-500">
                          No lab data recorded yet. Click "Start Virtual Lab" to log real-time data.
                        </td>
                      </tr>
                    ) : (
                      labLogData.slice().reverse().map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="p-2.5 font-bold text-white">{row.time} s</td>
                          <td className="p-2.5">{row.value}</td>
                          <td className="p-2.5">{row.ratio}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
