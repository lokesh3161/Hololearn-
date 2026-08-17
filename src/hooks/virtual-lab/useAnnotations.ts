import { useState, useCallback, useRef } from 'react';
import { labSound } from '../../labs/utils/LabSoundManager';

export type LabInteractionMode = 'interact' | 'pen' | 'eraser';

export interface AnnotationPoint {
  x: number; // normalized [0, 1]
  y: number; // normalized [0, 1]
  pressure?: number;
}

export interface AnnotationStroke {
  id: string;
  points: AnnotationPoint[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
  timestamp: number;
}

export const PRESET_COLORS = [
  { id: 'red', name: 'Red', value: '#ef4444' },
  { id: 'blue', name: 'Blue', value: '#3b82f6' },
  { id: 'green', name: 'Green', value: '#22c55e' },
  { id: 'yellow', name: 'Yellow', value: '#eab308' },
  { id: 'white', name: 'White', value: '#ffffff' },
  { id: 'purple', name: 'Purple', value: '#a855f7' },
];

export const STROKE_WIDTHS = [
  { id: 'thin', label: 'Thin', value: 2 },
  { id: 'medium', label: 'Medium', value: 4 },
  { id: 'thick', label: 'Thick', value: 7 },
];

function distToSegmentSquared(
  p: AnnotationPoint,
  v: AnnotationPoint,
  w: AnnotationPoint
): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
}

export function useAnnotations() {
  const [mode, setModeState] = useState<LabInteractionMode>('interact');
  const [color, setColorState] = useState<string>('#3b82f6');
  const [strokeWidth, setStrokeWidthState] = useState<number>(4);

  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationStroke[][]>([]);

  const currentStrokeRef = useRef<AnnotationStroke | null>(null);

  const setMode = useCallback((newMode: LabInteractionMode) => {
    setModeState(newMode);
    labSound.playPause();
  }, []);

  const setColor = useCallback((newColor: string) => {
    setColorState(newColor);
    labSound.playLensDrag();
  }, []);

  const setStrokeWidth = useCallback((newWidth: number) => {
    setStrokeWidthState(newWidth);
    labSound.playLensDrag();
  }, []);

  const pushHistory = useCallback((currentStrokes: AnnotationStroke[]) => {
    setUndoStack((prev) => [...prev.slice(-30), currentStrokes]);
    setRedoStack([]);
  }, []);

  const startStroke = useCallback((point: AnnotationPoint) => {
    const newStroke: AnnotationStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      points: [point],
      color,
      width: strokeWidth,
      tool: 'pen',
      timestamp: Date.now(),
    };
    currentStrokeRef.current = newStroke;
    setStrokes((prev) => [...prev, newStroke]);
  }, [color, strokeWidth]);

  const addPointToStroke = useCallback((point: AnnotationPoint) => {
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(point);
    const updatedStroke = { ...currentStrokeRef.current };
    setStrokes((prev) =>
      prev.map((s) => (s.id === updatedStroke.id ? updatedStroke : s))
    );
  }, []);

  const endStroke = useCallback(() => {
    if (currentStrokeRef.current) {
      pushHistory(strokes.filter((s) => s.id !== currentStrokeRef.current?.id));
      currentStrokeRef.current = null;
    }
  }, [strokes, pushHistory]);

  const eraseStrokeAt = useCallback(
    (point: AnnotationPoint, radiusNorm: number = 0.02) => {
      const radiusSq = radiusNorm * radiusNorm;
      setStrokes((prev) => {
        const remaining = prev.filter((stroke) => {
          if (stroke.points.length === 1) {
            const dx = stroke.points[0].x - point.x;
            const dy = stroke.points[0].y - point.y;
            return dx * dx + dy * dy > radiusSq;
          }
          for (let i = 0; i < stroke.points.length - 1; i++) {
            const d2 = distToSegmentSquared(point, stroke.points[i], stroke.points[i + 1]);
            if (d2 <= radiusSq) {
              return false; // Erase stroke
            }
          }
          return true;
        });

        if (remaining.length !== prev.length) {
          pushHistory(prev);
          labSound.playScreenSlide();
        }
        return remaining;
      });
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [strokes, ...prev]);
    setStrokes(previous);
    setUndoStack((prev) => prev.slice(0, -1));
    labSound.playPause();
  }, [undoStack, strokes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes(next);
    setRedoStack((prev) => prev.slice(1));
    labSound.playPause();
  }, [redoStack, strokes]);

  const clearAll = useCallback(() => {
    if (strokes.length === 0) return;
    pushHistory(strokes);
    setStrokes([]);
    labSound.playReset();
  }, [strokes, pushHistory]);

  return {
    mode,
    setMode,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    strokes,
    startStroke,
    addPointToStroke,
    endStroke,
    eraseStrokeAt,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    clearAll,
  };
}
