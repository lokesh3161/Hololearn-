import type { PenPoint } from './types';

export class InkRenderer {
  renderStroke(
    ctx: CanvasRenderingContext2D,
    points: PenPoint[],
    color: string = '#ffffff',
    baseWidth: number = 3.5,
    isHighlighter: boolean = false
  ): void {
    if (!points || points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isHighlighter) {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, baseWidth * 3);
      ctx.beginPath();
      ctx.moveTo(points[0].x || 0, points[0].y || 0);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x || 0, points[i].y || 0);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Pen stroke with variable pressure & velocity dynamics
    if (points.length === 1) {
      const p = points[0];
      const press = typeof p.pressure === 'number' && !isNaN(p.pressure) ? p.pressure : 0.5;
      const r = Math.max(1.5, (baseWidth * press) / 2);
      ctx.beginPath();
      ctx.arc(p.x || 0, p.y || 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Variable-width quad curve rendering for smooth natural handwriting
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (!p1 || !p2) continue;

      const p1Press = typeof p1.pressure === 'number' && !isNaN(p1.pressure) && p1.pressure > 0 ? p1.pressure : 0.5;
      const p2Press = typeof p2.pressure === 'number' && !isNaN(p2.pressure) && p2.pressure > 0 ? p2.pressure : 0.5;
      const pressure = (p1Press + p2Press) / 2;
      const effectiveWidth = Math.max(1.8, baseWidth * (0.4 + pressure * 0.9));

      ctx.lineWidth = isNaN(effectiveWidth) ? baseWidth : effectiveWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x || 0, p1.y || 0);

      if (i < points.length - 2 && points[i + 2]) {
        const p3 = points[i + 2];
        const xc = ((p2.x || 0) + (p3.x || 0)) / 2;
        const yc = ((p2.y || 0) + (p3.y || 0)) / 2;
        ctx.quadraticCurveTo(p2.x || 0, p2.y || 0, xc, yc);
      } else {
        ctx.lineTo(p2.x || 0, p2.y || 0);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  renderHoverCursor(
    ctx: CanvasRenderingContext2D,
    screenPos: { x: number; y: number },
    toolSize: number = 4
  ): void {
    if (!screenPos) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space rendering

    // Outer subtle white ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screenPos.x || 0, screenPos.y || 0, Math.max(4, toolSize + 2), 0, Math.PI * 2);
    ctx.stroke();

    // Inner point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screenPos.x || 0, screenPos.y || 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderSemanticShape(
    ctx: CanvasRenderingContext2D,
    obj: any,
    selected: boolean = false,
    color: string = '#ffffff',
    strokeWidth: number = 3.5
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3.5, strokeWidth);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (selected) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
    }

    const geo = obj?.geometry;
    if (!geo) {
      ctx.restore();
      return;
    }

    ctx.beginPath();

    switch (geo.type) {
      case 'circle':
        ctx.arc(geo.centerX || 0, geo.centerY || 0, Math.max(5, geo.radius || 10), 0, 2 * Math.PI);
        break;

      case 'ellipse':
        ctx.ellipse(
          geo.centerX || 0,
          geo.centerY || 0,
          Math.max(5, geo.radiusX || 10),
          Math.max(5, geo.radiusY || 10),
          geo.rotation || 0,
          0,
          2 * Math.PI
        );
        break;

      case 'rectangle':
      case 'square':
        if (geo.corners && geo.corners.length === 4) {
          ctx.moveTo(geo.corners[0].x || 0, geo.corners[0].y || 0);
          geo.corners.forEach((c: any, i: number) => {
            if (i > 0) ctx.lineTo(c.x || 0, c.y || 0);
          });
          ctx.closePath();
        } else {
          ctx.rect(geo.x || 0, geo.y || 0, geo.width || 50, geo.height || 50);
        }
        break;

      case 'triangle':
        ctx.moveTo(geo.p1?.x || 0, geo.p1?.y || 0);
        ctx.lineTo(geo.p2?.x || 0, geo.p2?.y || 0);
        ctx.lineTo(geo.p3?.x || 0, geo.p3?.y || 0);
        ctx.closePath();
        break;

      case 'line':
        ctx.moveTo(geo.startX || 0, geo.startY || 0);
        ctx.lineTo(geo.endX || 0, geo.endY || 0);
        break;

      case 'arrow': {
        const sx = geo.startX || 0;
        const sy = geo.startY || 0;
        const ex = geo.endX || 0;
        const ey = geo.endY || 0;
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        const angle = Math.atan2(ey - sy, ex - sx);
        const hs = geo.headSize || 14;
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - hs * Math.cos(angle - 0.42),
          ey - hs * Math.sin(angle - 0.42)
        );
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - hs * Math.cos(angle + 0.42),
          ey - hs * Math.sin(angle + 0.42)
        );
        break;
      }

      case 'arc':
        ctx.arc(geo.centerX || 0, geo.centerY || 0, Math.max(5, geo.radius || 10), geo.startAngle || 0, geo.endAngle || Math.PI);
        break;

      case 'polygon':
        if (geo.vertices && geo.vertices.length > 0) {
          ctx.moveTo(geo.vertices[0].x || 0, geo.vertices[0].y || 0);
          geo.vertices.forEach((v: any, i: number) => {
            if (i > 0) ctx.lineTo(v.x || 0, v.y || 0);
          });
          ctx.closePath();
        }
        break;
    }

    ctx.stroke();
    ctx.restore();
  }
}

export const inkRenderer = new InkRenderer();
