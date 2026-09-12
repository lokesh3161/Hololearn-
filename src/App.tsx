import React, { useState } from 'react';
import { SmartboardCanvas } from './components/canvas/SmartboardCanvas';
import { MinimalTopbar } from './components/layout/MinimalTopbar';
import { FloatingToolbar } from './components/layout/FloatingToolbar';
import { SimulationOverlay } from './components/simulations/SimulationOverlay';
import { VirtualLabDashboard } from './components/labs/VirtualLabDashboard';
import { VirtualLabWorkbench } from './components/labs/VirtualLabWorkbench';
import { EquationModal } from './components/modals/EquationModal';
import { ShareModal } from './components/modals/ShareModal';
import { PeriodicTableModal } from './subjects/chemistry/periodic/PeriodicTableModal';
import { ChemistryCalculatorModal } from './subjects/chemistry/components/ChemistryCalculatorModal';
import { SmartStylusControlPanel } from '../smart-stylus/ui/SmartStylusControlPanel';
import SmartStylusTestPanel from '../smart-stylus/phase-1/ble-test/SmartStylusTestPanel';
import { useBoardStore } from './store/boardStore';

export function App() {
  const {
    isPeriodicTableOpen,
    setPeriodicTableOpen,
    isChemistryCalcOpen,
    setChemistryCalcOpen,
    isStylusPanelOpen,
    setStylusPanelOpen,
  } = useBoardStore();

  const [showHardwareTest, setShowHardwareTest] = useState(true);

  return (
    <div className="relative h-screen w-screen bg-[#080808] overflow-hidden font-sans text-white select-none">
      {/* Top Banner Toggle for Phase 1 Hardware BLE Test */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 bg-black/80 border border-cyan-500/30 rounded-full px-4 py-1.5 backdrop-blur-md shadow-lg text-xs">
        <span className="text-zinc-400 font-mono">MODE:</span>
        <button
          onClick={() => setShowHardwareTest(true)}
          className={`px-3 py-1 rounded-full font-semibold transition-all ${
            showHardwareTest
              ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          ESP32 BLE Hardware Test
        </button>
        <button
          onClick={() => setShowHardwareTest(false)}
          className={`px-3 py-1 rounded-full font-semibold transition-all ${
            !showHardwareTest
              ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          HoloLearn Smartboard Canvas
        </button>
      </div>

      {showHardwareTest ? (
        <div className="fixed inset-0 z-[9999] overflow-auto bg-[#080808]">
          <SmartStylusTestPanel />
        </div>
      ) : (
        <>
          {/* Layer 1 — 95%+ Viewport Full Screen HTML5 Blackboard Canvas */}
          <SmartboardCanvas />

          {/* Layer 2 — Minimal Top Control */}
          <MinimalTopbar />

          {/* Layer 3 — Compact Floating Tool Dock */}
          <FloatingToolbar />

          {/* Interactive Subsystems & Virtual Labs */}
          <SimulationOverlay />
          <VirtualLabDashboard />
          <VirtualLabWorkbench />

          {/* Smart Stylus Subsystem Developer Control Panel */}
          {isStylusPanelOpen && (
            <SmartStylusControlPanel onClose={() => setStylusPanelOpen(false)} />
          )}

          {/* User-Triggered Action Modals */}
          <EquationModal />
          <ShareModal />
          <PeriodicTableModal isOpen={isPeriodicTableOpen} onClose={() => setPeriodicTableOpen(false)} />
          <ChemistryCalculatorModal isOpen={isChemistryCalcOpen} onClose={() => setChemistryCalcOpen(false)} />
        </>
      )}
    </div>
  );
}

export default App;
