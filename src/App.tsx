import React, { useEffect } from 'react';
import { Topbar } from './components/layout/Topbar';
import { LeftToolbar } from './components/layout/LeftToolbar';
import { SmartboardCanvas } from './components/canvas/SmartboardCanvas';
import { AIPanel } from './components/ai-panel/AIPanel';
import { BottomBar } from './components/layout/BottomBar';
import { SimulationOverlay } from './components/simulations/SimulationOverlay';
import { EquationModal } from './components/modals/EquationModal';
import { ShareModal } from './components/modals/ShareModal';
import { PeriodicTableModal } from './subjects/chemistry/periodic/PeriodicTableModal';
import { ChemistryCalculatorModal } from './subjects/chemistry/components/ChemistryCalculatorModal';
import { VirtualLabDashboard } from './components/labs/VirtualLabDashboard';
import { VirtualLabWorkbench } from './components/labs/VirtualLabWorkbench';
import { useBoardStore } from './store/boardStore';
import type { CanvasObject } from './types/canvas';
import { scheduleDetection } from './services/detectionService';

export function App() {
  const {
    addObject,
    setActiveDetection,
    objects,
    isPeriodicTableOpen,
    setPeriodicTableOpen,
    isChemistryCalcOpen,
    setChemistryCalcOpen,
  } = useBoardStore();

  // Load initial demo equation F = ma on first mount
  useEffect(() => {
    if (objects.length === 0) {
      const demoEq: CanvasObject = {
        id: 'eq-demo-newton',
        type: 'equation',
        points: [{ x: 260, y: 180 }],
        x: 260,
        y: 180,
        width: 140,
        height: 45,
        strokeColor: '#ffffff',
        strokeWidth: 2,
        opacity: 1,
        mathLatex: 'F = ma',
        zIndex: 1,
        isGlowing: true,
      };

      addObject(demoEq);
      scheduleDetection(demoEq, setActiveDetection);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden font-sans text-white select-none">
      {/* Topbar */}
      <Topbar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <LeftToolbar />
        <SmartboardCanvas />
        <AIPanel />
      </div>

      {/* Bottom Bar */}
      <BottomBar />

      {/* Modals & Overlays */}
      <SimulationOverlay />
      <VirtualLabDashboard />
      <VirtualLabWorkbench />
      <EquationModal />
      <ShareModal />
      <PeriodicTableModal isOpen={isPeriodicTableOpen} onClose={() => setPeriodicTableOpen(false)} />
      <ChemistryCalculatorModal isOpen={isChemistryCalcOpen} onClose={() => setChemistryCalcOpen(false)} />
    </div>
  );
}

export default App;
