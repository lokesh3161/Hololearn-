import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, PenTool, Bug } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import type { CanvasObject, Point, DetectionResult } from '../../types/canvas';
import { scheduleDetection, calculateBoundingBox } from '../../services/detectionService';
import { FloatingSuggestion } from './FloatingSuggestion';
import { RightSideSuggestionPill } from './RightSideSuggestionPill';
import { ShapeRecognitionBadge } from './ShapeRecognitionBadge';
import { ShapeRecognitionEngine } from '../../recognition/ShapeRecognitionEngine';
import { LongPressDetector } from '../../recognition/LongPressDetector';
import { ShapeConverter } from '../../recognition/ShapeConverter';
import type { RecognitionResult } from '../../recognition/types';
import { PenInputEngine } from '../../pen/PenInputEngine';
import { inkRenderer } from '../../pen/InkRenderer';
import { PenDiagnosticsPanel } from '../../pen/PenDiagnosticsPanel';
import type { PenPoint, PointerDeviceType } from '../../pen/types';

const shapeEngine = new ShapeRecognitionEngine();
const shapeConverter = new ShapeConverter();

export const SmartboardCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const penInputEngineRef = useRef<PenInputEngine>(new PenInputEngine());

  const {
    objects,
    selectedIds,
    activeTool,
    activeShape,
    strokeWidth,
    opacity,
    transform,
    showGrid,
    mode,
    addObject,
    updateObject,
    deleteSelectedObjects,
    selectObject,
    setTransform,
    setActiveDetection,
    activeDetection,
    setEquationModalOpen,
    pushHistory,
    addAIMessage,
  } = useBoardStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<PenPoint[]>([]);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const [activePointerType, setActivePointerType] = useState<PointerDeviceType>('mouse');
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [lastPenPoint, setLastPenPoint] = useState<PenPoint | null>(null);

  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);

  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [targetStrokeId, setTargetStrokeId] = useState<string | null>(null);
  const [longPressProgress, setLongPressProgress] = useState<number>(0);
  const [longPressScreenPos, setLongPressScreenPos] = useState<{ x: number; y: number } | null>(null);

  const longPressDetectorRef = useRef<LongPressDetector | null>(null);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      if (!containerRef.current) return { x: screenX, y: screenY };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - transform.x) / transform.zoom;
      const y = (screenY - rect.top - transform.y) / transform.zoom;
      return { x, y };
    },
    [transform]
  );

  const zoomAtPoint = (newZoom: number, pivotX: number, pivotY: number) => {
    const currentZoom = transform.zoom;
    const clampedZoom = Math.min(Math.max(newZoom, 0.5), 3.0);
    const zoomRatio = clampedZoom / currentZoom;

    const newX = pivotX - (pivotX - transform.x) * zoomRatio;
    const newY = pivotY - (pivotY - transform.y) * zoomRatio;

    setTransform({ x: newX, y: newY, zoom: clampedZoom });
  };

  const handleResetZoom = () => {
    setTransform({ x: 0, y: 0, zoom: 1.0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pivotX = e.clientX - rect.left;
    const pivotY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    zoomAtPoint(transform.zoom * zoomFactor, pivotX, pivotY);
  };

  const triggerConversion = useCallback(
    (targetIdParam?: string, resultParam?: any) => {
      const currentObjs = useBoardStore.getState().objects;
      let targetId = targetIdParam || targetStrokeId;
      let result = resultParam || recognitionResult;

      if (!result || (!result.bestCandidate && !result.best)) return;

      let originalObj = currentObjs.find((o) => o.id === targetId);
      if (!originalObj) {
        originalObj = currentObjs.slice().reverse().find((o) => o.type === 'stroke');
        if (originalObj) targetId = originalObj.id;
      }

      if (!originalObj) return;

      const convRes = shapeEngine.convert(originalObj, result);
      if (!convRes || !convRes.success) return;

      const semantic = convRes.convertedObject;
      const bbox = result.metrics?.boundingBox || { x: originalObj.x, y: originalObj.y, width: originalObj.width, height: originalObj.height };

      let shapeSubtype: any = 'circle';
      if (semantic.type === 'rectangle' || semantic.type === 'square') shapeSubtype = 'rectangle';
      else if (semantic.type === 'triangle') shapeSubtype = 'triangle';
      else if (semantic.type === 'line') shapeSubtype = 'line';

      const convertedCanvasObj: CanvasObject = {
        id: semantic.id || `converted-${Date.now()}`,
        type: 'shape',
        shapeSubtype,
        points: shapeConverter.shapeToPoints(result.bestCandidate || result.best, 128),
        x: bbox.x,
        y: bbox.y,
        width: Math.max(bbox.width, 20),
        height: Math.max(bbox.height, 20),
        strokeColor: originalObj.strokeColor || '#ffffff',
        strokeWidth: Math.max(3.5, originalObj.strokeWidth || 3.5),
        opacity: originalObj.opacity ?? 1,
        zIndex: originalObj.zIndex || currentObjs.length + 1,
        semanticShape: semantic,
        recognizedShapeType: semantic.type,
        originalStroke: originalObj,
        isConverted: true,
      };

      pushHistory();
      useBoardStore.setState((state) => ({
        objects: state.objects.map((o) => (o.id === targetId ? convertedCanvasObj : o)),
      }));

      setRecognitionResult(null);
      setTargetStrokeId(null);
    },
    [targetStrokeId, recognitionResult, pushHistory]
  );

  const handleConvertCurrentStroke = useCallback(
    (detection?: DetectionResult) => {
      const strokeId = detection?.sourceObjectId || targetStrokeId;
      const res = detection?.recognitionResult || recognitionResult;

      if (res && strokeId) {
        triggerConversion(strokeId, res);
      } else if (objects.length > 0) {
        const lastStroke = objects.slice().reverse().find((o) => o.type === 'stroke');
        if (lastStroke) {
          const recognized = shapeEngine.recognizeSync(lastStroke);
          if (recognized && (recognized.bestCandidate || recognized.best)) {
            triggerConversion(lastStroke.id, recognized);
          }
        }
      }
    },
    [targetStrokeId, recognitionResult, objects, triggerConversion]
  );

  useEffect(() => {
    longPressDetectorRef.current = new LongPressDetector(() => {
      if (targetStrokeId && recognitionResult) {
        triggerConversion(targetStrokeId, recognitionResult);
      }
      setLongPressProgress(0);
    });
  }, [targetStrokeId, recognitionResult, triggerConversion]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.zoom, transform.zoom);

      if (showGrid) {
        const gridSpacing = 24;
        const startX = Math.floor(-transform.x / transform.zoom / gridSpacing) * gridSpacing - gridSpacing;
        const startY = Math.floor(-transform.y / transform.zoom / gridSpacing) * gridSpacing - gridSpacing;
        const endX = startX + displayWidth / transform.zoom + gridSpacing * 2;
        const endY = startY + displayHeight / transform.zoom + gridSpacing * 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let x = startX; x < endX; x += gridSpacing) {
          for (let y = startY; y < endY; y += gridSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      objects.forEach((obj) => {
        const isSelected = selectedIds.includes(obj.id);
        ctx.save();
        ctx.globalAlpha = obj.opacity ?? 1;

        try {
          if (obj.type === 'shape') {
            ctx.strokeStyle = obj.strokeColor || '#ffffff';
            ctx.lineWidth = Math.max(3.5, obj.strokeWidth || 3.5);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (obj.semanticShape && obj.semanticShape.geometry) {
              inkRenderer.renderSemanticShape(ctx, obj.semanticShape, isSelected, obj.strokeColor || '#ffffff', obj.strokeWidth || 3.5);
            } else {
              ctx.beginPath();
              const { x, y, width, height } = obj;
              if (obj.shapeSubtype === 'circle') {
                const radius = Math.max(Math.max(width, height) / 2, 10);
                ctx.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2);
              } else if (obj.shapeSubtype === 'rectangle' || obj.shapeSubtype === 'square') {
                ctx.strokeRect(x, y, width, height);
              } else if (obj.shapeSubtype === 'triangle') {
                ctx.moveTo(x + width / 2, y);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x, y + height);
                ctx.closePath();
              } else if (obj.shapeSubtype === 'line') {
                ctx.moveTo(x, y);
                ctx.lineTo(x + width, y + height);
              }
              ctx.stroke();
            }
          } else if (obj.type === 'stroke' || obj.type === 'handwriting') {
            if (obj.points && obj.points.length > 0) {
              const penPoints: PenPoint[] = obj.points.map((p) => ({
                x: p.x,
                y: p.y,
                pressure: p.pressure ?? 0.5,
                timestamp: p.timestamp ?? performance.now(),
                pointerType: p.pointerType || 'mouse',
                velocity: p.velocity || 0,
              }));

              inkRenderer.renderStroke(ctx, penPoints, obj.strokeColor || '#ffffff', obj.strokeWidth || 3.5, obj.opacity < 0.5);
            }
          } else if (obj.type === 'text' || obj.type === 'equation') {
            const content = obj.mathLatex || obj.text || '';
            ctx.save();
            ctx.font = obj.type === 'equation' ? '600 24px "JetBrains Mono", monospace' : '500 20px "Inter", sans-serif';
            const textMetrics = ctx.measureText(content);
            const paddingX = 14;
            const bgW = Math.max(textMetrics.width + paddingX * 2, obj.width || 120);
            const bgH = 44;

            ctx.fillStyle = 'rgba(12, 12, 12, 0.92)';
            ctx.strokeStyle = obj.type === 'equation' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1.5;

            ctx.fillRect(obj.x - 4, obj.y - 4, bgW, bgH);
            ctx.strokeRect(obj.x - 4, obj.y - 4, bgW, bgH);

            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'middle';
            ctx.fillText(content, obj.x + paddingX - 4, obj.y - 4 + bgH / 2);
            ctx.restore();
          }

          if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            ctx.strokeRect(obj.x - 6, obj.y - 6, obj.width + 12, obj.height + 12);
            ctx.setLineDash([]);
          }
        } catch (err) {
          console.error('[HoloLearn Render Safe Recover]', err);
        }

        ctx.restore();
      });

      if (isDrawing && currentPoints.length > 0) {
        inkRenderer.renderStroke(
          ctx,
          currentPoints,
          activeTool === 'highlighter' ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
          activeTool === 'highlighter' ? strokeWidth * 2.5 : Math.max(3.5, strokeWidth),
          activeTool === 'highlighter'
        );
      }

      ctx.restore();

      if (isHovering && hoverScreenPos && !isDrawing) {
        inkRenderer.renderHoverCursor(ctx, hoverScreenPos, strokeWidth);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [objects, selectedIds, isDrawing, currentPoints, activeTool, activeShape, strokeWidth, transform, showGrid, isHovering, hoverScreenPos]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const screenPos = { x: e.clientX, y: e.clientY };
    const pos = screenToCanvas(e.clientX, e.clientY);

    const pointerType = (e.pointerType || 'mouse') as PointerDeviceType;
    setActivePointerType(pointerType);

    if (e.button === 1 || (e.button === 0 && (e as any).spaceKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      return;
    }

    if (activeTool === 'select') {
      const clickedObj = objects.slice().reverse().find((obj) => {
        return (
          pos.x >= obj.x - 10 &&
          pos.x <= obj.x + obj.width + 10 &&
          pos.y >= obj.y - 10 &&
          pos.y <= obj.y + obj.height + 10
        );
      });

      if (clickedObj) {
        selectObject(clickedObj.id, e.shiftKey);
        setDragStart({ x: pos.x - clickedObj.x, y: pos.y - clickedObj.y });
      } else {
        useBoardStore.getState().clearSelection();
      }
      return;
    }

    if (activeTool === 'eraser') {
      const toDelete = objects.filter((obj) => {
        return (
          pos.x >= obj.x - 15 &&
          pos.x <= obj.x + obj.width + 15 &&
          pos.y >= obj.y - 15 &&
          pos.y <= obj.y + obj.height + 15
        );
      });
      if (toDelete.length > 0) {
        toDelete.forEach((o) => selectObject(o.id, true));
        deleteSelectedObjects();
      }
      return;
    }

    if (activeTool === 'equation') {
      setEquationModalOpen(true);
      return;
    }

    const penPoints = penInputEngineRef.current.normalizePointerEvent(e, (sx, sy) => screenToCanvas(sx, sy));

    if (penPoints.length > 0) {
      setIsDrawing(true);
      setCurrentPoints(penPoints);
      setLastPenPoint(penPoints[penPoints.length - 1]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const screenPos = { x: e.clientX, y: e.clientY };
    const pos = screenToCanvas(e.clientX, e.clientY);

    const pointerType = (e.pointerType || 'mouse') as PointerDeviceType;
    setActivePointerType(pointerType);

    if (e.buttons === 0) {
      setIsHovering(true);
      setHoverScreenPos(screenPos);
    } else {
      setIsHovering(false);
    }

    longPressDetectorRef.current?.move(pos);

    if (isPanning) {
      setTransform({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (dragStart && selectedIds.length > 0) {
      const targetId = selectedIds[0];
      updateObject(targetId, {
        x: pos.x - dragStart.x,
        y: pos.y - dragStart.y,
      });
      return;
    }

    if (!isDrawing) return;

    const penPoints = penInputEngineRef.current.normalizePointerEvent(e, (sx, sy) => screenToCanvas(sx, sy));

    if (penPoints.length > 0) {
      setCurrentPoints((prev) => [...prev, ...penPoints]);
      setLastPenPoint(penPoints[penPoints.length - 1]);
    }
  };

  const handlePointerUp = () => {
    longPressDetectorRef.current?.end();

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (dragStart) {
      setDragStart(null);
    }

    if (!isDrawing || currentPoints.length === 0) return;

    setIsDrawing(false);

    const bbox = calculateBoundingBox(currentPoints);

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const strokeObj: CanvasObject = {
        id: `stroke-${Date.now()}`,
        type: 'stroke',
        points: currentPoints,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        strokeColor: '#ffffff',
        strokeWidth: activeTool === 'highlighter' ? strokeWidth * 2.5 : Math.max(3.5, strokeWidth),
        opacity: activeTool === 'highlighter' ? 0.35 : opacity,
        zIndex: objects.length + 1,
      };

      addObject(strokeObj);

      const res = shapeEngine.recognizeSync(strokeObj);
      if (res && (res.bestCandidate || res.best)) {
        setRecognitionResult(res);
        setTargetStrokeId(strokeObj.id);

        scheduleDetection(strokeObj, (det) => {
          setActiveDetection({
            ...det,
            sourceObjectId: strokeObj.id,
            recognitionResult: res,
          });
        });

        const autoConvertEnabled = useBoardStore.getState().autoConvertShape;
        const bestCandidate = res.bestCandidate || res.best;
        if (autoConvertEnabled && bestCandidate && bestCandidate.confidence >= 0.70) {
          setTimeout(() => {
            triggerConversion(strokeObj.id, res);
            addAIMessage({
              sender: 'ai',
              text: `✨ Auto-converted freehand stroke into clean **${bestCandidate.type}** (${Math.round(
                bestCandidate.confidence * 100
              )}% match). Click 'Revert' or Undo if you want your original raw drawing back.`,
            });
          }, 250);
        }
      } else {
        scheduleDetection(strokeObj, setActiveDetection);
      }
    } else if (activeTool === 'shape') {
      const shapeObj: CanvasObject = {
        id: `shape-${Date.now()}`,
        type: 'shape',
        shapeSubtype: activeShape,
        points: currentPoints,
        x: bbox.x,
        y: bbox.y,
        width: Math.max(bbox.width, 20),
        height: Math.max(bbox.height, 20),
        strokeColor: '#ffffff',
        strokeWidth: Math.max(3.5, strokeWidth),
        opacity: opacity,
        zIndex: objects.length + 1,
      };

      addObject(shapeObj);
      scheduleDetection(shapeObj, setActiveDetection);
    }

    setCurrentPoints([]);
    penInputEngineRef.current.reset();
  };

  const handlePointerLeave = () => {
    setIsHovering(false);
    setHoverScreenPos(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full bg-[#0a0a0a] overflow-hidden cursor-crosshair select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onWheel={handleWheel}
      onDoubleClick={handleResetZoom}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* AI Floating Suggestion Card */}
      <FloatingSuggestion onConvertShape={handleConvertCurrentStroke} />
      <RightSideSuggestionPill />

      {/* Smart Shape Recognition Badge & Long Press Arc */}
      <ShapeRecognitionBadge
        result={recognitionResult}
        transform={transform}
        onConvert={handleConvertCurrentStroke}
        onDismiss={() => setRecognitionResult(null)}
        longPressProgress={longPressProgress}
        longPressPos={longPressScreenPos}
      />

      {/* Stylus Hardware Diagnostics Overlay */}
      {showDiagnostics && (
        <PenDiagnosticsPanel
          lastPenPoint={lastPenPoint}
          activePointerType={activePointerType}
          isHovering={isHovering}
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {/* Floating Canvas Quick Info, Stylus Diagnostics, Reset Zoom & Debug Toggle */}
      <div className="absolute top-4 left-4 text-[11px] font-mono text-zinc-400 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/15 flex items-center gap-3 shadow-xl pointer-events-auto z-20">
        <span>MODE: {mode.toUpperCase()}</span>
        <span>OBJECTS: {objects.length}</span>
        <button
          onClick={handleResetZoom}
          className="flex items-center gap-1 text-white hover:text-zinc-200 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors font-bold"
          title="Reset Zoom to 100%"
        >
          <RotateCcw className="w-3 h-3 text-white" />
          <span>ZOOM: {Math.round(transform.zoom * 100)}%</span>
        </button>
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-colors ${
            showDiagnostics
              ? 'bg-white text-black font-bold border-white'
              : 'border-white/15 text-zinc-400 hover:text-white'
          }`}
          title="Toggle Active Stylus Diagnostics Panel"
        >
          <PenTool className="w-3 h-3" />
          <span>STYLUS</span>
        </button>
        <button
          onClick={() => setIsDebugMode(!isDebugMode)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-colors ${
            isDebugMode ? 'bg-white text-black font-bold border-white' : 'border-white/15 text-zinc-400 hover:text-white'
          }`}
          title="Toggle Visual Debug Mode"
        >
          <Bug className="w-3 h-3" />
          <span>{isDebugMode ? 'DEBUG ON' : 'DEBUG'}</span>
        </button>
      </div>
    </div>
  );
};
