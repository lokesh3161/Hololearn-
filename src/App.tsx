import React from 'react';
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
import { useBoardStore } from './store/boardStore';

export function App() {
  const {
    isPeriodicTableOpen,
    setPeriodicTableOpen,
    isChemistryCalcOpen,
    setChemistryCalcOpen,
  } = useBoardStore();

  return (
    <div className="relative h-screen w-screen bg-[#080808] overflow-hidden font-sans text-white select-none">
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

      {/* User-Triggered Action Modals */}
      <EquationModal />
      <ShareModal />
      <PeriodicTableModal isOpen={isPeriodicTableOpen} onClose={() => setPeriodicTableOpen(false)} />
      <ChemistryCalculatorModal isOpen={isChemistryCalcOpen} onClose={() => setChemistryCalcOpen(false)} />
    </div>
  );
}

export default App;
