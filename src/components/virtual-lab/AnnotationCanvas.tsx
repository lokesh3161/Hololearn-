import React, { useRef, useEffect, useState, useCallback } from 'react';
import type {
  AnnotationStroke,
  LabInteractionMode,
  AnnotationPoint,
} from '../../hooks/virtual-lab/useAnnotations';
import { inkRenderer } from '../../pen/InkRenderer';

interface AnnotationCanvasProps {
  mode: LabInteractionMode;
  strokes: AnnotationStroke[];
  color: string;
  strokeWidth: number;
  onStartStroke: (point: AnnotationPoint) => void;
  onAddPoint: (point: AnnotationPoint) => void;
  onEndStroke: () => void;
  onEraseAt: (point: AnnotationPoint) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  mode,
  strokes,
  color,
  strokeWidth,
  onStartStroke,
  onAddPoint,
  onEndStroke,
  onEraseAt,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // ResizeObserver to update canvas width/height to match container bounds continuously
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // Main Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;

    // Synchronize canvas buffer resolution with CSS display size
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Draw all strokes scaled by normalized coordinates
    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      const pxPoints = stroke.points.map((p) => ({
        x: p.x * width,
        y: p.y * height,
        pressure: p.pressure ?? 0.5,
        timestamp: Date.now(),
        pointerType: 'pen' as const,
        velocity: 0,
      }));

      inkRenderer.renderStroke(ctx, pxPoints, stroke.color, stroke.width, false);
    });

    // Draw hover cursor ring if hovering in pen/eraser mode
    if (hoverPos && (mode === 'pen' || mode === 'eraser')) {
      ctx.save();
      ctx.strokeStyle = mode === 'eraser' ? '#f59e0b' : color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const r = mode === 'eraser' ? 12 : Math.max(3, strokeWidth * 1.5);
      ctx.arc(hoverPos.x, hoverPos.y, r, 0, Math.PI * 2);
      ctx.stroke();

      if (mode === 'eraser') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [dimensions, strokes, hoverPos, mode, color, strokeWidth]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderCanvas();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  // Pointer Event Handlers
  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>): AnnotationPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      pressure,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode === 'interact') return;

    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const normPt = getNormalizedPoint(e);

    if (mode === 'pen') {
      isDrawingRef.current = true;
      onStartStroke(normPt);
    } else if (mode === 'eraser') {
      isDrawingRef.current = true;
      onEraseAt(normPt);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode === 'interact') return;

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!isDrawingRef.current) return;

    e.preventDefault();
    const normPt = getNormalizedPoint(e);

    if (mode === 'pen') {
      onAddPoint(normPt);
    } else if (mode === 'eraser') {
      onEraseAt(normPt);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (e.target && (e.target as HTMLElement).releasePointerCapture) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore pointer capture errors if already released
      }
    }

    if (mode === 'pen') {
      onEndStroke();
    }
  };

  const handlePointerLeave = () => {
    setHoverPos(null);
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (mode === 'pen') {
        onEndStroke();
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="absolute inset-0 w-full h-full z-40 touch-none select-none"
      style={{
        pointerEvents: mode === 'interact' ? 'none' : 'auto',
        cursor: mode === 'pen' ? 'crosshair' : mode === 'eraser' ? 'cell' : 'default',
      }}
    />
  );
};
