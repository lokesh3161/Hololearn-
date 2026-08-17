import { create } from 'zustand';
import type {
  CanvasObject,
  ToolType,
  ShapeSubtype,
  DetectionResult,
  SimulationId,
  AIMessage,
  AppMode,
} from '../types/canvas';

import type { Subject } from '../registry/types';

interface BoardState {
  // Canvas State
  objects: CanvasObject[];
  selectedIds: string[];
  activeTool: ToolType;
  activeShape: ShapeSubtype;
  strokeWidth: number;
  opacity: number;
  transform: { x: number; y: number; zoom: number };
  showGrid: boolean;

  // Active Subject Module
  activeSubject: Subject;
  setActiveSubject: (subject: Subject) => void;

  // App & Lesson State
  mode: AppMode;
  lessonTitle: string;
  
  // AI & Detection State
  activeDetection: DetectionResult | null;
  aiPanelOpen: boolean;
  activeTab: 'Assist' | 'Explain' | 'Simulate' | 'Quiz';
  aiMessages: AIMessage[];

  // Active Simulation
  activeSimulation: SimulationId | null;
  isSimulationMinimized: boolean;
  toggleMinimizeSimulation: () => void;

  // Modals & Subsystems
  isEquationModalOpen: boolean;
  isShareModalOpen: boolean;
  isPeriodicTableOpen: boolean;
  setPeriodicTableOpen: (open: boolean) => void;
  isChemistryCalcOpen: boolean;
  setChemistryCalcOpen: (open: boolean) => void;

  // Active Virtual Laboratory Subsystem
  activeLabId: string | null;
  isVirtualLabDashboardOpen: boolean;
  activeLabMode: 'guided' | 'practice' | 'challenge' | 'free' | 'research';
  setVirtualLabDashboardOpen: (open: boolean) => void;
  openVirtualLab: (labId: string, mode?: 'guided' | 'practice' | 'challenge' | 'free' | 'research') => void;
  closeVirtualLab: () => void;

  labState: {
    isLabOpen: boolean;
    experimentId: string | null;
    canResume: boolean;
    savedState: any | null;
  };
  labActions: {
    openLab: (id: string) => void;
    closeLab: () => void;
    pauseLab: () => void;
    resetLab: () => void;
    saveLab: (state: any) => void;
  };

  // History
  undoStack: CanvasObject[][];
  redoStack: CanvasObject[][];

  // Auto Convert State
  autoConvertShape: boolean;
  toggleAutoConvertShape: () => void;
  revertConversion: (id: string) => void;

  // Actions
  setTool: (tool: ToolType) => void;
  setShape: (shape: ShapeSubtype) => void;
  setStrokeWidth: (width: number) => void;
  setTransform: (transform: Partial<{ x: number; y: number; zoom: number }>) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  setMode: (mode: AppMode) => void;
  setLessonTitle: (title: string) => void;

  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, patch: Partial<CanvasObject>) => void;
  deleteSelectedObjects: () => void;
  clearCanvas: () => void;
  selectObject: (id: string, multi?: boolean) => void;
  clearSelection: () => void;

  setActiveDetection: (detection: DetectionResult | null) => void;
  dismissDetection: () => void;

  openSimulation: (simId: SimulationId) => void;
  closeSimulation: () => void;

  toggleAIPanel: () => void;
  setActiveTab: (tab: 'Assist' | 'Explain' | 'Simulate' | 'Quiz') => void;
  addAIMessage: (msg: Omit<AIMessage, 'id' | 'timestamp'>) => void;

  setEquationModalOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  objects: [],
  selectedIds: [],
  activeTool: 'pen',
  activeShape: 'circle',
  strokeWidth: 3,
  opacity: 1,
  transform: { x: 0, y: 0, zoom: 1 },
  showGrid: true,

  activeSubject: 'chemistry',
  setActiveSubject: (activeSubject) => set({ activeSubject }),

  mode: 'teacher',
  lessonTitle: "Physics 101: Newton's Laws & Mechanics",

  activeDetection: null,
  aiPanelOpen: true,
  activeTab: 'Assist',
  aiMessages: [
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Welcome to HoloLearn AI. Draw any shape or equation on the smartboard to begin real-time analysis and simulation.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ],

  activeSimulation: null,
  isSimulationMinimized: false,
  toggleMinimizeSimulation: () => set((state) => ({ isSimulationMinimized: !state.isSimulationMinimized })),
  isEquationModalOpen: false,
  isShareModalOpen: false,
  isPeriodicTableOpen: false,
  setPeriodicTableOpen: (isPeriodicTableOpen) => set({ isPeriodicTableOpen }),
  isChemistryCalcOpen: false,
  setChemistryCalcOpen: (isChemistryCalcOpen) => set({ isChemistryCalcOpen }),

  activeLabId: null,
  isVirtualLabDashboardOpen: false,
  activeLabMode: 'guided',

  labState: {
    isLabOpen: false,
    experimentId: null,
    canResume: false,
    savedState: null,
  },

  labActions: {
    openLab: (id: string) => {
      set((state) => ({
        activeLabId: id,
        isVirtualLabDashboardOpen: false,
        labState: {
          isLabOpen: true,
          experimentId: id,
          canResume: Boolean(state.labState.savedState && state.labState.experimentId === id),
          savedState: state.labState.savedState,
        },
      }));
    },
    closeLab: () => {
      set((state) => ({
        activeLabId: null,
        labState: {
          ...state.labState,
          isLabOpen: false,
        },
      }));
    },
    pauseLab: () => {
      // pause state toggle helper
    },
    resetLab: () => {
      // reset lab state helper
    },
    saveLab: (savedState: any) => {
      set((state) => ({
        labState: {
          ...state.labState,
          savedState,
          canResume: true,
        },
      }));
    },
  },

  setVirtualLabDashboardOpen: (isVirtualLabDashboardOpen) => set({ isVirtualLabDashboardOpen }),
  openVirtualLab: (labId, mode = 'guided') => {
    set({ activeLabMode: mode });
    get().labActions.openLab(labId);
  },
  closeVirtualLab: () => {
    get().labActions.closeLab();
  },

  undoStack: [],
  redoStack: [],

  autoConvertShape: true,
  toggleAutoConvertShape: () => set((state) => ({ autoConvertShape: !state.autoConvertShape })),
  revertConversion: (id: string) => {
    const currentObjs = get().objects;
    const targetObj = currentObjs.find((o) => o.id === id);
    if (targetObj && targetObj.originalStroke) {
      get().pushHistory();
      const nextObjects = currentObjs.map((o) => (o.id === id ? targetObj.originalStroke! : o));
      set({ objects: nextObjects });
    }
  },

  setTool: (activeTool) => set({ activeTool }),
  setShape: (activeShape) => set({ activeShape, activeTool: 'shape' }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setTransform: (patch) =>
    set((state) => ({ transform: { ...state.transform, ...patch } })),
  setZoom: (zoom) =>
    set((state) => ({
      transform: { ...state.transform, zoom: Math.min(Math.max(zoom, 0.5), 3.0) },
    })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setMode: (mode) => set({ mode }),
  setLessonTitle: (lessonTitle) => set({ lessonTitle }),

  pushHistory: () => {
    const { objects, undoStack } = get();
    set({
      undoStack: [...undoStack.slice(-20), JSON.parse(JSON.stringify(objects))],
      redoStack: [],
    });
  },

  addObject: (obj) => {
    get().pushHistory();
    set((state) => ({ objects: [...state.objects, obj] }));
  },

  updateObject: (id, patch) => {
    set((state) => ({
      objects: state.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  },

  deleteSelectedObjects: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    get().pushHistory();
    set((state) => ({
      objects: state.objects.filter((o) => !selectedIds.includes(o.id)),
      selectedIds: [],
      activeDetection: state.activeDetection && selectedIds.includes(state.activeDetection.objectId) ? null : state.activeDetection,
    }));
  },

  clearCanvas: () => {
    get().pushHistory();
    set({ objects: [], selectedIds: [], activeDetection: null });
  },

  selectObject: (id, multi = false) => {
    set((state) => ({
      selectedIds: multi
        ? state.selectedIds.includes(id)
          ? state.selectedIds.filter((i) => i !== id)
          : [...state.selectedIds, id]
        : [id],
    }));
  },

  clearSelection: () => set({ selectedIds: [] }),

  setActiveDetection: (activeDetection) => set({ activeDetection }),
  dismissDetection: () => set({ activeDetection: null }),

  openSimulation: (activeSimulation) => set({ activeSimulation, isSimulationMinimized: false }),
  closeSimulation: () => set({ activeSimulation: null, isSimulationMinimized: false }),

  toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),
  setActiveTab: (activeTab) => set({ activeTab }),

  addAIMessage: (msg) => {
    const newMsg: AIMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    set((state) => ({ aiMessages: [...state.aiMessages, newMsg] }));
  },

  setEquationModalOpen: (isEquationModalOpen) => set({ isEquationModalOpen }),
  setShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),

  undo: () => {
    const { undoStack, objects, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    set({
      objects: previous,
      undoStack: undoStack.slice(0, -1),
      redoStack: [JSON.parse(JSON.stringify(objects)), ...redoStack],
      selectedIds: [],
    });
  },

  redo: () => {
    const { redoStack, objects, undoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    set({
      objects: next,
      redoStack: redoStack.slice(1),
      undoStack: [...undoStack, JSON.parse(JSON.stringify(objects))],
      selectedIds: [],
    });
  },
}));
