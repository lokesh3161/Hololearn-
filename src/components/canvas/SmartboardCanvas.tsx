import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useBoardStore } from '../../store/boardStore';
import type { CanvasObject, Point } from '../../types/canvas';
import { calculateBoundingBox } from '../../services/detectionService';
import { PenInputEngine } from '../../pen/PenInputEngine';
import { inkRenderer } from '../../pen/InkRenderer';
import type { PenPoint, PointerDeviceType } from '../../pen/types';

interface DragStartInfo {
  pointerX: number;
  pointerY: number;
  objX: number;
  objY: number;
  initialPoints?: Point[];
}

export const SmartboardCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const penInputEngineRef = useRef<PenInputEngine>(new PenInputEngine());

  const {
    objects,
    selectedIds,
    activeTool,
    setTool,
    activeShape,
    strokeColor,
    strokeWidth,
    eraserSize,
    opacity,
    transform,
    showGrid,
    addObject,
    updateObject,
    deleteSelectedObjects,
    selectObject,
    setTransform,
    setEquationModalOpen,
    pushHistory,
  } = useBoardStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<PenPoint[]>([]);
  const [shapeStartPos, setShapeStartPos] = useState<Point | null>(null);
  const [shapeCurrentPos, setShapeCurrentPos] = useState<Point | null>(null);

  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<DragStartInfo | null>(null);

  const [activePointerType, setActivePointerType] = useState<PointerDeviceType>('mouse');
  const [hoverScreenPos, setHoverScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState<boolean>(false);

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

  // Real-Time MS Paint Square Eraser Function
  const eraseAtPosition = useCallback(
    (canvasPos: Point) => {
      const currentObjs = useBoardStore.getState().objects;
      const activeEraserSize = useBoardStore.getState().eraserSize || 28;
      const boxSizeCanvas = activeEraserSize / transform.zoom;
      const half = boxSizeCanvas / 2;

      const minX = canvasPos.x - half;
      const maxX = canvasPos.x + half;
      const minY = canvasPos.y - half;
      const maxY = canvasPos.y + half;

      let hasChanges = false;
      const updatedObjs: CanvasObject[] = [];

      for (const obj of currentObjs) {
        if (obj.type === 'stroke' || obj.type === 'handwriting') {
          if (!obj.points || obj.points.length === 0) continue;

          const segments: Point[][] = [];
          let currentSegment: Point[] = [];

          for (const p of obj.points) {
            const isInside = p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
            if (isInside) {
              if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
              }
              hasChanges = true;
            } else {
              currentSegment.push(p);
            }
          }

          if (currentSegment.length > 0) {
            segments.push(currentSegment);
          }

          segments.forEach((seg, idx) => {
            if (seg.length > 0) {
              const bbox = calculateBoundingBox(seg);
              updatedObjs.push({
                ...obj,
                id: idx === 0 ? obj.id : `${obj.id}-split-${idx}`,
                points: seg,
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height,
              });
            }
          });
        } else {
          const isOverlapping =
            obj.x + obj.width >= minX &&
            obj.x <= maxX &&
            obj.y + obj.height >= minY &&
            obj.y <= maxY;

          if (isOverlapping) {
            hasChanges = true;
          } else {
            updatedObjs.push(obj);
          }
        }
      }

      if (hasChanges) {
        useBoardStore.setState({ objects: updatedObjs });
      }
    },
    [transform]
  );

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
      ctx.fillStyle = '#080808'; // Very dark charcoal blackboard surface
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.zoom, transform.zoom);

      // Subtle Dot Grid (24px spacing, 0.08 opacity)
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

      // Render Stored Canvas Objects
      objects.forEach((obj) => {
        const isSelected = selectedIds.includes(obj.id);
        ctx.save();
        ctx.globalAlpha = obj.opacity ?? 1;

        try {
          if (obj.type === 'shape') {
            inkRenderer.renderShape(
              ctx,
              obj.shapeSubtype || 'rectangle',
              obj.x,
              obj.y,
              obj.width,
              obj.height,
              obj.strokeColor || strokeColor || '#ffffff',
              obj.strokeWidth || strokeWidth || 3.5
            );
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

              inkRenderer.renderStroke(ctx, penPoints, obj.strokeColor || strokeColor || '#ffffff', obj.strokeWidth || 3.5, obj.opacity < 0.5);
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1.5;

            ctx.fillRect(obj.x - 4, obj.y - 4, bgW, bgH);
            ctx.strokeRect(obj.x - 4, obj.y - 4, bgW, bgH);

            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'middle';
            ctx.fillText(content, obj.x + paddingX - 4, obj.y - 4 + bgH / 2);
            ctx.restore();
          }

          // Selection Bounding Box & 8 Move/Resize Handle Knobs
          if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(obj.x - 5, obj.y - 5, obj.width + 10, obj.height + 10);
            ctx.setLineDash([]);

            // Render 8 White Transform Handle Knobs
            const handles = [
              { x: obj.x - 5, y: obj.y - 5 }, // NW
              { x: obj.x + obj.width / 2, y: obj.y - 5 }, // N
              { x: obj.x + obj.width + 5, y: obj.y - 5 }, // NE
              { x: obj.x + obj.width + 5, y: obj.y + obj.height / 2 }, // E
              { x: obj.x + obj.width + 5, y: obj.y + obj.height + 5 }, // SE
              { x: obj.x + obj.width / 2, y: obj.y + obj.height + 5 }, // S
              { x: obj.x - 5, y: obj.y + obj.height + 5 }, // SW
              { x: obj.x - 5, y: obj.y + obj.height / 2 }, // W
            ];

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            for (const h of handles) {
              ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
              ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);
            }
          }
        } catch (err) {
          console.error('[HoloLearn Render Safe Recover]', err);
        }

        ctx.restore();
      });

      // Render Live Freehand Stroke Drawing
      if (isDrawing && (activeTool === 'pen' || activeTool === 'highlighter') && currentPoints.length > 0) {
        inkRenderer.renderStroke(
          ctx,
          currentPoints,
          activeTool === 'highlighter' ? 'rgba(255, 255, 255, 0.3)' : strokeColor || '#ffffff',
          activeTool === 'highlighter' ? strokeWidth * 2.5 : Math.max(3.5, strokeWidth),
          activeTool === 'highlighter'
        );
      }

      // Render Live Shape Drag-to-Draw Preview
      if (isDrawing && activeTool === 'shape' && shapeStartPos && shapeCurrentPos) {
        const shapeW = shapeCurrentPos.x - shapeStartPos.x;
        const shapeH = shapeCurrentPos.y - shapeStartPos.y;
        inkRenderer.renderShape(
          ctx,
          activeShape || 'rectangle',
          shapeStartPos.x,
          shapeStartPos.y,
          shapeW,
          shapeH,
          strokeColor || '#ffffff',
          strokeWidth || 3.5
        );
      }

      ctx.restore();

      // Render Eraser Cursor or Hover Cursor
      if (isHovering && hoverScreenPos) {
        if (activeTool === 'eraser') {
          inkRenderer.renderEraserCursor(ctx, hoverScreenPos, eraserSize || 28);
        } else if (!isDrawing) {
          inkRenderer.renderHoverCursor(ctx, hoverScreenPos, strokeWidth);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [objects, selectedIds, isDrawing, currentPoints, shapeStartPos, shapeCurrentPos, activeTool, activeShape, strokeColor, strokeWidth, eraserSize, transform, showGrid, isHovering, hoverScreenPos]);

  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const screenPos = { x: e.clientX, y: e.clientY };
    const pos = screenToCanvas(e.clientX, e.clientY);

    const pointerType = (e.pointerType || 'mouse') as PointerDeviceType;
    setActivePointerType(pointerType);

    if (e.button === 1 || (e.button === 0 && ((e as any).spaceKey || activeTool === 'hand'))) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      return;
    }

    // Hit Testing for Object Selection & Drag-to-Move
    const clickedObj = objects.slice().reverse().find((obj) => {
      const padding = 12;
      return (
        pos.x >= obj.x - padding &&
        pos.x <= obj.x + obj.width + padding &&
        pos.y >= obj.y - padding &&
        pos.y <= obj.y + obj.height + padding
      );
    });

    if (activeTool === 'select' || (clickedObj && activeTool !== 'eraser' && activeTool !== 'pen' && activeTool !== 'highlighter' && activeTool !== 'shape')) {
      if (clickedObj) {
        selectObject(clickedObj.id, e.shiftKey);
        setDragStart({
          pointerX: pos.x,
          pointerY: pos.y,
          objX: clickedObj.x,
          objY: clickedObj.y,
          initialPoints: clickedObj.points ? JSON.parse(JSON.stringify(clickedObj.points)) : undefined,
        });
      } else {
        useBoardStore.getState().clearSelection();
        setDragStart(null);
      }
      return;
    }

    if (activeTool === 'eraser') {
      eraseAtPosition(pos);
      return;
    }

    if (activeTool === 'equation') {
      setEquationModalOpen(true);
      return;
    }

    if (activeTool === 'shape') {
      setIsDrawing(true);
      setShapeStartPos(pos);
      setShapeCurrentPos(pos);
      return;
    }

    const penPoints = penInputEngineRef.current.normalizePointerEvent(e, (sx, sy) => screenToCanvas(sx, sy));

    if (penPoints.length > 0) {
      setIsDrawing(true);
      setCurrentPoints(penPoints);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const screenPos = { x: e.clientX, y: e.clientY };
    const pos = screenToCanvas(e.clientX, e.clientY);

    const pointerType = (e.pointerType || 'mouse') as PointerDeviceType;
    setActivePointerType(pointerType);

    setIsHovering(true);
    setHoverScreenPos(screenPos);

    if (isPanning) {
      setTransform({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (activeTool === 'eraser' && e.buttons > 0) {
      eraseAtPosition(pos);
      return;
    }

    // Drag-to-Move Selected Object Anywhere on Canvas
    if (dragStart && selectedIds.length > 0) {
      const targetId = selectedIds[0];
      const dx = pos.x - dragStart.pointerX;
      const dy = pos.y - dragStart.pointerY;

      const newX = dragStart.objX + dx;
      const newY = dragStart.objY + dy;

      let newPoints: Point[] | undefined = undefined;
      if (dragStart.initialPoints && dragStart.initialPoints.length > 0) {
        newPoints = dragStart.initialPoints.map((p) => ({
          ...p,
          x: p.x + dx,
          y: p.y + dy,
        }));
      }

      updateObject(targetId, {
        x: newX,
        y: newY,
        ...(newPoints ? { points: newPoints } : {}),
      });
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'shape') {
      setShapeCurrentPos(pos);
      return;
    }

    const penPoints = penInputEngineRef.current.normalizePointerEvent(e, (sx, sy) => screenToCanvas(sx, sy));

    if (penPoints.length > 0) {
      setCurrentPoints((prev) => [...prev, ...penPoints]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (dragStart) {
      setDragStart(null);
    }

    if (!isDrawing) return;

    setIsDrawing(false);

    if (activeTool === 'shape' && shapeStartPos && shapeCurrentPos) {
      const rawW = shapeCurrentPos.x - shapeStartPos.x;
      const rawH = shapeCurrentPos.y - shapeStartPos.y;

      const objX = rawW >= 0 ? shapeStartPos.x : shapeCurrentPos.x;
      const objY = rawH >= 0 ? shapeStartPos.y : shapeCurrentPos.y;
      const width = Math.max(15, Math.abs(rawW));
      const height = Math.max(15, Math.abs(rawH));

      pushHistory();
      const shapeObj: CanvasObject = {
        id: `shape-${Date.now()}`,
        type: 'shape',
        shapeSubtype: activeShape || 'rectangle',
        points: [],
        x: objX,
        y: objY,
        width,
        height,
        strokeColor: strokeColor || '#ffffff',
        strokeWidth: Math.max(2.5, strokeWidth),
        opacity: opacity,
        zIndex: objects.length + 1,
      };

      addObject(shapeObj);

      // Auto-select the created shape and switch to Select tool for immediate moving!
      selectObject(shapeObj.id);
      setTool('select');

      setShapeStartPos(null);
      setShapeCurrentPos(null);
      return;
    }

    if (currentPoints.length > 0 && (activeTool === 'pen' || activeTool === 'highlighter')) {
      const bbox = calculateBoundingBox(currentPoints);
      pushHistory();
      const strokeObj: CanvasObject = {
        id: `stroke-${Date.now()}`,
        type: 'stroke',
        points: currentPoints,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        strokeColor: strokeColor || '#ffffff',
        strokeWidth: activeTool === 'highlighter' ? strokeWidth * 2.5 : Math.max(3.5, strokeWidth),
        opacity: activeTool === 'highlighter' ? 0.35 : opacity,
        zIndex: objects.length + 1,
      };

      addObject(strokeObj);
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
      className="relative flex-1 w-full h-full bg-[#080808] overflow-hidden cursor-crosshair select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onWheel={handleWheel}
      onDoubleClick={handleResetZoom}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
};
