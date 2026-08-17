import React, { useRef, useEffect, useState, useCallback } from 'react';
import { OpticsEngine } from '../../engines/OpticsEngine';

export interface OpticalBenchCanvasProps {
  objectPos_cm: number;
  lensPos_cm: number;
  screenPos_cm: number;
  focalLength_cm: number;
  objectHeight_cm: number;
  benchLength_cm?: number;
  showRayDiagram: boolean;
  sharpness: number;
  calculatedImagePos_cm: number;
  isRealImage: boolean;
  magnification: number;
  onObjectMove: (newPos_cm: number) => void;
  onLensMove: (newPos_cm: number) => void;
  onScreenMove: (newPos_cm: number) => void;
  onDragStart?: () => void;
}

export const OpticalBenchCanvas: React.FC<OpticalBenchCanvasProps> = ({
  objectPos_cm,
  lensPos_cm,
  screenPos_cm,
  focalLength_cm,
  objectHeight_cm,
  benchLength_cm = 80,
  showRayDiagram,
  sharpness,
  calculatedImagePos_cm,
  isRealImage,
  magnification,
  onObjectMove,
  onLensMove,
  onScreenMove,
  onDragStart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<'object' | 'lens' | 'screen' | null>(null);

  // Convert bench cm position to Canvas pixel X
  const cmToPx = useCallback(
    (cm: number, width: number) => {
      const margin = width * 0.05;
      const usableWidth = width * 0.9;
      return margin + (cm / benchLength_cm) * usableWidth;
    },
    [benchLength_cm]
  );

  // Convert Canvas pixel X to bench cm position
  const pxToCm = useCallback(
    (px: number, width: number) => {
      const margin = width * 0.05;
      const usableWidth = width * 0.9;
      const rawCm = ((px - margin) / usableWidth) * benchLength_cm;
      return Math.max(2, Math.min(benchLength_cm - 2, Number(rawCm.toFixed(1))));
    },
    [benchLength_cm]
  );

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // 1. Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    const axisY = H / 2;
    const benchY = axisY + 45;

    // 2. Optical Bench Horizontal Rails
    const margin = W * 0.05;
    const benchWidth = W * 0.9;

    const grad = ctx.createLinearGradient(0, benchY, 0, benchY + 12);
    grad.addColorStop(0, '#4b5563');
    grad.addColorStop(0.5, '#9ca3af');
    grad.addColorStop(1, '#374151');

    ctx.fillStyle = grad;
    ctx.fillRect(margin, benchY, benchWidth, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, benchY, benchWidth, 12);

    // 3. Bench Scale Markings (0cm to benchLength_cm)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    for (let cm = 0; cm <= benchLength_cm; cm += 1) {
      const x = cmToPx(cm, W);
      let tickH = 3;
      if (cm % 5 === 0) tickH = 7;
      if (cm % 10 === 0) tickH = 12;

      ctx.lineWidth = cm % 10 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, benchY + 12);
      ctx.lineTo(x, benchY + 12 + tickH);
      ctx.stroke();

      if (cm % 10 === 0) {
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${cm}`, x, benchY + 32);
      }
    }

    // 4. Principal Axis Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(margin, axisY);
    ctx.lineTo(margin + benchWidth, axisY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Focal Point Markers (F, 2F, F', 2F')
    const F1_cm = lensPos_cm - focalLength_cm;
    const F2_cm = lensPos_cm - 2 * focalLength_cm;
    const F1_prime_cm = lensPos_cm + focalLength_cm;
    const F2_prime_cm = lensPos_cm + 2 * focalLength_cm;

    const drawMarker = (cm: number, label: string) => {
      if (cm < 0 || cm > benchLength_cm) return;
      const mx = cmToPx(cm, W);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(mx, axisY - 5);
      ctx.lineTo(mx + 4, axisY);
      ctx.lineTo(mx, axisY + 5);
      ctx.lineTo(mx - 4, axisY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, mx, axisY - 10);
    };

    drawMarker(F2_cm, '2F');
    drawMarker(F1_cm, 'F');
    drawMarker(F1_prime_cm, "F'");
    drawMarker(F2_prime_cm, "2F'");

    // 6. Object (Illuminated Candle/Arrow)
    const objX = cmToPx(objectPos_cm, W);
    const pxScaleY = 12; // 1cm height = 12px
    const objHeightPx = objectHeight_cm * pxScaleY;
    const objTopY = axisY - objHeightPx;

    // Shaft
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(objX, axisY);
    ctx.lineTo(objX, objTopY);
    ctx.stroke();

    // Arrowhead / Flame Tip
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(objX, objTopY - 6);
    ctx.lineTo(objX - 5, objTopY + 4);
    ctx.lineTo(objX + 5, objTopY + 4);
    ctx.closePath();
    ctx.fill();

    // Object Base Drag Circle
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(objX, benchY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Object', objX, objTopY - 12);

    // 7. Biconvex Lens
    const lensX = cmToPx(lensPos_cm, W);
    const lensH = 90;
    const lensW = 12;

    ctx.save();
    ctx.fillStyle = 'rgba(147, 197, 253, 0.12)';
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(lensX, axisY - lensH / 2);
    ctx.quadraticCurveTo(lensX + lensW, axisY, lensX, axisY + lensH / 2);
    ctx.quadraticCurveTo(lensX - lensW, axisY, lensX, axisY - lensH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Optical Center O Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(lensX, axisY - lensH / 2);
    ctx.lineTo(lensX, axisY + lensH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Lens Base Drag Circle
    ctx.fillStyle = '#93c5fd';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lensX, benchY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('O', lensX, axisY + 16);
    ctx.fillText('Lens', lensX, axisY - lensH / 2 - 8);
    ctx.restore();

    // 8. Screen (Vertical Plane)
    const screenX = cmToPx(screenPos_cm, W);
    const screenH = 100;
    const screenW = 8;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(screenX - screenW / 2, axisY - screenH / 2, screenW, screenH);
    ctx.strokeRect(screenX - screenW / 2, axisY - screenH / 2, screenW, screenH);

    // Screen Focus Glow
    if (sharpness > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + sharpness * 0.25})`;
      ctx.fillRect(screenX - screenW / 2 + 1, axisY - screenH / 2 + 1, screenW - 2, screenH - 2);
    }

    // Render Real Image on Screen surface
    if (isRealImage && sharpness > 0.05) {
      const imgHeightPx = Math.min(screenH / 2 - 5, Math.abs(objectHeight_cm * magnification * pxScaleY));
      const imgTopY = axisY + imgHeightPx; // Inverted real image points downward

      ctx.save();
      ctx.filter = `blur(${(1 - sharpness) * 6}px)`;
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.2, sharpness)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, axisY);
      ctx.lineTo(screenX, imgTopY);
      ctx.stroke();

      // Inverted Arrowhead
      ctx.fillStyle = `rgba(96, 165, 250, ${Math.max(0.3, sharpness)})`;
      ctx.beginPath();
      ctx.moveTo(screenX, imgTopY + 6);
      ctx.lineTo(screenX - 4, imgTopY - 4);
      ctx.lineTo(screenX + 4, imgTopY - 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Screen Base Drag Circle
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screenX, benchY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Screen', screenX, axisY - screenH / 2 - 8);

    // Focus Quality Indicator Bar above Screen
    const barW = 36;
    const barH = 4;
    const barX = screenX - barW / 2;
    const barY = axisY - screenH / 2 - 20;

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = sharpness >= 0.9 ? '#10b981' : '#ffffff';
    ctx.fillRect(barX, barY, barW * sharpness, barH);

    if (sharpness >= 0.9) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('✓ SHARP', screenX, barY - 4);
    }

    // 9. Principal Rays (when showRayDiagram is true)
    if (showRayDiagram) {
      const rayPaths = OpticsEngine.calculatePrincipalRays(
        objectPos_cm,
        objectHeight_cm,
        lensPos_cm,
        focalLength_cm,
        benchLength_cm
      );

      rayPaths.forEach((ray) => {
        ctx.strokeStyle = ray.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ray.segments.forEach((seg) => {
          const x1 = cmToPx(seg.x1, W);
          const y1 = axisY - seg.y1 * pxScaleY;
          const x2 = cmToPx(seg.x2, W);
          const y2 = axisY - seg.y2 * pxScaleY;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        });
        ctx.stroke();
      });
    }

    // 10. Measurement Distance Guides during dragging
    if (activeDrag === 'object' || activeDrag === 'lens' || activeDrag === 'screen') {
      const u = Math.abs(objectPos_cm - lensPos_cm);
      const v = Math.abs(screenPos_cm - lensPos_cm);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // u Guide Line
      ctx.beginPath();
      ctx.moveTo(objX, axisY + 25);
      ctx.lineTo(lensX, axisY + 25);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`u = ${u.toFixed(1)}cm`, (objX + lensX) / 2, axisY + 22);

      // v Guide Line
      ctx.beginPath();
      ctx.moveTo(lensX, axisY + 25);
      ctx.lineTo(screenX, axisY + 25);
      ctx.stroke();

      ctx.fillText(`v = ${v.toFixed(1)}cm`, (lensX + screenX) / 2, axisY + 22);
      ctx.setLineDash([]);
    }
  }, [
    objectPos_cm,
    lensPos_cm,
    screenPos_cm,
    focalLength_cm,
    objectHeight_cm,
    benchLength_cm,
    showRayDiagram,
    sharpness,
    calculatedImagePos_cm,
    isRealImage,
    magnification,
    activeDrag,
    cmToPx,
  ]);

  // Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const W = canvas.clientWidth;

    const objX = cmToPx(objectPos_cm, W);
    const lensX = cmToPx(lensPos_cm, W);
    const screenX = cmToPx(screenPos_cm, W);

    const hitRadius = 18;

    if (Math.abs(px - objX) < hitRadius) {
      setActiveDrag('object');
      if (onDragStart) onDragStart();
      canvas.setPointerCapture(e.pointerId);
    } else if (Math.abs(px - lensX) < hitRadius) {
      setActiveDrag('lens');
      if (onDragStart) onDragStart();
      canvas.setPointerCapture(e.pointerId);
    } else if (Math.abs(px - screenX) < hitRadius) {
      setActiveDrag('screen');
      if (onDragStart) onDragStart();
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeDrag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const W = canvas.clientWidth;
    const cm = pxToCm(px, W);

    if (activeDrag === 'object') {
      const clampedCm = Math.min(lensPos_cm - 2, Math.max(2, cm));
      onObjectMove(clampedCm);
    } else if (activeDrag === 'lens') {
      const clampedCm = Math.min(screenPos_cm - 2, Math.max(objectPos_cm + 2, cm));
      onLensMove(clampedCm);
    } else if (activeDrag === 'screen') {
      const clampedCm = Math.min(benchLength_cm - 2, Math.max(lensPos_cm + 2, cm));
      onScreenMove(clampedCm);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeDrag) {
      setActiveDrag(null);
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    }
  };

  return (
    <div className="w-full h-full relative cursor-crosshair select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full block"
      />
    </div>
  );
};
